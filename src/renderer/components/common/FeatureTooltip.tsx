import React, { useState, useEffect } from 'react'

interface FeatureTooltipProps {
  id: string            // Unique tooltip key, e.g. 'tip_review_button'
  text: string          // One-sentence tip shown to the user
  position?: 'top' | 'bottom' | 'right' | 'left'
  children?: React.ReactNode
}

/**
 * Returns [dismissed, markDismissed].
 *
 * Dismissal is stored persistently in app-state.json (via IPC) so it
 * survives app restarts — localStorage is unreliable in packaged Electron.
 *
 * While loading: returns [true, noop] so the tooltip is hidden until we
 * know whether it's been dismissed (avoids a flash on startup).
 */
export function useTipSeen(id: string): [boolean, () => void] {
  // true = hidden (either dismissed or loading), false = show tooltip
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    window.electronAPI
      .appStateGetDismissedTooltips()
      .then((ids) => setDismissed(ids.includes(id)))
      .catch(() => setDismissed(true)) // on error, hide rather than spam
  }, [id])

  const markDismissed = () => {
    setDismissed(true)
    window.electronAPI.appStateDismissTooltip(id).catch(() => {})
  }

  return [dismissed, markDismissed]
}

export default function FeatureTooltip({
  id,
  text,
  position = 'bottom',
  children,
}: FeatureTooltipProps) {
  const [dismissed, markDismissed] = useTipSeen(id)

  if (dismissed) return <>{children}</>

  const positionClasses: Record<string, string> = {
    bottom: 'top-full left-0 mt-1',
    top:    'bottom-full left-0 mb-1',
    right:  'left-full top-0 ml-1',
    left:   'right-full top-0 mr-1',
  }

  return (
    <div className="relative inline-block w-full">
      {children}
      <div
        className={`absolute ${positionClasses[position]} z-40 w-64 bg-asu-maroon text-white text-xs rounded-lg shadow-lg px-3 py-2.5`}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="leading-snug mb-2">{text}</p>
        <button
          onClick={markDismissed}
          className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-2 py-0.5 rounded transition-colors"
        >
          Got it
        </button>
        <button
          onClick={markDismissed}
          className="ml-2 text-white/60 hover:text-white text-xs transition-colors"
          title="Don't show again"
        >
          ✕
        </button>
        {position === 'bottom' && (
          <div className="absolute -top-1.5 left-4 w-3 h-3 bg-asu-maroon rotate-45" />
        )}
        {position === 'top' && (
          <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-asu-maroon rotate-45" />
        )}
      </div>
    </div>
  )
}
