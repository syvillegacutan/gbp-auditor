const puppeteer = require('puppeteer');

async function getRankForKeyword({ keyword, lat, lng, businessName }) {
  const query = encodeURIComponent(keyword);
  const url = `https://www.google.com/maps/search/${query}/@${lat},${lng},14z`;

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('[role="feed"] .Nv2PK', { timeout: 15000 });

    const names = await page.evaluate(() => {
      // Selectors target Google Maps as of mid-2026
      const cards = [...document.querySelectorAll('[role="feed"] .Nv2PK')];
      return cards.map(card => card.querySelector('.qBF1Pd')?.textContent?.trim() || '');
    });

    const target = businessName.toLowerCase().trim();
    const rank = names.findIndex(name => {
      const n = name.toLowerCase().trim();
      return n.includes(target) || target.includes(n);
    });

    return {
      keyword,
      rank: rank >= 0 ? rank + 1 : null,
      totalChecked: names.length,
    };
  } finally {
    await browser.close();
  }
}

module.exports = { getRankForKeyword };
