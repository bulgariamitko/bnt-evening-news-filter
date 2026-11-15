const DEFAULTS = { enabled: true, hour: "20" };
const enabledEl = document.getElementById("enabled");
const hourEl = document.getElementById("hour");

chrome.storage.sync.get(DEFAULTS, (s) => {
  enabledEl.checked = s.enabled;
  hourEl.value = s.hour;
});

enabledEl.addEventListener("change", () => chrome.storage.sync.set({ enabled: enabledEl.checked }));
hourEl.addEventListener("change", () => chrome.storage.sync.set({ hour: hourEl.value }));
