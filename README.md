# Hisaab — Private Money Tracker

Free, offline-first money tracker. Data lives in **your Google Sheet**, not on any server.

**Live app:** just open `index.html` — no build step needed.

## Files
- `index.html` — the app (single file, works offline)
- `sw.js` — offline cache + background sync
- `manifest.webmanifest` / `icon.svg` / `icon-192.png` / `icon-512.png` — PWA install

## Host on GitHub Pages (free, 2 min)
1. Create a new repo on github.com (name e.g. `hisaab`, Public)
2. Upload all 6 files to the root (drag-drop on github.com, or `git push`)
3. Settings → Pages → Source: **main** branch, **/ (root)** → Save
4. Your URL: `https://YOUR-USERNAME.github.io/hisaab/` — opens in 30-60 sec

To update: just upload the new `index.html` again.

## Download from GitHub (no Netlify needed)
- Visitors: **Code → Download ZIP** on your repo page
- You: **Releases → Create release** to add versioned zips (e.g. v1.0, v2.0)

> Never commit your Sheet URL or PIN — those stay only on your phone (in app Settings).

Free forever · works offline · syncs to your Sheet when online
