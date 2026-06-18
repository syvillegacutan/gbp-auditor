const state = {
  step: 1,
  clientProfile: null,
  competitors: [],      // { name, rating, reviewCount, selected: bool, manual: bool }
  keywords: [],
  auditResult: null,
  pdfData: null,        // { base64, filename }
  baseline: null,
};

// ─── Messaging ───────────────────────────────────────────────────────────────

function sendToBackground(action, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, payload }, response => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response?.success) return reject(new Error(response?.error || 'Unknown error'));
      resolve(response.data);
    });
  });
}

// ─── Navigation ──────────────────────────────────────────────────────────────

function updateStepIndicators() {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot-${i}`);
    const label = document.getElementById(`label-${i}`);
    dot.className = 'step-dot' + (i < state.step ? ' done' : i === state.step ? ' active' : '');
    label.className = 'step-label' + (i === state.step ? ' active' : '');
  }
}

function showStep(n) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('visible'));
  document.getElementById(`step-${n}`).classList.add('visible');
  document.getElementById('btn-back').style.display = n > 1 ? 'inline-block' : 'none';
  document.getElementById('btn-next').style.display = n < 4 ? 'inline-block' : 'none';
  document.getElementById('btn-generate').style.display = n === 4 ? 'inline-block' : 'none';
  state.step = n;
  updateStepIndicators();
}

function goBack() {
  if (state.step > 1) showStep(state.step - 1);
}

function showError(stepN, message) {
  const el = document.getElementById(`step${stepN}-error`);
  el.textContent = message;
  el.style.display = 'block';
}

function hideError(stepN) {
  const el = document.getElementById(`step${stepN}-error`);
  if (el) el.style.display = 'none';
}

function setLoading(stepN, show, text) {
  const el = document.getElementById(`step${stepN}-loading`);
  if (el) el.style.display = show ? 'flex' : 'none';
  if (text) {
    const statusEl = document.getElementById(`step${stepN}-status`);
    if (statusEl) statusEl.textContent = text;
  }
}

// ─── Step 1: Profile ──────────────────────────────────────────────────────────

function validateStep1() {
  const name = document.getElementById('field-name').value.trim();
  const category = document.getElementById('field-category').value.trim();
  if (!name || !category) {
    showError(1, 'Business name and category are required.');
    return false;
  }
  // Persist edits back to state
  state.clientProfile = {
    ...state.clientProfile,
    name,
    category,
    address: document.getElementById('field-address').value.trim(),
    rating: parseFloat(document.getElementById('field-rating').value) || null,
    reviewCount: parseInt(document.getElementById('field-reviewCount').value) || 0,
    photoCount: parseInt(document.getElementById('field-photoCount').value) || 0,
    website: document.getElementById('field-website').value.trim() || null,
    description: document.getElementById('field-description').value.trim() || null,
  };
  hideError(1);
  // Load baseline for this business
  sendToBackground('getBaseline', { key: state.clientProfile.baselineKey })
    .then(baseline => { state.baseline = baseline; })
    .catch(() => {});
  return true;
}

function populateStep1Form(profile) {
  document.getElementById('field-name').value = profile.name || '';
  document.getElementById('field-category').value = profile.category || '';
  document.getElementById('field-address').value = profile.address || '';
  document.getElementById('field-rating').value = profile.rating || '';
  document.getElementById('field-reviewCount').value = profile.reviewCount || '';
  document.getElementById('field-photoCount').value = profile.photoCount || '';
  document.getElementById('field-website').value = profile.website || '';
  document.getElementById('field-description').value = profile.description || '';
}

async function initStep1() {
  setLoading(1, true);
  document.getElementById('step1-form').style.display = 'none';
  try {
    const profile = await sendToBackground('getProfile');
    state.clientProfile = profile;
    populateStep1Form(profile);
    document.getElementById('step1-form').style.display = 'block';
    setLoading(1, false);
  } catch (err) {
    setLoading(1, false);
    showError(1, `Could not read page: ${err.message}. Make sure you are on a Google Maps business listing.`);
  }
}

// ─── Step 2: Competitors ──────────────────────────────────────────────────────

let prefetchedCompetitors = null;

async function prefetchCompetitors(profile) {
  try {
    const competitors = await sendToBackground('scrapeCompetitors', {
      category: profile.category,
      lat: profile.location.lat,
      lng: profile.location.lng,
    });
    prefetchedCompetitors = competitors.map(c => ({ ...c, selected: true, manual: false }));
  } catch (_) {
    prefetchedCompetitors = null; // null = failed; [] = succeeded but empty
  }
}

function renderCompetitorList() {
  const list = document.getElementById('competitor-list');
  list.innerHTML = '';
  state.competitors.forEach((comp, i) => {
    const div = document.createElement('div');
    div.className = 'competitor-item';
    const name = comp.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    div.innerHTML = `
      <input type="checkbox" data-index="${i}" ${comp.selected ? 'checked' : ''}>
      <div>
        <div class="competitor-name">${name}</div>
        <div class="competitor-meta">
          ${comp.rating ? `★ ${comp.rating}` : ''}
          ${comp.reviewCount ? `· ${comp.reviewCount} reviews` : ''}
          ${comp.manual ? ' · Added manually' : ''}
        </div>
      </div>`;
    list.appendChild(div);
  });
}

function toggleCompetitor(index) {
  state.competitors[index].selected = !state.competitors[index].selected;
}

function addManualCompetitor() {
  const input = document.getElementById('competitor-input');
  const val = input.value.trim();
  if (!val) return;
  const name = val.startsWith('http') ? val : val;
  state.competitors.push({ name, rating: null, reviewCount: 0, selected: true, manual: true });
  renderCompetitorList();
  input.value = '';
}

async function findCompetitors() {
  setLoading(2, true);
  hideError(2);
  document.getElementById('competitor-list').innerHTML = '';
  document.getElementById('btn-find-competitors').style.display = 'none';
  try {
    const { category, location } = state.clientProfile;
    const competitors = await sendToBackground('scrapeCompetitors', {
      category,
      lat: location.lat,
      lng: location.lng,
    });
    state.competitors = competitors.map(c => ({ ...c, selected: true, manual: false }));
    setLoading(2, false);
    renderCompetitorList();
    if (competitors.length === 0) {
      showError(2, 'No nearby competitors found automatically. Add them manually below.');
    }
  } catch (err) {
    setLoading(2, false);
    document.getElementById('btn-find-competitors').style.display = 'inline-block';
    showError(2, `Auto-detection failed: ${err.message}. Add competitors manually below.`);
    state.competitors = [];
  }
}

async function onEnterStep2() {
  hideError(2);
  if (state.competitors.length === 0) {
    await findCompetitors();
  } else {
    renderCompetitorList();
  }
}

// ─── Step 3: Keywords ─────────────────────────────────────────────────────────

function renderKeywordChips() {
  const container = document.getElementById('keyword-chips');
  container.innerHTML = '';
  state.keywords.forEach((kw, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span>${kw}</span><button data-index="${i}">×</button>`;
    container.appendChild(chip);
  });
}

