import {
  canCloseTabInWindow,
  DEFAULT_TIMEOUT_MINUTES,
  shouldCloseTab,
} from "./lib.js";

function ensureAlarm() {
  chrome.alarms.create("checkInactiveTabs", { periodInMinutes: 1 });
}

chrome.runtime.onStartup.addListener(ensureAlarm);
chrome.runtime.onInstalled.addListener(ensureAlarm);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "checkInactiveTabs") return;

  try {
    const {
      timeoutMinutes = DEFAULT_TIMEOUT_MINUTES,
      enabled = true,
      whitelist = [],
    } = await chrome.storage.local.get([
      "timeoutMinutes",
      "enabled",
      "whitelist",
    ]);

    if (!enabled) return;

    const now = Date.now();
    const threshold = timeoutMinutes * 60 * 1000;
    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
      if (!shouldCloseTab(tab, now, threshold, whitelist)) continue;

      const windowTabs = await chrome.tabs.query({ windowId: tab.windowId });
      if (!canCloseTabInWindow(tab, windowTabs)) continue;

      chrome.tabs.remove(tab.id);
    }
  } catch (e) {
    console.error("[End of Tab] Alarm handler error", e);
  }
});
