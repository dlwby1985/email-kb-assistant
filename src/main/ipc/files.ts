import { ipcMain, dialog, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export function registerFilesHandlers() {
  // Extract text from a file (PDF, DOCX, MD, TXT)
  ipcMain.handle('files:extract-text', async (_event, filePath: string) => {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('File not found')
    }

    const ext = path.extname(filePath).toLowerCase()
    let text = ''

    switch (ext) {
      case '.md':
      case '.txt':
      case '.text': {
        text = fs.readFileSync(filePath, 'utf-8')
        break
      }

      case '.pdf': {
        try {
          const pdfParse = require('pdf-parse')
          const buffer = fs.readFileSync(filePath)
          const data = await pdfParse(buffer)
          text = data.text || ''
        } catch (err: any) {
          throw new Error(`PDF extraction failed: ${err.message}. This feature may require additional setup.`)
        }
        break
      }

      case '.docx': {
        try {
          const mammoth = require('mammoth')
          const result = await mammoth.extractRawText({ path: filePath })
          text = result.value || ''
        } catch (err: any) {
          throw new Error(`DOCX extraction failed: ${err.message}. This feature may require additional setup.`)
        }
        break
      }

      default:
        throw new Error(`Unsupported file type: ${ext}. Supported: .pdf, .docx, .md, .txt`)
    }

    // Count words (handles English and Chinese)
    const wordCount = text
      .replace(/[\u4e00-\u9fff]/g, (m) => ` ${m} `) // separate CJK characters
      .split(/\s+/)
      .filter(Boolean).length

    return { text, wordCount }
  })

  // Open file dialog
  ipcMain.handle('files:open-dialog', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Attachment',
      filters: [
        { name: 'Supported Files', extensions: ['pdf', 'docx', 'md', 'txt'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Word Document', extensions: ['docx'] },
        { name: 'Markdown', extensions: ['md', 'txt'] },
      ],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  // Reveal a file in the OS file explorer (Explorer on Windows, Finder on macOS)
  ipcMain.handle('files:show-in-folder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
    return true
  })
}
