# CORE Research Explorer

**CORE Research Explorer** is a production-quality **Angular 20** scientific research discovery and publication analytics web application powered by the [CORE API v3](https://api.core.ac.uk/docs/v3). It enables researchers, students, and engineers to run Boolean literature searches across open-access scholarly works, control result sample size dynamically, inspect sanitized publication metadata, and analyse publication-year trends with interactive Chart.js visualizations.

Built with standalone zoneless Angular 20 components, strict TypeScript, Angular Signals, RxJS request cancellation and debouncing, Reactive Forms, Angular CDK accessibility primitives, Chart.js, SCSS design tokens, and a lightweight Express API proxy that keeps API credentials strictly server-side.

---

## Table of Contents

1. [Core Features](#1-core-features)
2. [Optional Enhancements](#2-optional-enhancements)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture & Project Structure](#4-system-architecture--project-structure)
5. [CORE API v3 Integration & Verified Behaviour](#5-core-api-v3-integration--verified-behaviour)
6. [Security & API Credential Handling](#6-security--api-credential-handling)
7. [Boolean Search Syntax Guide](#7-boolean-search-syntax-guide)
8. [Dynamic Result Count Control](#8-dynamic-result-count-control)
9. [Research Analytics Methodology](#9-research-analytics-methodology)
10. [Accessibility & Responsive Design](#10-accessibility--responsive-design)
11. [Prerequisites & Installation](#11-prerequisites--installation)
12. [Environment Configuration](#12-environment-configuration)
13. [Running Locally](#13-running-locally)
14. [Testing & Quality Assurance](#14-testing--quality-assurance)
15. [Production Build & Deployment](#15-production-build--deployment)
16. [Publishing to GitHub](#16-publishing-to-github)
17. [Limitations, Trade-Offs & Attribution](#17-limitations-trade-offs--attribution)

---

## 1. Core Features

- **Live CORE API v3 Literature Search:** Queries open-access scholarly works from CORE via a validated server-side proxy (`/api/core/search`) with zero fabricated records or mock fallbacks.
- **Full Boolean Search Engine:** Supports single keywords, uppercase Boolean operators (`AND`, `OR`, `NOT`), quoted exact phrases, field prefixes, and nested parentheses such as `(drone AND (package OR delivery))` with client-side syntax validation.
- **Dynamic Result Count Control:** Lets users choose `10`, `20`, `50`, or `100` papers per request, re-querying CORE automatically when an active search is present and distinguishing **Requested** vs. **Returned** counts alongside total CORE matches.
- **Structured Research Paper Cards:** Displays only verified fields returned by CORE (publication year, venue/journal/publisher, field of study, open-access full-text status, title, authors, sanitized abstract, DOI, repository, and safe external links).
- **Publication-Year Analytics Chart:** Aggregates publication years from retrieved papers into a responsive **Chart.js** bar chart titled *"Publication years of retrieved papers"*, paired with KPI metrics (`Analysed papers`, `Earliest year`, `Latest year`, `Missing dates`), tooltips, and an accessible data table on both the Discover sidebar and the dedicated `/analytics` view.
- **Resilient State Handling:** Clear loading skeletons, idle/empty guidance, and actionable error banners (`Retry search`) for rate limits (`429`), upstream outages (`5xx`), bad expressions (`400`), timeouts, and offline conditions.
- **Responsive Across Viewports:** Verified with zero horizontal overflow at desktop (`1440px`), tablet (`768px`), and mobile (`390px`).

---

## 2. Optional Enhancements

Additional workflow improvements were built only after all mandatory features were verified. They are separated and documented in detail in [`EXTRA_FEATURES.md`](./EXTRA_FEATURES.md):

- **Debounced Live Search Suggestions** (`SearchSuggestionsService` using RxJS `debounceTime(350)` + `distinctUntilChanged()` + `switchMap()` deriving prefix completions from real CORE titles with ARIA combobox keyboard navigation)
- **Accessible Paper Detail Viewer** (`PaperDetailDialogComponent` using `@angular/cdk/a11y` focus trapping)
- **Recent Search History** (`SearchHistoryService` with schema-validated `localStorage` persistence)
- **Formula-Safe CSV Export** (`csv-export.util.ts` with UTF-8 BOM and spreadsheet formula-injection neutralization)
- **One-Click Copy DOI / Link** with `aria-live="polite"` confirmation
- **Light & Dark Theme Toggle** (`ThemeService` with automatic Chart.js palette synchronization)
- **Metadata Completeness Indicator** (`metadata-completeness.util.ts`)

---

## 3. Technology Stack

| Layer | Technology | Version |
| :--- | :--- | :--- |
| Frontend Framework | Angular (Standalone, Zoneless, Signals) | `~20.3.35` |
| Language | TypeScript (strict + `strictTemplates`) | `~5.9.3` |
| Asynchronous & State | RxJS (`switchMap`, `debounceTime`, `distinctUntilChanged`) + Signals | `~7.8.2` |
| Forms & Accessibility | Angular Reactive Forms + `@angular/cdk` (`a11y`) | `~20.2.14` |
| Data Visualization | Chart.js (tree-shaken bar chart controller) | `^4.5.1` |
| Styling | SCSS with CSS custom property design tokens | Angular CLI Sass |
| Backend Proxy | Node.js + Express (`tsx`) | Express `^4.21.2` |
| Automated Testing | Angular `@angular/build:unit-test` (Vitest + jsdom) & Node `node:test` | Vitest `^3.2.7` |

---

## 4. System Architecture & Project Structure

### Request & Data Flow

```text
User Input (Reactive Forms)
   │
   ├──► Typing Draft ──► SearchSuggestionsService (RxJS debounceTime(350) + distinctUntilChanged + switchMap)
   │                           └──► CoreApiService.fetchSuggestionTitles() ──► GET /api/core/search?limit=10
   │
   └──► Submit / Limit / Sort ──► ResearchSearchStore (Boolean & Limit Validators + RxJS switchMap cancellation)
                                       └──► CoreApiService.searchWorks() ──► GET /api/core/search
                                                                                  │
                                                                      Express Proxy (server/core-proxy.ts)
                                                                      • Strict param validation & SSRF lock
                                                                      • Optional server-side Bearer CORE_API_KEY
                                                                      • 60s bounded TTL cache (50 entries)
                                                                                  │
                                                                                  ▼
                                                                  https://api.core.ac.uk/v3/search/works/
                                                                                  │
                                                                                  ▼
                                                                  paper-mapper.util.ts + text-sanitizer.util.ts
                                                                  year-aggregation.util.ts ──► Chart.js Bar Chart
```

### Directory Structure

```text
.
├── server/
│   ├── core-proxy.ts                         # SSRF-locked CORE v3 proxy, validation, 60s TTL cache
│   ├── core-proxy.test.ts                    # Node test suite for proxy validation, caching, errors
│   └── server.ts                             # Express server serving Angular dist & /api/core/search
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── configuration/api.config.ts   # InjectionToken for API limits and endpoints
│   │   │   ├── interceptors/http-error.interceptor.ts
│   │   │   ├── models/
│   │   │   │   ├── core-api.models.ts        # Strict CORE API v3 DTOs
│   │   │   │   └── research-paper.model.ts   # Clean domain models
│   │   │   └── services/
│   │   │       ├── core-api.service.ts       # Typed HttpClient wrapper (+ .spec.ts)
│   │   │       ├── research-search.store.ts  # Signal + RxJS switchMap store (+ .spec.ts)
│   │   │       ├── search-history.service.ts # Validated localStorage history (+ .spec.ts)
│   │   │       ├── search-suggestions.service.ts # RxJS debounceTime suggestions (+ .spec.ts)
│   │   │       └── theme.service.ts          # Light/dark theme persistence (+ .spec.ts)
│   │   ├── features/
│   │   │   ├── research-search/
│   │   │   │   ├── research-explorer-page.component.ts (+ integration .spec.ts)
│   │   │   │   └── research-search-bar/      # Reactive form, combobox suggestions, syntax guide
│   │   │   ├── research-results/
│   │   │   │   ├── paper-detail-dialog/      # CDK focus-trapped full-record modal
│   │   │   │   ├── research-paper-card/      # Structured scholarly card + copy + completeness
│   │   │   │   └── research-results-toolbar/ # Requested/Returned counts, sort, CSV export
│   │   │   └── research-analytics/
│   │   │       ├── analytics-page.component.ts
│   │   │       ├── analytics-panel/          # KPI summary + chart states
│   │   │       └── publication-year-chart/   # Tree-shaken Chart.js bar chart + data table
│   │   ├── shared/
│   │   │   ├── components/                   # Header, footer, skeletons, state feedback
│   │   │   ├── utilities/                    # Text sanitizer, mapper, year aggregation, CSV, clipboard, suggestions
│   │   │   └── validators/                   # Boolean query validator, result limit validator
│   │   ├── app.component.ts
│   │   ├── app.config.ts                     # Zoneless change detection, router, HttpClient
│   │   └── app.routes.ts                     # Lazy-loaded Discover ('') and Analytics ('analytics')
│   ├── environments/
│   └── styles/                               # _tokens.scss, _mixins.scss, styles.scss
├── EXTRA_FEATURES.md                         # Explicit inventory of optional Phase 8–9 enhancements
├── .env.example                              # Safe environment variable template
├── angular.json
├── proxy.conf.json                           # Angular CLI dev proxy forwarding /api to port 3000
└── package.json
```

---

## 5. CORE API v3 Integration & Verified Behaviour

All API assumptions were verified directly against the [CORE API v3 documentation](https://api.core.ac.uk/docs/v3) and live responses from `api.core.ac.uk`:

1. **Canonical Trailing-Slash Endpoint:** Requests target `https://api.core.ac.uk/v3/search/works/` (with trailing slash). Calling `/v3/search/works` without a trailing slash triggers an upstream `HTTP 301` redirect.
2. **Authentication & Quotas:** Unauthenticated requests currently return `HTTP 200` under shared rate limits (`x-ratelimit-limit: 10`, `x-ratelimit-remaining`, `x-ratelimit-retry-after`). Configuring a free server-side `CORE_API_KEY` (`Authorization: Bearer <key>`) unlocks higher throughput.
3. **Single-Request Limits:** CORE API v3 natively supports `limit` up to `100` in a single request (`10`, `20`, `50`, and `100` were all live-verified).
4. **Upstream Data Hygiene Handled Defensively:**
   - `yearPublished` can contain sentinel values such as `9999` or `0`; years outside `1400 .. currentYear + 1` are rejected (with fallback to ISO `publishedDate` when valid) and counted under **Missing dates**.
   - `abstract` fields frequently include double-encoded HTML entities and truncated trailing tags (e.g., `&lt;/p&gt` or `</p`); `text-sanitizer.util.ts` decodes and strips tags cleanly into plain text without `innerHTML`.
   - Placeholder `fullText` strings (`"Not available for public API users."`) are filtered out.
5. **Outer-Parentheses `totalHits` Nuance:** CORE API v3 accepts nested expressions verbatim, including `(drone AND (package OR delivery))`, and returns properly filtered top matches (e.g., *"Aero Drone Package Delivery System"*). However, CORE's upstream `totalHits` counter may report a broader estimate when outer parentheses wrap the entire query compared to omitting the outer pair. Expressions are intentionally forwarded verbatim without rewriting user syntax.
6. **Search Suggestions Approach:** CORE API v3 does not expose a dedicated public `/suggest` endpoint. Live debounced suggestions (`SearchSuggestionsService`) therefore query `/api/core/search?q=<activePrefix>&limit=10` and rank real scholarly prefix completions extracted from returned CORE paper titles.

---

## 6. Security & API Credential Handling

- **Server-Side Secrets Only:** `CORE_API_KEY` is read exclusively by `server/server.ts` from environment variables and injected into upstream `Authorization: Bearer` headers. It is never bundled into Angular client assets or committed to Git.
- **SSRF-Locked Proxy:** `server/core-proxy.ts` constructs URLs strictly against the hardcoded `CORE_WORKS_SEARCH_URL` constant, validates `q` (non-empty, `<= 500` chars, no control characters), `limit` (`1..100`), `offset` (`0..9900`), and `sort` allowlist, and enforces a 15-second upstream timeout.
- **XSS & Link Hardening:** All CORE text renders through Angular interpolation (zero `innerHTML` or `bypassSecurityTrust*`). External URLs are validated for `http:` / `https:` schemes only and open with `target="_blank" rel="noopener noreferrer"`.
- **CSV Formula Injection Protection:** Exported cells starting with `=`, `+`, `-`, or `@` are neutralized with a leading apostrophe and RFC-4180 quoted.

---

## 7. Boolean Search Syntax Guide

| Example Query | Behaviour |
| :--- | :--- |
| `drone` | Matches works referencing `drone`. |
| `drone AND delivery` | Requires both terms (uppercase `AND`). |
| `drone OR delivery` | Matches works containing either term (uppercase `OR`). |
| `(drone AND (package OR delivery))` | Preserves explicit operator precedence with nested balanced parentheses. |
| `drone AND NOT military` | Excludes works matching the negated term. |
| `title:"autonomous flight" AND yearPublished>=2020` | Combines exact quoted phrases, CORE field prefixes, and numeric filters. |

Client-side validation (`boolean-query.validator.ts`) checks empty queries, maximum length (`500` chars), balanced parentheses, balanced quotes, unsupported `&&`/`||` operators, and misplaced binary operators before dispatching HTTP requests.

---

## 8. Dynamic Result Count Control

- Users can choose **`10`**, **`20`**, **`50`**, or **`100`** papers per request via the `Results` selector.
- Changing the selector when no query is active updates the preferred limit silently (`0` network requests).
- Changing the selector while a search is active cancels any in-flight request via RxJS `switchMap`, re-queries CORE with the new limit, and synchronizes paper cards, toolbar metrics (`Requested: X · Returned: Y`), and the Chart.js publication-year distribution.

---

## 9. Research Analytics Methodology

- **Transparent Sample Scope:** The analytics panel and `/analytics` page clearly state *"Publication years of retrieved papers"* and report the exact sample size (`analysedCount`) alongside total CORE matches (`totalHits`), avoiding misleading corpus-wide claims.
- **Chronological Aggregation:** `aggregatePublicationYears` groups valid years (`1400 .. currentYear + 1`) in ascending chronological order, tracks `missingDateCount` explicitly, and identifies the peak year and share percentages.
- **Accessible Chart Presentation:** The Chart.js `<canvas>` exposes `role="img"` and a dynamic summary `aria-label`, paired with a semantic `<table>` (`sr-only` in the sidebar and toggleable as a visible breakdown table on `/analytics`).

---

## 10. Accessibility & Responsive Design

- **WCAG 2.2 AA Practices:** Semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`), skip-to-content link, visible focus rings (`--focus-ring`), `aria-live="polite"` status regions, `role="alert"` validation errors, ARIA `combobox`/`listbox` autocomplete keyboard support, and CDK focus trapping in the Paper Detail modal.
- **Motion & Contrast:** Transitions remain within `<= 200ms` and respect `prefers-reduced-motion: reduce` (including setting Chart.js animation duration to `0`). Both light and dark themes maintain high text contrast.
- **Responsive Breakpoints:** Verified cleanly with zero horizontal overflow at `1440×900` (desktop), `768×1024` (tablet), and `390×844` (mobile).

---

## 11. Prerequisites & Installation

- **Node.js:** `>= 20.19` (verified on Node `v22.23.2`)
- **npm:** `>= 10`

```bash
git clone <your-repository-url>
cd core-research-explorer
npm install
```

---

## 12. Environment Configuration

Copy `.env.example` to `.env` for local configuration:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `CORE_API_KEY` | Optional (recommended) | *(empty)* | Free API key from [CORE Services Portal](https://core.ac.uk/services/api) for higher rate limits. Used strictly server-side. |
| `PORT` | Optional | `3000` | Port for the Express server hosting the Angular build and `/api/core/search`. |

---

## 13. Running Locally

### Option A: Unified Production-Like Server (Recommended)

Builds the Angular app and starts the Express server on `http://localhost:3000`:

```bash
npm run build
npm run dev
```

Verify proxy health at `http://localhost:3000/api/health`.

### Option B: Angular CLI Live Dev Server + Proxy

Run the API proxy in one terminal and Angular CLI dev server on port `4200` (proxying `/api/*` via `proxy.conf.json`) in another:

```bash
# Terminal 1 (API proxy on port 3000)
npm run dev

# Terminal 2 (Angular CLI dev server on port 4200)
npm run dev:ng
```

---

## 14. Testing & Quality Assurance

Run all automated checks:

```bash
# 1. Angular unit, component & integration tests (Vitest + jsdom — 21 spec files, 59 tests)
npm test

# 2. Server-side CORE proxy tests (Node test runner — 5 tests)
npx tsx --test server/core-proxy.test.ts

# 3. Strict TypeScript checks (Angular app + Express server)
npm run lint

# 4. Production Angular build verification
npm run build
```

---

## 15. Production Build & Deployment

All three deployment targets reuse the shared SSRF-locked CORE API v3 proxy (`server/core-proxy.ts`) so `CORE_API_KEY` remains strictly server-side and never enters the Angular browser bundle.

### Option 1: Node.js / Express Hosting (Render, Railway, Fly.io, Cloud Run, VPS)

```bash
npm ci
npm run build
NODE_ENV=production PORT=3000 npm start
```

Configure `CORE_API_KEY` in your hosting provider's secret environment variables and verify `GET /api/health` returns `{"status":"ok","authenticated":true}`.

### Option 2: Vercel (Recommended Serverless)

Pre-configured via [`vercel.json`](./vercel.json), [`api/core/search.ts`](./api/core/search.ts), and [`api/health.ts`](./api/health.ts):

1. Import the GitHub repository into [Vercel](https://vercel.com/) (or run `npx vercel --prod` locally).
2. Vercel detects `vercel.json`:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/core-research-explorer/browser`
   - **Serverless Proxy:** `/api/core/search` and `/api/health`
3. Add `CORE_API_KEY` under **Project Settings → Environment Variables** (Production & Preview) and redeploy.

### Option 3: Netlify

Pre-configured via [`netlify.toml`](./netlify.toml), [`netlify/functions/core-search.ts`](./netlify/functions/core-search.ts), and [`netlify/functions/health.ts`](./netlify/functions/health.ts):

1. Connect the GitHub repository in [Netlify](https://www.netlify.com/) (or run `npx netlify deploy --prod`).
2. Netlify applies `netlify.toml`:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist/core-research-explorer/browser`
   - **Functions Directory:** `netlify/functions` (rewritten cleanly from `/api/core/search` and `/api/health`)
3. Add `CORE_API_KEY` under **Site configuration → Environment variables** and trigger a deploy.

---

## 16. Publishing to GitHub

This repository maintains a clean, incremental local commit history on `main`:

```bash
git log --oneline
```

To publish to a new public GitHub repository:

```bash
git remote add origin https://github.com/<your-username>/core-research-explorer.git
git branch -M main
git push -u origin main
```

Double-check that `.env` is ignored before pushing (`git status`).

---

## 17. Limitations, Trade-Offs & Attribution

- **Keyless Rate Limits:** Without `CORE_API_KEY`, CORE enforces a shared upstream limit (~10 requests per window). The server proxy mitigates redundant traffic via a 60-second in-memory TTL cache (50 entries), and search suggestions debounce input by `350ms`.
- **Sample-Level Analytics:** Publication-year charts aggregate the retrieved result page (`10`–`100` works) rather than scanning all matching works across CORE's full index.
- **Pagination:** Single-request result count control (`10`–`100`) is implemented per project scope; multi-page offset pagination can be layered directly onto `CoreApiService`'s existing `offset` parameter.
- **Data Attribution:** Scholarly metadata is retrieved from [CORE (Connecting Repositories)](https://core.ac.uk/) via the [CORE API v3](https://api.core.ac.uk/docs/v3).
