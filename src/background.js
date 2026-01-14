const DEFAULT_TIMEOUT_MINUTES = 30;

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isWhitelisted(hostname, whitelist) {
  for (const entry of whitelist) {
    const domain = entry.toLowerCase();
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      return true;
    }
  }
  return false;
}

function ensureAlarm() {
  chrome.alarms.create('checkInactiveTabs', { periodInMinutes: 1 });
}

chrome.runtime.onStartup.addListener(ensureAlarm);
chrome.runtime.onInstalled.addListener(ensureAlarm);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'checkInactiveTabs') return;

  try {
    const { timeoutMinutes = DEFAULT_TIMEOUT_MINUTES, enabled = true, whitelist = [] } =
      await chrome.storage.local.get(['timeoutMinutes', 'enabled', 'whitelist']);

    if (!enabled) return;

    const now = Date.now();
    const threshold = timeoutMinutes * 60 * 1000;
    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
      if (tab.pinned || tab.active || tab.audible) continue;

      const hostname = getHostname(tab.url || '');
      if (hostname && isWhitelisted(hostname, whitelist)) continue;

      if (!tab.lastAccessed) continue;

      if (now - tab.lastAccessed > threshold) {
        const windowTabs = await chrome.tabs.query({ windowId: tab.windowId });
        const closableTabs = windowTabs.filter(t => !t.pinned);
        if (closableTabs.length <= 1) continue;

        chrome.tabs.remove(tab.id);
      }
    }
  } catch (e) {
    console.error('[End of Tab] Alarm handler error', e);
  }
});
