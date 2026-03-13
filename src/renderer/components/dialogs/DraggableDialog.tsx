import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'

interface DraggableDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  maxWidth?: string
}

export default function DraggableDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md',
}: DraggableDialogProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  // Reset to center whenever dialog opens
  useLayoutEffect(() => {
    if (isOpen) {
      setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    }
  }, [isOpen])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    }
  }, [pos])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const card = cardRef.current
      const halfW = (card?.offsetWidth ?? 400) / 2
      const halfH = (card?.offsetHeight ?? 300) / 2
      const newX = Math.max(halfW, Math.min(window.innerWidth - halfW, e.clientX - dragOffset.current.x))
      const newY = Math.max(halfH, Math.min(window.innerHeight - halfH, e.clientY - dragOffset.current.y))
      setPos({ x: newX, y: newY })
    }
    const onMouseUp = () => { dragging.current = false }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop — click to close */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Draggable card */}
      <div
        ref={cardRef}
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          transform: 'translate(-50%, -50%)',
        }}
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle = title bar */}
        <div
          onMouseDown={handleMouseDown}
          className="px-6 py-4 border-b border-gray-200 cursor-grab active:cursor-grabbing select-none shrink-0 flex items-start justify-between"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {subtitle && <div className="text-sm text-gray-500 mt-0.5">{subtitle}</div>}
          </div>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 ml-4 text-xl leading-none mt-0.5"
          >
            ×
          </button>
        </div>

        {/* Scrollable children area */}
        <div className="flex flex-col min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
