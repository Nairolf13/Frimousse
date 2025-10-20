const path = require("path");
// Load environment variables from backend/.env if present. Log result for easier debugging.
const dotenvResult = require("dotenv").config({ path: path.resolve(__dirname, ".env") });
if (dotenvResult.error) {
  // don't hard-fail: allow process.env to supply variables (useful in CI/prod)
  console.warn('No backend/.env loaded or failed to parse:', dotenvResult.error.message || dotenvResult.error);
} else {
  console.log('Loaded backend/.env');
}

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


const meRoutes = require('./routes/me');
const nanniesRoutes = require('./routes/nannies');
const childrenRoutes = require('./routes/children');
const reportsRoutes = require('./routes/reports');
const parentRoutes = require('./routes/parent');


app.use(helmet());

app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

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
      // Allow requests with no origin (curl, same-origin) and be permissive in dev
      if (!origin) return callback(null, true);
      if (!isProd) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS: origine non autorisée'), false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Serve frontend static files in production with appropriate Cache-Control headers.
const distPath = isProd ? path.resolve(__dirname, '..', 'build') : null;
if (isProd && distPath) {
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      try {
        const ext = path.extname(filePath).toLowerCase();
        // index.html should be revalidated frequently
        if (ext === '.html') {
          res.setHeader('Cache-Control', 'no-cache');
          return;
        }

        // Vite outputs hashed files under /assets/ — these are safe to cache long-term
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return;
        }

        // Images: if fingerprinted they will sit under assets; otherwise give a reasonable TTL
        if (filePath.includes(`${path.sep}imgs${path.sep}`) || ['.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif'].includes(ext)) {
          res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30 days
          return;
        }

        // Default for other static files (small TTL)
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      } catch (e) {
        // Don't break serving on header errors
        console.warn('Failed to set cache headers for', filePath, e && e.message ? e.message : e);
      }
    }
  }));
}

app.use('/api/me', meRoutes);
app.use('/api/user/me', meRoutes);
app.use('/api/nannies', nanniesRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/parent', parentRoutes);


const centersRoutes = require('./routes/centers');
app.use('/api/centers', centersRoutes);

const reviewsRoutes = require('./routes/reviews');
app.use('/api/reviews', reviewsRoutes);



const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const assignmentsRoutes = require('./routes/assignments');
app.use('/api/assignments', assignmentsRoutes);

const schedulesRoutes = require('./routes/schedules');
app.use('/api', schedulesRoutes);

const subscriptionsRoutes = require('./routes/subscriptions');
app.use('/api/subscriptions', subscriptionsRoutes);

const notificationPushRoutes = require('./routes/notificationPush');
app.use('/api/push-subscriptions', notificationPushRoutes);

const geodataRoutes = require('./routes/geodata');
app.use('/api/geodata', geodataRoutes);

const feedRoutes = require('./routes/feed');
app.use('/api/feed', feedRoutes);

const uploadsRoutes = require('./routes/uploads');
app.use('/api/uploads', uploadsRoutes);

const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes);

// Hugging Face parental assistant route
const hfChatRoutes = require('./routes/hfChat');
app.use('/api/hf-chat', hfChatRoutes);

// Assistant route (Mistral proxy)
try {
  const assistantRoutes = require('./routes/assistant');
  app.use('/api/assistant', assistantRoutes);
} catch (e) {
  console.warn('assistant route not available:', e.message);
}

// paymentHistoryRoutes mounted later after invoice and admin routes

const adminEmailLogsRoutes = require('./routes/adminEmailLogs');
app.use('/api/admin', adminEmailLogsRoutes);


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

// Catch-all handler: serve index.html for client-side routing in production
if (isProd) {
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

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
