import { getSignal, getScoreColor, scoreBTC, scoreETF, scoreMacro, scoreNews, computeGlobalScore } from '../utils/scoring.js'

function getBtcStructureStep(btcComponents) {
  const ratio = btcComponents?.priceVsMA200
  const rsi = btcComponents?.rsi14

  const aboveMA200 = ratio !== null && ratio !== undefined && ratio >= 1.0
  const rsiOverbought = rsi !== null && rsi !== undefined && rsi >= 70
  const rsiExtreme = rsi !== null && rsi !== undefined && rsi >= 80

  // Determine positive/negative based on actual MA200 + RSI
  const isPositive = aboveMA200 && !rsiOverbought

  // Build dynamic description text
  let positiveText = 'Au-dessus MA200'
  let negativeText = ''

  if (!aboveMA200) {
    negativeText = 'En-dessous MA200'
  }
  if (rsiExtreme) {
    negativeText += negativeText ? ' + RSI > 80' : 'RSI > 80'
  } else if (rsiOverbought) {
    negativeText += negativeText ? ' + RSI > 70' : 'RSI > 70'
  }

  if (rsi !== null && rsi !== undefined) {
    positiveText += `, RSI ${rsi.toFixed(0)} (< 70)`
  }

  if (!negativeText) negativeText = 'En-dessous MA200 ou RSI > 80'

  return {
    isPositive,
    positiveText,
    negativeText,
    hasData: ratio !== null && ratio !== undefined,
  }
}

const STEPS = [
  {
    id: 'check_macro',
    label: '1. Environnement macro',
    description: 'La politique de la Fed est-elle accommodante ? L\'inflation recule-t-elle ?',
    positive: 'Fed accommodant + inflation en baisse',
    negative: 'Fed hawkish ou inflation persistante',
    threshold: 50,
    scoreKey: 'macro',
  },
  {
    id: 'check_btc',
    label: '2. Structure BTC',
    description: 'Le prix est-il au-dessus de la MA200 ? RSI non suracheté ?',
    positive: null,
    negative: null,
    threshold: 50,
    scoreKey: 'btc',
    dynamic: true,
  },
  {
    id: 'check_sentiment',
    label: '3. Sentiment du marché',
    description: 'Fear & Greed < 40 (opportunité) ou signal de momentum ?',
    positive: 'Peur extrême ou momentum haussier',
    negative: 'Euphorie extrême (> 80) ou panique',
    threshold: 50,
    scoreKey: 'btc',
  },
  {
    id: 'check_etf',
    label: '4. Flux institutionnels',
    description: 'Les ETF Bitcoin montrent-ils des entrées nettes positives ?',
    positive: 'Flux ETF positifs, accumulation institutionnelle',
    negative: 'Flux ETF négatifs, sortie institutionnelle',
    threshold: 50,
    scoreKey: 'etf',
  },
  {
    id: 'check_geo',
    label: '5. Contexte géopolitique',
    description: 'Aucun événement majeur perturbateur à l\'horizon ?',
    positive: 'Environnement géopolitique stable',
    negative: 'Risques majeurs (guerre, régulation, crise)',
    threshold: 50,
    scoreKey: 'news',
  },
]

const ACTIONS = {
  strongBuy: {
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.08)',
    title: 'FORT ACHAT',
    steps: [
      'Augmenter la position BTC (DCA agressif)',
      'Allonger l\'horizon temporel (HODLing)',
      'Envisager une exposition à l\'effet de levier modéré (max 2x)',
      'Surveiller les niveaux de résistance clés',
    ],
  },
  buy: {
    color: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.06)',
    title: 'ACHAT / DCA',
    steps: [
      'DCA régulier (hebdomadaire ou mensuel)',
      'Accumuler progressivement en zones de support',
      'Conserver les positions existantes',
      'Fixer des alertes sur les niveaux techniques',
    ],
  },
  hold: {
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    title: 'HOLD / ATTENDRE',
    steps: [
      'Maintenir les positions actuelles',
      'Pas d\'achat supplémentaire, pas de vente',
      'Surveiller l\'évolution des indicateurs',
      'Préparer les niveaux d\'entrée/sortie',
    ],
  },
  caution: {
    color: '#fb923c',
    bg: 'rgba(251, 146, 60, 0.08)',
    title: 'PRUDENCE',
    steps: [
      'Réduire progressivement l\'exposition (20-30%)',
      'Activer les stop-loss sur les positions',
      'Sécuriser les gains récents',
      'Augmenter la portion cash/stablecoins',
    ],
  },
  sell: {
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    title: 'VENTE / SORTIE',
    steps: [
      'Sortir progressivement du marché',
      'Conserver uniquement les positions long terme intouchables',
      'Aller majoritairement en cash/stablecoins',
      'Rester en veille pour un point d\'entrée futur',
    ],
  },
}

