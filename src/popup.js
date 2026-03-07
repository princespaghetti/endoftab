import { getHostname } from "./lib.js";
import { readSettings, writeSettings } from "./settings.js";

const enabledEl = document.getElementById("enabled");
const timeoutEl = document.getElementById("timeout");
const addCurrentSiteBtn = document.getElementById("addCurrentSite");
const whitelistItemsEl = document.getElementById("whitelistItems");

let whitelist = [];

function renderWhitelist() {
  whitelistItemsEl.replaceChildren();

  if (whitelist.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty";
    emptyState.textContent = "No sites whitelisted";
    whitelistItemsEl.appendChild(emptyState);
    return;
  }

  whitelist.forEach((domain) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = domain;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.domain = domain;
    button.textContent = "×";

    li.append(label, button);
    whitelistItemsEl.appendChild(li);
  });
}

async function loadSettings() {
  try {
    const data = await readSettings();
    enabledEl.checked = data.enabled;
    timeoutEl.value = String(data.timeoutMinutes);
    whitelist = data.whitelist;
    renderWhitelist();
  } catch (e) {
    console.error("[End of Tab] Failed to load settings", e);
  }
}

async function saveWhitelist() {
  const savedSettings = await writeSettings({ whitelist });
  whitelist = savedSettings.whitelist || [];
  renderWhitelist();
}

loadSettings();

enabledEl.addEventListener("change", async () => {
  const savedSettings = await writeSettings({ enabled: enabledEl.checked });
  enabledEl.checked = savedSettings.enabled ?? true;
});

timeoutEl.addEventListener("change", async () => {
  const savedSettings = await writeSettings({
    timeoutMinutes: timeoutEl.value,
  });
  timeoutEl.value = String(savedSettings.timeoutMinutes || 30);
});

addCurrentSiteBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = getHostname(tab?.url || "");
  if (hostname && !whitelist.includes(hostname)) {
    whitelist = [...whitelist, hostname];
    await saveWhitelist();
  }
});

whitelistItemsEl.addEventListener("click", async (e) => {
  if (!(e.target instanceof HTMLButtonElement) || !e.target.dataset.domain) {
    return;
  }

  whitelist = whitelist.filter((domain) => domain !== e.target.dataset.domain);
  await saveWhitelist();
});
