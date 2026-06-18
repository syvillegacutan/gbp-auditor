const frame = document.getElementById('report-frame');
const loading = document.getElementById('loading');

document.getElementById('save-btn').addEventListener('click', () => {
  frame.contentWindow.print();
});

chrome.storage.local.get('pendingReport', ({ pendingReport }) => {
  if (!pendingReport) {
    loading.textContent = 'No report found. Generate a report first.';
    return;
  }
  const bytes = Uint8Array.from(atob(pendingReport.base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'text/html;charset=utf-8' });
  frame.src = URL.createObjectURL(blob);
  frame.onload = () => {
    loading.style.display = 'none';
    frame.style.display = 'block';
  };
});
