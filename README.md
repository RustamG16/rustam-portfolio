# Rustam Gurbanov portfolio

This directory is the complete public GitHub Pages site. It is a dependency-free static deployment: every font, image, video and browser runtime file is served from this repository, with no build step and no analytics.

## Before publishing

Run these checks from the parent workspace:

```powershell
node _verify/launch-check.mjs
Push-Location site; node ci/check-refs.mjs; Pop-Location
node _verify/verify-preview.mjs
```

Review every PDF in `assets/` before publishing: GitHub Pages is public and each committed document is downloadable.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` deploys `main` only after the local-reference gate succeeds. In the GitHub repository settings, set Pages → Source to **GitHub Actions**, then confirm the deployment URL and enable **Enforce HTTPS**. Do not put API keys, source inputs, verification screenshots, plans, or private material in this directory.
