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

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Render (and most hosts) put the app behind a reverse proxy that terminates
// HTTPS and forwards plain HTTP internally. Without this, Express thinks
// every request is insecure, so it silently refuses to set cookies marked
// "secure" -- which breaks logins right after they succeed.
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
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    secure: IS_PROD,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use('/api', authRoutes);
app.use('/api', linkRoutes);
app.use('/api', newsRoutes);

// health check for Render
app.get('/healthz', (req, res) => res.send('ok'));

// Run the users/saved_links migration automatically on boot.
// This lets the app work on Render's free tier, which doesn't
// include Shell access to run `npm run migrate` manually.
// Safe to run every time the server starts: schema.sql uses
// "CREATE TABLE IF NOT EXISTS", so it's a no-op once tables exist.
async function runMigration() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Database ready (users, saved_links tables checked/created).');
  } catch (err) {
    console.error('Migration on startup failed:', err);
  }
}

runMigration().then(() => {
  app.listen(PORT, () => {
    console.log(`The Internet Rest Stop server running on port ${PORT}`);
  });
});
