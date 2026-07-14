require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const pool = require('./db');
const authRoutes = require('./routes/auth');
const linkRoutes = require('./routes/links');
const newsRoutes = require('./routes/news');
const cardRoutes = require('./routes/cards');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

if (IS_PROD) {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30,
    secure: IS_PROD,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use('/api', authRoutes);
app.use('/api', linkRoutes);
app.use('/api', newsRoutes);
app.use('/api', cardRoutes);

app.get('/healthz', (req, res) => res.send('ok'));

async function runMigration() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Database ready.');
  } catch (err) {
    console.error('Migration on startup failed:', err);
  }
}

app.listen(PORT, () => {
  console.log(`The Internet Rest Stop server running on port ${PORT}`);
});

runMigration();
