export const USER_GUIDE_CONTENT = `# Email KB Assistant — User Guide

## Getting Started

### System Requirements
- Windows 10 or later (64-bit)
- 4 GB RAM minimum (8 GB recommended)
- Obsidian installed with a vault created
- Internet connection (for Claude API)

### First Launch
1. Select your Obsidian vault folder
2. Enter your Anthropic API key (get one at console.anthropic.com)
3. The app creates an EmailKB/ folder in your vault with all default files

### Installation Options

This app ships in two forms:

**Installer (Email KB Assistant Setup 1.1.0.exe)**
- Double-click to install. Creates Start Menu and Desktop shortcuts.
- Data is stored in your chosen vault folder — uninstalling the app does NOT delete your vault data.
- To uninstall: Windows Settings → Apps → Email KB Assistant → Uninstall.

**Portable (win-unpacked/ folder)**
- No installation required. Copy the entire win-unpacked/ folder to any location (USB drive, OneDrive, etc.).
- Launch Email KB Assistant.exe directly.
- First launch runs the setup wizard (select vault folder + API key) — same as the installer version.
- To move the portable app: copy the entire folder. Your vault data stays in your chosen location independently.

Both versions share the same vault data — you can switch between installer and portable at any time by pointing them at the same vault folder.

---

### Your First Email
1. Click the **Compose** tab
2. Select a channel (Email, WeChat, Slack, or Zoom)
3. Type or select a contact name (or leave blank for Quick Mode)
4. Fill in your core content — the key points you want to convey
5. Optionally add background context
6. Click **Generate**
7. Review, edit, copy, or save the result

---

## Features Guide

### Compose Page
- **Mode**: Generate (AI writes from your key points) or Polish (AI refines your existing draft)
- **Channel**: Email adds subject line, greeting, and signature. Conversation channels (WeChat/Slack/Zoom) produce informal messages.
- **Contact**: Select a contact to load their profile and history as context. Leave blank for Quick Mode.
- **Task/Template**: Search for reusable templates or find similar past emails.
- **Background**: Paste prior email threads or describe context. This is sent to the AI but NOT included in the output.
- **Reference Documents**: Upload PDF/DOCX/MD files as background context for the AI.
- **Email Attachments**: Note files you'll attach to the actual email. The AI will mention them in the body.
- **Core Content**: Your key points. This is the only required field.
- **Revision**: After generating, type instructions like "make it more formal" to refine.
- **Review**: Click Review to get a pre-send quality check.

### Contacts Page
- Create and manage contacts with profiles
- Each contact has: name, email, role, relationship type, language preference, group, tags
- Pin frequently-used contacts for quick access
- Groups: Faculty, Admin, Student, External, Other

### Drafts Page
- Unsent drafts saved here
- Click to resume editing
- Promote to sent (moves to contact's thread archive)

### Projects Page
- Cross-contact view organized by tags
- All threads sharing a tag appear together regardless of contact
- Useful for tracking multi-person initiatives (e.g., "spring-2026-scheduling")

### Search Page
- Full-text search across all threads
- Semantic (meaning-based) search toggle
- Filter by contact, channel, date range, tag

### Analytics Page
- Communication statistics: total contacts, threads, activity trends
- Top active contacts, channel breakdown

### Settings
- **General**: API key, model selection, context thread limit
- **IMAP**: Connect to Gmail/Outlook for automatic email import
- **Writing Style**: Train the AI on your writing style with rules and examples
- **Templates**: Create and manage email templates for recurring tasks
- **Skills**: Edit AI behavior files (advanced)
- **Keyboard Shortcuts**: Reference for all shortcuts
- **About**: Version and build information

---

## Keyboard Shortcuts

| Shortcut | Action |
|:---------|:-------|
| Ctrl+Enter | Generate / Polish |
| Ctrl+K | Go to Search |
| Ctrl+, | Go to Settings |
| Ctrl+Shift+S | Save & Archive |
| Ctrl+D | Save Draft |
| Ctrl+Shift+I | Toggle DevTools |
| F11 | Toggle Fullscreen |
| Escape | Return to Compose / close dialog |

---

## IMAP Email Import

Connect your Gmail or Outlook account to import received emails directly into your compose workflow:

1. Go to Settings → IMAP
2. Enter your IMAP host (e.g., imap.gmail.com), port (993), email, and App Password
3. For Gmail: create an App Password at myaccount.google.com/apppasswords
4. Click **Save Settings**, then **Test Connection**
5. Once connected, a "📨 Import" button appears on each contact card in Compose
6. Click it to browse recent emails from that contact and import them as background context

---

## Writing Style Training

Teach the AI to match your personal writing style:

1. Go to Settings → Writing Style
2. Add style rules (tone, common phrases, what to avoid)
3. Add example emails you've written
4. Click **Analyze Examples** to extract patterns automatically
5. The AI uses these rules and patterns on every generation

---

## Recommended Tools

### Voice Input
This app supports voice input through your operating system or third-party tools.
You can dictate into any text field (Background, Core Content, Revision) using:

**Windows Built-in**:
- Press \`Win + H\` to activate Windows Voice Typing
- Works in any text field in the app
- Supports English and many other languages

**Third-Party Tools**:
- **Whisper-based tools** (free, offline):
  - Buzz (github.com/chidiwilliams/buzz) — free, offline transcription
  - WhisperWriter — always-on voice typing
- **Cloud-based** (paid, higher accuracy):
  - Otter.ai — transcription with speaker identification
  - Google Voice Typing (via Google Docs, then copy)

**Tips for voice input in this app**:
- Click on the text field first, then start dictating
- For the Background box: dictate the context of the email thread
- For Core Content: dictate your key points
- For Revision: dictate instructions like "make it more formal"
- The AI handles rough or ungrammatical input well — don't worry about perfect dictation

---

## Advanced Features

### Custom Skills
Skills are instruction files that control how the AI generates content.
Advanced users can view and edit skills in Settings → Skills.

### Semantic Search
The Search page supports two modes:
- **Keyword**: Traditional full-text search
- **Semantic**: Meaning-based search using AI embeddings (finds related content even without exact word matches)

---

## Troubleshooting

- **API errors**: Check your API key in Settings → General
- **Blank output**: Verify internet connection (required for Claude API)
- **Files not appearing in Obsidian**: Check that Obsidian vault is open and pointing to the correct folder
- **IMAP not connecting**: Use an App Password (not your main account password) for Gmail
- **App running slowly**: Reduce Max Context Threads in Settings → General
`

export const DEFAULT_USER_GUIDE: Record<string, string> = {
  'USER-GUIDE.md': USER_GUIDE_CONTENT,
}
