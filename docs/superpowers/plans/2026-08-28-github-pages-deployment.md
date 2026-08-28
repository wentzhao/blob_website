# GitHub Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Astro static site from `wentzhao/blob_website` to GitHub Pages at `https://wentzhao.github.io/blob_website/` with working sub-path assets, navigation, RSS, and Pagefind search.

**Architecture:** Keep the existing static Astro build and GitHub Actions Pages workflow. Make the Astro `site` and `base` values environment-driven, and derive the project base path from the repository name in Actions so local root-path development remains unchanged.

**Tech Stack:** Astro 7, pnpm, Pagefind, GitHub Actions, GitHub Pages.

**Spec:** User request to deploy the current website to GitHub Pages.

## Global Constraints

- Do not add a new runtime dependency.
- Preserve root-path local development and preview behavior when no deployment environment variables are set.
- Build and verify the generated static output before pushing deployment changes.
- Keep the CMS out of the Pages artifact; deploy only the root `dist/` output produced by `pnpm build`.

---

### Task 1: Make Astro deployment URL and base path configurable

**Files:**
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: `PUBLIC_SITE_URL` and `BASE_PATH` environment variables.
- Produces: Astro `site` and `base` configuration used by `import.meta.env.BASE_URL`, canonical URLs, RSS, and generated asset links.

- [ ] **Step 1: Update the Astro configuration**

Use `PUBLIC_SITE_URL` for the production origin and `BASE_PATH` for an optional project-site prefix, while keeping `https://example.com` and root-path behavior as local defaults:

```js
  site: process.env.PUBLIC_SITE_URL || 'https://example.com',
  base: process.env.BASE_PATH || '/',
```

- [ ] **Step 2: Run the existing build for the local default**

Run: `pnpm build`

Expected: the static build and Pagefind indexing complete successfully, with output in `dist/`.

### Task 2: Verify project-site output under the GitHub Pages sub-path

**Files:**
- No source files; inspect generated `dist/` output.

**Interfaces:**
- Consumes: Task 1's `BASE_PATH=/blob_website` and `PUBLIC_SITE_URL=https://wentzhao.github.io/blob_website` configuration.
- Produces: evidence that generated HTML, CSS, JavaScript, favicon, navigation, RSS, and Pagefind URLs include `/blob_website` where required.

- [ ] **Step 1: Build with the repository's GitHub Pages values**

Run in PowerShell:

```powershell
$env:PUBLIC_SITE_URL = 'https://wentzhao.github.io/blob_website'
$env:BASE_PATH = '/blob_website'
pnpm build
Remove-Item Env:PUBLIC_SITE_URL
Remove-Item Env:BASE_PATH
```

Expected: the build completes successfully and generated pages are still emitted under `dist/`.

- [ ] **Step 2: Inspect generated references**

Run:

```powershell
rg -n 'https://wentzhao.github.io/blob_website|/blob_website/' dist --glob '*.html' --glob '*.css' --glob '*.js'
```

Expected: generated internal links and assets use the project prefix, and the RSS link uses the GitHub Pages URL.

### Task 3: Harden the GitHub Actions Pages workflow

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: GitHub Actions `github.repository` and `github.repository_owner` context values.
- Produces: a Pages artifact built with the correct project URL and base path on pushes to `main`.

- [ ] **Step 1: Set deployment environment variables in the build step**

Add these environment variables to the existing `Build` step:

```yaml
        env:
          PUBLIC_SITE_URL: https://${{ github.repository_owner }}.github.io/${{ github.event.repository.name }}
          BASE_PATH: /${{ github.event.repository.name }}
```

- [ ] **Step 2: Preserve the Pages artifact and deployment permissions**

Keep `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`, and the existing `pages: write` / `id-token: write` permissions unchanged.

- [ ] **Step 3: Inspect the workflow for valid YAML and intended values**

Run:

```powershell
Get-Content .github/workflows/deploy.yml
```

Expected: the build step exports the two variables, installs the root workspace dependencies, runs `pnpm build`, and uploads only `dist/`.

### Task 4: Verify and hand off GitHub Pages activation

**Files:**
- Modify: `README.md` only if deployment instructions need to be documented.

**Interfaces:**
- Consumes: the validated workflow and generated artifact.
- Produces: a pushed workflow ready for GitHub Pages, plus the exact Pages URL and any remaining repository-setting action.

- [ ] **Step 1: Run the final local build**

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 2: Review the diff and repository state**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only the intended deployment configuration and plan documentation are changed.

- [ ] **Step 3: Commit the deployment configuration**

Run:

```powershell
git add astro.config.mjs .github/workflows/deploy.yml docs/superpowers/plans/2026-08-28-github-pages-deployment.md
git commit -m "feat: configure GitHub Pages deployment"
```

- [ ] **Step 4: Push `main` and report the activation requirement**

Run: `git push origin main`

Expected: GitHub Actions starts the Pages workflow. If Pages is not already configured to use GitHub Actions, enable it in the repository's Settings → Pages → Build and deployment → Source: GitHub Actions. The intended URL is `https://wentzhao.github.io/blob_website/`.

