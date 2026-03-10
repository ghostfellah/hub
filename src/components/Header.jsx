import { RefreshCw, Settings, Activity } from 'lucide-react'

export default function Header({ lastUpdate, loading, onRefresh, onOpenSettings }) {
  const fmt = lastUpdate
    ? lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-bg-border bg-bg-card sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="pulse-dot w-2 h-2 rounded-full bg-accent-green inline-block" />
          <span className="text-accent-blue font-bold text-lg tracking-wider">
            FINANCIAL HUB
          </span>
        </div>
        <span className="text-slate-500 text-xs hidden sm:block">
          Bitcoin · ETF Flows · Macro · Géopolitique
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Activity size={12} className="text-accent-blue" />
          <span>Mis à jour: <span className="text-slate-200">{fmt}</span></span>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-bg-border text-slate-300 hover:text-accent-blue hover:border-accent-blue transition-colors text-xs disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Chargement...' : 'Actualiser'}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded border border-bg-border text-slate-400 hover:text-accent-blue hover:border-accent-blue transition-colors"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  )
}
