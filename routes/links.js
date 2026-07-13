const express = require('express');
const pool = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'You need to be logged in for that.' });
  }
  next();
}

// GET /api/mystops - list current user's saved links
router.get('/mystops', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT card_id, title, category, url, description, saved_at FROM saved_links WHERE user_id = $1 ORDER BY saved_at DESC',
      [req.session.userId]
    );
    res.json({ ok: true, links: result.rows });
  } catch (err) {
    console.error('List mystops error:', err);
    res.status(500).json({ error: 'Could not load your saved links.' });
  }
});

// POST /api/mystops - save a card
// body: { cardId, title, category, url, description }
router.post('/mystops', requireAuth, async (req, res) => {
  const { cardId, title, category, url, description } = req.body || {};
  if (!cardId || !title || !category) {
    return res.status(400).json({ error: 'cardId, title, and category are required.' });
  }

  try {
    await pool.query(
      `INSERT INTO saved_links (user_id, card_id, title, category, url, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, card_id) DO NOTHING`,
      [req.session.userId, cardId, title, category, url || null, description || null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Save link error:', err);
    res.status(500).json({ error: 'Could not save that link.' });
  }
});

// DELETE /api/mystops/:cardId - remove a saved card
router.delete('/mystops/:cardId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM saved_links WHERE user_id = $1 AND card_id = $2',
      [req.session.userId, req.params.cardId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete link error:', err);
    res.status(500).json({ error: 'Could not remove that link.' });
  }
});

module.exports = router;
