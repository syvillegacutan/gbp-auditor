const path = require('path');
const fs = require('fs');

const TEMPLATE_PATH = path.join(__dirname, '../templates/report.html');
const CSS_PATH = path.join(__dirname, '../templates/report.css');

function gradeFromScore(score) {
  if (score >= 90) return { grade: 'A', color: '#2e7d32' };
  if (score >= 80) return { grade: 'B', color: '#558b2f' };
  if (score >= 70) return { grade: 'C', color: '#f57f17' };
  if (score >= 60) return { grade: 'D', color: '#e65100' };
  return { grade: 'F', color: '#c62828' };
}

function rankClass(rank) {
  if (!rank) return 'rank-none';
  if (rank <= 3) return 'rank-good';
  if (rank <= 10) return 'rank-ok';
  return 'rank-bad';
}

function buildCriticalIssues(issues) {
  return issues
    .filter(i => i.severity === 'critical')
    .slice(0, 3)
    .map(i => `
      <div class="issue-row">
        <span class="badge badge-critical">Critical</span>
        <div><strong>${i.field}</strong>: ${i.detail}</div>
      </div>`)
    .join('');
}

function buildCompletenessItems(clientProfile, competitors) {
  const fields = [
    { key: 'name', label: 'Business Name' },
    { key: 'category', label: 'Category' },
    { key: 'address', label: 'Address' },
    { key: 'phone', label: 'Phone' },
    { key: 'website', label: 'Website' },
    { key: 'description', label: 'Description' },
    { key: 'hoursSet', label: 'Business Hours' },
    { key: 'photoCount', label: 'Photos' },
    { key: 'postsLast30d', label: 'Posts (last 30 days)' },
  ];

  const topCompetitor = competitors[0];

  return fields.map(field => {
    const val = clientProfile[field.key];
    const compVal = topCompetitor?.[field.key];
    const done = val && val !== 0;
    const icon = done ? '✓' : '✗';
    const cls = done ? 'status-done' : 'status-missing';
    const benchmark = compVal != null
      ? `<span class="benchmark">Top competitor: ${compVal}</span>`
      : '';
    return `<div class="checklist-item">
      <span class="${cls}">${icon}</span>
      <span>${field.label}: <strong>${val ?? 'Not set'}</strong></span>
      ${benchmark}
    </div>`;
  }).join('');
}

function buildCompetitorHeaders(competitors) {
  return competitors.map(c => `<th>${c.name}</th>`).join('');
}

function buildReviewRows(clientProfile, competitors) {
  const metrics = [
    { label: 'Rating', key: 'rating' },
    { label: 'Review Count', key: 'reviewCount' },
    { label: 'Response Rate', key: 'responseRate', fmt: v => v != null ? `${Math.round(v * 100)}%` : 'N/A' },
    { label: 'Reviews (last 30d)', key: 'recentReviews30d' },
  ];

  return metrics.map(m => {
    const fmt = m.fmt || (v => v ?? 'N/A');
    const clientVal = fmt(clientProfile[m.key]);
    const compCells = competitors.map(c => `<td>${fmt(c[m.key])}</td>`).join('');
    return `<tr><td><strong>${m.label}</strong></td><td>${clientVal}</td>${compCells}</tr>`;
  }).join('');
}

function buildGapTableRows(gaps, competitors) {
  return gaps.map(g => {
    const cls = g.impact === 'high' ? 'gap-high' : g.impact === 'medium' ? 'gap-medium' : '';
    return `<tr class="${cls}">
      <td>${g.metric}</td>
      <td>${g.clientValue}</td>
      <td colspan="${competitors.length}">${g.competitorValue} (${g.competitor})</td>
    </tr>`;
  }).join('');
}

function buildWeeklyTasks(tasks) {
  return ['week1', 'week2', 'week3', 'week4'].map((week, i) => {
    const items = (tasks[week] || []).map(t => `
      <div class="task-item">
        <div class="task-title">${t.task}</div>
        <div class="task-why">Why: ${t.why}</div>
        <div class="task-gap">Closes gap: ${t.closesGap}</div>
      </div>`).join('');
    return `<div class="task-week"><h3>Week ${i + 1}</h3>${items}</div>`;
  }).join('');
}

