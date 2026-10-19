# Daily Cash Book & Sales Ledger (PB-Daily-Ledger)

A specialized real-time cash management, sales tracking, and vault reconciliation system engineered for retail counters, distributors, and trading businesses operating in **Pakistani Rupee (PKR / Rs.)**. Bridges the tactile speed of traditional two-page paper cash registers (*Roznamcha / Daily Khata*) with modern automated arithmetic, instant multi-tab Excel workbooks, physical currency denomination verification, and multi-day vault tracking.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed in Phase 1:
> - **Primary Objective**: Import the full PB-Daily-Ledger codebase and significantly upgrade both its feature set and visual design.
> - **Storage & Persistence Architecture**: Dual-mode setup with resilient offline-first client storage (`localStorage` / in-memory cache) seamlessly connected to optional Firebase Cloud Sync with manual and automated backup/restore.
> - **Currency & Denominations**: Retain Pakistani Rupee (`PKR / Rs.`) as the primary accounting currency with rapid counting tools for Rs. 5000, 1000, 500, 100, 50, 20, 10 notes and loose coins.

---

## 1. Overview & Core Concept

- **What It Does**: Provides cashiers, counter managers, and shop owners with an uncompromising, zero-latency daily cash ledger. It tracks customer cash sales, digital transfers (Raast / JazzCash / Bank), operational expenses, vendor disbursements, and internal movements between the counter drawer and the locked safe vault.
- **Target Audience / Persona**: Cashiers, retail counter clerks, wholesale distributors, and business owners managing high-volume cash transactions with daily physical balancing and shift handovers.
- **Key Value**:
  1. **Zero Discrepancy Reconciliation**: Continuous mathematical checks comparing expected drawer cash against physical counted currency notes.
  2. **Sales vs. Internal Movement Isolation**: Pure operating revenue and expenses are strictly segregated from vault handovers and capital injections, guaranteeing clean profit accounting.
  3. **Offline-First Resilience with Cloud Sync**: Instant local responses on every keystroke with zero reliance on cloud latency, combined with background Firebase cloud persistence and portable JSON/Excel exports.

---

## 2. User Experience & Visual Design

Following the **Universal Frontend Design Constitution** and **SaaS & Dashboard Guidelines (`references/3_saas_dashboard.md`)**:

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Professional, high-density financial workstation. Modern Scandinavian minimalism meets Swiss typographic rigor. Flat surfaces with crisp 1px borders, zero visual fluff, and zero ornamental pill badges.
  - *Color Palette & Mood*:
    - **60% Neutral Canvas**: Slate background (`#0B0F19` dark / `#F8FAFC` light posture) with crisp contrast.
    - **30% Structural Surfaces**: Clean white or obsidian cards (`#111827`), hairline dividers (`border-slate-200 dark:border-slate-800`), and subtle zebra row striping.
    - **10% Semantic Accent Budget**: Emerald (`#10B981`) for Cash In / Sales, Crimson/Rose (`#F43F5E`) for Cash Out / Expenses, Amber (`#F59E0B`) for Drawer-to-Safe transfers & pending items, and Indigo/Blue for Bank & Digital payments.
  - *Typography & Hierarchy*:
    - Display & Titles: `Plus Jakarta Sans` or `Outfit` for brand title, section titles, and action controls.
    - Data & Metrics: Monospace with strict tabular numerals (`font-mono tabular-nums`) for currency amounts, voucher numbers, timestamps, and denomination counts.
- **Layout & Viewport Presence**:
  - Full-width desktop workstation layout (1440px target) with zero viewport collapse.
  - **Top Bar Contract**:
    - *Zone 1 (Brand)*: `PB Daily Ledger` wordmark with active financial date.
    - *Zone 2 (Navigation / Status)*: Clean single-line breadcrumb & sync indicator (`Drawer Register · Safe Vault · Denomination Sheet`).
    - *Zone 3 (Primary Actions)*: `Start New Day` roll-over button, `Export Excel (.xlsx)` button, and `Cloud Sync` toggle.
- **Key User Flows**:
  1. **Morning Shift Initialization**: Enter opening cash float or roll over from yesterday's closing drawer balance.
  2. **Real-Time Transaction Entry**: Ultra-fast keyboard-navigable intake form for Cash In (Salesperson, Bill No, Cash/Online, Refund toggle) and Cash Out (Expenses, Vendor payments, Market creditors, Receipt/Bilty No).
  3. **Physical Denomination Counting**: Real-time counter for Rs. 5000 down to Rs. 10 notes with automatic bundle counters (100 notes per bundle) and live surplus/shortage variance calculation.
  4. **Vault & Internal Transfers**: Transfer surplus cash from drawer to safe vault or replenish float with 1-click audit trail.
  5. **End-of-Day Reconciliation & Excel Export**: Review closing variance, snapshot denomination counts, lock the day, and download formatted multi-tab `.xlsx` workbook.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Mode Persistence (Offline-First + Cloud Sync)**
  - *Chosen Approach*: Write all ledger state immediately to browser `localStorage` and memory, then sync asynchronously to Firebase Firestore when cloud credentials or connectivity are present. Provide backup/restore JSON download.
  - *Why*: In high-speed retail checkout and cash-counting environments, an app cannot afford cloud latency or network hiccup blockers. Cashiers require sub-millisecond response times.
  - *Alternatives Considered*: Cloud-only Firestore writes (rejected: introduces latency and breaks when internet drops).
