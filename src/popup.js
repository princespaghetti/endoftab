const enabledEl = document.getElementById("enabled");
const timeoutEl = document.getElementById("timeout");
const addCurrentSiteBtn = document.getElementById("addCurrentSite");
const whitelistItemsEl = document.getElementById("whitelistItems");

let whitelist = [];

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function renderWhitelist() {
  whitelistItemsEl.innerHTML = "";
  if (whitelist.length === 0) {
    whitelistItemsEl.innerHTML = '<li class="empty">No sites whitelisted</li>';
    return;
  }
  whitelist.forEach((domain) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${domain}</span><button data-domain="${domain}">×</button>`;
    whitelistItemsEl.appendChild(li);
  });
}

async function loadSettings() {
  const data = await chrome.storage.local.get([
    "enabled",
    "timeoutMinutes",
    "whitelist",
  ]);
  enabledEl.checked = data.enabled !== false;
  timeoutEl.value = data.timeoutMinutes || 30;
  whitelist = data.whitelist || [];
  renderWhitelist();
}

async function saveWhitelist() {
  await chrome.storage.local.set({ whitelist });
  renderWhitelist();
}

loadSettings();

enabledEl.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabledEl.checked });
});

timeoutEl.addEventListener("change", () => {
  chrome.storage.local.set({
    timeoutMinutes: parseInt(timeoutEl.value, 10) || 30,
  });
});

addCurrentSiteBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = getHostname(tab?.url || "");
  if (hostname && !whitelist.includes(hostname)) {
    whitelist.push(hostname);
    saveWhitelist();
  }
});

whitelistItemsEl.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON" && e.target.dataset.domain) {
    whitelist = whitelist.filter((d) => d !== e.target.dataset.domain);
    saveWhitelist();
  }
});
