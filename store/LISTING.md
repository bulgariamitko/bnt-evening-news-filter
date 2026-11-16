# Chrome Web Store listing – copy & paste

## Package
Upload `dist/bulgarian-evening-news-<version>.zip` (run `./build.sh` to create it).

## Store listing tab

**Name** (from manifest): Bulgarian Evening News (BNT, NOVA, Euronews)

**Summary** (max 132 chars, from manifest description):
Only the evening news on the BNT, NOVA and Euronews Bulgaria YouTube channels. Jump to the next day and resume where you left off.

**Category:** News & Weather
**Language:** Bulgarian (add English as a second language if offered)

**Description:**

Гледате вечерните новини в YouTube? Това разширение скрива всичко излишно и ви води директно до емисиите.

✔ Само вечерните новини – в YouTube каналите на БНТ („По света и у нас“, 20:00), NOVA („Новините на NOVA“, централна емисия) и Euronews България (централна емисия) се показват само емисиите новини.
✔ Следващи / предишни новини – докато гледате, най-отгоре в препоръките има бутон към новините от следващия и предишния ден, с дата, ден от седмицата и заглавие.
✔ Продължете откъдето спряхте – разширението помни последните гледани новини за всеки канал и докъде сте стигнали. Един клик върху иконата и продължавате.
✔ Същата дата по другите канали – докато гледате новините на един канал, отворете иконата и вижте емисиите от същия ден по другите телевизии.
✔ Избор на емисия на БНТ – 20:00 по подразбиране, или друга (12:00, 23:00 и др.).

Без реклами, без проследяване, без събиране на данни. Отворен код: https://github.com/bulgariamitko/bnt-evening-news-filter

Разширението не е свързано с БНТ, NOVA, Euronews или YouTube и не е одобрено от тях. Всички видеа са от официалните им YouTube канали.

---

Watching Bulgarian evening news on YouTube? This extension hides everything else on the BNT, NOVA and Euronews Bulgaria channels, links each episode to the next and previous day, remembers where you stopped, and shows the same day's news on the other channels.

No ads, no tracking, no data collection. Not affiliated with or endorsed by BNT, NOVA, Euronews or YouTube.

**Graphic assets:**
- Store icon 128×128: `icons/icon128.png`
- Small promo tile 440×280: `store/promo-440x280.png`
- Screenshots 1280×800 (at least 1 required): take them in Chrome with the extension installed – e.g. the filtered BNT channel page, a news video with the "Следващи новини" box, and the popup.

**Official URL / Homepage:** https://github.com/bulgariamitko/bnt-evening-news-filter
**Support URL:** https://github.com/bulgariamitko/bnt-evening-news-filter/issues

## Privacy tab

**Single purpose:**
Helps users watch Bulgarian TV evening news on YouTube: filters the BNT, NOVA and Euronews Bulgaria channel pages to show only the evening news, links to the next/previous day's episode, and lets the user resume the last watched episode.

**Permission justifications:**
- `storage` – saves the user's settings and the last watched episode/position per channel, locally.
- `activeTab` – when the popup is opened on a YouTube news video, reads that tab's title and URL to show the same date's news on the other channels, and opens the chosen episode in that tab.
- Host permission `https://www.youtube.com/*` – the content script filters the channel pages and adds the next/previous box on youtube.com; the popup requests YouTube's own channel search page to find episodes for a given date.

**Remote code:** No, I am not using remote code.

**Data usage:** tick nothing (no user data is collected). Certify all three statements (not sold, not used for unrelated purposes, not used for creditworthiness).

**Privacy policy URL:** https://github.com/bulgariamitko/bnt-evening-news-filter/blob/main/PRIVACY.md

## Distribution tab
Visibility: Public · Regions: All regions · Free
