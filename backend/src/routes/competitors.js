const express = require('express');
const { scrapeCompetitors } = require('../services/competitorScraper');

const router = express.Router();

router.post('/', async (req, res) => {
  const { category, lat, lng } = req.body;
  if (!category || lat == null || lng == null) {
    return res.status(400).json({ error: 'category, lat, and lng are required' });
  }
  try {
    const competitors = await scrapeCompetitors({ category, lat, lng });
    res.json({ competitors });
  } catch (err) {
    console.error('competitorScraper error:', err.message);
    res.status(500).json({ error: 'Failed to scrape competitors' });
  }
});

module.exports = router;