function buildKeywordRows(keywordSummary, baseline) {
  return keywordSummary.map(k => {
    const cls = rankClass(k.clientRank);
    const rankText = k.clientRank ? `#${k.clientRank}` : 'Not in top 20';
    const compCells = (k.competitorRanks || []).map(c => {
      const r = c.rank ? `#${c.rank}` : '—';
      return `<td class="${rankClass(c.rank)}">${r}</td>`;
    }).join('');

    let baselineCell = '';
    if (baseline) {
      const prev = (baseline.keywordSummary || []).find(b => b.keyword === k.keyword);
      if (prev) {
        const delta = (prev.clientRank || 21) - (k.clientRank || 21);
        const arrow = delta > 0 ? `↑${delta}` : delta < 0 ? `↓${Math.abs(delta)}` : '→';
        const cls2 = delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : '';
        baselineCell = `<td class="${cls2}">${arrow}</td>`;
      } else {
        baselineCell = '<td>New</td>';
      }
    }

    return `<tr>
      <td>${k.keyword}</td>
      <td class="${cls} rank-position">${rankText}</td>
      ${compCells}
      ${baselineCell}
    </tr>`;
  }).join('');
}

function buildReviewGaps(gaps) {
  return gaps
    .filter(g => ['reviewCount', 'responseRate', 'rating'].includes(g.metric))
    .map(g => `<div class="issue-row">
      <span class="badge badge-${g.impact === 'high' ? 'critical' : 'moderate'}">${g.impact}</span>
      <div>${g.competitor} has ${g.competitorValue} vs your ${g.clientValue} on ${g.metric}</div>
    </div>`).join('');
}

async function renderReport({ auditResult, clientProfile, competitors, baseline }) {
  const { grade, color: gradeColor } = gradeFromScore(auditResult.scores.overall);
  const cssContent = fs.readFileSync(CSS_PATH, 'utf8');
  let html = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const competitorList = competitors; // use directly instead of deriving from gaps

  const baselineDelta = baseline
    ? (auditResult.scores.overall - baseline.scores.overall > 0
        ? `+${auditResult.scores.overall - baseline.scores.overall}`
        : `${auditResult.scores.overall - baseline.scores.overall}`)
    : null;

  // Replace scalar vars
  const scalars = {
    clientName: clientProfile.name,
    reportDate,
    grade,
    gradeColor,
    scoreOverall: auditResult.scores.overall,
    scoreCompleteness: auditResult.scores.completeness,
    scoreReviews: auditResult.scores.reviews,
    scorePosts: auditResult.scores.posts,
    scoreCompetitorGap: auditResult.scores.competitorGap,
    baselineDelta: baselineDelta || '',
    baselineOverall: baseline?.scores?.overall ?? '',
    baselineDate: baseline?.reportDate ?? '',
    CSS_PATH: `data:text/css;base64,${Buffer.from(cssContent).toString('base64')}`,
  };

  Object.entries(scalars).forEach(([k, v]) => {
    html = html.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v ?? ''));
  });

  // Handle {{#if hasBaseline}} blocks
  if (baseline) {
    html = html.replace(/\{\{#if hasBaseline\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  } else {
    html = html.replace(/\{\{#if hasBaseline\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Replace dynamic sections
  html = html.replace('<!--CRITICAL_ISSUES-->', buildCriticalIssues(auditResult.issues));
  html = html.replace(/<!--COMPLETENESS_ITEMS-->/g, buildCompletenessItems(clientProfile, competitorList));
  html = html.replace(/<!--COMPETITOR_HEADERS-->/g, buildCompetitorHeaders(competitorList));
  html = html.replace('<!--REVIEW_ROWS-->', buildReviewRows(clientProfile, competitorList));
  html = html.replace('<!--REVIEW_GAPS-->', buildReviewGaps(auditResult.gaps));
  html = html.replace('<!--GAP_TABLE_ROWS-->', buildGapTableRows(auditResult.gaps, competitorList));
  html = html.replace('<!--WEEKLY_TASKS-->', buildWeeklyTasks(auditResult.tasks));
  html = html.replace('<!--KEYWORD_ROWS-->', buildKeywordRows(auditResult.keywordSummary || [], baseline));

  return html;
}

module.exports = { renderReport };
