import { DEFAULT_TIMEOUT_MINUTES } from "./lib.js";

export const SETTINGS_KEYS = ["enabled", "timeoutMinutes", "whitelist"];

export function normalizeEnabled(value) {
  return typeof value === "boolean" ? value : true;
}

export function normalizeTimeoutMinutes(value) {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_TIMEOUT_MINUTES;
  }

  return Math.floor(parsed);
}

function normalizeWhitelistEntry(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const normalizedUrl = trimmed.includes("://")
      ? trimmed
      : `https://${trimmed}`;
    return new URL(normalizedUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeWhitelist(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const whitelist = [];

  for (const entry of value) {
    const normalizedEntry = normalizeWhitelistEntry(entry);
    if (!normalizedEntry || seen.has(normalizedEntry)) continue;

    seen.add(normalizedEntry);
    whitelist.push(normalizedEntry);
  }

  return whitelist;
}

export function normalizeSettings(value = {}) {
  return {
    enabled: normalizeEnabled(value.enabled),
    timeoutMinutes: normalizeTimeoutMinutes(value.timeoutMinutes),
    whitelist: normalizeWhitelist(value.whitelist),
  };
}

export function sanitizeSettingsPatch(value = {}) {
  const patch = {};

  if ("enabled" in value) {
    patch.enabled = normalizeEnabled(value.enabled);
  }

  if ("timeoutMinutes" in value) {
    patch.timeoutMinutes = normalizeTimeoutMinutes(value.timeoutMinutes);
  }

  if ("whitelist" in value) {
    patch.whitelist = normalizeWhitelist(value.whitelist);
  }

  return patch;
}

export async function readSettings(storageArea = chrome.storage.local) {
  const storedSettings = await storageArea.get(SETTINGS_KEYS);
  return normalizeSettings(storedSettings);
}

export async function writeSettings(
  value,
  storageArea = chrome.storage.local,
) {
  const patch = sanitizeSettingsPatch(value);

  if (Object.keys(patch).length === 0) {
    return patch;
  }

  await storageArea.set(patch);
  return patch;
}
