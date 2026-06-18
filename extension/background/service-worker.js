const BACKEND_URL = 'https://gbp-auditor-production.up.railway.app';

async function apiPost(path, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res;
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(result => sendResponse({ success: true, data: result }))
    .catch(err => sendResponse({ success: false, error: err.message }));
  return true; // async response
});

async function handleMessage(message) {
  const { action, payload } = message;

  switch (action) {
    case 'getProfile': {
      const tabId = await getActiveTabId();
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { action: 'getProfile' }, response => {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
          if (!response?.success) return reject(new Error(response?.error || 'Scrape failed'));
          resolve(response.data);
        });
      });
    }

    case 'scrapeCompetitors': {
      const res = await apiPost('/scrape/competitors', payload);
      const { competitors } = await res.json();
      return competitors;
    }

    case 'suggestKeywords': {
      const res = await apiPost('/suggest-keywords', payload);
      const { keywords } = await res.json();
      return keywords;
    }

    case 'analyze': {
      const res = await apiPost('/analyze', payload);
      return res.json();
    }

    case 'generatePdf': {
      const res = await apiPost('/pdf', payload);
      const { html, filename } = await res.json();
      return { base64: html, filename };
    }

    case 'getBaseline': {
      const { key } = payload;
      return new Promise(resolve => {
        chrome.storage.local.get(key, result => resolve(result[key] || null));
      });
    }

    case 'saveBaseline': {
      const { key, data } = payload;
      return new Promise(resolve => {
        chrome.storage.local.set({ [key]: data }, resolve);
      });
    }

    case 'clearBaseline': {
      const { key } = payload;
      return new Promise(resolve => {
        chrome.storage.local.remove(key, resolve);
      });
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
