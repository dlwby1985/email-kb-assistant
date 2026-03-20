import React, { useState, useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Channel, SignatureConfig, ExtractedTodo } from '../../types'
import ActionButtons from './ActionButtons'
import RevisionBox from './RevisionBox'
import TodoPanel from './TodoPanel'

interface ReviewResult {
  text: string
  isReady: boolean
}

interface OutputPanelProps {
  output: string
  isLoading: boolean
  error: string | null
  channel: Channel
  revisionCount: number
  onOutputChange: (text: string) => void
  onRevise: (instruction: string) => void
  onRegenerate: () => void
  onCopy: () => void
  onSaveDraft: () => void
  onSaveArchive: () => void
  onReview: () => Promise<{ success: boolean; text?: string; error?: string }>
  signatures: SignatureConfig[]
  signatureId: string | null
  onSignatureIdChange: (id: string | null) => void
  contactName?: string
}

function OutputPanel({
  output,
  isLoading,
  error,
  channel,
  revisionCount,
  onOutputChange,
  onRevise,
  onRegenerate,
  onCopy,
  onSaveDraft,
  onSaveArchive,
  onReview,
  signatures,
  signatureId,
  onSignatureIdChange,
  contactName,
}: OutputPanelProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(true)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Tasks state — managed internally
  const [pendingTodos, setPendingTodos] = useState<ExtractedTodo[] | null>(null)
  const [isExtractingTasks, setIsExtractingTasks] = useState(false)
  const [isSavingTodos, setIsSavingTodos] = useState(false)

  // Clear review and todos when new output is generated
  useEffect(() => {
    setReviewResult(null)
    setReviewError(null)
    setPendingTodos(null)
  }, [output])

  const handleReview = async () => {
    setIsReviewing(true)
    setReviewResult(null)
    setReviewError(null)
    try {
      const result = await onReview()
      if (result.success && result.text) {
        setReviewResult({
          text: result.text,
          isReady: result.text.includes('Ready to Send'),
        })
      } else {
        setReviewError(result.error || 'Review failed')
      }
    } catch (err: any) {
      setReviewError(err.message || 'Review failed')
    } finally {
      setIsReviewing(false)
    }
  }

  const handleTasks = async () => {
    if (!output) return
    setIsExtractingTasks(true)
    setPendingTodos(null)
    try {
      const result = await window.electronAPI.todosExtract(output, contactName ?? '')
      if (result.success && result.todos.length > 0) {
        setPendingTodos(result.todos)
      } else if (result.success) {
        // No action items found — show empty panel so user can add manually
        setPendingTodos([])
      }
    } catch { /* swallow */ } finally {
      setIsExtractingTasks(false)
    }
  }

  const handleSaveTodos = async (selected: ExtractedTodo[]) => {
    setIsSavingTodos(true)
    try {
      await window.electronAPI.todosSave(selected)
    } catch { /* swallow */ } finally {
      setIsSavingTodos(false)
      setPendingTodos(null)
    }
  }

  // Parse email output into subject and body
  const isEmail = channel === 'email'
  let subject = ''
  let body = output

  if (isEmail && output) {
    const subjectMatch = output.match(/^Subject:\s*(.+)/im)
    if (subjectMatch) {
      subject = subjectMatch[1].trim()
      body = output.replace(/^Subject:\s*.+\n*/im, '').trim()
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-white/50">
        <div className="w-10 h-10 border-4 border-asu-gold/20 border-t-asu-gold rounded-full animate-spin mb-4" />
        <p className="text-sm">{t('compose.generating')}</p>
        <p className="text-xs text-white/30 mt-1">This may take a few seconds</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-red-400 text-sm font-medium mb-2">⚠ Generation Error</p>
          <p className="text-white/50 text-sm mb-4">{error}</p>
          <button onClick={onRegenerate} className="btn-secondary text-sm">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (!output) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-white/40 p-6">
        <div className="text-center max-w-xs">
          <p className="text-4xl mb-3">✉️</p>
          <p className="text-sm font-medium text-white/50 mb-1">{t('output.noOutput')}</p>
          <p className="text-xs text-white/40">
            {t('output.noOutputHint')}
          </p>
        </div>
      </div>
    )
  }

  // Output display
  return (
    <div className="flex flex-col h-full">
      {/* Output content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Email mode: show subject + body */}
        {isEmail && (
          <div className="mb-4">
            <label className="section-label">Subject</label>
            {isEditing ? (
              <input
                type="text"
                value={subject}
                onChange={(e) => {
                  const newOutput = `Subject: ${e.target.value}\n\n${body}`
                  onOutputChange(newOutput)
                }}
                className="input-field text-base font-medium"
              />
            ) : (
              <p className="text-base font-medium text-white">{subject || '(no subject)'}</p>
            )}
          </div>
        )}

        {/* Body */}
        <div>
          {isEmail && <label className="section-label">Body</label>}
          {isEditing ? (
            <textarea
              value={isEmail ? body : output}
              onChange={(e) => {
                if (isEmail && subject) {
                  onOutputChange(`Subject: ${subject}\n\n${e.target.value}`)
                } else {
                  onOutputChange(e.target.value)
                }
              }}
              className="w-full min-h-[300px] leading-relaxed bg-transparent border border-white/15 rounded-md p-3 focus:outline-none focus:border-asu-gold/40 resize-y text-white"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', lineHeight: '1.5', color: '#FAFAFA' }}
              rows={15}
            />
          ) : (
            <div
              className="leading-relaxed whitespace-pre-wrap cursor-text"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', lineHeight: '1.5', color: '#FAFAFA' }}
              onClick={() => setIsEditing(true)}
              title="Click to edit"
            >
              {isEmail ? body : output}
            </div>
          )}
        </div>

        {/* Revision count indicator */}
        {revisionCount > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <span className="text-xs text-white/40">
              {revisionCount} revision{revisionCount > 1 ? 's' : ''} applied
            </span>
          </div>
        )}

        {/* Review result panel */}
        {reviewError && (
          <div className="mt-4 p-3 rounded border border-red-500/30 text-xs text-red-400" style={{ background: 'rgba(220,38,38,0.08)' }}>
            ⚠ Review error: {reviewError}
          </div>
        )}
        {reviewResult && (
          <div className={`mt-4 p-3 rounded border text-xs whitespace-pre-wrap leading-relaxed ${
            reviewResult.isReady
              ? 'border-green-500/30 text-white/80'
              : 'border-amber-500/30 text-white/80'
          }`} style={{ background: reviewResult.isReady ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)' }}>
            <div className={`font-semibold mb-2 ${reviewResult.isReady ? 'text-green-400' : 'text-amber-400'}`}>
              {reviewResult.isReady ? '✓ Ready to Send' : '⚠ Needs Attention'}
            </div>
            {reviewResult.text.replace(/###\s*Status:.*\n?/, '').trim()}
          </div>
        )}
      </div>

      {/* Signature indicator (email mode only, when there are multiple signatures) */}
      {isEmail && output && signatures.length > 0 && (
        <div className="border-t border-white/10 px-6 py-2 flex items-center gap-2 text-xs text-white/50 shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <span className="font-medium">Signature:</span>
          <select
            value={signatureId ?? ''}
            onChange={(e) => onSignatureIdChange(e.target.value || null)}
            className="text-xs border border-white/15 rounded px-1.5 py-0.5 bg-transparent text-white/70 focus:outline-none focus:border-asu-gold"
          >
            <option value="" className="bg-gray-900">Auto (by language)</option>
            {signatures.map((s) => (
              <option key={s.id} value={s.id} className="bg-gray-900">
                {s.name}{s.is_default ? ' ★' : ''}
              </option>
            ))}
          </select>
          {signatureId && (
            <span className="text-white/30 text-xs">
              — change takes effect on next generate
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <ActionButtons
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onCopy={onCopy}
        onTasks={handleTasks}
        isExtractingTasks={isExtractingTasks}
        onSaveDraft={onSaveDraft}
        onSaveArchive={onSaveArchive}
        onRegenerate={onRegenerate}
        onReview={handleReview}
        isReviewing={isReviewing}
      />

      {/* Todo panel — shown when Tasks button is clicked */}
      {pendingTodos !== null && (
        <TodoPanel
          todos={pendingTodos}
          onSave={handleSaveTodos}
          onDismiss={() => setPendingTodos(null)}
          isSaving={isSavingTodos}
        />
      )}

      {/* Revision box */}
      <RevisionBox onRevise={onRevise} isLoading={isLoading} />
    </div>
  )
}

export default memo(OutputPanel)
