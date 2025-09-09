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
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS: origine non autorisée'), false);
    },
    credentials: true,
  })
);

app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.use(express.json());
app.use(cookieParser());

app.use('/api/me', meRoutes);
app.use('/api/user/me', meRoutes);
app.use('/api/nannies', nanniesRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/parent', parentRoutes);

const centersRoutes = require('./routes/centers');
app.use('/api/centers', centersRoutes);



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

const feedRoutes = require('./routes/feed');
app.use('/api/feed', feedRoutes);

app.get('/', (req, res) => {
  res.send('API is running');
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
