const request = require('supertest');
const clientProfile = require('../fixtures/clientProfile.json');
const auditResult = require('../fixtures/auditResult.json');

jest.mock('../../src/services/pdfRenderer', () => ({
  renderPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 test')),
}));

const app = require('../../src/index');

describe('POST /pdf', () => {
  it('returns a PDF binary response', async () => {
    const res = await request(app)
      .post('/pdf')
      .send({ auditResult, clientProfile, competitors: require('../fixtures/competitors.json'), baseline: null });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });

  it('returns 400 when auditResult is missing', async () => {
    const res = await request(app).post('/pdf').send({ clientProfile });
    expect(res.status).toBe(400);
  });
});
