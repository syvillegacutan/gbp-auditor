const express = require('express');
const { renderReport } = require('../services/pdfRenderer');

const router = express.Router();

router.post('/', async (req, res) => {
  const { auditResult, clientProfile, competitors, baseline } = req.body;
  if (!auditResult || !clientProfile || !competitors) {
    return res.status(400).json({ error: 'auditResult, clientProfile, and competitors are required' });
  }

  try {
    const html = await renderReport({ auditResult, clientProfile, competitors, baseline: baseline || null });
    const filename = `gbp-audit-${clientProfile.name.replace(/\s+/g, '-')}.html`;
    res.json({ html: Buffer.from(html).toString('base64'), filename });
  } catch (err) {
    console.error('report render error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
