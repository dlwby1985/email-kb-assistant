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
      <div className="flex flex-col h-full items-center justify-center text-gray-400">
        <div className="w-10 h-10 border-4 border-asu-maroon/20 border-t-asu-maroon rounded-full animate-spin mb-4" />
        <p className="text-sm">{t('compose.generating')}</p>
        <p className="text-xs text-gray-300 mt-1">This may take a few seconds</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-red-500 text-sm font-medium mb-2">⚠ Generation Error</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
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
      <div className="flex flex-col h-full items-center justify-center text-gray-400 p-6">
        <div className="text-center max-w-xs">
          <p className="text-4xl mb-3">✉️</p>
          <p className="text-sm font-medium text-gray-500 mb-1">{t('output.noOutput')}</p>
          <p className="text-xs text-gray-400">
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
              <p className="text-base font-medium text-gray-900">{subject || '(no subject)'}</p>
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
              className="w-full min-h-[300px] leading-relaxed bg-transparent border border-gray-200 rounded-md p-3 focus:outline-none focus:border-asu-maroon/40 resize-y"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', lineHeight: '1.5', color: '#222222' }}
              rows={15}
            />
          ) : (
            <div
              className="text-gray-800 leading-relaxed whitespace-pre-wrap cursor-text"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', lineHeight: '1.5', color: '#222222' }}
              onClick={() => setIsEditing(true)}
              title="Click to edit"
            >
              {isEmail ? body : output}
            </div>
          )}
        </div>

        {/* Revision count indicator */}
        {revisionCount > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              {revisionCount} revision{revisionCount > 1 ? 's' : ''} applied
            </span>
          </div>
        )}

        {/* Review result panel */}
        {reviewError && (
          <div className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-xs text-red-600">
            ⚠ Review error: {reviewError}
          </div>
        )}
        {reviewResult && (
          <div className={`mt-4 p-3 rounded border text-xs whitespace-pre-wrap leading-relaxed ${
            reviewResult.isReady
              ? 'border-green-200 bg-green-50 text-gray-700'
              : 'border-amber-200 bg-amber-50 text-gray-700'
          }`}>
            <div className={`font-semibold mb-2 ${reviewResult.isReady ? 'text-green-700' : 'text-amber-700'}`}>
              {reviewResult.isReady ? '✓ Ready to Send' : '⚠ Needs Attention'}
            </div>
            {reviewResult.text.replace(/###\s*Status:.*\n?/, '').trim()}
          </div>
        )}
      </div>

      {/* Signature indicator (email mode only, when there are multiple signatures) */}
      {isEmail && output && signatures.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-2 flex items-center gap-2 bg-gray-50 text-xs text-gray-500 shrink-0">
          <span className="font-medium">Signature:</span>
          <select
            value={signatureId ?? ''}
            onChange={(e) => onSignatureIdChange(e.target.value || null)}
            className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 focus:outline-none focus:border-asu-maroon"
          >
            <option value="">Auto (by language)</option>
            {signatures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.is_default ? ' ★' : ''}
              </option>
            ))}
          </select>
          {signatureId && (
            <span className="text-gray-400 text-xs">
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
