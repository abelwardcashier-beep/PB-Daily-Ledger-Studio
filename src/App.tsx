import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bars3Icon,
  BanknotesIcon,
  ChartBarSquareIcon,
  CloudIcon,
  ShieldCheckIcon,
  WifiIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import { APP_NAME, APP_TAGLINE } from './core/constants';
import { isSupabaseConfigured } from './core/supabase';
import { useTransactions } from './hooks/useTransactions';
import { useVault } from './hooks/useVault';
import { useDailyFloat } from './hooks/useDailyFloat';
import { LedgerDashboard } from './modules/ledger/LedgerDashboard';
import { VaultDashboard } from './modules/vault/VaultDashboard';
import { AnalyticsDashboard } from './modules/analytics/AnalyticsDashboard';
import { ErrorBanner } from './modules/shared/ErrorBanner';

/* ────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────── */

type ViewKey = 'ledger' | 'vault' | 'analytics';

interface NavItem {
  key: ViewKey;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/* ────────────────────────────────────────────────────────────────
 * Navigation configuration (single source of truth)
 * ──────────────────────────────────────────────────────────────── */

const NAV_ITEMS: readonly NavItem[] = [
  {
    key: 'ledger',
    label: 'Daily Ledger',
    description: 'Cash-in / cash-out entries for the business day',
    icon: BanknotesIcon,
  },
  {
    key: 'vault',
    label: 'Safe Vault',
    description: 'Physical safe balance, deposits & withdrawals',
    icon: ShieldCheckIcon,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'Trends, cash-flow lines & expense breakdowns',
    icon: ChartBarSquareIcon,
  },
] as const;

/** Today in `yyyy-MM-dd` (local time), used as the default business date. */
function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ────────────────────────────────────────────────────────────────
 * App shell
 * ──────────────────────────────────────────────────────────────── */

export default function App() {
  const [activeView, setActiveView] = useState<ViewKey>('ledger');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [businessDate] = useState<string>(todayIso());

  // Hooks own ALL data fetching, realtime subscriptions and calculations.
  const tx = useTransactions(businessDate);
  const vault = useVault(businessDate);
  const float = useDailyFloat(businessDate);

  const activeNav = NAV_ITEMS.find((n) => n.key === activeView) ?? NAV_ITEMS[0];
  const netFlow = (tx.summary?.totalCashIn ?? 0) - (tx.summary?.totalCashOut ?? 0);
  const isLoading = tx.isLoading || vault.isLoading || float.isLoading;

  const navigate = (key: ViewKey): void => {
    setActiveView(key);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-bg-app text-ink-soft antialiased">
      {/* ── Fixed Sidebar (desktop ≥ lg) ───────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border-subtle bg-bg-card shadow-sm lg:flex">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <BanknotesIcon className="h-5 w-5 text-on-dark" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-sm font-bold text-ink">PB Ledger Studio</h1>
            <p className="truncate text-xs text-[var(--text-muted)]">{APP_TAGLINE}</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary navigation">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = activeView === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => navigate(key)}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive
                    ? 'bg-primary-tint text-[var(--primary)]'
                    : 'text-ink-soft hover:bg-bg-hover hover:text-ink'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <Icon className={`h-5 w-5 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-ink-soft'}`} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Backend status */}
        <div className="border-t border-border-subtle p-4">
          <span
            className={`inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ring-1 ring-inset ${
              isSupabaseConfigured
                ? 'bg-income-tint text-income-deep ring-income/30'
                : 'bg-gilded-tint text-gilded-deep ring-gilded/30'
            }`}
            title={
              isSupabaseConfigured
                ? 'Connected to Supabase'
                : 'Local storage mode — set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY'
            }
          >
            {isSupabaseConfigured ? <CloudIcon className="h-4 w-4" /> : <WifiIcon className="h-4 w-4" />}
            {isSupabaseConfigured ? 'Supabase Connected' : 'Local Mode'}
          </span>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
            {APP_NAME} · Cash discipline, one day at a time.
          </p>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ──────────────────────────────── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-subtle bg-bg-card shadow-md lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <BanknotesIcon className="h-4 w-4 text-on-dark" />
                  </div>
                  <span className="font-display text-sm font-bold text-ink">PB Ledger Studio</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-bg-hover hover:text-ink"
                  aria-label="Close navigation"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 p-3" aria-label="Mobile navigation">
                {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
                  const isActive = activeView === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => navigate(key)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary-tint text-[var(--primary)]'
                          : 'text-ink-soft hover:bg-bg-hover'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </button>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content area ──────────────────────────────────── */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg-card/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg border border-border-subtle p-2 text-ink-soft hover:bg-bg-hover lg:hidden"
              aria-label="Open navigation"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate font-display text-base font-bold text-ink sm:text-lg">
                {activeNav.label}
              </h2>
              <p className="hidden truncate text-xs text-[var(--text-muted)] sm:block">{activeNav.description}</p>
            </div>
            <span className="ml-auto hidden items-center gap-2 rounded-lg border border-border-subtle bg-bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-sm sm:inline-flex">
              <ChartBarSquareIcon className="h-4 w-4 text-[var(--text-muted)]" />
              {businessDate}
            </span>
          </div>
        </header>

        {/* Active module */}
        <main className="px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
          {(tx.error || vault.error || float.error) && (
            <div className="mb-4 max-w-3xl">
              <ErrorBanner
                message={tx.error ?? vault.error ?? float.error ?? 'Unexpected error'}
                onRetry={() => {
                  void tx.reload();
                  void vault.reload();
                  void float.reload();
                }}
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {isLoading ? (
                /* Loading skeletons while hooks fetch */
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-xl border border-border-subtle bg-bg-card shadow-sm" />
                  ))}
                </div>
              ) : activeView === 'ledger' ? (
                <LedgerDashboard summary={tx.summary} netFlow={netFlow} />
              ) : activeView === 'vault' ? (
                <VaultDashboard safeBalance={vault.safeRunningBalance} />
              ) : (
                <AnalyticsDashboard
                  transactions={tx.transactions}
                  isLoading={tx.isLoading}
                  error={tx.error}
                  onRetry={() => void tx.reload()}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-border-subtle bg-bg-card px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} {APP_NAME} · Drawer float{' '}
            <b className="tabular-nums text-ink-soft">Rs. {(float.openingBalance ?? 0).toLocaleString()}</b> ·
            Ledger entries <b className="tabular-nums text-ink-soft">{tx.transactions.length}</b> · Safe balance{' '}
            <b className="tabular-nums text-ink-soft">Rs. {(vault.safeRunningBalance ?? 0).toLocaleString()}</b>
          </p>
        </footer>
      </div>

      {/* ── Bottom navigation bar (mobile only) ────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Bottom navigation"
      >
        <div className="grid grid-cols-3">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = activeView === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => navigate(key)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-ink-soft'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
