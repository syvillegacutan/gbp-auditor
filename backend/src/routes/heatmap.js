const express = require('express');
const { generateHeatmap } = require('../services/heatmapService');

const router = express.Router();

router.post('/', async (req, res) => {
  const { businessName, lat, lng, keywords } = req.body;
  if (!businessName || lat == null || lng == null || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'businessName, lat, lng, and keywords are required' });
  }
  try {
    const heatmap = await generateHeatmap({ businessName, lat, lng, keywords });
    res.json(heatmap);
  } catch (err) {
    console.error('heatmap error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
