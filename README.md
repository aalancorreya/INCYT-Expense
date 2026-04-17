# INCYT Expense Report Dashboard

A single-file static web tool that transforms Airwallex CSV expense exports into an interactive drill-down report of project expenditure. Built as a standalone `index.html` file with no build step, designed for deployment on GitHub Pages. CSV parsing and all rendering happen client-side in the browser. Optionally, edits and the normalised dataset can be persisted back to a GitHub repository via the GitHub REST API (see **GitHub Sync** below).

![Dashboard](docs/dashboard.png)

> **Note:** Screenshots should be added to `docs/dashboard.png` once the tool is deployed.

---

## Features

- **PIN gate** -- soft access control prevents casual access (not cryptographic)
- **Drag-and-drop CSV upload** -- drop an Airwallex expense export onto the upload zone or click to browse
- **KPI summary cards** -- total spend, transaction count, unique projects, and date range at a glance
- **Monthly stacked bar chart** -- spend over time broken down by project, with interactive legend toggling
- **Project breakdown table** -- per-project totals with transaction counts, sortable
- **Category donut chart** -- expense category distribution (GL codes)
- **Merchant top-10 bar chart** -- highest-spend merchants ranked
- **Sortable transaction table** -- full transaction list with column sorting; click any row to open a detail drawer with all fields
- **Transaction detail drawer** -- slide-out panel showing every field for a selected transaction, including FX conversion details
- **FX rate settings** -- configure manual exchange rates (USD, EUR, GBP to AUD) via the Settings modal; rates persist in `localStorage`
- **Project name override rules** -- define keyword-based derivation rules to normalise or remap project names from raw CSV data; rules persist in `localStorage`
- **GitHub sync** -- optional: auto-load expenses from and write edits back to a GitHub repo using a classic or fine-grained PAT
- **Inline editing** -- edit project, category, description, and comment directly from the drawer; changes auto-push to GitHub when sync is enabled
- **Print to PDF** -- print-optimised layout with a branded cover page, date range, and applied filters
- **CSV export** -- export the currently filtered dataset as a clean CSV file
- **Project and status filters** -- filter the dashboard by project and/or transaction status
- **Responsive design** -- works on desktop and tablet screens

---

## How to Use

1. Open the tool in your browser (locally or via GitHub Pages).
2. Enter the PIN: **4471**.
3. Drag and drop your Airwallex CSV export file onto the upload area, or click to browse.
4. Explore the dashboard -- use the project and status dropdowns to filter, click chart segments for detail, and click table rows to open the transaction drawer.
5. Use the **Settings** (gear icon) to adjust FX rates or project derivation rules.
6. Use the **Print** button for a PDF-ready report, or the **Export** button to download filtered data as CSV.

> **Important:** The PIN is a soft gate only. It is stored as a plaintext constant in the HTML file. Do not rely on it for security in public or hostile-upload scenarios. There is no server-side authentication.

---

## Deploying to GitHub Pages

1. **Create a GitHub repository** (public or private):
   ```bash
   gh repo create my-expense-dashboard --public
   ```

2. **Push this folder's contents** to the repository:
   ```bash
   cd airwallex-expense-report
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/<username>/my-expense-dashboard.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to **Settings** > **Pages**
   - Under **Source**, select **Deploy from a branch**
   - Set **Branch** to `main` and **Folder** to `/ (root)`
   - Click **Save**

4. **Access the dashboard** at:
   ```
   https://<username>.github.io/my-expense-dashboard/
   ```

> **Note:** GitHub Pages on private repositories requires a GitHub Pro, Team, or Enterprise plan.

---

## Local Development

No build tools, package manager, or server required. Just open `index.html` in any modern browser:

```bash
# macOS
open index.html

# Windows
start index.html

