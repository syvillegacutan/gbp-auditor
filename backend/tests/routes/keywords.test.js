const request = require('supertest');

jest.mock('../../src/services/keywordSuggester', () => ({
  suggestKeywords: jest.fn().mockResolvedValue([
    'roofing company Houston',
    'roof repair Houston TX',
    'emergency roof repair Houston',
  ]),
}));

const app = require('../../src/index');

describe('POST /suggest-keywords', () => {
  it('returns keyword array', async () => {
    const res = await request(app)
      .post('/suggest-keywords')
      .send({ businessName: 'Houston Roofing Pro', category: 'Roofing contractor', location: 'Houston, TX' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.keywords)).toBe(true);
    expect(res.body.keywords.length).toBeGreaterThan(0);
  });

  it('returns 400 when businessName is missing', async () => {
    const res = await request(app).post('/suggest-keywords').send({ category: 'Roofing' });
    expect(res.status).toBe(400);
  });
});
