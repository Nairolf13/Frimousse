const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), process.env.NODE_ENV === 'production' ? '.env.production' : '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

if (process.env.STRIPE_SECRET_KEY) {
  process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY.trim().replace(/^"|"$/g, '');
}
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();

const requiredEnvs = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'STRIPE_SECRET_KEY'];
for (const e of requiredEnvs) {
  if (!process.env[e]) {
    console.error(`Missing required env var: ${e}. Please set it in backend/.env or environment variables.`);
    process.exit(1);
  }
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('La clé STRIPE_SECRET_KEY doit être définie dans backend/.env ou dans les variables d\'environnement.');
}
if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
  throw new Error('La clé STRIPE_SECRET_KEY ne semble pas valide (doit commencer par sk_). Vérifiez backend/.env');
}
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');


const meRoutes = require('./routes/me');
const nanniesRoutes = require('./routes/nannies');
const childrenRoutes = require('./routes/children');
const reportsRoutes = require('./routes/reports');
const parentRoutes = require('./routes/parent');
// cache middleware for GET endpoints (supports Redis via REDIS_URL)
const cacheMiddleware = require('./middleware/cacheMiddleware');


app.use(helmet());

// Respect reverse proxy headers when deployed behind a proxy/load balancer
// Set TRUST_PROXY=true in env if you're behind a proxy (e.g., nginx, Cloudflare)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
}


const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = isProd
  ? [
      'https://lesfrimousses.com',
      'https://www.lesfrimousses.com',
      'http://localhost:5173'
    ]
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://lesfrimousses.com',
      'https://www.lesfrimousses.com',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS: origine non autorisée'), false);
    },
    credentials: true,
  })
);

// Parse JSON and cookies early so rate limiter can use per-user keys (from cookies)
// Limit JSON body size to avoid large payload attacks. Can be tuned via EXPRESS_JSON_LIMIT env var.
const jsonLimit = process.env.EXPRESS_JSON_LIMIT || '100kb';
app.use(express.json({ limit: jsonLimit }));
app.use(cookieParser());

// Rate limiter configuration: prefer per-user key (accessToken cookie) when present, otherwise fallback to IP.
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const defaultMax = isProd ? 120 : 1000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || defaultMax);
const Redis = require('ioredis');
let generalLimiter;
// If REDIS_URL is provided, use a Redis-backed store for express-rate-limit
if (process.env.REDIS_URL) {
  try {
    const RateLimitRedisStore = require('rate-limit-redis');
    const redisClient = new Redis(process.env.REDIS_URL);
    generalLimiter = rateLimit({
      windowMs: RATE_LIMIT_WINDOW_MS,
      max: RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      store: new RateLimitRedisStore({
        sendCommand: (...args) => redisClient.call(...args),
      }),
      keyGenerator: (req) => {
        try {
          const token = req.cookies && req.cookies.accessToken;
          if (token) {
            try {
              const payload = jwt.decode(String(token));
              if (payload && typeof payload === 'object' && 'id' in payload) {
                return String((payload).id);
              }
            } catch (e) {
              return String(token);
            }
          }
        } catch (e) {}
        return req.ip || req.connection.remoteAddress || '';
      },
      handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests, slow down.' });
      }
    });
  } catch (e) {
    console.warn('Failed to initialize Redis rate limiter, falling back to memory limiter', e && e.message);
  }
}

// fallback to in-memory limiter if redis not configured or on error
if (!generalLimiter) {
  generalLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      try {
        const token = req.cookies && req.cookies.accessToken;
        if (token) {
          try {
            const payload = jwt.decode(String(token));
            if (payload && typeof payload === 'object' && 'id' in payload) {
              return String((payload).id);
            }
          } catch (e) {
            return String(token);
          }
        }
      } catch (e) {}
      return req.ip || req.connection.remoteAddress || '';
    },
    handler: (req, res) => {
      res.status(429).json({ error: 'Too many requests, slow down.' });
    }
  });
}

// Separate stricter limiter for auth endpoints to mitigate brute-force attacks
const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress || '',
  handler: (req, res) => res.status(429).json({ error: 'Too many auth attempts, try again later.' })
});

// Apply authLimiter to auth endpoints (login/register) early to ensure stricter limits
// for auth actions are applied before the global limiter.
app.use('/api/auth', authLimiter);

// Apply generalLimiter globally (skip some health and static routes)
app.use((req, res, next) => {
  // Skip root, payment-intent creation, health and service-worker/static files
  const skipPaths = ['/', '/create-payment-intent', '/api/_health', '/sw.js', '/service-worker.js'];
  // Also skip internal debug endpoints if present
  if (req.path && req.path.startsWith('/api/_debug')) return next();
  if (skipPaths.includes(req.path)) return next();
  return generalLimiter(req, res, next);
});

// Production notes:
// - For horizontal scaling, use a central store for rate-limiter (e.g. Redis via 'rate-limit-redis') so limits are shared across instances.
// - Consider per-endpoint limits for sensitive routes (login, auth) and higher limits for read-only endpoints.
// - Cache expensive/read-heavy endpoints with a CDN or reverse-proxy (Varnish, Cloudflare) and use ETags/If-None-Match to reduce load.
// - If many concurrent WebSocket/SSE clients are required, offload real-time push to a dedicated service (Redis PubSub / message broker).

