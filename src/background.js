import {
  canCloseTabInWindow,
  shouldCloseTab,
} from "./lib.js";
import { readSettings } from "./settings.js";

function ensureAlarm() {
  chrome.alarms.create("checkInactiveTabs", { periodInMinutes: 1 });
}

ensureAlarm();

chrome.runtime.onStartup.addListener(ensureAlarm);
chrome.runtime.onInstalled.addListener(ensureAlarm);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "checkInactiveTabs") return;

  try {
    const { timeoutMinutes, enabled, whitelist } = await readSettings();

    if (!enabled) return;

    const now = Date.now();
    const threshold = timeoutMinutes * 60 * 1000;
    const tabs = await chrome.tabs.query({});
    const windowTabsById = new Map();

    for (const tab of tabs) {
      const windowTabs = windowTabsById.get(tab.windowId) || [];
      windowTabs.push(tab);
      windowTabsById.set(tab.windowId, windowTabs);
    }

    for (const tab of tabs) {
      if (!shouldCloseTab(tab, now, threshold, whitelist)) continue;

      const windowTabs = windowTabsById.get(tab.windowId) || [];
      if (!canCloseTabInWindow(tab, windowTabs)) continue;
      if (typeof tab.id !== "number") continue;

      try {
        await chrome.tabs.remove(tab.id);
        windowTabsById.set(
          tab.windowId,
          windowTabs.filter((windowTab) => windowTab.id !== tab.id),
        );
      } catch (e) {
        console.warn("[End of Tab] Failed to close tab", {
          error: e,
          tabId: tab.id,
          windowId: tab.windowId,
        });
      }
    }
  } catch (e) {
    console.error("[End of Tab] Alarm handler error", e);
  }
});
