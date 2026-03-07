import { describe, expect, it } from "bun:test";
import {
  canCloseTabInWindow,
  DEFAULT_TIMEOUT_MINUTES,
  getHostname,
  isClosableUrl,
  isWhitelisted,
  shouldCloseTab,
} from "../src/lib.js";
import {
  normalizeEnabled,
  normalizeSettings,
  normalizeTimeoutMinutes,
  normalizeWhitelist,
  sanitizeSettingsPatch,
  readSettings,
  writeSettings,
} from "../src/settings.js";

describe("DEFAULT_TIMEOUT_MINUTES", () => {
  it("should be 30", () => {
    expect(DEFAULT_TIMEOUT_MINUTES).toBe(30);
  });
});

describe("getHostname", () => {
  it("should extract hostname from valid URL", () => {
    expect(getHostname("https://example.com/path")).toBe("example.com");
  });

  it("should lowercase the hostname", () => {
    expect(getHostname("https://EXAMPLE.COM/path")).toBe("example.com");
  });

  it("should handle URLs with ports", () => {
    expect(getHostname("https://example.com:8080/path")).toBe("example.com");
  });

  it("should handle subdomains", () => {
    expect(getHostname("https://sub.example.com")).toBe("sub.example.com");
  });

  it("should return null for invalid URLs", () => {
    expect(getHostname("not-a-url")).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(getHostname("")).toBeNull();
  });
});

describe("isWhitelisted", () => {
  it("should return true for exact match", () => {
    expect(isWhitelisted("example.com", ["example.com"])).toBe(true);
  });

  it("should return true for subdomain match", () => {
    expect(isWhitelisted("sub.example.com", ["example.com"])).toBe(true);
  });

  it("should return true for deep subdomain match", () => {
    expect(isWhitelisted("deep.sub.example.com", ["example.com"])).toBe(true);
  });

  it("should be case insensitive", () => {
    expect(isWhitelisted("example.com", ["EXAMPLE.COM"])).toBe(true);
  });

  it("should return false for non-matching domain", () => {
    expect(isWhitelisted("other.com", ["example.com"])).toBe(false);
  });

  it("should return false for partial match that is not subdomain", () => {
    expect(isWhitelisted("notexample.com", ["example.com"])).toBe(false);
  });

  it("should return false for empty whitelist", () => {
    expect(isWhitelisted("example.com", [])).toBe(false);
  });

  it("should check multiple whitelist entries", () => {
    const whitelist = ["example.com", "other.com"];
    expect(isWhitelisted("sub.other.com", whitelist)).toBe(true);
  });
});

describe("isClosableUrl", () => {
  it("should allow http and https URLs", () => {
    expect(isClosableUrl("https://example.com")).toBe(true);
    expect(isClosableUrl("http://example.com")).toBe(true);
  });

  it("should reject browser-owned and invalid URLs", () => {
    expect(isClosableUrl("chrome://settings")).toBe(false);
    expect(isClosableUrl("chrome-extension://abc123/popup.html")).toBe(false);
    expect(isClosableUrl("not-a-url")).toBe(false);
  });
});

describe("shouldCloseTab", () => {
  const now = Date.now();
  const threshold = 30 * 60 * 1000; // 30 minutes

  it("should return false for pinned tabs", () => {
    const tab = {
      pinned: true,
      active: false,
      audible: false,
      lastAccessed: 0,
    };
    expect(shouldCloseTab(tab, now, threshold, [])).toBe(false);
  });

  it("should return false for active tabs", () => {
    const tab = {
      pinned: false,
      active: true,
      audible: false,
      lastAccessed: 0,
    };
    expect(shouldCloseTab(tab, now, threshold, [])).toBe(false);
  });

  it("should return false for audible tabs", () => {
    const tab = {
      pinned: false,
      active: false,
      audible: true,
      lastAccessed: 0,
    };
    expect(shouldCloseTab(tab, now, threshold, [])).toBe(false);
  });

  it("should return false for whitelisted tabs", () => {
    const tab = {
      pinned: false,
      active: false,
      audible: false,
      url: "https://example.com",
      lastAccessed: 0,
    };
    expect(shouldCloseTab(tab, now, threshold, ["example.com"])).toBe(false);
  });

  it("should return false for tabs without lastAccessed", () => {
    const tab = {
      pinned: false,
      active: false,
      audible: false,
      url: "https://other.com",
    };
    expect(shouldCloseTab(tab, now, threshold, [])).toBe(false);
  });

  it("should return false for recently accessed tabs", () => {
    const tab = {
      pinned: false,
      active: false,
      audible: false,
      url: "https://other.com",
      lastAccessed: now - 10 * 60 * 1000, // 10 minutes ago
    };
    expect(shouldCloseTab(tab, now, threshold, [])).toBe(false);
  });

  it("should return true for inactive tabs past threshold", () => {
    const tab = {
      pinned: false,
      active: false,
      audible: false,
      url: "https://other.com",
      lastAccessed: now - 60 * 60 * 1000, // 60 minutes ago
    };
    expect(shouldCloseTab(tab, now, threshold, [])).toBe(true);
  });

  it("should return false for non-web tabs even when stale", () => {
    const tab = {
      pinned: false,
      active: false,
      audible: false,
      url: "chrome://settings",
      lastAccessed: now - 60 * 60 * 1000,
    };
    expect(shouldCloseTab(tab, now, threshold, [])).toBe(false);
  });
});