function getAction(score) {
  if (score >= 80) return ACTIONS.strongBuy
  if (score >= 65) return ACTIONS.buy
  if (score >= 50) return ACTIONS.hold
  if (score >= 35) return ACTIONS.caution
  return ACTIONS.sell
}

export default function DecisionPanel({ scores, btcComponents }) {
  const { btc, etf, macro, news, global: globalScore } = scores || {}
  const action = globalScore !== null ? getAction(globalScore) : null

  const scoreMap = { btc, etf, macro, news }
  const btcStructure = getBtcStructureStep(btcComponents)

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-white font-bold text-sm tracking-wider">WORKFLOW DE DÉCISION</span>
        <span className="text-slate-500 text-xs">Analyse en 5 étapes</span>
      </div>

      {/* Decision flow */}
      <div className="flex flex-col gap-2">
        {STEPS.map((step, i) => {
          const stepScore = scoreMap[step.scoreKey]

          // For step 2 (Structure BTC), use actual MA200/RSI data
          let isPositive, isNull, positiveText, negativeText
          if (step.dynamic) {
            isNull = !btcStructure.hasData
            isPositive = btcStructure.isPositive
            positiveText = btcStructure.positiveText
            negativeText = btcStructure.negativeText
          } else {
            isNull = stepScore === null
            isPositive = stepScore !== null ? stepScore >= step.threshold : null
            positiveText = step.positive
            negativeText = step.negative
          }

          return (
            <div
              key={step.id}
              className="flex items-start gap-3 bg-bg-base rounded p-3"
              style={{
                borderLeft: `3px solid ${isNull ? '#1a2540' : isPositive ? '#22c55e' : '#ef4444'
                  }`,
              }}
            >
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: isNull ? '#1a2540' : isPositive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                    color: isNull ? '#6b7280' : isPositive ? '#22c55e' : '#ef4444',
                    border: `1px solid ${isNull ? '#374151' : isPositive ? '#22c55e' : '#ef4444'}`,
                  }}
                >
                  {isNull ? '?' : isPositive ? '✓' : '✗'}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px h-3 bg-bg-border" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">{step.label}</span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: isNull ? '#6b7280' : isPositive ? '#22c55e' : '#ef4444' }}
                  >
                    {stepScore !== null ? `${stepScore}/100` : '—'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                <div className="text-xs mt-1">
                  {isNull ? (
                    <span className="text-slate-600">En attente de données...</span>
                  ) : isPositive ? (
                    <span className="text-accent-green">{positiveText}</span>
                  ) : (
                    <span className="text-accent-red">{negativeText}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action recommendation */}
      {action && (
        <div
          className="rounded-lg p-4 border"
          style={{ background: action.bg, borderColor: action.color + '40' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="text-sm font-bold tracking-widest"
              style={{ color: action.color }}
            >
              → DÉCISION : {action.title}
            </div>
            <div
              className="ml-auto text-2xl font-black"
              style={{ color: action.color }}
            >
              {globalScore}/100
            </div>
          </div>
          <ul className="flex flex-col gap-1.5">
            {action.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span style={{ color: action.color }} className="mt-0.5 shrink-0">▸</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!action && (
        <div className="bg-bg-base rounded p-3 text-xs text-slate-500 text-center">
          Configurez au moins les clés API gratuites pour voir la recommandation.
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-slate-600 border-t border-bg-border pt-2">
        ⚠ Ce hub est un outil d'aide à la décision. Aucune décision financière ne doit être prise
        uniquement sur la base de ces indicateurs. Faites vos propres recherches (DYOR).
      </div>
    </div>
  )
}
