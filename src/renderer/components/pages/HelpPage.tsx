import React, { useState, useMemo } from 'react'

interface Section {
  id: string
  title: string
  content: React.ReactNode
}

const sections: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: (
      <div className="space-y-3 text-sm text-gray-700">
        <div>
          <p className="font-medium text-gray-800 mb-1">System Requirements</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-600 ml-2">
            <li>Windows 10 or later (64-bit)</li>
            <li>4 GB RAM minimum (8 GB recommended)</li>
            <li>Obsidian installed with a vault created</li>
            <li>Internet connection (for Claude API)</li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-gray-800 mb-1">First Launch</p>
          <ol className="list-decimal list-inside space-y-0.5 text-gray-600 ml-2">
            <li>Select your Obsidian vault folder</li>
            <li>Enter your Anthropic API key (get one at console.anthropic.com)</li>
            <li>The app creates an EmailKB/ folder in your vault</li>
          </ol>
        </div>
        <div>
          <p className="font-medium text-gray-800 mb-1">Your First Email</p>
          <ol className="list-decimal list-inside space-y-0.5 text-gray-600 ml-2">
            <li>Click the <strong>Compose</strong> tab</li>
            <li>Select a channel (Email, WeChat, Slack, or Zoom)</li>
            <li>Type or select a contact name (or leave blank for Quick Mode)</li>
            <li>Fill in your core content — the key points you want to convey</li>
            <li>Optionally add background context</li>
            <li>Click <strong>Generate</strong></li>
            <li>Review, edit, copy, or save the result</li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    id: 'compose',
    title: 'Compose Page',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        {[
          ['Mode', 'Generate (AI writes from your key points) or Polish (AI refines your existing draft)'],
          ['Channel', 'Email adds subject line, greeting, and signature. Conversation channels (WeChat/Slack/Zoom) produce informal messages.'],
          ['Contact', 'Select a contact to load their profile and history as context. Leave blank for Quick Mode.'],
          ['Task/Template', 'Search for reusable templates or find similar past emails.'],
          ['Background', 'Paste prior email threads or describe context. Sent to the AI but NOT included in the output.'],
          ['Reference Docs', 'Upload PDF/DOCX/MD files as background context for the AI.'],
          ['Email Attachments', "Note files you'll attach to the actual email. The AI will mention them in the body."],
          ['Core Content', 'Your key points. This is the only required field.'],
          ['Revision', 'After generating, type instructions like "make it more formal" to refine.'],
          ['Review', 'Click Review to get a pre-send quality check.'],
        ].map(([term, def]) => (
          <div key={term} className="flex gap-2">
            <span className="font-medium text-gray-800 w-32 shrink-0">{term}</span>
            <span className="text-gray-600">{def}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'contacts',
    title: 'Contacts Page',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>Create and manage contact profiles used to personalize AI output.</p>
        <ul className="list-disc list-inside space-y-0.5 text-gray-600 ml-2">
          <li>Each contact has: name, email, role, relationship type, language preference, group, tags</li>
          <li>Pin frequently-used contacts for quick access</li>
          <li>Groups: Faculty, Admin, Student, External, Other</li>
          <li>Click <strong>History</strong> to view past communication threads with a contact</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'imap',
    title: 'IMAP Email Import',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>Connect your Gmail or Outlook account to import emails directly into Compose.</p>
        <ol className="list-decimal list-inside space-y-0.5 text-gray-600 ml-2">
          <li>Go to Settings → IMAP</li>
          <li>Enter your IMAP host (e.g., imap.gmail.com), port (993), and email</li>
          <li>For Gmail: create an App Password at myaccount.google.com/apppasswords</li>
          <li>Click <strong>Save Settings</strong>, then <strong>Test Connection</strong></li>
          <li>Once connected, a "📨 Import" button appears on each contact card</li>
          <li>Click it to browse recent emails from that contact and import them as background context</li>
        </ol>
        <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mt-1">
          ⚠ Gmail requires an App Password (not your main Google account password). Enable 2FA first.
        </p>
      </div>
    ),
  },
  {
    id: 'writing-style',
    title: 'Writing Style Training',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>Teach the AI to match your personal writing style.</p>
        <ol className="list-decimal list-inside space-y-0.5 text-gray-600 ml-2">
          <li>Go to Settings → Writing Style</li>
          <li>Add style rules (tone, common phrases, what to avoid)</li>
          <li>Add example emails you've written</li>
          <li>Click <strong>Analyze Examples</strong> to extract patterns automatically</li>
          <li>The AI uses these rules and patterns on every generation</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'search',
    title: 'Search Page',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>Search across all saved communication threads.</p>
        <ul className="list-disc list-inside space-y-0.5 text-gray-600 ml-2">
          <li><strong>Keyword</strong>: Traditional full-text search — exact word matches</li>
          <li><strong>Semantic</strong>: Meaning-based search using AI embeddings — finds related content even without exact word matches</li>
        </ul>
        <p className="text-gray-500">Tip: Use Ctrl+K from anywhere to jump to Search.</p>
      </div>
    ),
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    content: (
      <table className="w-full text-sm">
        <tbody>
          {[
            ['Ctrl+Enter', 'Generate / Polish'],
            ['Ctrl+K', 'Go to Search'],
            ['Ctrl+,', 'Go to Settings'],
            ['Ctrl+Shift+S', 'Save & Archive'],
            ['Ctrl+D', 'Save Draft'],
            ['Ctrl+Shift+I', 'Toggle DevTools'],
            ['F11', 'Toggle Fullscreen'],
            ['Escape', 'Return to Compose / close dialog'],
          ].map(([key, action]) => (
            <tr key={key} className="border-b border-gray-100 last:border-0">
              <td className="py-1.5 pr-4 w-36">
                <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono text-gray-700 whitespace-nowrap">
                  {key}
                </kbd>
              </td>
              <td className="py-1.5 text-gray-600">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    id: 'voice-input',
    title: 'Voice Input',
    content: (
      <div className="space-y-3 text-sm text-gray-700">
        <p>You can dictate into any text field (Background, Core Content, Revision) using your OS or a third-party tool.</p>
        <div>
          <p className="font-medium text-gray-800 mb-1">Windows Built-in (free)</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-600 ml-2">
            <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1 py-0.5 text-xs font-mono">Win + H</kbd> to activate Windows Voice Typing</li>
            <li>Works in any text field — supports English and many other languages</li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-gray-800 mb-1">Third-Party Tools</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-600 ml-2">
            <li><strong>Buzz</strong> (github.com/chidiwilliams/buzz) — free, offline Whisper-based transcription</li>
            <li><strong>WhisperWriter</strong> — always-on voice typing using Whisper</li>
            <li><strong>Otter.ai</strong> — cloud-based transcription with speaker identification</li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-gray-800 mb-1">Tips</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-600 ml-2">
            <li>Click the text field first, then start dictating</li>
            <li>Background: dictate the context of the email thread</li>
            <li>Core Content: dictate your key points</li>
            <li>Revision: dictate instructions like "make it more formal"</li>
            <li>The AI handles rough or ungrammatical input well</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        {[
          ['API errors', 'Check your API key in Settings → General'],
          ['Blank output', 'Verify internet connection (required for Claude API)'],
          ['Files not in Obsidian', 'Check that Obsidian vault is open and pointing to the correct folder'],
          ['IMAP not connecting', 'Use an App Password (not your main account password) for Gmail'],
          ['App running slowly', 'Reduce Max Context Threads in Settings → General'],
        ].map(([problem, solution]) => (
          <div key={problem} className="flex gap-2">
            <span className="font-medium text-gray-800 w-36 shrink-0">• {problem}</span>
            <span className="text-gray-600">{solution}</span>
          </div>
        ))}
      </div>
    ),
  },
]

export default function HelpPage() {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections
    const q = search.toLowerCase()
    return sections.filter((s) => {
      // Search in title
      if (s.title.toLowerCase().includes(q)) return true
      return false
    })
  }, [search])

  const toggle = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-6 pt-4 pb-3 border-b border-gray-100 shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search help topics..."
          className="input-field text-sm w-full"
          autoFocus
        />
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {filteredSections.length === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-8">No topics match "{search}"</p>
        )}
        {filteredSections.map((section) => {
          const isCollapsed = collapsed[section.id]
          return (
            <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-gray-800">{section.title}</span>
                <span className="text-gray-400 text-xs">{isCollapsed ? '▼' : '▲'}</span>
              </button>
              {!isCollapsed && (
                <div className="px-4 py-3 bg-white">
                  {section.content}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
