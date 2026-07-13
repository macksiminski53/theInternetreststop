const express = require('express');
const pool = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'You need to be logged in for that.' });
  }
  next();
}

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

// GET /api/cards - list all cards with real stats (favorited count from
// saved_links, visit_count, added_by username, updated_at).
router.get('/cards', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.card_id, c.title, c.category, c.description, c.image_url,
        c.link_url, c.featured, c.big_row, c.sort_order, c.visit_count,
        c.created_at, c.updated_at,
        u.username AS added_by_username,
        COALESCE(fav.favorited_count, 0) AS favorited_count
      FROM cards c
      LEFT JOIN users u ON u.id = c.added_by
      LEFT JOIN (
        SELECT card_id, COUNT(*) AS favorited_count
        FROM saved_links
        GROUP BY card_id
      ) fav ON fav.card_id = c.card_id
      ORDER BY c.sort_order ASC, c.created_at ASC
    `);
    res.json({ ok: true, cards: result.rows });
  } catch (err) {
    console.error('List cards error:', err);
    res.status(500).json({ error: 'Could not load cards.' });
  }
});

// POST /api/cards/:cardId/visit - increment the visit counter. Called by
// the frontend whenever a card's detail modal is opened. No auth required
// (visits are anonymous), just a simple counter bump.
router.post('/cards/:cardId/visit', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE cards SET visit_count = visit_count + 1 WHERE card_id = $1 RETURNING visit_count',
      [req.params.cardId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found.' });
    }
    res.json({ ok: true, visit_count: result.rows[0].visit_count });
  } catch (err) {
    console.error('Visit tracking error:', err);
    res.status(500).json({ error: 'Could not record visit.' });
  }
});

// GET /api/me/is-admin - lightweight check the frontend can use to decide
// whether to show Add/Edit card controls.
router.get('/me/is-admin', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({ isAdmin: false });
  }
  try {
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.session.userId]);
    res.json({ isAdmin: result.rows.length > 0 && !!result.rows[0].is_admin });
  } catch (err) {
    console.error('is-admin check error:', err);
    res.json({ isAdmin: false });
  }
});

// POST /api/cards - create a new card (admin only)
router.post('/cards', requireAdmin, async (req, res) => {
  const { cardId, title, category, description, imageUrl, linkUrl, featured, bigRow, sortOrder } = req.body || {};
  if (!cardId || !title) {
    return res.status(400).json({ error: 'cardId and title are required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO cards (card_id, title, category, description, image_url, link_url, featured, big_row, sort_order, added_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        cardId,
        title,
        category || 'Browse',
        description || null,
        imageUrl || null,
        linkUrl || null,
        !!featured,
        !!bigRow,
        Number.isFinite(sortOrder) ? sortOrder : 500,
        req.session.userId
      ]
    );
    res.json({ ok: true, card: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A card with that ID already exists.' });
    }
    console.error('Create card error:', err);
    res.status(500).json({ error: 'Could not create card.' });
  }
});

// PUT /api/cards/:cardId - edit an existing card (admin only)
router.put('/cards/:cardId', requireAdmin, async (req, res) => {
  const { title, category, description, imageUrl, linkUrl, featured, bigRow, sortOrder } = req.body || {};
  try {
    const result = await pool.query(
      `UPDATE cards SET
         title = COALESCE($1, title),
         category = COALESCE($2, category),
         description = COALESCE($3, description),
         image_url = COALESCE($4, image_url),
         link_url = COALESCE($5, link_url),
         featured = COALESCE($6, featured),
         big_row = COALESCE($7, big_row),
         sort_order = COALESCE($8, sort_order),
         updated_at = NOW()
       WHERE card_id = $9
       RETURNING *`,
      [
        title || null,
        category || null,
        description || null,
        imageUrl || null,
        linkUrl || null,
        typeof featured === 'boolean' ? featured : null,
        typeof bigRow === 'boolean' ? bigRow : null,
        Number.isFinite(sortOrder) ? sortOrder : null,
        req.params.cardId
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found.' });
    }
    res.json({ ok: true, card: result.rows[0] });
  } catch (err) {
    console.error('Edit card error:', err);
    res.status(500).json({ error: 'Could not update card.' });
  }
});

// DELETE /api/cards/:cardId - remove a card (admin only)
router.delete('/cards/:cardId', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM cards WHERE card_id = $1', [req.params.cardId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete card error:', err);
    res.status(500).json({ error: 'Could not delete card.' });
  }
});

module.exports = router;
