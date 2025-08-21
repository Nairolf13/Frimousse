const path = require('path');
// Load root .env first, then backend/.env to allow backend-specific overrides
require('dotenv').config({ path: path.resolve(process.cwd(), process.env.NODE_ENV === 'production' ? '.env.production' : '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Normalize STRIPE_SECRET_KEY: remove surrounding quotes and trim whitespace
if (process.env.STRIPE_SECRET_KEY) {
  process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY.trim().replace(/^"|"$/g, '');
}
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();

// Stripe integration
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


app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.API_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4000',
      'http://192.168.1.64:5173', 
    ];
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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

app.get('/', (req, res) => {
  res.send('API is running');
});

// Endpoint pour créer un PaymentIntent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // Montant en centimes (10€)
      currency: 'eur',
      automatic_payment_methods: {enabled: true},
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).send({error: error.message});
  }
});

// Endpoint webhook Stripe
// Note: subscription-related webhooks are handled in /api/subscriptions/webhook


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
