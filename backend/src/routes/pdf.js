const express = require('express');
const { renderPdf } = require('../services/pdfRenderer');

const router = express.Router();

router.post('/', async (req, res) => {
  const { auditResult, clientProfile, competitors, baseline } = req.body;
  if (!auditResult || !clientProfile || !competitors) {
    return res.status(400).json({ error: 'auditResult, clientProfile, and competitors are required' });
  }

  try {
    const pdf = await renderPdf({ auditResult, clientProfile, competitors, baseline: baseline || null });
    const filename = `gbp-audit-${clientProfile.name.replace(/\s+/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    console.error('pdf render error:', err.message);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

module.exports = router;
