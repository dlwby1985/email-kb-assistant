import React from 'react'

interface MainLayoutProps {
  inputPanel: React.ReactNode
  outputPanel: React.ReactNode
}

export default function MainLayout({ inputPanel, outputPanel }: MainLayoutProps) {
  return (
    <div className="flex-1 flex min-h-0">
      {/* Left: Input Panel */}
      <div className="w-[45%] min-w-[380px] border-r border-gray-200 overflow-y-auto">
        {inputPanel}
      </div>

      {/* Right: Output Panel */}
      <div className="w-[55%] min-w-[420px] overflow-y-auto bg-white">
        {outputPanel}
      </div>
    </div>
  )
}