- **Decision 2: Strict Categorization of Internal Transfers vs. Operating Cash**
  - *Chosen Approach*: Tag Drawer-to-Safe handovers and Float Replenishments as `isInternalTransfer: true`. They update drawer and vault balances mathematically, but are strictly excluded from gross sales and business operating expenses.
  - *Why*: Transferring Rs. 200,000 from the drawer to the safe at 9 PM is not an expense—treating it as such would distort the store's daily P&L and show false losses.
- **Decision 3: Multi-Tab Formatted Excel Workbook Engine**
  - *Chosen Approach*: Use client-side `xlsx` to output 5 structured sheets: *Daily Cash Book*, *Cash In / Sales*, *Cash Out (Expenses/Vendors)*, *Safe Vault Ledger*, and *Denomination Reconciliation*.
  - *Why*: Allows accountants and store owners to archive or open the day's record in standard Microsoft Excel without needing custom software.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PB Daily Ledger App                           │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             Header (Top Bar: Brand · Date · Sync · Export)        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ Opening Balance  │  │  Stats Overview  │  │ Denomination Counter │  │
│  │  & Drawer Float  │  │ (Sales/Exp/Net)  │  │ (PKR Notes & Bundle) │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Fast Transaction Entry (Cash In / Cash Out)          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Filter & Search Bar: Type · Salesperson · Mode · Categories     │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │ High-Density Spreadsheet Ledger (Roznamcha T-Account Table)      │  │
│  │  - Running Balances, Verified Badges, Quick Inline Edits         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ Cash Safe Vault Manager       │  │ Cash Flow Trend Chart         │  │
│  │ (Reserve Reserves & Deposits) │  │ (Hourly & Category In/Out)    │  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Storage Engine: LocalStorage Cache ──◄──► Firebase Cloud Firestore│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Key Entities

- `Transaction`:
  - `id`: string (UUID)
  - `date`: string (`YYYY-MM-DD`)
  - `time`: string (`HH:mm`)
  - `type`: `'cash_in' | 'cash_out'`
  - `amount`: number (PKR)
  - `salesperson?`: string (e.g. Abdullah, Ishtiaq, Ilyas, Tayab Electric)
  - `billNumber?`: string
  - `paymentMode?`: `'cash' | 'online'`
  - `isRefund?`: boolean
  - `isInternalTransfer?`: boolean
  - `transferSource?`: `'safe' | 'owner_capital' | 'bank_withdrawal' | 'drawer' | 'bank'`
  - `transferDestination?`: `'safe' | 'bank' | 'drawer' | 'individual'`
  - `mainCategory?`: `'expenses' | 'vendor_payments' | 'market_payments'`
  - `partyName?`: string
  - `category?`: string
  - `description`: string
  - `receiptNumber?`: string
  - `verified?`: boolean
- `DenominationState`:
  - Notes: `5000`, `1000`, `500`, `100`, `50`, `20`, `10`
  - `coins`: number
- `DayClosing`:
  - `date`, `startingCash`, `denominations`, `notes`
- `VaultDeposit`:
  - `id`, `amount`, `category`, `categoryLabel`, `notes`, `date`, `time`, `createdAt`

### Migration & Implementation Steps

1. **Dependencies Installation**: Install `xlsx` for Excel export and `recharts` for visual cash trend visualization.
2. **Metadata & HTML Setup**: Update `metadata.json` and `index.html` with title "Daily Cash Book & Sales Ledger" and PKR meta descriptions.
3. **Core Types & Calculations**: Port and refine `types.ts` with rock-solid mathematical helpers for safe transfers, refunds, net balances, and denomination multiplication.
4. **Offline-First Storage & Cloud Sync Service**: Implement unified data repository that persists immediately to `localStorage` and synchronizes with Firebase when configured.
5. **UI Components Port & Polish**:
   - `Header`: 3-zone contract with date switcher, day rollover, Excel download, backup JSON, and sync status.
   - `OpeningBalanceCard`: Morning float configuration with 1-click yesterday rollover.
   - `StatsOverview`: High-impact KPI strip showing Cash Sales, Online Sales, Total In, Total Out, Net Drawer Cash, and Safe Balance.
   - `DenominationCounter`: Tactile Pakistani Rupee physical note counter with live difference calculation against drawer balance.
   - `IntakeForm`: Streamlined dual-mode form for instant entry with keyboard shortcuts.
   - `SpreadsheetLedger`: Clean, high-density data grid with sorting, search, column filtering, and verified toggle.
   - `CashSafeManager`: Dedicated drawer-to-safe handover wizard and reserve balance tracker.
   - `CashFlowTrendChart`: Clean cash-in vs cash-out time chart with categorical distribution.
   - Modals: Edit Transaction, Start New Day, Clear/Reset with safety confirmation, and Data Recovery/JSON Import.
6. **Excel Workbook Generation**: Professional 5-sheet `.xlsx` export with formatted currency and header styles.
7. **Verification**: Run `compile_applet` and test all interactive handlers.
