// Bulgarian Evening News – content script (runs on youtube.com).
// 1. On a supported channel page, hides everything except the evening news.
// 2. On an evening news video, shows next / previous day links and
//    remembers where you stopped watching (per channel).

(() => {
  const N = globalThis.BGNews;
  let settings = { ...N.DEFAULT_SETTINGS };

  const ITEM_SELECTOR = "ytd-rich-item-renderer, ytd-grid-video-renderer";
  const SECTION_SELECTOR = "ytd-rich-section-renderer"; // Shorts shelves etc.

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- Channel page filter ----------

  function getTitle(item) {
    const t = item.querySelector("#video-title, h3 a, h3");
    return (t?.getAttribute("title") || t?.textContent || "").trim();
  }

  function applyFilter() {
    const ch = N.channelFromPath(location.pathname);
    const active = settings.enabled && !!ch;
    document.querySelectorAll(ITEM_SELECTOR).forEach((item) => {
      const title = getTitle(item);
      // Item not rendered yet: leave it and recheck on next mutation.
      const hide = active && title !== "" && !ch.isNews(title, settings);
      item.classList.toggle("bnt-news-hidden", hide);
    });
    document.querySelectorAll(SECTION_SELECTOR).forEach((s) => {
      s.classList.toggle("bnt-news-hidden", active);
    });
    updateButton(ch);
  }

  // Floating on/off button on supported channel pages.
  function updateButton(ch) {
    let btn = document.getElementById("bnt-news-toggle");
    if (!ch) {
      btn?.remove();
      return;
    }
    if (!btn) {
      btn = el("button");
      btn.id = "bnt-news-toggle";
      btn.addEventListener("click", () => chrome.storage.sync.set({ enabled: !settings.enabled }));
      document.body.appendChild(btn);
    }
    btn.textContent = settings.enabled
      ? `📺 Само новините ${ch.time(settings)} (вкл.)`
      : "📺 Всички видеа (изкл.)";
    btn.classList.toggle("off", !settings.enabled);
  }

  // ---------- Watch page: next / previous card ----------

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
      el("div", "bnt-nav-date", `📅 ${N.fmtLong(ep.date)}`),
      el("div", "bnt-nav-title", ep.title)
    );
    a.append(img, text);
    return a;
  }

  let watchToken = 0;
  let currentCardVideo = null;
  let currentNews = null; // {ch, id, title, date} of the news video being watched

  async function updateWatchCard() {
    const videoId = new URLSearchParams(location.search).get("v");
    const isWatch = location.pathname === "/watch" && videoId;
    const existing = document.getElementById("bnt-nav-card");

    if (!isWatch) {
      existing?.remove();
      currentCardVideo = null;
      currentNews = null;
      return;
    }
    if (currentCardVideo === videoId && (existing || !settings.enabled || !currentNews)) return;

    const titleEl = document.querySelector("ytd-watch-metadata h1");
    const ownerHref = document.querySelector("ytd-watch-metadata #owner a")?.getAttribute("href") || "";
    const related = document.querySelector("#secondary #related");
    if (!titleEl || !related) return; // not rendered yet; retry on next mutation

    const title = titleEl.textContent.trim();
    // Title/owner may still belong to the previous video right after SPA nav.
    if (!title || !document.title.includes(title)) return;

    existing?.remove();
    currentCardVideo = videoId;
    currentNews = null;

    const ch = N.channelFromPath(ownerHref);
    const date = N.parseDate(title);
    if (!ch || !date || !ch.isNews(title, settings)) return;

    currentNews = { ch, id: videoId, title, date };
    rememberWatched(0);
    if (!settings.enabled) return;

    const token = ++watchToken;
    const card = el("div");
    card.id = "bnt-nav-card";
    card.append(el("div", "bnt-nav-empty", "Търся следващите новини…"));
    related.prepend(card);

    const [next, prev] = await Promise.all([
      N.findNearby(ch, date, 1, settings),
      N.findNearby(ch, date, -1, settings),
    ]);
    if (token !== watchToken || !card.isConnected) return;

    card.replaceChildren(
      el("div", "bnt-nav-header", `${ch.name} · сега гледате: ${N.fmtLong(date)}`),
      buildEntry("▶ Следващи новини", next, "все още няма"),
      buildEntry("◀ Предишни новини", prev, "не са намерени")
    );
  }

  // ---------- Remember last watched news per channel ----------

  let lastSaved = "";

  function rememberWatched(time, duration) {
    if (!currentNews) return;
    const { ch, id, title, date } = currentNews;
    try {
      chrome.storage.local.get({ lastWatched: {} }, ({ lastWatched }) => {
        const prev = lastWatched[ch.id];
        // Opening a video again shouldn't reset its saved position.
        if (time === 0 && prev?.id === id) return;
        lastWatched[ch.id] = {
          id,
          title,
          date: N.dateKey(date),
          time: Math.floor(time),
          duration: Math.floor(duration || prev?.duration || 0),
          updated: Date.now(),
        };
        chrome.storage.local.set({ lastWatched });
      });
    } catch {
      // Extension was reloaded; this old content script can no longer save.
    }
  }

  setInterval(() => {
    if (!currentNews) return;
    if (new URLSearchParams(location.search).get("v") !== currentNews.id) return;
    if (document.getElementById("movie_player")?.classList.contains("ad-showing")) return;
    const v = document.querySelector("#movie_player video");
    if (!v || !v.duration || v.currentTime < 1) return;
    const key = `${currentNews.id}|${Math.floor(v.currentTime)}`;
    if (key === lastSaved) return; // paused – nothing new to save
    lastSaved = key;
    rememberWatched(v.currentTime, v.duration);
  }, 5000);

  // ---------- Wiring ----------

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyFilter();
      updateWatchCard();
    });
  }

  chrome.storage.sync.get(N.DEFAULT_SETTINGS, (s) => {
    settings = { ...N.DEFAULT_SETTINGS, ...s };
    schedule();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [k, { newValue }] of Object.entries(changes)) {
      if (k in settings) settings[k] = newValue;
    }
    currentCardVideo = null; // rebuild the card with new settings
    document.getElementById("bnt-nav-card")?.remove();
    schedule();
  });

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // YouTube is a single-page app: re-run after in-app navigation.
  window.addEventListener("yt-navigate-finish", schedule);
})();
