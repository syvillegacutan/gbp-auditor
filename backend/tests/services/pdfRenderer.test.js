const clientProfile = require('../fixtures/clientProfile.json');
const auditResult = require('../fixtures/auditResult.json');
const competitors = require('../fixtures/competitors.json');

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-test')),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}));

const { renderPdf } = require('../../src/services/pdfRenderer');

describe('renderPdf', () => {
  it('returns a Buffer', async () => {
    const result = await renderPdf({ auditResult, clientProfile, competitors, baseline: null });
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('PDF buffer starts with %PDF', async () => {
    const result = await renderPdf({ auditResult, clientProfile, competitors, baseline: null });
    expect(result.toString('utf8', 0, 4)).toBe('%PDF');
  });
});