app.use('/api/me', meRoutes);
app.use('/api/user/me', meRoutes);
// Cache nannies list per-center for a short time to reduce DB load under spikes.
const NANNIES_CACHE_TTL_MS = Number(process.env.NANNIES_CACHE_TTL_MS || 20 * 1000);
app.use('/api/nannies', cacheMiddleware(NANNIES_CACHE_TTL_MS));
app.use('/api/nannies', nanniesRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/parent', parentRoutes);


const centersRoutes = require('./routes/centers');
// Cache GET responses for centers route for a short TTL to reduce DB load.
const CENTERS_CACHE_TTL_MS = Number(process.env.CENTERS_CACHE_TTL_MS || 30 * 1000);
app.use('/api/centers', cacheMiddleware(CENTERS_CACHE_TTL_MS));
app.use('/api/centers', centersRoutes);



const userRoutes = require('./routes/user');
// Cache user list endpoints with a short TTL (for admin listing) - keep /me private (no global cache)
const USER_CACHE_TTL_MS = Number(process.env.USER_CACHE_TTL_MS || 10 * 1000);
app.use('/api/user', cacheMiddleware(USER_CACHE_TTL_MS));
app.use('/api/user', userRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const assignmentsRoutes = require('./routes/assignments');
// Assignments list (per-center) cache
const ASSIGNMENTS_CACHE_TTL_MS = Number(process.env.ASSIGNMENTS_CACHE_TTL_MS || 15 * 1000);
app.use('/api/assignments', cacheMiddleware(ASSIGNMENTS_CACHE_TTL_MS));
app.use('/api/assignments', assignmentsRoutes);

const schedulesRoutes = require('./routes/schedules');
// Schedules listing cache (per-center); mount cache only on the schedules path to avoid
// accidentally caching other /api endpoints.
const SCHEDULES_CACHE_TTL_MS = Number(process.env.SCHEDULES_CACHE_TTL_MS || 15 * 1000);
app.use('/api/schedules', cacheMiddleware(SCHEDULES_CACHE_TTL_MS));
app.use('/api/schedules', schedulesRoutes);

const subscriptionsRoutes = require('./routes/subscriptions');
const SUBSCRIPTIONS_CACHE_TTL_MS = Number(process.env.SUBSCRIPTIONS_CACHE_TTL_MS || 20 * 1000);
app.use('/api/subscriptions', cacheMiddleware(SUBSCRIPTIONS_CACHE_TTL_MS));
app.use('/api/subscriptions', subscriptionsRoutes);

const notificationPushRoutes = require('./routes/notificationPush');
// push-subscriptions endpoints are per-user and small; do not cache globally (skip)
app.use('/api/push-subscriptions', notificationPushRoutes);

// Mount external API proxy (REST Countries + Photon + Nominatim) to avoid CORS and add User-Agent
try {
  const externalProxy = require('./routes/externalProxy');
  app.use('/api/external', externalProxy);
} catch (e) {
  console.warn('Failed to mount external proxy routes', e && e.message ? e.message : e);
}

const feedRoutes = require('./routes/feed');
// Apply caching to feed (short TTL) to reduce repeated DB reads under bursts.
const FEED_CACHE_TTL_MS = Number(process.env.FEED_CACHE_TTL_MS || 10 * 1000);
app.use('/api/feed', cacheMiddleware(FEED_CACHE_TTL_MS));
app.use('/api/feed', feedRoutes);

const uploadsRoutes = require('./routes/uploads');
app.use('/api/uploads', uploadsRoutes);

const notificationsRoutes = require('./routes/notifications');
// Notifications listing (per-user) is private; avoid global cache, rely on DB and push notifications.
app.use('/api/notifications', notificationsRoutes);

// paymentHistoryRoutes mounted later after invoice and admin routes

const paymentInvoiceRoutes = require('./routes/paymentInvoice');
// Mount invoice route before the general payment-history routes so it has priority
app.use('/api/payment-history', paymentInvoiceRoutes);

const paymentHistoryAdminRoutes = require('./routes/paymentHistoryAdmin');
app.use('/api/payment-history', paymentHistoryAdminRoutes);

const paymentHistoryRoutes = require('./routes/paymentHistory');
app.use('/api/payment-history', paymentHistoryRoutes);

app.get('/', (req, res) => {
  res.send('API is running');
});

// Lightweight health check including Redis connectivity and cache metrics
app.get('/api/_health', async (req, res) => {
  try {
    const redisCache = require('./lib/redisCache');
    const cacheMiddleware = require('./middleware/cacheMiddleware');
    const redisOk = await (redisCache && redisCache.ping ? redisCache.ping() : false);
    const metrics = cacheMiddleware._metrics || { hits: 0, misses: 0 };
    return res.json({ ok: true, redis: !!redisOk, cacheMetrics: metrics });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
  }
});

app.post('/create-payment-intent', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, 
      currency: 'eur',
      automatic_payment_methods: {enabled: true},
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).send({error: error.message});
  }
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0');

// Start monthly payment cron (calculates previous month on 1st of month)
try {
  const paymentCron = require('./lib/paymentCron');
  // task is scheduled automatically when the module is required
  console.log('Payment cron loaded');
} catch (err) {
  console.error('Failed to load payment cron', err);
}
