# INCYT Expense Report Dashboard

A single-file, static web tool that transforms Airwallex CSV expense exports into an interactive drill-down report of project expenditure. Built as a standalone `index.html` file with no build step, designed for deployment on GitHub Pages. All data processing happens client-side in the browser -- no data leaves your device.

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
- **FX rate settings** -- configure manual exchange rates (USD, EUR, GBP to AUD) via the Settings modal; rates are stored in session storage
- **Project name override rules** -- define keyword-based derivation rules to normalise or remap project names from raw CSV data
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

The PIN is defined as a single constant near the top of the `<script>` section in `index.html`:

```js
const PIN = '4471';
```

Change the string value to any new PIN and save the file. No other changes are needed.

---

## Privacy and Security Notes

- **All processing is client-side.** CSV files are read using the browser's `FileReader` API. No data is transmitted to any server.
- **No backend.** The tool is a single static HTML file with no server-side component.
- **No network requests for data.** The only external requests are for CDN-hosted libraries (Chart.js, PapaParse, Google Fonts) on first load.
- **Session-only unlock.** The PIN unlock state does not persist beyond the current browser session.
- **The PIN is a soft gate only.** It is visible in the page source. Do not use this tool as a security boundary for sensitive data in hostile environments.
- **FX rates and project rules** are stored in `sessionStorage` and cleared when the browser tab is closed.

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
3. Click **Apply**. All transaction amounts will be recalculated using the new rates.
4. Rates are stored in `sessionStorage` for the current tab only.

### Project Derivation Rules

1. In the same Settings modal, scroll to **Project Derivation Rules**.
2. Add keyword-to-project mappings (e.g., if the CSV description contains "Winch", assign the transaction to project "Winch Control").
3. Click **Apply**. Transactions will be re-categorised according to the new rules.
4. Rules are stored in `sessionStorage` for the current tab only.

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
