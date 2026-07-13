const express = require('express');
const router = express.Router();

// Simple in-memory cache so we don't hit the Currents API on every
// page load. Headlines are refreshed at most once every 30 minutes.
const CACHE_MS = 30 * 60 * 1000;
let cache = { headlines: [], fetchedAt: 0 };

const FALLBACK_HEADLINES = [
  { text: 'News ticker warming up — check back in a bit.', source: '' }
];

// Currents API /latest-news pulls from established news outlets/wires
// (not random blogs), which is the "reputable sourcing" bar for this ticker.
async function fetchHeadlines() {
  const apiKey = process.env.CURRENTS_API_KEY;
  if (!apiKey) {
    console.warn('CURRENTS_API_KEY not set — news ticker will show fallback text.');
    return FALLBACK_HEADLINES;
  }

  const url = `https://api.currentsapi.services/v1/latest-news?language=en&apiKey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Currents API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== 'ok' || !Array.isArray(data.news)) {
    throw new Error('Unexpected Currents API response shape');
  }

  return data.news
    .filter((item) => item && item.title)
    .slice(0, 12)
    .map((item) => {
      // `author` is often a byline or "@handle" rather than an outlet name,
      // so only show it when it looks like a real attribution.
      const author = item.author && item.author !== 'None' ? String(item.author).trim() : '';
      const source = author && !author.startsWith('@') ? author.slice(0, 40) : '';
      return {
        text: String(item.title).slice(0, 160),
        source
      };
    });
}

// GET /api/news - cached, reputable-outlet headlines for the homepage ticker
router.get('/news', async (req, res) => {
  const now = Date.now();
  if (cache.headlines.length > 0 && (now - cache.fetchedAt) < CACHE_MS) {
    return res.json({ ok: true, headlines: cache.headlines, cached: true });
  }

  try {
    const headlines = await fetchHeadlines();
    cache = { headlines, fetchedAt: now };
    res.json({ ok: true, headlines, cached: false });
  } catch (err) {
    console.error('News fetch error:', err);
    // Serve stale cache if we have it, otherwise fallback text.
    const headlines = cache.headlines.length > 0 ? cache.headlines : FALLBACK_HEADLINES;
    res.json({ ok: true, headlines, cached: true, stale: true });
  }
});

module.exports = router;
