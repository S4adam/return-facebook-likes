# ![icon](assets/icons/icon-32.png) *Return Facebook Likes*

<div align="center">  
  <a href="https://chromewebstore.google.com/detail/difgdoobfmnpndnikcghgbkbnhdnmoim">
    <img src="assets/chrome-badge.png" alt="Available in the Chrome Web Store" height="90">
  </a>  
</div>

## About
Came here because of the Facebook's recent update that hides reaction counts behind a hover? **Return Facebook Likes** is a lightweight browser extension that restores just that!

Simple, fully local, requires zero API permissions, and has zero tracking, zero telemetry, and no dependencies.

<p align="center">
  <img src="assets/comment.png" alt="Return Facebook Likes Screenshot">
</p>

## Key Features

* Instantly restores aggregate reaction counts on individual comments.
* Shows summed reaction totals on posts where the author has hidden the public count via Facebook's "Reaction Preferences."
* Appends numbers inside the native button layout, keeping the click target active so you can still click the count to see *who* reacted.
* It *should* work out of the box in multiple languages as it relies on structural punctuation so e.g. "1,5 tys." (PL) and "1.5K" (EN) are both accurately treated the same.
* No heavy event listeners. The entire extension operates on a single `childList` observer.

## Permissions & Privacy
This extension requires **zero browser API permissions**. 

While Chrome will display a warning saying the extension can *"Read and change your data on facebook.com"*, this is strictly because the extension must be able to insert the numbers into Facebook's page source.

## Installation

### Option 1: Chrome Web Store
The easiest way to use the extension:
1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/difgdoobfmnpndnikcghgbkbnhdnmoim).
2. Click **Add to Chrome**.

### Option 2: Manual Installation (Developer Mode)
If you want to run the extension directly from the source code:
1. Clone this repository or download the ZIP from [GitHub Releases](https://github.com/S4adam/return-facebook-likes/releases).
2. Extract the ZIP file on your computer.
3. Open Chrome and navigate to `chrome://extensions/`.
4. Enable **Developer mode** (toggle in the upper right corner).
5. Click **Load unpacked** in the upper left corner.
6. Select the extracted `fb-reaction-restorer` folder.

## License
This project is licensed under the GNU General Public License v2.0.