# Android “app” package (Fire tablet, home-screen icon)

Your site is a **PWA**; an **APK** is a thin **installable shell** that opens `https://jigsaw-kids.adammason93.workers.dev/` in full screen (no browser step for the child).

The repo now includes **192 / 512 / maskable** icons and an updated **`manifest.json`** so [PWABuilder](https://www.pwabuilder.com/) and [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) can package it reliably.

After you **deploy** those files to Workers, pick **one** route below.

---

## Option A — PWABuilder (fastest, no CLI)

1. Deploy this repo so `https://jigsaw-kids.adammason93.workers.dev/manifest.json` includes the new `icons` entries.
2. Open [https://www.pwabuilder.com/](https://www.pwabuilder.com/).
3. Enter your site root: `https://jigsaw-kids.adammason93.workers.dev/`
4. Let it **package** the PWA → download the **Android** app / APK steps it offers.
5. Move the **APK** to the Fire tablet and install (enable **install from unknown sources** for **Files** / **Silk** only if you sideload that way).

Opening the installed app uses your **Workers URL**; offline behaviour still follows your **service worker** after the first load.

---

## Option B — Bubblewrap (CLI, more control)

Needs **Node.js**, **JDK**, and **Android SDK** installed (typical Android Studio install).

```bash
cd /path/to/jigsaw-kids
npx @bubblewrap/cli init --manifest https://jigsaw-kids.adammason93.workers.dev/manifest.json
# follow prompts: package id e.g. dev.adammason93.jigsawkids
npx @bubblewrap/cli build
```

This produces a signing key and **APK/AAB** locally. See the [Bubblewrap README](https://github.com/GoogleChromeLabs/bubblewrap).

---

## Trusted Web Activity (optional polish)

For **Chrome’s** full TWA address-bar removal, Google expects a **Digital Asset Link** at:

`https://jigsaw-kids.adammason93.workers.dev/.well-known/assetlinks.json`

That ties your **signing key SHA-256** to the site. You generate the exact JSON **after** you have a release keystore; PWABuilder / Bubblewrap docs explain the fingerprint. Serve that file from the **same host** as your PWA.

Sideload APKs on Fire often work **without** asset links; add them if you publish to **Google Play** or want stricter TWA validation.

---

## What this repo added for you

| Item | Purpose |
|------|--------|
| `icons/icon-192.png`, `icon-512.png`, `icon-384-maskable.png` | PWABuilder / Android launcher & Play |
| `manifest.json` → `icons[]` | Lets packagers show a proper kid-friendly icon |
| `sw.js` cache bump + precache icons | Icons available offline after install |

---

**I can’t safely commit a built `.apk`**: it must be built and signed on **your** machine (or via PWABuilder’s flow) with **your** keystores.
