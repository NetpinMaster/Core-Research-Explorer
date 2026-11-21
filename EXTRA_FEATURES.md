# Extra Features — CORE Research Explorer

This document explicitly separates **optional enhancements** implemented in Phase 8 from the **mandatory core requirements** delivered and verified in Phases 1–7.

All mandatory requirements (CORE API v3 integration via secure server-side proxy, verbatim Boolean search with parentheses validation, dynamic result count control for 10/20/50/100 works, structured paper cards, Chart.js publication-year analytics chart with accessible data table, loading/empty/error states, and responsive WCAG 2.2 AA layout) were completed and verified first.

---

## Optional Enhancements Included

### 1. Accessible Paper Detail Viewer (`PaperDetailDialogComponent`)
- **Purpose:** Lets researchers inspect the full, untruncated title, complete author roster (beyond the 5-author card summary), full sanitized abstract, structured publication metadata (journal, publisher, repository, field of study, language, DOI, CORE citation count when returned, and CORE work ID), and all available external links without leaving the current result list.
- **Accessibility:** Uses Angular CDK `CdkTrapFocus` (`@angular/cdk/a11y`), `role="dialog"`, `aria-modal="true"`, backdrop click dismissal, `Escape` key dismissal, and background scroll locking.

### 2. Recent Search History (`SearchHistoryService`)
- **Purpose:** Persists up to 6 recent successful queries and their selected result limits in `localStorage` so researchers can re-run previous Boolean expressions with one click or clear their history at any time.
- **Safety:** Strictly validates stored JSON payloads on hydration (ignoring malformed entries, overly long queries, or unsupported limits).

### 3. Formula-Safe CSV Export (`csv-export.util.ts`)
- **Purpose:** Exports the currently retrieved CORE research papers to a UTF-8 CSV file (with Excel-friendly BOM) from the results toolbar (`Export CSV`).
- **Security:** Neutralizes spreadsheet formula-injection prefixes (`=`, `+`, `-`, `@`) and applies RFC-4180 quoting for commas, quotes, and line breaks. Filenames are sanitized ASCII slugs derived from the active query and date.

### 4. One-Click Copy DOI / Publication Link (`clipboard.util.ts`)
- **Purpose:** Adds a one-click `Copy DOI` (or `Copy link` fallback when no DOI is returned) action on both paper cards and the paper detail dialog, with screen-reader `aria-live="polite"` confirmation (`Copied`).

### 5. Light & Dark Theme Toggle (`ThemeService`)
- **Purpose:** Provides a header toggle between the default academic light theme and a high-contrast dark theme (`:root[data-theme='dark']`), persisted in `localStorage`.
- **Chart Synchronization:** `PublicationYearChartComponent` observes `data-theme` attribute changes and updates Chart.js bar, axis, gridline, and tooltip colors automatically.

### 6. Metadata Completeness Indicator (`metadata-completeness.util.ts`)
- **Purpose:** Evaluates real CORE record completeness across five scholarly fields (`Publication year`, `Authors`, `Abstract`, `DOI`, and `Venue / Repository`) without fabricating missing fields. Displayed inline as subtle text (`Metadata: X/5`) on cards with a descriptive tooltip and full breakdown inside the Paper Detail Viewer.

### 7. Debounced Live Search Suggestions (`SearchSuggestionsService` + `query-suggestions.util.ts`)
- **Purpose:** Fetches real matching works from CORE API v3 (`/api/core/search?limit=10`) as the user types and extracts frequency-ranked scholarly query prefix completions, preserving leading Boolean expressions (e.g., `drone AND deliv` -> `drone AND delivery`).
- **Rate-Limit Discipline:** Uses RxJS `debounceTime(350)`, `distinctUntilChanged()`, and `switchMap()` to throttle typing requests, cancel stale in-flight requests, and fail silently on transient rate-limit errors without interrupting the primary search workflow.
- **Accessibility:** Implemented as an ARIA `combobox` + `listbox` with `ArrowDown`, `ArrowUp`, `Enter`, and `Escape` keyboard support.
