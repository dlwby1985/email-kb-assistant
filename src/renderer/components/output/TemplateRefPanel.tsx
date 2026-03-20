import React, { useState, useEffect } from 'react'
import type { TemplateSelectorValue } from '../../types'

interface TemplateRefPanelProps {
  selectedTemplate: TemplateSelectorValue
  onClear: () => void
}

/**
 * Compact banner that shows when a template or history ref is active.
 * Displays the name, type badge, and a clear button.
 * For templates, also shows a "View" button that opens a modal with full content.
 */
export default function TemplateRefPanel({ selectedTemplate, onClear }: TemplateRefPanelProps) {
  const [showModal, setShowModal] = useState(false)
  const [fullContent, setFullContent] = useState<string | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)

  // Reset modal state when template changes
  useEffect(() => {
    setShowModal(false)
    setFullContent(null)
  }, [selectedTemplate])

  if (!selectedTemplate) return null

  const isTemplate = selectedTemplate.type === 'template'
  const icon = isTemplate ? '📋' : '📧'
  const label = isTemplate ? 'Template' : 'Past Email'

  const handleView = async () => {
    if (isTemplate && !fullContent) {
      setLoadingContent(true)
      try {
        const result = await window.electronAPI.templatesGet(
          (selectedTemplate as any).slug
        )
        setFullContent(result?.content ?? null)
      } catch {
        setFullContent(null)
      } finally {
        setLoadingContent(false)
      }
    }
    setShowModal(true)
  }

  return (
    <>
      {/* Banner */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-asu-gold/10 border-b border-asu-gold/30 text-sm shrink-0">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-xs font-semibold text-asu-gold uppercase tracking-wide shrink-0">
          {label}:
        </span>
        <span className="text-white truncate flex-1">{selectedTemplate.name}</span>
        {isTemplate && (
          <button
            onClick={handleView}
            className="text-xs text-asu-gold hover:underline shrink-0"
          >
            View
          </button>
        )}
        <button
          onClick={onClear}
          title="Remove template"
          className="text-white/30 hover:text-white/70 shrink-0 text-base leading-none ml-1"
        >
          ×
        </button>
      </div>

      {/* Full-content modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowModal(false)}
        >
          <div
            className="rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col border border-white/15"
            style={{ background: 'rgba(30,8,18,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <span className="text-base">{icon}</span>
              <span className="font-semibold text-white flex-1">{selectedTemplate.name}</span>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/40 hover:text-white/70 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto p-4 flex-1">
              {loadingContent ? (
                <p className="text-sm text-white/40">Loading…</p>
              ) : fullContent ? (
                <pre className="text-sm text-white/80 whitespace-pre-wrap font-sans leading-relaxed">
                  {fullContent}
                </pre>
              ) : (
                <p className="text-sm text-white/40">Content not available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
