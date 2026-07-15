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
const settingsRoutes = require('./routes/settings');
const uploadRoutes = require('./routes/upload');
const localBizRoutes = require('./routes/local-biz');

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
// Also applies to .js files: several pages (baby-markus.html, index.html)
// load their logic from separate script files, and a stale cached .js is
// the exact same failure mode as stale inline HTML -- a bug fix can be
// deployed and confirmed live, but a browser still quietly running the old
// script sees no change at all. Images/SVGs/etc. are unaffected and keep
// normal static caching.
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.js')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

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

// Maintenance mode: when the maintenance_mode site_setting is 'true', every
// non-admin visitor gets the under-construction page instead of the real
// site, while admins can keep browsing normally to actually work on
// whatever needed the site taken down in the first place. Checked before
// the static file server so it can intercept page loads; API routes for
// auth/settings still work underneath so an admin's session and the
// toggle itself keep functioning while this is on. Runs on every request,
// which costs one extra tiny DB read while maintenance mode is on -- fine
// for a site this size, and it's already off (the common case) most of
// the time so this mostly no-ops.
async function maintenanceGate(req, res, next) {
  // Never gate the API, the under-construction page itself, or static
  // assets the under-construction page needs -- only gate actual page
  // navigations so the toggle and admin login keep working underneath.
  if (req.path.startsWith('/api/') || req.path === '/under-construction.html' || req.path === '/healthz') {
    return next();
  }
  var isPageRequest = req.path === '/' || req.path.endsWith('.html');
  if (!isPageRequest) {
    return next();
  }
  try {
    const result = await pool.query(
      "SELECT value FROM site_settings WHERE key = 'maintenance_mode'"
    );
    const isOn = result.rows.length > 0 && result.rows[0].value === 'true';
    if (!isOn) return next();

    if (req.session && req.session.userId) {
      const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.session.userId]);
      if (adminCheck.rows.length > 0 && adminCheck.rows[0].is_admin) {
        return next();
      }
    }
    res.sendFile(path.join(__dirname, 'public', 'under-construction.html'));
  } catch (err) {
    console.error('Maintenance gate check error:', err);
    next();
  }
}
app.use(maintenanceGate);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', authRoutes);
app.use('/api', linkRoutes);
app.use('/api', newsRoutes);
app.use('/api', cardRoutes);
app.use('/api', settingsRoutes);
app.use('/api', uploadRoutes);
app.use('/api', localBizRoutes);

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
