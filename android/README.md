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

### PWABuilder not working? Check these first

1. **Use the live HTTPS URL only** — Paste your **deployed** root, e.g. `https://jigsaw-kids.adammason93.workers.dev/` (with trailing slash is fine). **Localhost / file:// will fail** unless you use a tunnel (ngrok, Cloudflare Tunnel).

2. **Same URL you ship** — `manifest.json` uses **paths relative to the manifest** (`./index.html`, `icons/...`). That matches both a **root domain** and a **subfolder** (e.g. GitHub Pages `…/jigsaw-kids/`). If you previously used `/manifest.json` only at the **origin root**, a project site would 404 the manifest; the repo now uses `href="manifest.json"` on the portal so the link always matches the folder the app lives in.

3. **Open the site once in a normal browser** before re-running PWABuilder so the **service worker** can register; then run the report again.

4. **403/404 on manifest or icons** — In the browser, open `yoursite/manifest.json` and `yoursite/icons/icon-192.png` ; both must load. **Content-Type** for the manifest should be `application/manifest+json` or `application/json` (this repo’s `_headers` does that on static hosts that respect it).

5. **Ad / privacy blockers** — Some block service workers; try an incognito window with extensions off, or another device.

6. **Interpreting PWABuilder** — A yellow “Service worker” or “Installable” item is a **hint**; the **Package** / **Download** step for Android can still work if the **required** fields (name, icons, start_url, display) are valid. Use the in-site **Report card** copy-paste or “View errors” for the exact line.

If it still fails, copy the **exact error text** or a screenshot of the report card and compare to [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) (Option B) with the same public `manifest` URL.

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

## APK shows a URL bar and a close button?

That chrome is **not** coming from your HTML. The wrapper (PWABuilder / Bubblewrap / TWA) is opening your site in **Custom Tabs fallback** because **Digital Asset Links** are missing or wrong.

**Fix:**

1. Use the **same hostname** in the browser as in the APK (`https://jigsaw-kids.adammason93.workers.dev` — or whatever you ship in `twa-manifest.json` / PWABuilder).
2. **Get your app’s SHA-256 cert fingerprint**  
   - *Bubblewrap:* after `build`, check the project or run  
     `keytool -list -v -keystore YOUR.keystore -alias android`  
   - *PWABuilder:* it usually shows the fingerprint when you generate the package, or use Play App Signing in Play Console if published.
3. Publish **`/.well-known/assetlinks.json`** on **that exact host** (HTTPS, no redirect to a different domain), for example:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "YOUR.APPLICATION.ID",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:…full SHA-256 of your signing cert…"
      ]
    }
  }
]
```

4. Replace `YOUR.APPLICATION.ID` with the **Java application id** from your Android project (e.g. `dev.adammason93.jigsawkids`).
5. Deploy, wait a few minutes, **reinstall the APK** (or clear Chrome / WebView data for the app), then open again — the bar should disappear when verification succeeds.

Details: [Digital Asset Links](https://developer.android.com/training/sign-in/passkeys#add-link) (Google) and [TWA quality criteria](https://developer.chrome.com/docs/android/trusted-web-activity/).

**Note:** A plain **WebView** APK (not TWA) hides the bar by using a fullscreen `WebViewActivity` with **no** Custom Tabs — but then you build/configure that in Android Studio, not in this repo.

---

## What this repo added for you

| Item | Purpose |
|------|--------|
| `icons/icon-192.png`, `icon-512.png`, `icon-384-maskable.png` | PWABuilder / Android launcher & Play |
| `manifest.json` → `icons[]` | Lets packagers show a proper kid-friendly icon |
| `sw.js` cache bump + precache icons | Icons available offline after install |

---

**I can’t safely commit a built `.apk`**: it must be built and signed on **your** machine (or via PWABuilder’s flow) with **your** keystores.
