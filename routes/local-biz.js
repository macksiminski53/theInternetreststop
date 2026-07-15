const express = require('express');
const pool = require('../db');

const router = express.Router();

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

// GET /api/local-biz - public list of active local business shoutouts, used
// by the homepage's rotating ad carousel and footer strip. Only returns
// active=true entries so an admin can pull one out of rotation without
// deleting it outright.
router.get('/local-biz', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT biz_id, name, tagline, image_url, link_url, sort_order
       FROM local_biz_ads
       WHERE active = TRUE
       ORDER BY sort_order ASC, created_at ASC`
    );
    res.json({ ok: true, businesses: result.rows });
  } catch (err) {
    console.error('List local-biz error:', err);
    res.status(500).json({ error: 'Could not load local businesses.' });
  }
});

// GET /api/local-biz/all - admin list including inactive entries, for the
// admin management UI (so a paused entry still shows up to be re-enabled
// or edited instead of disappearing entirely).
router.get('/local-biz/all', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, biz_id, name, tagline, image_url, link_url, active, sort_order, created_at, updated_at
       FROM local_biz_ads
       ORDER BY sort_order ASC, created_at ASC`
    );
    res.json({ ok: true, businesses: result.rows });
  } catch (err) {
    console.error('List all local-biz error:', err);
    res.status(500).json({ error: 'Could not load local businesses.' });
  }
});

// POST /api/local-biz - create a new local business shoutout (admin only)
router.post('/local-biz', requireAdmin, async (req, res) => {
  const { bizId, name, tagline, imageUrl, linkUrl, active, sortOrder } = req.body || {};
  if (!bizId || !name) {
    return res.status(400).json({ error: 'bizId and name are required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO local_biz_ads (biz_id, name, tagline, image_url, link_url, active, sort_order, added_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        bizId,
        name,
        tagline || null,
        imageUrl || null,
        linkUrl || null,
        typeof active === 'boolean' ? active : true,
        Number.isFinite(sortOrder) ? sortOrder : 500,
        req.session.userId
      ]
    );
    res.json({ ok: true, business: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A business with that ID already exists.' });
    }
    console.error('Create local-biz error:', err);
    res.status(500).json({ error: 'Could not create business entry.' });
  }
});

// PUT /api/local-biz/:bizId - edit an existing entry (admin only)
router.put('/local-biz/:bizId', requireAdmin, async (req, res) => {
  const { name, tagline, imageUrl, linkUrl, active, sortOrder } = req.body || {};
  try {
    const result = await pool.query(
      `UPDATE local_biz_ads SET
         name = COALESCE($1, name),
         tagline = COALESCE($2, tagline),
         image_url = COALESCE($3, image_url),
         link_url = COALESCE($4, link_url),
         active = COALESCE($5, active),
         sort_order = COALESCE($6, sort_order),
         updated_at = NOW()
       WHERE biz_id = $7
       RETURNING *`,
      [
        name || null,
        tagline || null,
        imageUrl || null,
        linkUrl || null,
        typeof active === 'boolean' ? active : null,
        Number.isFinite(sortOrder) ? sortOrder : null,
        req.params.bizId
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found.' });
    }
    res.json({ ok: true, business: result.rows[0] });
  } catch (err) {
    console.error('Edit local-biz error:', err);
    res.status(500).json({ error: 'Could not update business entry.' });
  }
});

// DELETE /api/local-biz/:bizId - remove an entry entirely (admin only)
router.delete('/local-biz/:bizId', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM local_biz_ads WHERE biz_id = $1', [req.params.bizId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete local-biz error:', err);
    res.status(500).json({ error: 'Could not delete business entry.' });
  }
});

module.exports = router;
