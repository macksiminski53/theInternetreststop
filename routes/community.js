const express = require('express');
const pool = require('../db');

const router = express.Router();

// ---------- VISITOR COUNTER ----------
// Purely cosmetic retro touch -- a real, atomically-incrementing count,
// bumped once per homepage load. No auth needed, this isn't sensitive data,
// and there's no reasonable way to abuse a number going up faster than
// intended other than repeatedly loading the page, which just... makes
// the number bigger, which is fine.
router.post('/visitor-counter/increment', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE visitor_counter SET count = count + 1 WHERE id = 1 RETURNING count'
    );
    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Counter row missing.' });
    }
    res.json({ ok: true, count: result.rows[0].count });
  } catch (err) {
    console.error('Visitor counter increment error:', err);
    res.status(500).json({ error: 'Could not update visitor counter.' });
  }
});

router.get('/visitor-counter', async (req, res) => {
  try {
    const result = await pool.query('SELECT count FROM visitor_counter WHERE id = 1');
    const count = result.rows.length > 0 ? result.rows[0].count : 0;
    res.json({ ok: true, count });
  } catch (err) {
    console.error('Visitor counter read error:', err);
    res.status(500).json({ error: 'Could not load visitor counter.' });
  }
});

// ---------- GUESTBOOK ----------
const MAX_MESSAGE_LENGTH = 500;
const GUESTBOOK_PAGE_SIZE = 20;

// GET /api/guestbook - public read of the most recent entries. No auth
// needed to read, only to sign.
router.get('/guestbook', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, message, created_at
       FROM guestbook_entries
       ORDER BY created_at DESC
       LIMIT $1`,
      [GUESTBOOK_PAGE_SIZE]
    );
    res.json({ ok: true, entries: result.rows });
  } catch (err) {
    console.error('List guestbook error:', err);
    res.status(500).json({ error: 'Could not load the guestbook.' });
  }
});

// POST /api/guestbook - sign the guestbook (must be logged in -- keeps
// this from being an open target for spam/abuse, and the username comes
// from the session rather than trusting whatever the client claims).
router.post('/guestbook', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'You need to be logged in to sign the guestbook.' });
  }
  const { message } = req.body || {};
  const trimmed = (message || '').trim();
  if (!trimmed) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'Message is too long (max ' + MAX_MESSAGE_LENGTH + ' characters).' });
  }
  try {
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Your session is no longer valid.' });
    }
    const username = userResult.rows[0].username;
    const insertResult = await pool.query(
      `INSERT INTO guestbook_entries (user_id, username, message)
       VALUES ($1, $2, $3)
       RETURNING id, username, message, created_at`,
      [req.session.userId, username, trimmed]
    );
    res.json({ ok: true, entry: insertResult.rows[0] });
  } catch (err) {
    console.error('Sign guestbook error:', err);
    res.status(500).json({ error: 'Could not sign the guestbook.' });
  }
});

module.exports = router;
