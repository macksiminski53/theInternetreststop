const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// The only avatars a user can pick. Keeping this as a fixed list (rather
// than free-text or file uploads) means no image hosting/storage needed.
const VALID_AVATARS = ['traveler', 'trucker', 'raccoon', 'robot', 'ghost', 'cat', 'alien', 'cowboy'];

// POST /api/register
router.post('/register', async (req, res) => {
  const { username, password, avatar } = req.body || {};
  const chosenAvatar = VALID_AVATARS.includes(avatar) ? avatar : 'traveler';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters: letters, numbers, underscores only.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, avatar) VALUES ($1, $2, $3) RETURNING id, username, avatar',
      [username, hash, chosenAvatar]
    );

    const user = result.rows[0];
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ ok: true, user: { id: user.id, username: user.username, avatar: user.avatar } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const result = await pool.query('SELECT id, username, password_hash, avatar FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ ok: true, user: { id: user.id, username: user.username, avatar: user.avatar } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong logging you in.' });
  }
});

// POST /api/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// GET /api/me - who am I currently logged in as
router.get('/me', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({ loggedIn: false });
  }
  try {
    const result = await pool.query('SELECT id, username, avatar FROM users WHERE id = $1', [req.session.userId]);
    if (result.rows.length === 0) {
      return res.json({ loggedIn: false });
    }
    res.json({ loggedIn: true, user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Could not load your account.' });
  }
});

// GET /api/avatars - list of valid avatar choices, for the picker UI
router.get('/avatars', (req, res) => {
  res.json({ avatars: VALID_AVATARS });
});

// PATCH /api/me/avatar - change the logged-in user's avatar
router.patch('/me/avatar', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'You need to be logged in for that.' });
  }
  const { avatar } = req.body || {};
  if (!VALID_AVATARS.includes(avatar)) {
    return res.status(400).json({ error: 'That is not a valid avatar choice.' });
  }
  try {
    await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, req.session.userId]);
    res.json({ ok: true, avatar });
  } catch (err) {
    console.error('Update avatar error:', err);
    res.status(500).json({ error: 'Could not update your avatar.' });
  }
});

module.exports = router;
