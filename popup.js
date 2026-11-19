(async () => {
  const N = globalThis.BGNews;
  const $ = (id) => document.getElementById(id);

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  const fmtTime = (s) => {
    s = Math.floor(s);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
  };

  const settings = { ...N.DEFAULT_SETTINGS, ...(await chrome.storage.sync.get(N.DEFAULT_SETTINGS)) };
  const { lastWatched = {} } = await chrome.storage.local.get({ lastWatched: {} });

  // Older versions could save another video's ID next to a news title.
  // Check each saved entry and repair it from the channel's search if needed.
  async function realTitle(id) {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
      return r.ok ? (await r.json()).title : null;
    } catch {
      return null;
    }
  }
  let repaired = false;
  await Promise.all(
    N.CHANNELS.map(async (ch) => {
      const last = lastWatched[ch.id];
      if (!last) return;
      const t = await realTitle(last.id);
      if (t === null || t === last.title) return;
      const ep = await N.findEpisode(ch, N.fromKey(last.date), settings);
      if (ep) lastWatched[ch.id] = { ...last, id: ep.id, title: ep.title, time: 0, duration: 0 };
      else delete lastWatched[ch.id];
      repaired = true;
    })
  );
  if (repaired) chrome.storage.local.set({ lastWatched });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Open in the current tab if it's YouTube, otherwise in a new tab.
  function openUrl(url) {
    if (tab?.url?.startsWith("https://www.youtube.com/")) chrome.tabs.update(tab.id, { url });
    else chrome.tabs.create({ url });
    window.close();
  }
  const watchUrl = (id, t) => `https://www.youtube.com/watch?v=${id}${t ? `&t=${t}s` : ""}`;

  function episodeRow(ep, t) {
    const row = el("div", "ep");
    const img = el("img");
    img.src = `https://i.ytimg.com/vi/${ep.id}/mqdefault.jpg`;
    img.alt = "";
    row.append(img, el("div", "ep-title", ep.title));
    row.addEventListener("click", () => openUrl(watchUrl(ep.id, t)));
    return row;
  }

  // ---------- Same date on the other channels ----------

  if (tab?.url?.includes("youtube.com/watch")) {
    const title = (tab.title || "").replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube$/, "");
    const current = N.CHANNELS.find((c) => c.isShow(title, settings));
    const date = current && N.parseDate(title);
    if (current && date) {
      $("same-date").hidden = false;
      $("same-date-title").textContent = `Новините от ${N.fmtLong(date)} по другите канали`;
      for (const ch of N.CHANNELS.filter((c) => c !== current)) {
        const box = el("div", "ch");
        const head = el("div", "ch-head");
        head.append(el("span", "ch-name", ch.name), el("span", "ch-date", ch.time(settings)));
        const body = el("div", "muted", "Търся…");
        box.append(head, body);
        $("same-date-list").append(box);
        N.findEpisode(ch, date, settings).then((ep) => {
          body.replaceWith(ep ? episodeRow(ep) : el("div", "muted", "Няма намерена емисия за тази дата."));
        });
      }
    }
  }

  // ---------- Last watched per channel ----------

  for (const ch of N.CHANNELS) {
    const box = el("div", "ch");
    const head = el("div", "ch-head");
    const last = lastWatched[ch.id];
    head.append(el("span", "ch-name", ch.name));
    box.append(head);
    $("last-list").append(box);

    if (!last) {
      head.append(el("span", "ch-date", "още не сте гледали"));
      const buttons = el("div", "buttons");
      const open = el("button", "primary", "Отвори канала");
      open.addEventListener("click", () => openUrl(`https://www.youtube.com/@${ch.handle}/videos`));
      buttons.append(open);
      box.append(buttons);
      continue;
    }

    const date = N.fromKey(last.date);
    const finished = last.duration && last.time > last.duration - 90;
    head.append(el("span", "ch-date", N.fmtLong(date)));
    box.append(episodeRow(last, last.time));

    if (last.duration) {
      const bar = el("div", "progress");
      const fill = el("div");
      fill.style.width = `${Math.min(100, (last.time / last.duration) * 100)}%`;
      bar.append(fill);
      box.append(bar);
    }

    const buttons = el("div", "buttons");
    const resume = el(
      "button",
      finished ? "" : "primary",
      finished ? "✓ Изгледано – отначало" : `▶ Продължи от ${fmtTime(last.time)}`
    );
    resume.addEventListener("click", () => openUrl(watchUrl(last.id, finished ? 0 : last.time)));

    const next = el("button", finished ? "primary" : "", "Търся следващите…");
    next.disabled = true;
    buttons.append(resume, next);
    box.append(buttons);

    N.findNearby(ch, date, 1, settings).then((ep) => {
      if (!ep) {
        next.textContent = "Следващите ги няма още";
        return;
      }
      next.textContent = `⏭ Следващи (${N.fmt(ep.date).slice(0, 5)})`;
      next.disabled = false;
      next.addEventListener("click", () => openUrl(watchUrl(ep.id)));
    });
  }

  // ---------- Settings ----------

  $("enabled").checked = settings.enabled;
  $("hour").value = settings.hour;
  $("enabled").addEventListener("change", (e) => chrome.storage.sync.set({ enabled: e.target.checked }));
  $("hour").addEventListener("change", (e) => chrome.storage.sync.set({ hour: e.target.value }));
})();
