# Email KB Assistant

A desktop email drafting and knowledge management tool built with Electron, React, and Claude AI. Designed for academics, professionals, and anyone who manages high-volume professional communication.

## Features

- **AI-Powered Drafting** — Generate or polish emails using Claude (Anthropic), OpenAI-compatible models, Ollama, or local GGUF models
- **Contact Management** — Maintain profiles with relationship types, language preferences, and communication history
- **Knowledge Base** — Upload PDFs, DOCX, Markdown, or fetch URLs as reference context for AI generation
- **Thread Archive** — Save and search communication records with full-text and semantic search
- **Writing Style Training** — Teach the AI your personal writing style with rules and examples
- **IMAP Integration** — Import emails directly from Gmail or Outlook
- **Templates & Skills** — Reusable email templates and customizable AI behavior files
- **Multi-Language UI** — English, Simplified Chinese (简体中文), and Spanish (Español)
- **Obsidian Compatible** — Store all data as Markdown files in an Obsidian vault (or any folder)
- **Offline Capable** — Works with local models (Ollama, GGUF) for fully offline operation

## Quick Start

### Prerequisites

- Windows 10+ (64-bit)
- Node.js 18+ and npm
- An Anthropic API key ([get one here](https://console.anthropic.com))

### Development Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/email-kb-assistant.git
cd email-kb-assistant

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

### Build for Production

```bash
# Type check
npx tsc --noEmit

# Build installer + portable
npm run dist
```

Output in `release/`:
- `Email KB Assistant Setup 1.0.0.exe` — Windows installer
- `win-unpacked/` — Portable version (no installation needed)

## Architecture

Electron desktop app with a React/Vite/Tailwind renderer and Node.js main process.

```
src/
├── main/           # Electron main process
│   ├── ipc/        # IPC handlers (one file per feature)
│   ├── services/   # Business logic, LLM providers, file I/O
│   └── defaults/   # Default skills, templates, user guide
├── renderer/       # React frontend
│   ├── components/ # UI components
│   ├── hooks/      # Custom React hooks
│   ├── i18n/       # Language files (en, zh, es)
│   └── types/      # TypeScript interfaces
└── preload/        # Electron contextBridge
```

All user data is stored as plain Markdown and YAML files in a user-chosen folder, making it fully portable and compatible with Obsidian, VS Code, or any text editor.

## Development Background

This project was built by a university professor to solve a real workflow problem: managing hundreds of professional emails across multiple languages (English and Chinese) while maintaining consistent quality and institutional knowledge.

Every feature exists because it was needed in daily use — from IMAP email import to writing style training to the Obsidian-compatible file format.

## License

This project is licensed under the [MIT License](LICENSE).

This is a personal tool shared for educational purposes. Issues and pull requests are welcome, but response times may vary.
