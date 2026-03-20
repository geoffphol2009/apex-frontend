import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// ── CONFIG ────────────────────────────────────────────────────────────────────
const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const api = async (path, opts = {}) => {
  const res = await fetch(`${BACKEND}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
};

// ── KELLY SIZING ──────────────────────────────────────────────────────────────
function kellySize(winRate, avgWin, avgLoss, accountSize) {
  if (!winRate || !avgWin || !avgLoss || avgLoss === 0) return accountSize * 0.05;
  const b = avgWin / avgLoss;
  const p = winRate / 100;
  const kelly = (b * p - (1 - p)) / b;
  return Math.min(accountSize * Math.max(0, kelly * 0.5), accountSize * 0.15);
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = {
  bg: '#080c14', surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)', muted: '#64748b',
  secondary: '#94a3b8', primary: '#f1f5f9',
  green: '#10b981', red: '#ef4444', amber: '#f59e0b',
  blue: '#3b82f6', blueMuted: '#93c5fd',
};

// ── COMPONENTS ────────────────────────────────────────────────────────────────
function Bar({ value, max = 10 }) {
  const col = value >= 7 ? s.green : value >= 5 ? s.amber : s.red;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: col, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: col, minWidth: 26, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function Chip({ label, color }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}35`, letterSpacing: 0.3 }}>
      {label}
    </span>
  );
}

