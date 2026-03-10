import { X, ExternalLink } from 'lucide-react'
import { cacheClear } from '../services/cache.js'

const FIELDS = [
  {
    key: 'FRED_API_KEY',
    label: 'FRED API Key',
    placeholder: 'Votre clé FRED...',
    link: 'https://fred.stlouisfed.org/docs/api/api_key.html',
    desc: 'Macro: Fed Rate, CPI, Chômage, Taux 10Y — Gratuit',
    required: true,
  },
  {
    key: 'AV_API_KEY',
    label: 'Alpha Vantage API Key',
    placeholder: 'Votre clé Alpha Vantage...',
    link: 'https://www.alphavantage.co/support/#api-key',
    desc: 'ETF IBIT/FBTC, SPY, DXY, Gold — 25 req/jour gratuit',
    required: false,
  },
  {
    key: 'CRYPTOPANIC_KEY',
    label: 'CryptoPanic API Key',
    placeholder: 'Votre clé CryptoPanic...',
    link: 'https://cryptopanic.com/developers/api/',
    desc: 'News BTC avec sentiment — Optionnel (fallback RSS)',
    required: false,
  },
]

export default function Settings({ keys, onSave, onClose }) {
  const handleSave = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const updated = {}
    FIELDS.forEach((f) => { updated[f.key] = fd.get(f.key)?.trim() || '' })
    onSave(updated)
    cacheClear()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-bg-border rounded-lg w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-bg-border">
          <h2 className="text-accent-blue font-bold tracking-wider text-sm">CONFIGURATION API</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 flex flex-col gap-4">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs font-semibold text-slate-300">{f.label}</label>
                {f.required && <span className="text-accent-red text-xs">*requis</span>}
                <a
                  href={f.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-blue hover:underline text-xs flex items-center gap-0.5 ml-auto"
                >
                  Obtenir une clé <ExternalLink size={10} />
                </a>
              </div>
              <input
                type="password"
                name={f.key}
                defaultValue={keys?.[f.key] || ''}
                placeholder={f.placeholder}
                className="w-full bg-bg-base border border-bg-border rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-blue font-mono"
              />
              <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
            </div>
          ))}

          <div className="bg-bg-base border border-bg-border rounded p-3 text-xs text-slate-400">
            <strong className="text-slate-300">Sans clé API :</strong> Bitcoin (CoinGecko + Mempool), Fear&Greed,
            ETF via Yahoo Finance, et News via RSS sont disponibles gratuitement sans aucune clé.
            Seules les données macro FRED nécessitent une clé (gratuite en 2 min).
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-bg-border text-slate-400 hover:text-white text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-accent-blue text-white font-semibold text-xs hover:bg-blue-600 transition-colors"
            >
              Sauvegarder & Actualiser
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
