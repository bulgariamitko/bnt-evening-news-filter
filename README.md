# Bulgarian Evening News (BNT, NOVA, Euronews)

<img src="icons/icon128.png" width="64" align="right" alt="">

Chrome extension that makes it easy to follow the Bulgarian TV **evening news** on YouTube.

*Разширение за Chrome за лесно гледане на вечерните новини на БНТ, NOVA и Euronews България в YouTube.*

| Channel | Show | Time |
|---|---|---|
| [БНТ](https://www.youtube.com/@BNT1/videos) | По света и у нас | 20:00 (configurable) |
| [NOVA](https://www.youtube.com/@novinitenanova_official/videos) | Новините на NOVA – Централна емисия | 19:00 |
| [Euronews България](https://www.youtube.com/@EuronewsBulgaria/videos) | Централна емисия новини | 19:30 |

bTV is not included because bTV doesn't publish its full news broadcasts on YouTube.

## Features

- **Only the evening news**: on the supported channel pages, every other video is hidden. A floating button turns the filter on and off.
- **Next / previous day**: while you watch an episode, a box at the top of the recommendations links to the next and previous day's episode, with date, weekday and title.
- **Resume where you stopped**: the extension remembers the last episode you watched on each channel and your position in it. Click the toolbar icon, then **Продължи** to resume or **Следващи** to open the next day's episode.
- **Same date on other channels**: open the popup while watching an episode to see the same day's news on the other channels.
- **Choose the BNT edition**: 20:00 by default, or another hour such as 12:00 or 23:00.

## Install

**Chrome Web Store:** coming soon.

**Manually:**
1. Download this repository (**Code → Download ZIP**) and unzip it.
2. Open `chrome://extensions` and enable **Developer mode** (top right).
3. Click **Load unpacked** and select the folder.

## Инсталиране

1. Изтеглете хранилището (**Code → Download ZIP**) и го разархивирайте.
2. Отворете `chrome://extensions` и включете **Developer mode** (горе вдясно).
3. Натиснете **Load unpacked** и изберете папката.

## Privacy

No data is collected or sent anywhere. Settings and your last watched position stay in your browser. Episodes are found using YouTube's own search. See [PRIVACY.md](PRIVACY.md).

## Development

`./build.sh` creates the Chrome Web Store ZIP in `dist/`. The store listing text is in [`store/LISTING.md`](store/LISTING.md). To add a channel, add an entry to `CHANNELS` in `channels.js`.

Not affiliated with or endorsed by BNT, NOVA, Euronews or YouTube.

## License

MIT
