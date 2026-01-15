import { describe, expect, it } from "bun:test";
import {
  canCloseTabInWindow,
  DEFAULT_TIMEOUT_MINUTES,
  getHostname,
  isWhitelisted,
  shouldCloseTab,
} from "../src/lib.js";

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
