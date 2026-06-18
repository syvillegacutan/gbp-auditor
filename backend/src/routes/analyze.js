const express = require('express');
const { getRankForKeyword } = require('../services/keywordRanker');
const { analyzeAudit } = require('../services/claudeAnalyzer');

const router = express.Router();

router.post('/', async (req, res) => {
  const { client, competitors, keywords } = req.body;
  if (!client || !competitors || !keywords || !Array.isArray(keywords)) {
    return res.status(400).json({ error: 'client, competitors, and keywords are required' });
  }

  if (client.location?.lat == null || client.location?.lng == null) {
    return res.status(400).json({ error: 'client.location.lat and client.location.lng are required' });
  }

  try {
    // Keyword ranking uses Puppeteer which may fail on hosted environments.
    // Failures are non-fatal — keyword gets rank: null and analysis continues.
    const keywordRankings = [];
    for (const keyword of keywords) {
      try {
        const result = await getRankForKeyword({
          keyword,
          lat: client.location.lat,
          lng: client.location.lng,
          businessName: client.name,
        });
        keywordRankings.push(result);
      } catch (rankErr) {
        console.warn(`Keyword ranking failed for "${keyword}":`, rankErr.message);
        keywordRankings.push({ keyword, rank: null, totalChecked: 0 });
      }
    }

    const auditResult = await analyzeAudit({ client, competitors, keywordRankings });
    res.json(auditResult);
  } catch (err) {
    console.error('analyze error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
