# Email KB Assistant — Developer Guide

## Architecture Overview

Electron desktop app: main process (Node.js) + renderer (React/Vite/Tailwind).

### Key Directories

- `src/main/` — Electron main process (Node.js)
  - `src/main/ipc/` — IPC handlers (one file per feature domain)
  - `src/main/services/` — Business logic, API calls, file I/O
  - `src/main/services/llm/` — LLM provider abstraction (Claude, OpenAI, Ollama, local)
  - `src/main/defaults/` — Default file contents (skills, templates, user guide)
- `src/renderer/` — React frontend
  - `src/renderer/components/` — UI components organized by area
  - `src/renderer/components/pages/` — Full page components
  - `src/renderer/hooks/` — Custom React hooks
  - `src/renderer/types/index.ts` — ALL TypeScript interfaces
  - `src/renderer/lib/ipc.ts` — Typed IPC wrappers
- `src/preload/index.ts` — Electron contextBridge (exposes IPC to renderer)

### Data Storage

User data lives in `{BASE_PATH}/EmailKB/`. Base path is either an Obsidian vault or any user-chosen folder (configured on first launch).

```
EmailKB/
├── contacts/{slug}/profile.md, threads/, attachments/, _all.md
├── skills/ — AI behavior files (_base.md, email-reply.md, polish.md, etc.)
├── skills/styles/ — Multiple writing style profiles
├── skills/style-examples/ — Sample emails grouped by style
├── templates/ — Task-based email templates
├── projects/ — Cross-contact project contexts
├── drafts/ — Unsent drafts
├── knowledge-base/ — Reference documents (PDF, DOCX, MD, fetched URLs)
├── todos/ — Daily todo files (Obsidian Tasks compatible)
├── my-profile.md — Persistent user context (loaded into every generation)
├── config.yaml — All settings (API keys, model, signatures, IMAP, etc.)
└── USER-GUIDE.md — In-app help documentation
```

App state (vault path, dismissed tooltips) stored in `%APPDATA%/email-kb-assistant/app-state.json`.

### Brand Colors

Primary: Maroon `#8C1D40`, Gold `#FFC627`, Black `#000000`, White `#FFFFFF`
Secondary (accents only): Blue `#00A3E0`, Green `#78BE20`, Orange `#FF7F32`, Gray `#747474`

---

## Development Rules

### Adding a feature

1. List all files to create or modify BEFORE writing any code
2. Implement in order: types → IPC handler → service → preload → renderer
3. Follow the 4-file IPC registration pattern (see below) — NO EXCEPTIONS
4. Add any native modules to `vite.config.ts` `rollupOptions.external`
5. Run `npx tsc --noEmit` after all changes
6. Summarize what was built and what to test manually

### Fixing a bug

1. Restate the bug: observed behavior vs expected behavior
2. Trace the call path through the relevant IPC channel before proposing any fix
3. Fix ONLY what is broken — do not refactor adjacent code
4. Run `npx tsc --noEmit` after the fix
5. List what else could break and how to verify

### Never do

- Add dependencies without flagging them first
- Skip the IPC 4-file registration pattern
- Use inline styles (use Tailwind utility classes)
- Hardcode file paths (use config-based paths from vault service)
- Store passwords in plain text (use Electron `safeStorage` API)

---

## IPC Registration Pattern

When adding a new IPC channel, ALL FOUR files must be updated:

| Step | File | What to add |
|:-----|:-----|:------------|
| 1 | `src/main/ipc/{domain}.ts` | Handler function |
| 2 | `src/main/index.ts` | Import + call register function |
| 3 | `src/preload/index.ts` | Add method to `electronAPI` object |
| 4 | `src/renderer/types/index.ts` | Add to `ElectronAPI` interface |

Missing any one of these causes runtime errors.

---

## Vite Externals

Any Node.js module used in the main process that has native bindings or uses Node.js internals MUST be listed in `rollupOptions.external` in `vite.config.ts`.

Current externals:
```
electron, better-sqlite3, gray-matter, js-yaml,
@anthropic-ai/sdk, pdf-parse, mammoth, imapflow
```

When adding a new native module: add it to this list IMMEDIATELY.

**Symptom of a missing external**: Main process bundle size exceeds ~110 kB. App crashes on startup.

---

## LLM Provider System

All AI calls go through the `LLMProvider` interface in `src/main/services/llm/provider.ts`.

Supported providers:
- **Claude** (`claude-provider.ts`) — Anthropic SDK, default
- **OpenAI-compatible** (`openai-provider.ts`) — covers OpenAI, DeepSeek, Groq, custom endpoints
- **Ollama** (`ollama-provider.ts`) — local, user-managed at localhost:11434
- **Local model** (`local-provider.ts`) — node-llama-cpp, GGUF files

All providers return `GenerateResult { success: boolean; text?: string; error?: string }`. Never assume the return value is a raw string.

---

## Prompt Assembly Order

System prompt is assembled in `src/main/services/prompt-assembly.ts`:

```
_base.md
→ my-profile.md (always loaded)
→ styles/{active-style}.md
→ {active-skill}.md
→ contact profile.md (single-person mode only)
→ recent threads (single-person mode only)
→ template content (if selected)
→ knowledge-base excerpts (if search enabled)
→ project context (if selected)
```

---

## Known Pitfalls

- **`safeStorage` API**: Only works in packaged app or with `--enable-features` flag in dev mode. Used for IMAP password encryption.
- **Dialogs**: All modal dialogs must use the `DraggableDialog` wrapper component.
- **System menu bar**: Removed. Keyboard shortcuts registered via hidden menu accelerators.
- **`GenerateResult` vs string**: LLM providers return objects, not strings. Always check `result.success` and use `result.text`.
- **Thread file timestamps**: No colons in filenames (Windows + Obsidian safe). Use format: `2026-03-07T1432` not `2026-03-07T14:32`.
- **Storage mode**: App supports both Obsidian vault and standalone folder. All file logic is identical — only UI text differs based on `config.yaml` `storage.mode`.
- **Bundle size check**: After adding dependencies, verify main bundle stays under ~110 kB. If it balloons, a new external is likely missing from vite.config.ts.
- **Logo**: PNG format only in header.

---

## Build and Distribution

```bash
# Development
npm run dev              # Vite dev server + Electron

# Type check
npx tsc --noEmit         # Must pass before any commit

# Production build
npm run build            # Compile renderer + main process
npm run dist             # NSIS installer + portable dir → release/
```

Output in `release/`:
- `Email KB Assistant Setup 1.0.0.exe` — NSIS installer (x64 Windows)
- `win-unpacked/` — Portable version (copy-and-run)

Target machines do NOT need Node.js installed — Electron bundles its own runtime.

---

## Internationalization

Three languages supported: English (default), Simplified Chinese, Spanish.

- Language files: `src/renderer/i18n/{en,zh,es}.json`
- i18n setup: `src/renderer/i18n/index.ts` (react-i18next)
- Language selector: Settings → General → Interface Language
- All UI components use `useTranslation()` hook with `t('key')` calls

---

## Build Metrics

| Metric | Value |
|:-------|:------|
| Installer size | ~88 MB |
| Portable dir | win-unpacked/ |
| Main process bundle | ~108 kB |
| Renderer JS bundle | ~476 kB |
| Renderer CSS | ~40 kB |
| Preload | ~5 kB |
| TypeScript strict | Enabled, clean |