function addKeyword() {
  const input = document.getElementById('keyword-input');
  const val = input.value.trim();
  if (val && !state.keywords.includes(val)) {
    state.keywords.push(val);
    renderKeywordChips();
  }
  input.value = '';
}

function removeKeyword(index) {
  state.keywords.splice(index, 1);
  renderKeywordChips();
}

async function onEnterStep3() {
  if (state.keywords.length > 0) return; // already loaded
  setLoading(3, true);
  hideError(3);
  try {
    const { name, category, address } = state.clientProfile;
    const location = address || '';
    const keywords = await sendToBackground('suggestKeywords', {
      businessName: name,
      category,
      location,
    });
    state.keywords = keywords;
    renderKeywordChips();
    setLoading(3, false);
  } catch (err) {
    setLoading(3, false);
    showError(3, `Could not suggest keywords: ${err.message}`);
  }
}

// ─── Step 4: Generate ─────────────────────────────────────────────────────────

function renderStep4Summary() {
  const selected = state.competitors.filter(c => c.selected);
  const container = document.getElementById('step4-summary');
  container.innerHTML = `
    <div class="summary-row"><span class="summary-label">Client</span><span>${state.clientProfile.name}</span></div>
    <div class="summary-row"><span class="summary-label">Competitors</span><span>${selected.length} selected</span></div>
    <div class="summary-row"><span class="summary-label">Keywords</span><span>${state.keywords.length} keywords</span></div>
    ${state.baseline ? `<div class="summary-row"><span class="summary-label">Baseline</span><span>Found — delta comparison will be included</span></div>` : ''}
  `;
}

async function generateReport() {
  hideError(4);
  setLoading(4, true, 'Running keyword ranking checks...');
  document.getElementById('btn-generate').disabled = true;
  document.getElementById('download-btn').classList.remove('visible');

  try {
    const selectedCompetitors = state.competitors.filter(c => c.selected);

    setLoading(4, true, 'Analyzing profile against competitors...');
    const auditResult = await sendToBackground('analyze', {
      client: state.clientProfile,
      competitors: selectedCompetitors,
      keywords: state.keywords,
    });
    state.auditResult = auditResult;

    setLoading(4, true, 'Generating PDF report...');
    const pdfData = await sendToBackground('generatePdf', {
      auditResult,
      clientProfile: state.clientProfile,
      competitors: selectedCompetitors,
      baseline: state.baseline,
    });
    state.pdfData = pdfData;

    // Save this result as the new baseline
    await sendToBackground('saveBaseline', {
      key: state.clientProfile.baselineKey,
      data: { ...auditResult, reportDate: new Date().toLocaleDateString() },
    });

    setLoading(4, false);
    document.getElementById('btn-generate').disabled = false;
    document.getElementById('download-btn').classList.add('visible');
    document.getElementById('heatmap-section').style.display = 'block';
  } catch (err) {
    setLoading(4, false);
    document.getElementById('btn-generate').disabled = false;
    showError(4, `Report generation failed: ${err.message}`);
  }
}

