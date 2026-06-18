const request = require('supertest');

jest.mock('../../src/services/competitorScraper', () => ({
  scrapeCompetitors: jest.fn().mockResolvedValue([
    { name: 'Acme Roofing', rating: 4.8, reviewCount: 120, category: 'Roofing contractor',
      address: '123 Main St', website: true, hoursSet: true },
  ]),
}));

const app = require('../../src/index');

describe('POST /scrape/competitors', () => {
  it('returns competitors array', async () => {
    const res = await request(app)
      .post('/scrape/competitors')
      .send({ category: 'Roofing contractor', lat: 29.7604, lng: -95.3698 });
    expect(res.status).toBe(200);
    expect(res.body.competitors).toHaveLength(1);
    expect(res.body.competitors[0].name).toBe('Acme Roofing');
  });

  it('returns 400 when category is missing', async () => {
    const res = await request(app).post('/scrape/competitors').send({ lat: 29.7, lng: -95.3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
