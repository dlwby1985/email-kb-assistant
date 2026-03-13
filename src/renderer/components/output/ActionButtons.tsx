import React from 'react'
import { useTranslation } from 'react-i18next'
import FeatureTooltip from '../common/FeatureTooltip'

interface ActionButtonsProps {
  isEditing: boolean
  onToggleEdit: () => void
  onCopy: () => void
  onTasks: () => void
  isExtractingTasks: boolean
  onSaveDraft: () => void
  onSaveArchive: () => void
  onRegenerate: () => void
  onReview: () => void
  isReviewing: boolean
}

export default function ActionButtons({
  isEditing,
  onToggleEdit,
  onCopy,
  onTasks,
  isExtractingTasks,
  onSaveDraft,
  onSaveArchive,
  onRegenerate,
  onReview,
  isReviewing,
}: ActionButtonsProps) {
  const { t } = useTranslation()
  return (
    <div className="border-t border-gray-200 px-6 py-3 flex items-center gap-2 shrink-0 bg-gray-50">
      {/* Copy */}
      <button
        onClick={onCopy}
        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
        title="Copy to clipboard"
      >
        📋 {t('output.copy')}
      </button>

      {/* Edit toggle */}
      <button
        onClick={onToggleEdit}
        className={`text-xs px-3 py-1.5 rounded font-medium border transition-all duration-150 flex items-center gap-1
          ${isEditing
            ? 'border-asu-maroon text-asu-maroon bg-asu-maroon/5'
            : 'border-gray-200 text-gray-700 hover:border-asu-maroon hover:text-asu-maroon'
          }`}
        title={isEditing ? 'Finish editing' : 'Edit inline'}
      >
        ✏️ {isEditing ? t('output.done') : t('output.edit')}
      </button>

      {/* Tasks */}
      <button
        onClick={onTasks}
        disabled={isExtractingTasks}
        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
        title="Extract action items from this draft"
      >
        {isExtractingTasks ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-gray-400/30 border-t-gray-500 rounded-full animate-spin" />
            {t('output.extracting')}
          </>
        ) : (
          `📋 ${t('output.tasks')}`
        )}
      </button>

      {/* Review */}
      <FeatureTooltip id="review_button" text="Review checks your draft for tone, completeness, and clarity before you send it." position="top">
        <button
          onClick={onReview}
          disabled={isReviewing}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
          title="Pre-send review — check draft for issues"
        >
          {isReviewing ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-gray-400/30 border-t-gray-500 rounded-full animate-spin" />
              {t('output.reviewing')}
            </>
          ) : (
            `🔍 ${t('output.review')}`
          )}
        </button>
      </FeatureTooltip>

      {/* Save Draft */}
      <button
        onClick={onSaveDraft}
        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
        title="Save as draft to vault"
      >
        💾 {t('output.saveDraft')}
      </button>

      {/* Save & Archive */}
      <button
        onClick={onSaveArchive}
        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
        title="Save thread and archive"
      >
        📁 {t('output.saveArchive')}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Regenerate */}
      <button
        onClick={onRegenerate}
        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
        title="Regenerate from scratch"
      >
        🔄 {t('output.regenerate')}
      </button>
    </div>
  )
}
