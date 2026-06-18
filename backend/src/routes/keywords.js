const express = require('express');
const { suggestKeywords } = require('../services/keywordSuggester');

const router = express.Router();

router.post('/', async (req, res) => {
  const { businessName, category, location } = req.body;
  if (!businessName || !category || !location) {
    return res.status(400).json({ error: 'businessName, category, and location are required' });
  }
  try {
    const keywords = await suggestKeywords({ businessName, category, location });
    res.json({ keywords });
  } catch (err) {
    console.error('keywordSuggester error:', err.message);
    res.status(500).json({ error: 'Failed to suggest keywords' });
  }
});

module.exports = router;
