const clientProfile = require('../fixtures/clientProfile.json');
const competitors = require('../fixtures/competitors.json');

jest.mock('@anthropic-ai/sdk', () => {
  const mockAuditResult = require('../fixtures/auditResult.json');
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockAuditResult) }],
      }),
    },
  }));
});

const { analyzeAudit } = require('../../src/services/claudeAnalyzer');

describe('analyzeAudit', () => {
  it('returns audit result with required keys', async () => {
    const result = await analyzeAudit({
      client: clientProfile,
      competitors,
      keywordRankings: [{ keyword: 'roofing company Houston', rank: 14, totalChecked: 20 }],
    });
    expect(result).toHaveProperty('scores');
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('gaps');
    expect(result).toHaveProperty('tasks');
    expect(result.tasks).toHaveProperty('week1');
    expect(result.tasks.week1.length).toBeGreaterThan(0);
  });

  it('each task has task, why, and closesGap fields', async () => {
    const result = await analyzeAudit({
      client: clientProfile,
      competitors,
      keywordRankings: [],
    });
    const allTasks = [
      ...result.tasks.week1,
      ...result.tasks.week2,
      ...result.tasks.week3,
      ...result.tasks.week4,
    ];
    allTasks.forEach(t => {
      expect(t).toHaveProperty('task');
      expect(t).toHaveProperty('why');
      expect(t).toHaveProperty('closesGap');
    });
  });
});
