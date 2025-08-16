require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();

// Stripe integration
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('La clé STRIPE_SECRET_KEY doit être définie dans le fichier .env ou l’environnement.');
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



const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const assignmentsRoutes = require('./routes/assignments');
app.use('/api/assignments', assignmentsRoutes);

const schedulesRoutes = require('./routes/schedules');
app.use('/api', schedulesRoutes);

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
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...';
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Erreur de webhook: ${err.message}`);
  }
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Paiement réussi:', paymentIntent.id);
      break;
    case 'payment_intent.payment_failed':
      console.log('Échec du paiement');
      break;
    default:
      console.log(`Événement non traité: ${event.type}`);
  }
  res.send();
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
