const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes wired in later tasks
// app.use('/scrape/competitors', require('./routes/competitors'));
// app.use('/suggest-keywords', require('./routes/keywords'));
// app.use('/analyze', require('./routes/analyze'));
// app.use('/pdf', require('./routes/pdf'));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

module.exports = app;
