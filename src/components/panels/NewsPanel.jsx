import { ExternalLink } from 'lucide-react'
import { scoreNews, getScoreColor } from '../../utils/scoring.js'

function SentimentBadge({ value }) {
  if (value > 1)  return <span className="text-accent-green text-xs">↑ Positif</span>
  if (value < -1) return <span className="text-accent-red text-xs">↓ Négatif</span>
  return <span className="text-slate-400 text-xs">→ Neutre</span>
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}min`
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

export default function NewsPanel({ newsData, loading }) {
  const scored = newsData ? scoreNews(newsData) : { score: null, components: {} }
  const scoreColor = getScoreColor(scored.score)
  const articles = newsData?.articles?.slice(0, 10) || []

  const sentimentBar = scored.components?.totalArticles > 0
    ? (scored.components.positiveCount / scored.components.totalArticles) * 100
    : 50

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-accent-blue font-bold text-sm tracking-wider">ACTUALITÉS / GÉOPOLITIQUE</span>
          <span className="text-slate-500 text-xs">10% du score</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-slate-500 animate-pulse">...</span>}
          <span className="text-lg font-bold" style={{ color: scoreColor }}>
            {scored.score ?? '—'}<span className="text-xs text-slate-500">/100</span>
          </span>
        </div>
      </div>

      {/* Sentiment overview */}
      {scored.components?.totalArticles > 0 && (
        <div className="bg-bg-base rounded p-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Sentiment global : {scored.score >= 60 ? 'Haussier' : scored.score >= 40 ? 'Neutre' : 'Baissier'}</span>
            <span className="text-slate-500">
              {scored.components.positiveCount}↑ / {scored.components.negativeCount}↓ / {scored.components.neutralCount}→
            </span>
          </div>
          <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${sentimentBar}%`,
                background: sentimentBar > 60 ? '#22c55e' : sentimentBar < 40 ? '#ef4444' : '#f59e0b',
              }}
            />
          </div>
        </div>
      )}

      {/* News list */}
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
        {articles.map((article, i) => (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-2 bg-bg-base hover:bg-bg-hover rounded p-2 text-xs group transition-colors"
          >
            <div
              className="w-1 h-full min-h-6 rounded-full shrink-0 mt-0.5"
              style={{
                background: article.sentiment > 0 ? '#22c55e' : article.sentiment < 0 ? '#ef4444' : '#64748b',
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 leading-snug group-hover:text-white line-clamp-2">
                {article.title}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-slate-600">{article.source}</span>
                <span className="text-slate-700">·</span>
                <span className="text-slate-600">{timeAgo(article.publishedAt)}</span>
                <SentimentBadge value={article.sentiment} />
              </div>
            </div>
            <ExternalLink size={10} className="text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5" />
          </a>
        ))}

        {!loading && articles.length === 0 && (
          <div className="text-slate-500 text-xs text-center py-4">
            Aucune actualité disponible
          </div>
        )}

        {loading && (
          <div className="text-slate-500 text-xs text-center py-4 animate-pulse">
            Chargement des actualités...
          </div>
        )}
      </div>

      {/* Source indicator */}
      <div className="text-xs text-slate-600 flex items-center justify-between">
        <span>Source: {newsData?.source ?? '—'}</span>
        <span className="text-slate-700">
          {articles.length} articles analysés
        </span>
      </div>
    </div>
  )
}