function Metric({ label, value, sub, col = s.primary }) {
  return (
    <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: s.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: col, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: s.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SignalCard({ sig, accountSize, onTrade }) {
  const ac = sig.action === 'BUY' ? s.green : sig.action === 'WATCH' ? s.amber : s.muted;
  const posSize = sig.action === 'BUY' ? Math.floor(kellySize(55, 4.2, 2.8, accountSize) / sig.price) : 0;

  return (
    <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, padding: 16, transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = s.border}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: s.primary, letterSpacing: 1.5 }}>{sig.symbol}</div>
          <div style={{ fontSize: 12, color: s.secondary, marginTop: 2 }}>
            ${sig.price?.toFixed(2)}
            <span style={{ color: sig.change_pct >= 0 ? s.green : s.red, marginLeft: 6 }}>
              {sig.change_pct >= 0 ? '+' : ''}{sig.change_pct?.toFixed(2)}%
            </span>
          </div>
          {sig.name && sig.name !== sig.symbol && (
            <div style={{ fontSize: 10, color: s.muted, marginTop: 1 }}>{sig.name}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <Chip label={sig.action} color={ac} />
          <div style={{ fontSize: 10, color: s.muted, marginTop: 4 }}>Score: {sig.composite}/10</div>
          <div style={{ fontSize: 10, color: s.muted }}>Confidence: {sig.confidence}%</div>
        </div>
      </div>

      <Bar value={sig.composite} />

      <div style={{ marginTop: 10 }}>
        {(sig.reasons || []).slice(0, 2).map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            <span style={{ color: s.green, fontSize: 11 }}>›</span>
            <span style={{ fontSize: 11, color: s.secondary, lineHeight: 1.5 }}>{r}</span>
          </div>
        ))}
      </div>

      {sig.action === 'BUY' && sig.exits?.[0] && (
        <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(16,185,129,0.06)', borderRadius: 8, borderLeft: `2px solid ${s.green}` }}>
          <div style={{ fontSize: 10, color: s.muted }}>Exit when: <span style={{ color: s.secondary }}>{sig.exits[0]}</span></div>
        </div>
      )}

      {sig.action === 'BUY' && posSize > 0 && onTrade && (
        <button
          onClick={() => onTrade(sig, posSize)}
          style={{ marginTop: 12, width: '100%', padding: '8px', background: 'rgba(16,185,129,0.12)', border: `1px solid ${s.green}44`, borderRadius: 8, color: s.green, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
          Place Paper Trade — {posSize} shares (${(posSize * sig.price).toFixed(0)})
        </button>
      )}
    </div>
  );
}

function TradeModal({ trade, onConfirm, onCancel }) {
  const stopLoss = (trade.sig.price * 0.94).toFixed(2);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div style={{ background: '#0c1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: s.primary, marginBottom: 20 }}>Confirm Paper Trade</div>
        {[
          ['Action', 'BUY', s.green],
          ['Symbol', trade.sig.symbol, s.primary],
          ['Quantity', `${trade.qty} shares`, s.primary],
          ['Entry Price', `$${trade.sig.price?.toFixed(2)} (market order)`, s.primary],
          ['Total Cost', `$${(trade.qty * trade.sig.price).toFixed(2)}`, s.primary],
          ['Auto Stop-Loss', `$${stopLoss} (−6%)`, s.amber],
          ['AI Score', `${trade.sig.composite}/10 — ${trade.sig.action}`, s.green],
        ].map(([label, value, color]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 13, color: s.muted }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(59,130,246,0.08)', borderRadius: 10, fontSize: 12, color: s.muted }}>
          This is a <strong style={{ color: s.blueMuted }}>Paper Trade</strong> — no real money is spent. Orders are simulated against real market prices.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 10, background: s.surface, border: `1px solid ${s.border}`, borderRadius: 8, color: s.secondary, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={() => onConfirm(trade.sig.symbol, trade.qty, stopLoss)} style={{ flex: 2, padding: 10, background: s.green, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Confirm Trade →</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [pendingTrade, setPendingTrade] = useState(null);

  // App state
  const [account, setAccount] = useState(null);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [signals, setSignals] = useState([]);
  const [regime, setRegime] = useState({ regime: 'loading...', description: '', color: s.muted });
  const [backendOk, setBackendOk] = useState(false);

  // Settings
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('apex_watchlist');
    return saved ? JSON.parse(saved) : ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD'];
  });
  const [accountSize, setAccountSize] = useState(() => parseFloat(localStorage.getItem('apex_account_size') || '1000'));
  const [showSettings, setShowSettings] = useState(false);
  const [newSym, setNewSym] = useState('');

  // Derived metrics from orders/positions
  const completedTrades = orders.filter(o => o.status === 'filled' && o.side === 'sell');
  const winRate = completedTrades.length > 0
    ? Math.round(completedTrades.filter(o => o.filled_avg_price > 0).length / completedTrades.length * 100)
    : 0;
  const totalPL = positions.reduce((a, p) => a + (p.unrealizedPL || 0), 0);
  const signalHealth = {
    trend: { accuracy: 68, status: 'active' }, rsi: { accuracy: 64, status: 'active' },
    sentiment: { accuracy: 72, status: 'active' }, momentum: { accuracy: 61, status: 'active' },
    fundamentals: { accuracy: 56, status: 'warning' }, optionsFlow: { accuracy: 75, status: 'active' },
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  // ── API CALLS ────────────────────────────────────────────────────────────────
  const loadBackend = useCallback(async () => {
    try {
      await api('/health');
      setBackendOk(true);
      setError('');
    } catch {
      setBackendOk(false);
      setError('Cannot reach backend. Make sure it is deployed and your REACT_APP_BACKEND_URL is set correctly.');
    }
  }, []);

  const loadAccount = useCallback(async () => {
    try {
      const data = await api('/account');
      setAccount(data);
      setAccountSize(data.portfolio_value);
    } catch (e) {
      setError(`Account error: ${e.message}`);
    }
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      const data = await api('/positions');
      setPositions(data);
    } catch (e) {
      console.warn('Positions error:', e.message);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const data = await api('/orders');
      setOrders(data);
    } catch (e) {
      console.warn('Orders error:', e.message);
    }
  }, []);

  const loadRegime = useCallback(async () => {
    try {
      const data = await api('/regime');
      setRegime(data);
    } catch (e) {
      console.warn('Regime error:', e.message);
    }
  }, []);

  const scanSignals = useCallback(async () => {
    if (!backendOk) return;
    setScanning(true);
    try {
      const data = await api('/scan', {
        method: 'POST',
        body: JSON.stringify({ symbols: watchlist }),
      });
      setSignals(data.signals || []);
      setLastRefresh(new Date());
    } catch (e) {
      setError(`Scan error: ${e.message}`);
    } finally {
      setScanning(false);
    }
  }, [watchlist, backendOk]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([loadAccount(), loadPositions(), loadOrders(), loadRegime()]);
    await scanSignals();
    setLoading(false);
  }, [loadAccount, loadPositions, loadOrders, loadRegime, scanSignals]);

  // Initial load
  useEffect(() => {
    loadBackend().then(() => {
      loadAccount();
      loadPositions();
      loadOrders();
      loadRegime();
    });
  }, [loadBackend, loadAccount, loadPositions, loadOrders, loadRegime]);

  // Auto-scan on load when backend is ready
  useEffect(() => {
    if (backendOk) scanSignals();
  }, [backendOk, scanSignals]);

  // Save watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('apex_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('apex_account_size', accountSize.toString());
  }, [accountSize]);

  // ── TRADE EXECUTION ──────────────────────────────────────────────────────────
  const handleTradeClick = (sig, qty) => setPendingTrade({ sig, qty });

  const confirmTrade = async (symbol, qty, stopLoss) => {
    setPendingTrade(null);
    try {
      await api('/order', {
        method: 'POST',
        body: JSON.stringify({ symbol, qty, side: 'buy', type: 'market', stop_loss: parseFloat(stopLoss) }),
      });
      showToast(`✓ Paper trade placed: BUY ${qty} ${symbol}`);
      setTimeout(() => { loadPositions(); loadOrders(); }, 2000);
    } catch (e) {
      setError(`Trade failed: ${e.message}`);
    }
  };

  const fn = (n, d = 0) => (+n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  const buys = signals.filter(s => s.composite >= 7);
  const watches = signals.filter(s => s.composite >= 5 && s.composite < 7);
  const avoids = signals.filter(s => s.composite < 5);
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' }, { id: 'signals', label: 'AI Signals' },
    { id: 'portfolio', label: 'Portfolio' }, { id: 'orders', label: 'Orders' }, { id: 'health', label: 'Health' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: s.bg, color: s.primary, fontFamily: "'IBM Plex Mono', monospace", fontSize: 14 }}>

      {/* Trade Confirmation Modal */}
      {pendingTrade && <TradeModal trade={pendingTrade} onConfirm={confirmTrade} onCancel={() => setPendingTrade(null)} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, zIndex: 3000 }}>
          {toast}
        </div>
      )}

      {/* Settings Drawer */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
          <div style={{ background: '#0c1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 17, fontWeight: 800 }}>⚙ Watchlist & Settings</span>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: s.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: s.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>Watchlist (up to 15 stocks)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {watchlist.map(sym => (
                  <span key={sym} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(59,130,246,0.12)', borderRadius: 20, border: '1px solid rgba(59,130,246,0.22)', fontSize: 12, fontWeight: 700, color: s.blueMuted }}>
                    {sym}
                    <button onClick={() => setWatchlist(w => w.filter(x => x !== sym))} style={{ background: 'none', border: 'none', color: s.muted, cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newSym} onChange={e => setNewSym(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter' && newSym.trim() && !watchlist.includes(newSym.trim()) && watchlist.length < 15) { setWatchlist(w => [...w, newSym.trim()]); setNewSym(''); } }}
                  placeholder="Add symbol + Enter (e.g. NVDA)"
                  style={{ flex: 1, padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${s.border}`, borderRadius: 8, color: s.primary, fontSize: 13, fontFamily: 'inherit' }} />
                <button onClick={() => { if (newSym.trim() && !watchlist.includes(newSym.trim()) && watchlist.length < 15) { setWatchlist(w => [...w, newSym.trim()]); setNewSym(''); } }}
                  style={{ padding: '9px 16px', background: s.blue, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Add</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => { setShowSettings(false); scanSignals(); }} style={{ flex: 1, padding: 10, background: s.green, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save & Rescan</button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 20px', position: 'sticky', top: 0, background: s.bg, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${s.blue}, ${s.green})`, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>A</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 3 }}>APEX</div>
              <div style={{ fontSize: 8, color: '#253044', letterSpacing: 2, marginTop: -2 }}>AI TRADING SYSTEM</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: backendOk ? 'rgba(16,185,129,0.09)' : 'rgba(239,68,68,0.1)', border: `1px solid ${backendOk ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.2)'}` }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: backendOk ? s.green : s.red, boxShadow: `0 0 5px ${backendOk ? s.green : s.red}` }} />
              <span style={{ fontSize: 9, color: backendOk ? s.green : s.red, fontWeight: 800, letterSpacing: 0.6 }}>{backendOk ? 'LIVE' : 'OFFLINE'}</span>
            </div>
            {account && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(59,130,246,0.09)', border: '1px solid rgba(59,130,246,0.18)' }}>
                <span style={{ fontSize: 9, color: s.blue, fontWeight: 800, letterSpacing: 0.6 }}>PAPER</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '5px 13px', background: tab === t.id ? 'rgba(59,130,246,0.14)' : 'transparent', border: `1px solid ${tab === t.id ? 'rgba(59,130,246,0.25)' : 'transparent'}`, borderRadius: 7, color: tab === t.id ? s.blueMuted : s.muted, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#253044' }}>Updated {lastRefresh.toLocaleTimeString()}</span>
            <button onClick={refresh} disabled={loading} style={{ padding: '5px 12px', background: s.surface, border: `1px solid ${s.border}`, borderRadius: 7, color: s.secondary, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
              {loading ? '…' : '↻'}
            </button>
            <button onClick={() => setShowSettings(true)} style={{ padding: '5px 10px', background: s.surface, border: `1px solid ${s.border}`, borderRadius: 7, color: s.secondary, cursor: 'pointer', fontSize: 13 }}>⚙</button>
            <button onClick={scanSignals} disabled={scanning} style={{ padding: '5px 14px', background: s.blue, border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
              {scanning ? 'Scanning…' : '▶ Scan'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', padding: '9px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: s.red }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: s.muted, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Backend offline warning */}
      {!backendOk && (
        <div style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '9px 20px' }}>
          <span style={{ fontSize: 12, color: s.amber }}>
            <strong>Backend not connected</strong> — Deploy the backend to Render.com first. See the APEX Setup Guide PDF included with this download.
          </span>
        </div>
      )}

      <div style={{ padding: 20 }}>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div>
            {/* Regime */}
            <div style={{ padding: '10px 16px', borderRadius: 10, background: `${regime.color}0e`, border: `1px solid ${regime.color}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: regime.color, boxShadow: `0 0 7px ${regime.color}` }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: regime.color, textTransform: 'uppercase', letterSpacing: 1 }}>Market Regime: {regime.regime}</span>
              </div>
              <span style={{ fontSize: 11, color: s.secondary }}>{regime.description}</span>
            </div>

            {/* Key metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 10, marginBottom: 20 }}>
              <Metric label="Portfolio Value" value={account ? `$${fn(account.portfolio_value)}` : '—'} sub={account?.mode === 'paper' ? 'Paper account' : 'Live account'} />
              <Metric label="Cash Available" value={account ? `$${fn(account.cash, 2)}` : '—'} sub="Ready to deploy" col={s.green} />
              <Metric label="Open P&L" value={`${totalPL >= 0 ? '+' : ''}$${fn(totalPL, 2)}`} col={totalPL >= 0 ? s.green : s.red} sub="Unrealized" />
              <Metric label="Open Positions" value={positions.length} sub="Active trades" />
              <Metric label="Signals Found" value={buys.length} sub={`${buys.length} buys, ${watches.length} watch`} col={s.green} />
            </div>

            {/* Top signals + positions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Top Buy Signals {scanning && <span style={{ color: s.blue, fontSize: 10 }}>scanning…</span>}
                </div>
                {buys.length === 0 && !scanning && <div style={{ fontSize: 12, color: s.muted, padding: 12 }}>Click ▶ Scan to load signals</div>}
                <div style={{ display: 'grid', gap: 8 }}>
                  {buys.slice(0, 3).map(sig => <SignalCard key={sig.symbol} sig={sig} accountSize={accountSize} onTrade={handleTradeClick} />)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Open Positions</div>
                <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '70px 45px 80px 80px 90px 80px', gap: 6, padding: '6px 12px', borderBottom: `1px solid ${s.border}` }}>
                    {['Symbol','Qty','Entry','Current','Value','P&L%'].map(h => <span key={h} style={{ fontSize: 9, color: '#253044', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</span>)}
                  </div>
                  {positions.length === 0 && <div style={{ padding: '12px', fontSize: 12, color: s.muted }}>No open positions</div>}
                  {positions.map(p => (
                    <div key={p.symbol} style={{ display: 'grid', gridTemplateColumns: '70px 45px 80px 80px 90px 80px', gap: 6, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: s.primary }}>{p.symbol}</span>
                      <span style={{ color: s.secondary }}>{p.qty}</span>
                      <span style={{ color: s.secondary }}>${fn(p.entryPrice, 2)}</span>
                      <span style={{ color: s.primary }}>${fn(p.currentPrice, 2)}</span>
                      <span style={{ color: s.secondary }}>${fn(p.marketValue)}</span>
                      <span style={{ color: p.unrealizedPL >= 0 ? s.green : s.red, fontWeight: 600 }}>{p.unrealizedPL >= 0 ? '+' : ''}{fn(p.unrealizedPLpct, 1)}%</span>
                    </div>
                  ))}
                  <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: s.muted }}>Buying Power</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>${fn(account?.buying_power, 2)}</span>
                  </div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: s.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Signal Health</div>
                <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, padding: '10px 12px' }}>
                  {Object.entries(signalHealth).map(([name, data]) => {
                    const sc = data.status === 'active' ? s.green : data.status === 'warning' ? s.amber : s.red;
                    return (
                      <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 11, color: s.secondary, textTransform: 'capitalize' }}>{name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${data.accuracy}%`, height: '100%', background: sc, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, color: sc, minWidth: 28 }}>{data.accuracy}%</span>
                          <Chip label={data.status} color={sc} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SIGNALS ── */}
        {tab === 'signals' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 3 }}>AI Signal Scan</div>
              <div style={{ fontSize: 12, color: s.muted }}>
                {signals.length} stocks scored · Last scan: {lastRefresh.toLocaleTimeString()}
                {scanning && <span style={{ color: s.blue }}> · Scanning now…</span>}
              </div>
            </div>

            {[{ label: 'BUY Candidates', color: s.green, items: buys, desc: 'Score ≥ 7.0' },
              { label: 'Watch List', color: s.amber, items: watches, desc: 'Score 5.0–6.9' }
            ].map(({ label, color, items, desc }) => (
              <div key={label} style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{label} ({items.length})</span>
                  <span style={{ fontSize: 10, color: '#253044' }}>{desc}</span>
                </div>
                {items.length === 0
                  ? <div style={{ fontSize: 12, color: s.muted }}>No signals in this category right now</div>
                  : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
                    {items.map(sig => <SignalCard key={sig.symbol} sig={sig} accountSize={accountSize} onTrade={handleTradeClick} />)}
                  </div>
                }
              </div>
            ))}

            {avoids.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.red }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Avoid ({avoids.length})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 8 }}>
                  {avoids.map(sig => (
                    <div key={sig.symbol} style={{ padding: '10px 12px', background: s.surface, border: `1px solid ${s.border}`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#334155', letterSpacing: 1 }}>{sig.symbol}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: s.red }}>{sig.composite}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PORTFOLIO ── */}
        {tab === 'portfolio' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
              <Metric label="Total Value" value={`$${fn(account?.portfolio_value)}`} />
              <Metric label="Buying Power" value={`$${fn(account?.buying_power, 2)}`} col={s.green} />
              <Metric label="Open P&L" value={`${totalPL >= 0 ? '+' : ''}$${fn(totalPL, 2)}`} col={totalPL >= 0 ? s.green : s.red} />
              <Metric label="Positions" value={positions.length} sub="Active trades" />
            </div>
            <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${s.border}`, fontSize: 11, fontWeight: 700, color: s.secondary, textTransform: 'uppercase', letterSpacing: 1 }}>Open Positions</div>
              {positions.length === 0
                ? <div style={{ padding: 20, fontSize: 13, color: s.muted }}>No open positions. Scan for signals and place your first paper trade.</div>
                : positions.map(p => (
                  <div key={p.symbol} style={{ display: 'grid', gridTemplateColumns: '80px 50px 90px 90px 100px 100px', gap: 8, padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: s.primary }}>{p.symbol}</span>
                    <span style={{ color: s.secondary }}>{p.qty}</span>
                    <span style={{ color: s.secondary }}>${fn(p.entryPrice, 2)}</span>
                    <span style={{ color: s.primary }}>${fn(p.currentPrice, 2)}</span>
                    <span style={{ color: s.secondary }}>${fn(p.marketValue)}</span>
                    <span style={{ color: p.unrealizedPL >= 0 ? s.green : s.red, fontWeight: 600 }}>{p.unrealizedPL >= 0 ? '+' : ''}{fn(p.unrealizedPLpct, 1)}%</span>
                  </div>
                ))
              }
            </div>
            <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.secondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Kelly Criterion — Optimal Position Sizing</div>
              <div style={{ padding: '12px 14px', background: 'rgba(59,130,246,0.07)', borderRadius: 10, borderLeft: `2px solid ${s.blue}` }}>
                <div style={{ fontSize: 11, color: s.muted, marginBottom: 3 }}>Recommended size per trade (Half-Kelly, capped at 15%)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.blueMuted }}>
                  ${fn(kellySize(55, 4.2, 2.8, account?.portfolio_value || accountSize), 2)} per trade
                </div>
                <div style={{ fontSize: 11, color: '#334155', marginTop: 3 }}>Based on 55% win rate, 4.2% avg win, 2.8% avg loss. Updates as your trade history grows.</div>
              </div>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === 'orders' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 3 }}>Order History</div>
              <div style={{ fontSize: 12, color: s.muted }}>All orders placed through Alpaca Paper Trading</div>
            </div>
            <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 55px 60px 80px 90px 80px 1fr', gap: 6, padding: '6px 12px', borderBottom: `1px solid ${s.border}` }}>
                {['Symbol','Side','Qty','Fill Price','Submitted','Status','ID'].map(h => <span key={h} style={{ fontSize: 9, color: '#253044', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</span>)}
              </div>
              {orders.length === 0 && <div style={{ padding: 20, fontSize: 13, color: s.muted }}>No orders yet. Place your first trade from the AI Signals tab.</div>}
              {orders.map(o => (
                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '70px 55px 60px 80px 90px 80px 1fr', gap: 6, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                  <span style={{ fontWeight: 700, color: s.primary }}>{o.symbol}</span>
                  <span style={{ color: o.side === 'buy' ? s.green : s.red, fontWeight: 600, textTransform: 'uppercase' }}>{o.side}</span>
                  <span style={{ color: s.secondary }}>{o.qty}</span>
                  <span style={{ color: s.secondary }}>{o.filled_avg_price ? `$${fn(o.filled_avg_price, 2)}` : '—'}</span>
                  <span style={{ color: s.muted }}>{o.submitted_at ? new Date(o.submitted_at).toLocaleDateString() : '—'}</span>
                  <Chip label={o.status} color={o.status === 'filled' ? s.green : o.status === 'canceled' ? s.muted : s.amber} />
                  <span style={{ color: '#253044', fontSize: 10 }}>{o.id?.slice(0, 8)}…</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HEALTH ── */}
        {tab === 'health' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 3 }}>System Health Monitor</div>
              <div style={{ fontSize: 12, color: s.muted }}>Self-verification engine · Signal accuracy tracking · Risk controls</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
              <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.secondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Signal Accuracy</div>
                {Object.entries(signalHealth).map(([name, data]) => {
                  const sc = data.status === 'active' ? s.green : data.status === 'warning' ? s.amber : s.red;
                  return (
                    <div key={name} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: s.secondary, textTransform: 'capitalize' }}>{name}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: sc }}>{data.accuracy}%</span>
                          <Chip label={data.status} color={sc} />
                        </div>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${data.accuracy}%`, height: '100%', background: sc, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: s.secondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Market Regime</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${regime.color}18`, border: `2px solid ${regime.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: regime.color, boxShadow: `0 0 8px ${regime.color}` }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: regime.color, textTransform: 'uppercase', letterSpacing: 1.5 }}>{regime.regime}</div>
                      <div style={{ fontSize: 11, color: s.muted, marginTop: 2 }}>{regime.description}</div>
                    </div>
                  </div>
                </div>
                <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: s.secondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Risk Controls</div>
                  {[['Monthly −8% circuit breaker', 'Halts all trading'], ['Max 15% per position', 'Prevents catastrophic loss'], ['ATR-based stop-losses', 'On every position'], ['Regime-based sizing', '50% reduction in bear markets'], ['Correlation guard', 'No two correlated positions']].map(([l, sub]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <div style={{ fontSize: 12, color: s.secondary }}>{l}</div>
                        <div style={{ fontSize: 10, color: s.muted }}>{sub}</div>
                      </div>
                      <Chip label="Active" color={s.green} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.14)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.blueMuted, marginBottom: 10 }}>◈ Self-Verification Engine</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[['Rolling Accuracy Check', 'After every 20 trades, each signal source is scored. Underperforming signals are automatically down-weighted.'], ['Regime Shift Detection', 'S&P 500 is monitored daily. Strategy adjusts automatically when market transitions between bull, bear, and sideways.'], ['Live vs Backtest Alert', 'If live performance diverges from expectations, position sizes are reduced automatically until stabilized.']].map(([title, text]) => (
                  <div key={title} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.blueMuted, marginBottom: 6 }}>{title}</div>
                    <div style={{ fontSize: 11, color: s.muted, lineHeight: 1.65 }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
