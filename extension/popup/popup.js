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

function goNext() {
  if (state.step === 1 && !validateStep1()) return;
  if (state.step === 2) onEnterStep3();
  if (state.step < 4) showStep(state.step + 1);
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
    // Pre-fetch competitors in background
    if (profile.category && profile.location?.lat) {
      prefetchCompetitors(profile);
    }
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
    prefetchedCompetitors = [];
  }
}

function renderCompetitorList() {
  const list = document.getElementById('competitor-list');
  list.innerHTML = '';
  state.competitors.forEach((comp, i) => {
    const div = document.createElement('div');
    div.className = 'competitor-item';
    div.innerHTML = `
      <input type="checkbox" ${comp.selected ? 'checked' : ''} onchange="toggleCompetitor(${i})">
      <div>
        <div class="competitor-name">${comp.name}</div>
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

async function onEnterStep2() {
  setLoading(2, true);
  document.getElementById('competitor-list').innerHTML = '';
  if (prefetchedCompetitors) {
    state.competitors = prefetchedCompetitors;
    setLoading(2, false);
    renderCompetitorList();
    return;
  }
  // Wasn't prefetched yet — fetch now
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
  } catch (err) {
    setLoading(2, false);
    showError(2, `Could not fetch competitors: ${err.message}`);
    state.competitors = [];
  }
}

// Wire step 2 entry
const _origGoNext = goNext;
// (step navigation handled in goNext above — onEnterStep3 is called there)

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  showStep(1);
  initStep1();
  // Step 2 loads when Next is clicked from step 1
  document.getElementById('btn-next').addEventListener('click', async () => {
    if (state.step === 1 && validateStep1()) {
      await onEnterStep2();
      showStep(2);
    }
  }, { capture: true }); // capture before goNext
});
