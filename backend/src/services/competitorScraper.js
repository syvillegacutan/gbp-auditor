async function scrapeCompetitors({ category, lat, lng }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not set');

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', '2000');
  url.searchParams.set('keyword', category);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Places API HTTP ${res.status}`);

  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status} — ${data.error_message || ''}`);
  }

  return (data.results || []).slice(0, 5).map(place => ({
    name: place.name,
    rating: place.rating || null,
    reviewCount: place.user_ratings_total || 0,
    address: place.vicinity || null,
    website: false,
    hoursSet: !!place.opening_hours,
  }));
}

module.exports = { scrapeCompetitors };
