export const DEFAULT_TIMEOUT_MINUTES = 30;

export function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isClosableUrl(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function isWhitelisted(hostname, whitelist) {
  for (const entry of whitelist) {
    const domain = entry.toLowerCase();
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      return true;
    }
  }
  return false;
}

// A gap between checks longer than this means the machine was asleep.
export const SLEEP_GAP_MS = 5 * 60 * 1000;

// Returns the time from which inactivity should be counted. It resets to
// `now` on browser start or extension reload (no previous check) and after
// waking from sleep, so restored tabs aren't closed all at once.
export function getActiveSince(activeSince, lastCheck, now) {
  if (!activeSince || !lastCheck || now - lastCheck > SLEEP_GAP_MS) {
    return now;
  }
  return activeSince;
}

export function shouldCloseTab(
  tab,
  now,
  threshold,
  whitelist,
  activeSince = 0,
) {
  if (tab.pinned || tab.active || tab.audible) return false;

  const url = tab.url || "";
  if (!isClosableUrl(url)) return false;

  const hostname = getHostname(url);
  if (hostname && isWhitelisted(hostname, whitelist)) return false;

  if (!tab.lastAccessed) return false;

  return now - Math.max(tab.lastAccessed, activeSince) > threshold;
}

export function canCloseTabInWindow(_tab, windowTabs) {
  const closableTabs = windowTabs.filter((t) => !t.pinned);
  return closableTabs.length > 1;
}
