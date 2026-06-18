const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

async function suggestKeywords({ businessName, category, location }) {
  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are a local SEO expert. Suggest 8-10 Google Maps search keywords for this business.

Business: ${businessName}
Category: ${category}
Location: ${location}

Return ONLY a JSON array of strings — no markdown, no explanation.
Example: ["roofing company Houston TX", "roof repair near me Houston"]

Rules:
- Include city/region in every keyword
- Mix high-intent (service + city) with category-level searches
- Think like a customer who needs this service urgently`,
    }],
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Claude did not return a valid JSON array');
  return JSON.parse(match[0]);
}

module.exports = { suggestKeywords };
