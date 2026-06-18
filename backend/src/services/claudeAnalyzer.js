const Anthropic = require('@anthropic-ai/sdk');

async function analyzeAudit({ client, competitors, keywordRankings }) {
  const anthropic = new Anthropic();
  const prompt = `You are a local SEO expert. Analyze this Google Business Profile audit and return a structured JSON report.

CLIENT PROFILE:
${JSON.stringify(client, null, 2)}

COMPETITORS:
${JSON.stringify(competitors, null, 2)}

KEYWORD RANKINGS (client position in Google Maps for each keyword):
${JSON.stringify(keywordRankings, null, 2)}

Return ONLY a JSON object — no markdown fences, no explanation — with this exact shape:
{
  "scores": {
    "overall": <0-100>,
    "completeness": <0-100>,
    "reviews": <0-100>,
    "posts": <0-100>,
    "competitorGap": <0-100>
  },
  "issues": [
    { "field": "<field>", "severity": "critical|moderate|minor", "detail": "<specific detail>" }
  ],
  "gaps": [
    { "competitor": "<name>", "metric": "<metric>", "clientValue": <value>, "competitorValue": <value>, "delta": <number>, "impact": "high|medium|low" }
  ],
  "tasks": {
    "week1": [{ "task": "<specific action>", "why": "<which metric improves>", "closesGap": "<Competitor - metric>" }],
    "week2": [...],
    "week3": [...],
    "week4": [...]
  },
  "keywordSummary": [
    { "keyword": "<keyword>", "clientRank": <number|null>, "competitorRanks": [{ "name": "<name>", "rank": <number|null> }] }
  ]
}

Rules:
- Every task must name a specific competitor and metric in closesGap
- Week 1: highest-impact, fastest wins first (fill missing fields, respond to reviews)
- Tasks must be specific and measurable: "Upload 10 photos" not "Add more photos"
- competitorGap score: 0 = far behind best competitor, 100 = matches or beats all competitors`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find(b => b.type === 'text')?.text || '';
  const stripped = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Claude did not return valid JSON');
  const json = match[0];
  try {
    return JSON.parse(json);
  } catch {
    throw new Error('Claude returned unparseable JSON: ' + json?.slice(0, 100));
  }
}

module.exports = { analyzeAudit };
