// BNT Evening News Filter
// On https://www.youtube.com/@BNT1 pages, hides every video except the
// evening news "По света и у нас ... 20:00 / 20.00".

(() => {
  const DEFAULTS = { enabled: true, hour: "20" };
  let settings = { ...DEFAULTS };

  const ITEM_SELECTOR = "ytd-rich-item-renderer, ytd-grid-video-renderer";
  const SECTION_SELECTOR = "ytd-rich-section-renderer"; // Shorts shelves etc.

  const isBntPage = () => /^\/@bnt1(\/|$)/i.test(location.pathname);

  function isEveningNews(title) {
    if (!/по света и у нас/i.test(title)) return false;
    if (/регионални/i.test(title)) return false;
    const h = settings.hour.padStart(2, "0");
    // Matches "20:00", "20.00", "20,00" (word-bounded so 12:00 etc. don't match)
    return new RegExp(`(^|\\D)${h}[.:,]00(\\D|$)`).test(title);
  }

  function getTitle(item) {
    const el = item.querySelector("#video-title, h3 a, h3");
    return (el?.getAttribute("title") || el?.textContent || "").trim();
  }

  function applyFilter() {
    const active = settings.enabled && isBntPage();
    document.querySelectorAll(ITEM_SELECTOR).forEach((item) => {
      const title = getTitle(item);
      // Item not rendered yet: leave it and recheck on next mutation.
      const hide = active && title !== "" && !isEveningNews(title);
      item.classList.toggle("bnt-news-hidden", hide);
    });
    document.querySelectorAll(SECTION_SELECTOR).forEach((s) => {
      s.classList.toggle("bnt-news-hidden", active);
    });
    updateButton();
  }

  // Floating on/off button shown only on the BNT channel.
  function updateButton() {
    let btn = document.getElementById("bnt-news-toggle");
    if (!isBntPage()) {
      btn?.remove();
      return;
    }
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "bnt-news-toggle";
      btn.addEventListener("click", () => {
        chrome.storage.sync.set({ enabled: !settings.enabled });
      });
      document.body.appendChild(btn);
    }
    btn.textContent = settings.enabled
      ? `📺 Само ${settings.hour}:00 новини (вкл.)`
      : "📺 Всички видеа (изкл.)";
    btn.classList.toggle("off", !settings.enabled);
  }

  // ---------- Watch page: "next / previous day's news" card ----------

  const DATE_RE = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/;
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  function parseDate(title) {
    const m = title.match(DATE_RE);
    if (!m) return null;
    let y = +m[3];
    if (y < 100) y += 2000;
    return new Date(y, +m[2] - 1, +m[1]);
  }

  // Cache: "dd.mm.yyyy|hour" -> {id, title} | null
  const lookupCache = new Map();

  function collectVideos(obj, out = []) {
    if (!obj || typeof obj !== "object") return out;
    if (obj.videoRenderer) {
      const v = obj.videoRenderer;
      out.push({ id: v.videoId, title: (v.title?.runs || []).map((r) => r.text).join("") });
    }
    if (obj.lockupViewModel?.contentId) {
      const v = obj.lockupViewModel;
      out.push({ id: v.contentId, title: v.metadata?.lockupMetadataViewModel?.title?.content || "" });
    }
    for (const k in obj) collectVideos(obj[k], out);
    return out;
  }

  async function findEpisode(date) {
    const key = `${fmt(date)}|${settings.hour}`;
    if (lookupCache.has(key)) return lookupCache.get(key);
    const q = encodeURIComponent(`По света и у нас ${fmt(date)}`);
    let result = null;
    try {
      const html = await (await fetch(`/@BNT1/search?query=${q}`)).text();
      const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
      if (m) {
        result =
          collectVideos(JSON.parse(m[1])).find((v) => {
            const d = parseDate(v.title);
            return d && sameDay(d, date) && isEveningNews(v.title);
          }) || null;
      }
    } catch (e) {
      console.warn("[BNT News] search failed", e);
      return null; // don't cache failures
    }
    lookupCache.set(key, result);
    return result;
  }

  // Look up to `maxDays` days away in the given direction (skips missing days).
  async function findNearby(date, step, maxDays = 4) {
    const today = new Date();
    for (let i = 1; i <= maxDays; i++) {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + step * i);
      if (step > 0 && d > today) break;
      const ep = await findEpisode(d);
      if (ep) return { ...ep, date: d };
    }
    return null;
  }

  const WEEKDAYS = ["неделя", "понеделник", "вторник", "сряда", "четвъртък", "петък", "събота"];
  const fmtLong = (d) => `${fmt(d)}, ${WEEKDAYS[d.getDay()]}`;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // One entry: thumbnail + label + date + full video title (or a "not found" line).
  function buildEntry(label, ep, emptyText) {
    if (!ep) return el("div", "bnt-nav-empty", `${label}: ${emptyText}`);
    const a = el("a", "bnt-nav-item");
    a.href = `/watch?v=${ep.id}`;
    const img = el("img");
    img.src = `https://i.ytimg.com/vi/${ep.id}/mqdefault.jpg`;
    img.alt = "";
    const text = el("div");
    text.append(
      el("div", "bnt-nav-label", label),
      el("div", "bnt-nav-date", `📅 ${fmtLong(ep.date)}`),
      el("div", "bnt-nav-title", ep.title)
    );
    a.append(img, text);
    return a;
  }

  let watchToken = 0;
  let currentCardVideo = null;

  async function updateWatchCard() {
    const videoId = new URLSearchParams(location.search).get("v");
    const isWatch = location.pathname === "/watch" && videoId;
    const existing = document.getElementById("bnt-nav-card");

    if (!isWatch || !settings.enabled) {
      existing?.remove();
      currentCardVideo = null;
      return;
    }
    // Card already present for this video.
    if (existing && currentCardVideo === videoId) return;

    const titleEl = document.querySelector("ytd-watch-metadata h1");
    const ownerHref = document.querySelector("ytd-watch-metadata #owner a")?.getAttribute("href") || "";
    const related = document.querySelector("#secondary #related");
    if (!titleEl || !related) return; // not rendered yet; retry on next mutation

    const title = titleEl.textContent.trim();
    // Title/owner may still belong to the previous video right after SPA nav.
    const pageTitle = document.title;
    if (!pageTitle.includes(title)) return;

    existing?.remove();
    currentCardVideo = videoId;

    const date = parseDate(title);
    if (!/^\/@bnt1$/i.test(ownerHref) || !isEveningNews(title) || !date) return;

    const token = ++watchToken;
    const card = document.createElement("div");
    card.id = "bnt-nav-card";
    card.innerHTML = `<div class="bnt-nav-empty">Търся следващите новини…</div>`;
    related.prepend(card);

    const [next, prev] = await Promise.all([findNearby(date, 1), findNearby(date, -1)]);
    if (token !== watchToken || !card.isConnected) return;

    card.replaceChildren(
      el("div", "bnt-nav-header", `Сега гледате: ${fmtLong(date)}`),
      buildEntry("▶ Следващи новини", next, "все още няма"),
      buildEntry("◀ Предишни новини", prev, "не са намерени")
    );
  }

  let scheduled = false;
  function scheduleFilter() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyFilter();
      updateWatchCard();
    });
  }

  chrome.storage.sync.get(DEFAULTS, (s) => {
    settings = { ...DEFAULTS, ...s };
    applyFilter();
  });

  chrome.storage.onChanged.addListener((changes) => {
    for (const [k, { newValue }] of Object.entries(changes)) {
      if (k in settings) settings[k] = newValue;
    }
    applyFilter();
  });

  new MutationObserver(scheduleFilter).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // YouTube is a single-page app: re-run after in-app navigation.
  window.addEventListener("yt-navigate-finish", scheduleFilter);
})();
