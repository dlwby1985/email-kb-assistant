# Email KB Assistant

An AI-powered desktop application for drafting, polishing, and managing professional email communications — with a built-in local knowledge base that learns from every interaction.

Built by a university professor who needed a better way to handle the relentless flow of administrative emails. If you've ever stared at a reply-all chain in a language that isn't your first and thought *"there has to be a better way"* — this is that better way.

---

## Download

**[Download the latest release](https://github.com/dlwby1985/email-kb-assistant/releases/latest)**

- **Email KB Assistant Setup.exe** — Windows installer (recommended)
- **EmailKBAssistant-portable.zip** — Portable version (no install needed, runs from USB)

No Node.js or development tools required. Download, install, and start composing.

---

## Why This Exists

As a program director and professor at a public research university, I spend a significant portion of my workday on email. Course scheduling, faculty coordination, student advising, policy discussions, event planning — it all flows through the inbox.

For non-native English speakers, the challenge goes beyond volume. Every email requires careful attention to tone, formality, cultural context, and institutional language. A message to the Dean reads very differently from a WeChat message to a colleague, which reads very differently from a reply to a student.

I built this application to solve that problem: **an AI assistant that knows my contacts, remembers our communication history, understands institutional context, and adapts its output to each relationship and channel.**

---

## Features

### AI-Assisted Drafting

Write key points in any language. The AI composes a complete, contextually appropriate message — matching the tone, formality, and format to the recipient and channel.

- **Generate mode**: Provide your key points, get a full draft
- **Polish mode**: Paste an existing draft, get it refined while preserving your intent
- **Multi-channel**: Email (with subject, greeting, signature) or conversation style (WeChat, Slack, Zoom)
- **Pre-send review**: AI checks your draft for tone, completeness, and cultural sensitivity before you hit send
- **Inline editing**: Edit the generated output directly in the app before copying or saving
- **Gmail-compatible copy**: Output is formatted for clean paste into Gmail (Sans Serif, correct spacing)

### Gmail Integration with OAuth 2.0

Connect your Gmail account using secure Google OAuth 2.0 authentication — no app passwords needed.

- **Fetch emails on the Compose page**: Click "Fetch Today" to pull in today's emails without leaving the drafting workflow
- **Date filtering**: Fetch emails from today, the last 2 days, or the full week
- **One-click reply setup**: Click any fetched email to auto-fill the contact, background context, and channel — then just type your key points and generate
- **Works with Google Workspace**: Designed for university and enterprise Gmail accounts

### Persistent Knowledge Base

Every interaction is saved as a Markdown file, building a searchable personal knowledge base over time.

- **Per-contact profiles**: Communication preferences, relationship type, language, role, notes — all automatically referenced in future drafts
- **Thread history**: Complete record of every email exchange, organized by contact. Toggle past communication context on or off per generation
- **Auto-summaries**: After each interaction, the AI updates the contact's profile with recent topics and pending items
- **Reference documents**: Drag and drop PDFs, DOCX, Markdown files, or fetch web page URLs. The AI searches them when drafting
- **Full-text search**: SQLite FTS5 powered search across all contacts, threads, and knowledge base documents

### Contact Intelligence

- Contact profiles with relationship type, language preference, and communication history
- Groups (Faculty, Admin, Student, External) with visual indicators
- Pin frequently-used contacts for quick access
- Cross-contact project views — see all communication related to a topic across multiple people

### Template System

Create reusable templates for recurring tasks (fund approvals, scheduling requests, student advisement).

- **Editable templates**: Create, edit, and delete templates directly in the app
- **Strict mode**: Mark a template as "strict" to ensure the AI follows it exactly — only personalizing names, dates, and details while preserving the exact institutional language
- **AI matching**: The AI recommends templates based on your current task and adapts them to the specific situation

### Writing Style Training

Train the AI on your personal writing style through explicit rules and example emails. Create multiple style profiles for different contexts (formal English for admin, casual Chinese for colleagues).

### Task Extraction

After drafting a reply, the AI identifies action items and commitments in your message. Save them as todos in Obsidian-compatible format.

### Multi-Language Interface

The application interface is available in English, Simplified Chinese (简体中文), and Spanish (Español). Language can be selected during first launch or changed anytime in Settings.

---

## Multiple AI Providers

Choose the AI backend that works for you:

| Provider | Description |
|:---------|:------------|
| **Claude** (Anthropic) | Recommended default. Excellent for nuanced, bilingual communication |
| **OpenAI-compatible** | Works with OpenAI, DeepSeek, Qwen (DashScope), Groq, or any OpenAI-format API |
| **Ollama** | Run open-source models locally via Ollama |
| **Local model** | Built-in support for GGUF models via node-llama-cpp (advanced users) |

All providers are configured in Settings and can be switched at any time.

---

## Data Storage

All data is stored as plain Markdown files — human-readable, editable, and portable.

- **Obsidian users**: Point to your vault and browse everything in Obsidian
- **Non-Obsidian users**: Choose any folder. Files work with any text editor

Nothing is stored in the cloud. Your emails, contacts, and API keys stay on your machine.

### Offline Capable

Works with local models (Ollama, GGUF) for fully offline operation — no internet or API key required.

---

## Quick Start

### From Installer (Recommended)

Download the latest release from the [Releases page](https://github.com/dlwby1985/email-kb-assistant/releases/latest). Run the installer and follow the setup wizard.

Requirements:
- Windows 10+ (64-bit)
- 4 GB RAM minimum
- An API key from one of the supported providers (or Ollama installed locally)

### Portable Version

Download the portable `.zip` from the [Releases page](https://github.com/dlwby1985/email-kb-assistant/releases/latest). Extract and run `Email KB Assistant.exe` directly. No installation needed — can run from a USB drive.

### From Source

```bash
git clone https://github.com/dlwby1985/email-kb-assistant.git
cd email-kb-assistant
npm install

cp .env.example .env
# Edit .env with your API keys

npm run dev          # Development mode

npm run build        # Build for production
npm run dist         # Create installer + portable
```

---

## First Launch

1. **Select language**: English, 简体中文, or Español
2. **Choose storage location**: Obsidian vault or any folder
3. **Enter API key**: From Anthropic, OpenAI, or configure Ollama
4. **Connect Gmail** (optional): Settings → IMAP → Sign in with Google
5. Start composing — the app creates all necessary directories and default files automatically

---

## Daily Workflow

The typical daily workflow looks like this:

1. **Open the app** → click **Fetch Today** on the Compose page
2. **See today's emails** listed with sender, subject, and preview
3. **Click an email** → contact, background context, and channel auto-fill
4. **Type your key points** in the Core Content box
5. **Click Generate** → AI drafts a contextually appropriate reply
6. **Edit if needed** → directly in the output panel
7. **Copy** → paste into Gmail (formatting matches automatically)
8. **Save & Archive** → email saved to the contact's thread history for future reference

---

## Architecture

Electron desktop app with a React/Vite/Tailwind renderer and Node.js main process.

```
src/
├── main/              # Electron main process
│   ├── ipc/           # IPC handlers (one file per feature)
│   ├── services/      # Business logic, LLM providers, file I/O
│   │   └── llm/       # Multi-provider abstraction (Claude, OpenAI, Ollama, local)
│   └── defaults/      # Default skills, templates, user guide
├── renderer/          # React frontend
│   ├── components/    # UI components
│   ├── hooks/         # Custom React hooks
│   ├── i18n/          # Language files (en, zh, es)
│   └── types/         # TypeScript interfaces
└── preload/           # Electron contextBridge
```

### Data Structure

```
EmailKB/                          (in your chosen data folder)
├── contacts/                     Per-contact profiles, threads, attachments
├── skills/                       AI behavior files (customizable)
├── skills/styles/                Writing style profiles
├── templates/                    Reusable email templates
├── knowledge-base/               Reference documents (PDF, DOCX, MD, URLs)
├── projects/                     Cross-contact project contexts
├── drafts/                       Unsent drafts
├── todos/                        Daily task files (Obsidian Tasks compatible)
├── my-profile.md                 Your persistent context
├── config.yaml                   All settings
└── USER-GUIDE.md                 Built-in documentation
```

### Tech Stack

| Layer | Technology |
|:------|:-----------|
| Desktop shell | Electron |
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| AI integration | Anthropic SDK, OpenAI-compatible API, Ollama, node-llama-cpp |
| Search | SQLite with FTS5 full-text search |
| File parsing | pdf-parse, mammoth (DOCX), gray-matter (YAML frontmatter) |
| Email | IMAP via imapflow + Google OAuth 2.0 (google-auth-library) |
| Data format | Markdown + YAML frontmatter |
| Build | electron-builder (NSIS installer + portable) |
| i18n | react-i18next (EN, ZH, ES) |

---

## Development Background

This is my first software development project. I have no engineering background and no prior programming experience. The entire application — 27,000+ lines of TypeScript across 116 files — was built using [Claude Code](https://docs.anthropic.com/en/docs/claude-code), Anthropic's AI-powered coding tool.

The project evolved through 8 development phases plus an optimization round, each planned as a detailed specification document and executed step-by-step with Claude Code. The process taught me that the gap between "having an idea" and "building working software" is smaller than it has ever been — especially when you're clear about what you need and willing to iterate.

---

## Notes from Daily Use

A few observations from using this tool in my actual workflow, which may be helpful if you try it yourself.

**Obsidian integration is the killer feature.** I store all my data in an Obsidian vault. Every contact profile, every email thread, every template — it all lives as Markdown files that I can browse, search, and link in Obsidian. When I eventually move institutions or change workflows, all of this data travels with me. It is not locked inside an app. It is just files.

**On API providers.** I primarily use Claude's API (Anthropic) with Qwen (via Alibaba Cloud / DashScope) as a secondary option. Claude is noticeably faster; Qwen is slower but produces comparable results. The cost difference is meaningful if you send a high volume. Each person should experiment and choose based on their own priorities — speed, cost, language strength, or privacy preferences.

**Use templates with caution.** Templates work well for structured, recurring tasks — things like fund approval letters or scheduling confirmations where the format is predictable and you have rich background context. But for short, simple messages, selecting a template can actually distort your intent. The new strict mode helps: when enabled, the AI follows the template exactly and only personalizes names and details. For brief messages, skip the template entirely and just type your key points directly.

**The Gmail fetch workflow changed everything.** Before this feature, I had to copy-paste emails between Gmail and the app. Now I fetch today's emails directly on the Compose page, click one, and start drafting. The round-trip time for replying to an email dropped significantly.

**Skills need more work.** The current skill system relies heavily on AI auto-selection based on the channel and contact type. I have not invested deeply in customizing individual skills beyond the defaults. This is an area where the application has clear room for improvement — more tailored skills for specific scenarios (grant writing, committee correspondence, recommendation letters) would meaningfully improve output quality. It is on the roadmap.

---

## Roadmap

- Deeper skill customization and scenario-specific skill libraries
- Deeper IMAP integration (auto-categorize incoming emails)
- Semantic search with embeddings
- Communication analytics and reporting
- Additional language support
- macOS and Linux builds

---

## License

This project is licensed under the [MIT License](LICENSE).

This is a personal tool shared for educational purposes. Issues and pull requests are welcome, but response times may vary.

---

## Acknowledgments

- [Anthropic](https://www.anthropic.com) — for Claude API and Claude Code, which made this project possible
- [Obsidian](https://obsidian.md) — the knowledge management philosophy that shaped the data architecture
