const express = require('express');
const router = express.Router();

// Simple in-memory cache so we don't hit the Perplexity API on every
// page load. Headlines are refreshed at most once every 30 minutes.
const CACHE_MS = 30 * 60 * 1000;
let cache = { headlines: [], fetchedAt: 0 };

const FALLBACK_HEADLINES = [
  { text: 'News ticker warming up — check back in a bit.', source: '' }
];

async function fetchHeadlines() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn('PERPLEXITY_API_KEY not set — news ticker will show fallback text.');
    return FALLBACK_HEADLINES;
  }

  const prompt = `Give me the 6 biggest, most important news stories from the last 24 hours, sourced only from reputable, well-established outlets (e.g. AP, Reuters, BBC, NPR, major national newspapers). Respond with ONLY a JSON array, no other text, in this exact format: [{"text": "short headline, under 100 characters", "source": "outlet name"}]. No commentary, no markdown, just the JSON array.`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!raw) throw new Error('No content in Perplexity response');

  // Strip any accidental markdown code fences before parsing.
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Perplexity response was not a non-empty array');
  }

  return parsed
    .filter((item) => item && item.text)
    .map((item) => ({
      text: String(item.text).slice(0, 160),
      source: item.source ? String(item.source).slice(0, 40) : ''
    }));
}

// GET /api/news - cached, fact-checked-outlet headlines for the homepage ticker
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