describe("canCloseTabInWindow", () => {
  it("should return true when multiple closable tabs exist", () => {
    const tab = { id: 1 };
    const windowTabs = [
      { id: 1, pinned: false },
      { id: 2, pinned: false },
    ];
    expect(canCloseTabInWindow(tab, windowTabs)).toBe(true);
  });

  it("should return false when only one closable tab exists", () => {
    const tab = { id: 1 };
    const windowTabs = [
      { id: 1, pinned: false },
      { id: 2, pinned: true },
    ];
    expect(canCloseTabInWindow(tab, windowTabs)).toBe(false);
  });

  it("should return false when no closable tabs exist", () => {
    const tab = { id: 1 };
    const windowTabs = [{ id: 1, pinned: true }];
    expect(canCloseTabInWindow(tab, windowTabs)).toBe(false);
  });

  it("should ignore pinned tabs when counting", () => {
    const tab = { id: 1 };
    const windowTabs = [
      { id: 1, pinned: false },
      { id: 2, pinned: false },
      { id: 3, pinned: true },
      { id: 4, pinned: true },
    ];
    expect(canCloseTabInWindow(tab, windowTabs)).toBe(true);
  });
});

describe("settings normalization", () => {
  it("should default enabled to true unless a boolean false is stored", () => {
    expect(normalizeEnabled(undefined)).toBe(true);
    expect(normalizeEnabled("false")).toBe(true);
    expect(normalizeEnabled(false)).toBe(false);
  });

  it("should normalize timeout minutes safely", () => {
    expect(normalizeTimeoutMinutes("45")).toBe(45);
    expect(normalizeTimeoutMinutes(12.8)).toBe(12);
    expect(normalizeTimeoutMinutes(-1)).toBe(DEFAULT_TIMEOUT_MINUTES);
    expect(normalizeTimeoutMinutes("abc")).toBe(DEFAULT_TIMEOUT_MINUTES);
  });

  it("should normalize whitelist entries to unique lowercase hostnames", () => {
    expect(
      normalizeWhitelist([
        " Example.com ",
        "https://Sub.Example.com/path",
        "example.com",
        "",
        42,
        "<img src=x onerror=alert(1)>",
      ]),
    ).toEqual(["example.com", "sub.example.com"]);
  });

  it("should normalize malformed settings objects", () => {
    expect(
      normalizeSettings({
        enabled: "yes",
        timeoutMinutes: 0,
        whitelist: ["Example.com", null, "https://docs.example.com/path"],
      }),
    ).toEqual({
      enabled: true,
      timeoutMinutes: DEFAULT_TIMEOUT_MINUTES,
      whitelist: ["example.com", "docs.example.com"],
    });
  });

  it("should sanitize partial settings writes", () => {
    expect(
      sanitizeSettingsPatch({
        timeoutMinutes: "-5",
        whitelist: ["Example.com", "example.com"],
      }),
    ).toEqual({
      timeoutMinutes: DEFAULT_TIMEOUT_MINUTES,
      whitelist: ["example.com"],
    });
  });
});

describe("settings storage helpers", () => {
  it("should read normalized settings from storage", async () => {
    const storageArea = {
      get: async () => ({
        enabled: "oops",
        timeoutMinutes: -99,
        whitelist: ["Example.com", "https://sub.example.com/path", 5],
      }),
    };

    await expect(readSettings(storageArea)).resolves.toEqual({
      enabled: true,
      timeoutMinutes: DEFAULT_TIMEOUT_MINUTES,
      whitelist: ["example.com", "sub.example.com"],
    });
  });

  it("should write only normalized settings back to storage", async () => {
    let savedValue = null;
    const storageArea = {
      set: async (value) => {
        savedValue = value;
      },
    };

    await expect(
      writeSettings(
        {
          enabled: "invalid",
          timeoutMinutes: "15",
          whitelist: ["Example.com", "https://docs.example.com/path"],
        },
        storageArea,
      ),
    ).resolves.toEqual({
      enabled: true,
      timeoutMinutes: 15,
      whitelist: ["example.com", "docs.example.com"],
    });

    expect(savedValue).toEqual({
      enabled: true,
      timeoutMinutes: 15,
      whitelist: ["example.com", "docs.example.com"],
    });
  });
});
