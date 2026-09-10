# 3D_Lite

Current GitHub Pages development build: **v3.94.0 — L3N GitHub Runtime**

## Live runtime workflow

1. Open the GitHub Pages site.
2. Click **Run L3N Runtime Test**.
3. Use **View Report** to inspect results in-page.
4. Use **Copy Report** to copy the JSON directly into ChatGPT.
5. `window.ThreeDLiteBrowserTestAPI` provides a stable browser automation API.

### Browser Test API

```js
await ThreeDLiteBrowserTestAPI.runAll()
ThreeDLiteBrowserTestAPI.getHealth()
ThreeDLiteBrowserTestAPI.getReport()
ThreeDLiteBrowserTestAPI.getReportJSON()
await ThreeDLiteBrowserTestAPI.copyReport()
```

`main` should remain the last browser-confirmed good build.