# Linux
xdg-open index.html
```

---

## How to Change the PIN

The PIN is stored as a hash, not a plaintext constant. In `index.html`, find:

```js
const PIN_HASH = 1600858;   // hash of '4471'
```

To set a new PIN, run `hashString('your-new-pin')` in the browser console (the function is defined in the same script) and paste the resulting integer as the new `PIN_HASH` value.

> The PIN gate is a **soft gate only** — a simple polynomial hash over a 4-digit space is trivially brute-forceable from the browser console. It protects against casual shoulder-surfing, nothing more. Do not rely on it as a security boundary.

---

## GitHub Sync

The dashboard can read and write a normalised JSON dataset at `data/expenses.json` in a GitHub repo (default: `aalancorreya/INCYT-Expense`). When sync is enabled:

- On unlock, the dashboard fetches `data/expenses.json` from the repo and restores the last saved state.
- Inline edits (project, category, description, comment, project-derivation rules) are debounced and auto-pushed back to the repo.
- Conflicts are currently resolved last-write-wins — avoid editing from two tabs at once.

**To enable sync:** open **Settings** (gear icon), paste a GitHub Personal Access Token in the **GitHub Integration** field, and save.

**PAT requirements:** classic PAT with `repo` scope, or a fine-grained PAT with Contents read/write on the target repo.

**PAT storage:** the token is stored in `sessionStorage` and cleared when you close the tab. You will need to re-paste it for each new browser session.

To point at a different repo, edit the `REPO` constant in `GitHubSync` (around `index.html:1813`).

---

## Privacy and Security Notes

- **CSV parsing is client-side.** CSVs are read in-browser with `FileReader`; the file itself is never uploaded to any server.
- **Network calls.** External requests are: CDN libraries (Chart.js, PapaParse on jsDelivr — pinned with Subresource Integrity hashes), Google Fonts, and — only when GitHub Sync is enabled — `api.github.com`.
- **Session-only unlock.** The PIN unlock state does not persist beyond the current browser session.
- **PAT handling.** The GitHub PAT lives in `sessionStorage` only and never touches the DOM as plaintext (password input + API Authorization header).
- **FX rates and project rules** persist in `localStorage` so they survive tab close.
- **Content Security Policy.** The page ships with a restrictive CSP meta tag that blocks network calls outside `api.github.com` and scripts outside `cdn.jsdelivr.net`.
- **The PIN is a soft gate only.** It is a hash of a 4-digit numeric PIN; brute-forceable from the browser console. Use a private GitHub Pages deployment if you need real access control.

---

## Airwallex Export Instructions

1. Log in to your Airwallex account.
2. Navigate to **Expenses** in the left sidebar.
3. Click **Export** (or **Export CSV**) to download your expense data.
4. Upload the resulting CSV file to this dashboard.

The tool requires the following columns at minimum:

| Column | Example |
|---|---|
| `Transaction date UTC` | `2026-04-15` |
| `Billing amount` | `39.05` |
| `Billing currency` | `AUD` |
| `Transaction amount` | `39.05` |
| `Transaction currency` | `USD` |
| `Expense Id` | `7dcee872-a0f8-...` |
| `Transaction status` | `Succeeded` |
| `Department/Project` | `AgTech` |

Additional columns (Description, Merchant, Expense category, Employee(s), etc.) are used when present but are not strictly required.

---

## Tech Notes

- **Chart.js 4.4.1** (via jsDelivr CDN) -- bar charts and donut charts
- **PapaParse 5.4.1** (via jsDelivr CDN) -- CSV parsing
- **Inter font** (via Google Fonts) -- UI typography
- **No frameworks** -- vanilla HTML, CSS, and JavaScript
- **Offline capable** -- after the first load, CDN assets are typically cached by the browser. The tool will work offline if assets are already cached.

---

## Customising

### FX Rates

1. Click the **gear icon** in the top toolbar to open the Settings modal.
2. Under **FX Rates**, adjust the conversion rates for USD, EUR, GBP (or other currencies) to AUD.
3. Click **Save & Reprocess**. All transaction amounts are recalculated using the new rates.
4. Rates persist in `localStorage`.

### Project Derivation Rules

1. In the same Settings modal, scroll to **Project Derivation Rules**.
2. Add regex-to-project mappings (e.g., pattern `winch` → project `Winch Control` — order matters, first match wins).
3. Click **Save & Reprocess**. Transactions are re-categorised with the new rules.
4. Rules persist in `localStorage`.

### Persistent Changes

To make FX rates or project rules permanent defaults, edit the constants in the `<script>` section of `index.html`:

```js
const DEFAULT_FX = { AUD: 1, USD: 1.52, EUR: 1.65, GBP: 1.95 };
```

---

## Sample Data

A sample Airwallex export is included at `reference/sample_airwallex_export.csv` for testing.

---

## License

Internal tool -- INCYT / LX Pty Ltd.
