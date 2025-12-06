const DEFAULT_TIMEOUT_MINUTES = 30;
const tabActivity = new Map();

// Track when tabs become active
chrome.tabs.onActivated.addListener(({ tabId }) => {
  tabActivity.set(tabId, Date.now());
});

// Clean up when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  tabActivity.delete(tabId);
});

// Initialize existing tabs on install/startup
chrome.runtime.onStartup.addListener(initializeTabs);
chrome.runtime.onInstalled.addListener(initializeTabs);

async function initializeTabs() {
  // Restore tab activity from storage
  const stored = await chrome.storage.local.get('tabActivity');
  if (stored.tabActivity) {
    Object.entries(stored.tabActivity).forEach(([id, time]) => {
      tabActivity.set(parseInt(id), time);
    });
  }

  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  tabs.forEach(tab => {
    if (!tabActivity.has(tab.id)) {
      tabActivity.set(tab.id, tab.active ? now : now - 60000);
    }
  });

  // Set up periodic check
  chrome.alarms.create('checkInactiveTabs', { periodInMinutes: 1 });
}

// Check for inactive tabs
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'checkInactiveTabs') return;
  
  const { timeoutMinutes = DEFAULT_TIMEOUT_MINUTES, enabled = true } = 
    await chrome.storage.local.get(['timeoutMinutes', 'enabled']);
  
  if (!enabled) return;
  
  const now = Date.now();
  const threshold = timeoutMinutes * 60 * 1000;
  
  const tabs = await chrome.tabs.query({});
  
  for (const tab of tabs) {
    // Skip pinned tabs, active tabs, and audible tabs
    if (tab.pinned || tab.active || tab.audible) {
      tabActivity.set(tab.id, now);
      continue;
    }

    const lastActive = tabActivity.get(tab.id) || now;
    if (now - lastActive > threshold) {
      chrome.tabs.remove(tab.id);
    }
  }

  // Persist tab activity to storage
  const activityObj = Object.fromEntries(tabActivity);
  chrome.storage.local.set({ tabActivity: activityObj });
});
