const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('../db');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(12).toString('hex');
    cb(null, randomName + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB -- plenty for logos/screenshots, keeps the disk from filling up
  fileFilter: function (req, file, cb) {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error('Only PNG, JPG, GIF, SVG, and WEBP images are allowed.'));
    }
    cb(null, true);
  }
});

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

// POST /api/upload - admin-only image upload for card images and the site
// banner graphic. Returns a URL under /uploads/... that can be dropped
// straight into an Image URL field.
//
// Note: Render's default web service filesystem is ephemeral -- files
// written here can be wiped on redeploy or restart unless a persistent
// disk is attached to the service. This is fine for quick iteration, but
// for anything meant to stick around long-term, attach a Render Disk
// mounted at this uploads directory (or move to real object storage).
router.post('/upload', requireAdmin, function (req, res) {
  upload.single('image')(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }
    res.json({ ok: true, url: '/uploads/' + req.file.filename });
  });
});

module.exports = router;
