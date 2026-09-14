# Cloudflare Pages deployment

3DLite is prepared for direct Cloudflare Pages deployment while GitHub remains the source of truth.

## Project
- Repository: `3dmk/3D_Lite`
- Production branch: `main`
- Pages project name: `3d-lite`
- Build command: none (static site)
- Build output directory: repository root (`.`)

## Direct Git integration
Connect the GitHub repository to Cloudflare Pages and select `main` as the production branch. Each push to `main` then creates a new Cloudflare deployment automatically.

GitHub Pages can remain enabled as the fallback deployment.
