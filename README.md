# BNT Evening News Filter

Chrome extension for the [BNT1 YouTube channel](https://www.youtube.com/@BNT1/videos) that makes it easy to follow the **20:00 evening news** ("По света и у нас").

*Разширение за Chrome, което показва само вечерните новини от 20:00 ч. в YouTube канала на БНТ и позволява лесно преминаване към новините от следващия ден.*

## Features

- **Show only the evening news** – on `youtube.com/@BNT1` every video except "По света и у нас … 20:00" is hidden (regional news and Shorts shelves are hidden too). A floating button turns the filter on/off.
- **Next / previous day** – while watching an evening news episode, a box at the top of the recommendations links to the next day's and the previous day's 20:00 news, with date, weekday and title.
- **Pick another edition** – the toolbar popup lets you switch to another hour (e.g. 12:00 or 23:00) or disable the extension.

## Install

1. Download this repository (**Code → Download ZIP**) and unzip it, or `git clone` it.
2. Open `chrome://extensions` and enable **Developer mode** (top right).
3. Click **Load unpacked** and select the folder.
4. Open <https://www.youtube.com/@BNT1/videos>.

## Инсталиране

1. Изтеглете хранилището (**Code → Download ZIP**) и го разархивирайте.
2. Отворете `chrome://extensions` и включете **Developer mode** (горе вдясно).
3. Натиснете **Load unpacked** и изберете папката.
4. Отворете <https://www.youtube.com/@BNT1/videos>.

## How it works

Matching is based on video titles such as `По света и у нас – 15.11.2026, 20.00 по БНТ`. The next/previous episode is found with the channel's own search on youtube.com. No data is collected or sent anywhere else; the only permission used is `storage` for your settings.

If YouTube or BNT change their page layout or title format, the extension may need an update – feel free to open an issue.

## License

MIT
