// Shared channel definitions + YouTube search helpers.
// Used by both the content script and the popup (exposed as globalThis.BGNews).

(() => {
  const DEFAULT_SETTINGS = { enabled: true, hour: "20" };

  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = (k) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  const WEEKDAYS = ["неделя", "понеделник", "вторник", "сряда", "четвъртък", "петък", "събота"];
  const fmtLong = (d) => `${fmt(d)}, ${WEEKDAYS[d.getDay()]}`;

  // Month prefixes as they appear in titles ("16 ноем. 2026", "3 февруари").
  const MONTH_PREFIXES = ["ян", "фев", "мар", "апр", "май", "юни", "юли", "авг", "сеп", "окт", "ное", "дек"];
  // Abbreviations NOVA uses in its titles (for search queries).
  const MONTH_ABBR = ["яну.", "февр.", "март", "апр.", "май", "юни", "юли", "авг.", "септ.", "окт.", "ноем.", "дек."];

  // Parses "15.11.2026", "15.11.26", "16 ноем. 2026" or "3 февруари" (no year).
  function parseDate(title) {
    let m = title.match(/(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?!\d)/);
    if (m) {
      let y = +m[3];
      if (y < 100) y += 2000;
      return new Date(y, +m[2] - 1, +m[1]);
    }
    m = title.match(/(\d{1,2})\s+(ян|фев|мар|апр|май|юни|юли|авг|сеп|окт|ное|дек)[а-я]*\.?(?:\s+(\d{4}))?/i);
    if (m) {
      const mon = MONTH_PREFIXES.findIndex((p) => m[2].toLowerCase().startsWith(p));
      const day = +m[1];
      let y = m[3] ? +m[3] : null;
      if (!y) {
        // No year in the title: assume the most recent such date.
        const today = new Date();
        y = today.getFullYear();
        if (new Date(y, mon, day) > today) y--;
      }
      return new Date(y, mon, day);
    }
    return null;
  }

  const CHANNELS = [
    {
      id: "bnt",
      name: "БНТ",
      handle: "BNT1",
      show: "По света и у нас",
      time: (s) => `${pad(s.hour)}:00`,
      isNews: (t, s) =>
        /по света и у нас/i.test(t) &&
        !/регионални/i.test(t) &&
        new RegExp(`(^|\\D)${pad(s.hour)}[.:,]00(\\D|$)`).test(t),
      query: (d) => `По света и у нас ${fmt(d)}`,
    },
    {
      id: "nova",
      name: "NOVA",
      handle: "novinitenanova_official",
      show: "Новините на NOVA – Централна емисия",
      time: () => "19:00",
      isNews: (t) => /новините на nova/i.test(t) && /централна емисия/i.test(t),
      query: (d) =>
        `Новините на NOVA Централна емисия ${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`,
    },
    {
      id: "euronews",
      name: "Euronews България",
      handle: "EuronewsBulgaria",
      show: "Централна емисия новини",
      time: () => "19:30",
      isNews: (t) => /централна емисия новини/i.test(t),
      query: (d) => `Централна емисия новини ${fmt(d)}`,
    },
  ];

  const byId = (id) => CHANNELS.find((c) => c.id === id);

  // "/@BNT1", "/@BNT1/videos" -> channel
  function channelFromPath(path) {
    const m = (path || "").match(/^\/@([^/?#]+)/);
    if (!m) return null;
    const h = decodeURIComponent(m[1]).toLowerCase();
    return CHANNELS.find((c) => c.handle.toLowerCase() === h) || null;
  }

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

  const cache = new Map();

  // Finds the evening news episode of `ch` for exactly `date`. Returns {id,title,date} or null.
  async function findEpisode(ch, date, settings) {
    const key = `${ch.id}|${dateKey(date)}|${settings.hour}`;
    if (cache.has(key)) return cache.get(key);
    const url = `https://www.youtube.com/@${ch.handle}/search?query=${encodeURIComponent(ch.query(date))}`;
    let result = null;
    try {
      const html = await (await fetch(url, { credentials: "include" })).text();
      const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
      if (m) {
        const hit = collectVideos(JSON.parse(m[1])).find((v) => {
          const d = parseDate(v.title);
          return d && sameDay(d, date) && ch.isNews(v.title, settings);
        });
        if (hit) result = { ...hit, date };
      }
    } catch (e) {
      console.warn("[BG News] search failed", e);
      return null; // don't cache failures
    }
    cache.set(key, result);
    return result;
  }

  // Nearest episode up to `maxDays` days away (step = +1 next, -1 previous).
  async function findNearby(ch, date, step, settings, maxDays = 4) {
    const today = new Date();
    for (let i = 1; i <= maxDays; i++) {
      const d = addDays(date, step * i);
      if (step > 0 && d > today) break;
      const ep = await findEpisode(ch, d, settings);
      if (ep) return ep;
    }
    return null;
  }

  globalThis.BGNews = {
    DEFAULT_SETTINGS,
    CHANNELS,
    byId,
    channelFromPath,
    parseDate,
    fmt,
    fmtLong,
    dateKey,
    fromKey,
    findEpisode,
    findNearby,
  };
})();
