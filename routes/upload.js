const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const pool = require('../db');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const ALLOWED_TYPES = {
  'image/png': true,
  'image/jpeg': true,
  'image/gif': true,
  'image/svg+xml': true,
  'image/webp': true
};

// Keep uploads in memory rather than writing to local disk -- Render's
// default web service filesystem is ephemeral (wiped on every redeploy or
// restart), so anything written to public/uploads/ would silently vanish
// the next time the site deployed. Uploading straight to Cloudinary instead
// means the image survives redeploys without needing a paid Render plan +
// persistent disk just for this.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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

function uploadBufferToCloudinary(buffer) {
  return new Promise(function (resolve, reject) {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'reststop-uploads', resource_type: 'image' },
      function (err, result) {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// POST /api/upload - admin-only image upload for card images and the site
// banner graphic. Uploads straight to Cloudinary (no local disk write) and
// returns the resulting hosted URL, which drops straight into an Image URL
// field just like a hand-typed path would.
router.post('/upload', requireAdmin, function (req, res) {
  upload.single('image')(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ error: 'Image hosting is not configured on the server yet.' });
    }
    try {
      const result = await uploadBufferToCloudinary(req.file.buffer);
      res.json({ ok: true, url: result.secure_url });
    } catch (uploadErr) {
      console.error('Cloudinary upload error:', uploadErr);
      res.status(502).json({ error: 'Could not reach the image host. Try again in a moment.' });
    }
  });
});

module.exports = router;
