const puppeteer = require('puppeteer');

async function scrapeCompetitors({ category, lat, lng }) {
  const query = encodeURIComponent(category);
  const url = `https://www.google.com/maps/search/${query}/@${lat},${lng},14z`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('[role="feed"] .Nv2PK', { timeout: 15000 });

    const competitors = await page.evaluate(() => {
      // Selectors target Google Maps as of mid-2026 — update if Maps changes DOM
      const cards = [...document.querySelectorAll('[role="feed"] .Nv2PK')].slice(0, 5);
      return cards.map(card => ({
        name: card.querySelector('.qBF1Pd')?.textContent?.trim() || null,
        rating: parseFloat(card.querySelector('.MW4etd')?.textContent) || null,
        reviewCount: parseInt(
          (card.querySelector('.UY7F9')?.textContent || '0').replace(/[^\d]/g, '')
        ) || 0,
        category: card.querySelector('.W4Efsd span')?.textContent?.trim() || null,
        address: card.querySelector('.W4Efsd:last-child span')?.textContent?.trim() || null,
        website: !!card.querySelector('[aria-label*="website"]'),
        hoursSet: !!card.querySelector('[aria-label*="hour"]'),
      }));
    });

    return competitors.filter(c => c.name);
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeCompetitors };
