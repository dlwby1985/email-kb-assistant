import { ipcMain, shell } from 'electron'
import { getDismissedTooltips, dismissTooltip } from '../services/app-state'

export function registerAppStateHandlers() {
  /** Return the list of tooltip IDs the user has already dismissed */
  ipcMain.handle('app-state:get-dismissed-tooltips', () => {
    return getDismissedTooltips()
  })

  /** Persist a tooltip dismissal so it won't show again after restart */
  ipcMain.handle('app-state:dismiss-tooltip', (_event, id: string) => {
    dismissTooltip(id)
    return { success: true }
  })

  /** Open a URL in the system default browser */
  ipcMain.handle('shell:open-external', (_event, url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
  })
}
