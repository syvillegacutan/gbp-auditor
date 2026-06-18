const request = require('supertest');
const clientProfile = require('../fixtures/clientProfile.json');
const competitors = require('../fixtures/competitors.json');

jest.mock('../../src/services/keywordRanker', () => ({
  getRankForKeyword: jest.fn().mockResolvedValue({ keyword: 'roofing Houston', rank: 5, totalChecked: 20 }),
}));

jest.mock('../../src/services/claudeAnalyzer', () => {
  const mockAuditResult = require('../fixtures/auditResult.json');
  return {
    analyzeAudit: jest.fn().mockResolvedValue(mockAuditResult),
  };
});

const app = require('../../src/index');

describe('POST /analyze', () => {
  it('returns audit result', async () => {
    const res = await request(app)
      .post('/analyze')
      .send({ client: clientProfile, competitors, keywords: ['roofing Houston'] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('scores');
    expect(res.body).toHaveProperty('tasks');
  });

  it('returns 400 when client is missing', async () => {
    const res = await request(app).post('/analyze').send({ competitors, keywords: [] });
    expect(res.status).toBe(400);
  });
});
