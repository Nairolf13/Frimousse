require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();


const meRoutes = require('./routes/me');
const nanniesRoutes = require('./routes/nannies');
const childrenRoutes = require('./routes/children');
const reportsRoutes = require('./routes/reports');


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


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
