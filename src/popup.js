const enabledEl = document.getElementById('enabled');
const timeoutEl = document.getElementById('timeout');

// Load saved settings
chrome.storage.local.get(['enabled', 'timeoutMinutes'], (data) => {
  enabledEl.checked = data.enabled !== false;
  timeoutEl.value = data.timeoutMinutes || 30;
});

// Save on change
enabledEl.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: enabledEl.checked });
});

timeoutEl.addEventListener('change', () => {
  chrome.storage.local.set({ timeoutMinutes: parseInt(timeoutEl.value) || 30 });
});
