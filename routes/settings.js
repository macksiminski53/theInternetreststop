const express = require('express');
const pool = require('../db');

const router = express.Router();

// Small key/value store for editable bits of site copy that don't warrant
// their own dedicated table -- currently just the MK hero banner text and
// the scrolling marquee message. Keeping this generic (rather than two
// one-off columns somewhere) means new editable strings can be added later
// without another migration.
const ALLOWED_KEYS = ['mk_banner_text', 'mk_marquee_text'];

async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'You need to be logged in for that.' });
  }
  try {
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.session.userId]);
    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Admins only.' });
    }
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ error: 'Could not verify admin status.' });
  }
}

// GET /api/settings - public read of all editable site-copy settings, used
// by the homepage to render the banner/marquee. No auth required, this is
// just display copy, not sensitive data.
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM site_settings WHERE key = ANY($1)', [ALLOWED_KEYS]);
    const settings = {};
    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    res.json({ ok: true, settings });
  } catch (err) {
    console.error('List settings error:', err);
    res.status(500).json({ error: 'Could not load settings.' });
  }
});

// PUT /api/settings - update one or more settings at once (admin only).
// Body: { mk_banner_text: '...', mk_marquee_text: '...' } -- either or both.
router.put('/settings', requireAdmin, async (req, res) => {
  const updates = req.body || {};
  const keysToUpdate = Object.keys(updates).filter((k) => ALLOWED_KEYS.includes(k));

  if (keysToUpdate.length === 0) {
    return res.status(400).json({ error: 'No valid settings provided.' });
  }

  try {
    for (const key of keysToUpdate) {
      const value = String(updates[key] == null ? '' : updates[key]).slice(0, 2000);
      await pool.query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value]
      );
    }
    const result = await pool.query('SELECT key, value FROM site_settings WHERE key = ANY($1)', [ALLOWED_KEYS]);
    const settings = {};
    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    res.json({ ok: true, settings });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Could not save settings.' });
  }
});

module.exports = router;