function downloadPdf() {
  if (!state.pdfData) return;
  chrome.storage.local.set({ pendingReport: { base64: state.pdfData.base64 } }, () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('report/index.html') });
  });
}

// ─── Step 4: Heatmap ──────────────────────────────────────────────────────────

let heatmapData = null;
let activeHeatmapKeyword = null;

function rankClass(rank) {
  if (!rank) return 'rank-none';
  if (rank <= 3) return 'rank-1';
  if (rank <= 7) return 'rank-4';
  if (rank <= 10) return 'rank-8';
  return 'rank-11';
}

function renderHeatmapGrid(keyword) {
  activeHeatmapKeyword = keyword;
  const grid = heatmapData.grids[keyword];
  const size = heatmapData.gridSize;

  // Update tabs
  document.querySelectorAll('.heatmap-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.keyword === keyword);
  });

  // Render grid
  const container = document.getElementById('heatmap-grid-container');
  const div = document.createElement('div');
  div.className = 'heatmap-grid';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const rank = grid[row][col];
      const cell = document.createElement('div');
      cell.className = `heatmap-cell ${rankClass(rank)}`;
      cell.textContent = rank ? (rank > 20 ? '20+' : rank) : '—';
      cell.title = rank ? `Rank #${rank}` : 'Not in top 20';
      div.appendChild(cell);
    }
  }
  container.innerHTML = '';
  container.appendChild(div);
}

async function generateHeatmap() {
  const heatmapLoading = document.getElementById('heatmap-loading');
  const heatmapError = document.getElementById('heatmap-error');
  const heatmapTabs = document.getElementById('heatmap-tabs');
  const btnHeatmap = document.getElementById('btn-heatmap');

  heatmapLoading.style.display = 'flex';
  heatmapError.style.display = 'none';
  heatmapTabs.style.display = 'none';
  btnHeatmap.disabled = true;

  try {
    const { name, location } = state.clientProfile;
    const data = await sendToBackground('generateHeatmap', {
      businessName: name,
      lat: location.lat,
      lng: location.lng,
      keywords: state.keywords,
    });
    heatmapData = data;

    // Build keyword tabs
    const tabsEl = document.getElementById('heatmap-keyword-tabs');
    tabsEl.innerHTML = '';
    data.keywords.forEach(kw => {
      const btn = document.createElement('button');
      btn.className = 'heatmap-tab';
      btn.textContent = kw;
      btn.dataset.keyword = kw;
      btn.addEventListener('click', () => renderHeatmapGrid(kw));
      tabsEl.appendChild(btn);
    });

    heatmapLoading.style.display = 'none';
    heatmapTabs.style.display = 'block';
    btnHeatmap.disabled = false;
    renderHeatmapGrid(data.keywords[0]);
  } catch (err) {
    heatmapLoading.style.display = 'none';
    heatmapError.style.display = 'block';
    heatmapError.textContent = `Heatmap failed: ${err.message}`;
    btnHeatmap.disabled = false;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  showStep(1);
  initStep1();

  document.getElementById('btn-next').addEventListener('click', async () => {
    if (state.step === 1 && validateStep1()) {
      await onEnterStep2();
      showStep(2);
    } else if (state.step === 2) {
      await onEnterStep3();
      showStep(3);
    } else if (state.step === 3) {
      renderStep4Summary();
      showStep(4);
    }
  });

  document.getElementById('btn-back').addEventListener('click', goBack);
  document.getElementById('btn-generate').addEventListener('click', generateReport);
  document.getElementById('download-btn').addEventListener('click', downloadPdf);

  document.getElementById('btn-find-competitors').addEventListener('click', findCompetitors);
  document.getElementById('btn-heatmap').addEventListener('click', generateHeatmap);
  document.getElementById('btn-add-competitor').addEventListener('click', addManualCompetitor);
  document.getElementById('competitor-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addManualCompetitor();
  });

  document.getElementById('btn-add-keyword').addEventListener('click', addKeyword);
  document.getElementById('keyword-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addKeyword();
  });

  // Event delegation for dynamic competitor checkboxes and keyword remove buttons
  document.getElementById('competitor-list').addEventListener('change', e => {
    if (e.target.type === 'checkbox') {
      const index = parseInt(e.target.dataset.index);
      if (!isNaN(index)) toggleCompetitor(index);
    }
  });

  document.getElementById('keyword-chips').addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') {
      const index = parseInt(e.target.dataset.index);
      if (!isNaN(index)) removeKeyword(index);
    }
  });
});
