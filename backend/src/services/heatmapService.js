const KM_PER_DEG_LAT = 111;
const GRID_SIZE = 7;
const SPACING_KM = 1;
const BATCH_SIZE = 10;

function generateGridPoints(lat, lng) {
  const half = Math.floor(GRID_SIZE / 2);
  const latDelta = SPACING_KM / KM_PER_DEG_LAT;
  const lngDelta = SPACING_KM / (KM_PER_DEG_LAT * Math.cos(lat * Math.PI / 180));
  const points = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      points.push({
        row,
        col,
        lat: lat + (half - row) * latDelta,
        lng: lng + (col - half) * lngDelta,
      });
    }
  }
  return points;
}

async function getRankAtPoint({ businessName, lat, lng, keyword, apiKey }) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', '5000');
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('key', apiKey);
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return null;
    const results = data.results || [];
    const idx = results.findIndex(r => {
      const a = r.name.toLowerCase();
      const b = businessName.toLowerCase();
      return a.includes(b) || b.includes(a);
    });
    return idx === -1 ? null : idx + 1;
  } catch {
    return null;
  }
}

async function generateHeatmap({ businessName, lat, lng, keywords }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not set');

  const points = generateGridPoints(lat, lng);
  const topKeywords = keywords.slice(0, 3);
  const result = {};

  for (const keyword of topKeywords) {
    const grid = new Array(GRID_SIZE).fill(null).map(() => new Array(GRID_SIZE).fill(null));

    // Process points in batches to stay within rate limits
    for (let i = 0; i < points.length; i += BATCH_SIZE) {
      const batch = points.slice(i, i + BATCH_SIZE);
      const ranks = await Promise.all(
        batch.map(p => getRankAtPoint({ businessName, lat: p.lat, lng: p.lng, keyword, apiKey }))
      );
      ranks.forEach((rank, j) => {
        const { row, col } = batch[j];
        grid[row][col] = rank;
      });
      if (i + BATCH_SIZE < points.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    result[keyword] = grid;
  }

  return { keywords: topKeywords, grids: result, gridSize: GRID_SIZE };
}

module.exports = { generateHeatmap };
