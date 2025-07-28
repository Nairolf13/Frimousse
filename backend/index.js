
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();


const meRoutes = require('./routes/me');
const nanniesRoutes = require('./routes/nannies');
const childrenRoutes = require('./routes/children');


app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());




app.use('/api/me', meRoutes);
app.use('/api/user/me', meRoutes);
app.use('/api/nannies', nanniesRoutes);
app.use('/api/children', childrenRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);



const assignmentsRoutes = require('./routes/assignments');
app.use('/api/assignments', assignmentsRoutes);

app.get('/', (req, res) => {
  res.send('API is running');
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
