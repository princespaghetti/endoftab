export const DEFAULT_TIMEOUT_MINUTES = 30;

export function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
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

export function shouldCloseTab(
  tab,
  now,
  threshold,
  whitelist,
  getHostnameFn = getHostname,
) {
  if (tab.pinned || tab.active || tab.audible) return false;

  const hostname = getHostnameFn(tab.url || "");
  if (hostname && isWhitelisted(hostname, whitelist)) return false;

  if (!tab.lastAccessed) return false;

  return now - tab.lastAccessed > threshold;
}

export function canCloseTabInWindow(_tab, windowTabs) {
  const closableTabs = windowTabs.filter((t) => !t.pinned);
  return closableTabs.length > 1;
}
