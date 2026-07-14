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

// HTML pages carry all the interactive JS inline, so a stale cached copy of
// one of these means every button on the page can silently stop working
// (old script, but nothing visibly "broken" about the markup) -- force
// browsers/proxies to always revalidate these instead of trusting ETags.
// Images/SVGs/etc. are unaffected and keep normal static caching.
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

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
