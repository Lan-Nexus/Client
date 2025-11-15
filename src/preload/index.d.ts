import { ElectronAPI } from '@electron-toolkit/preload'

interface ProgressAPI {
  onProgress: (callback: (amount: string, name: string) => void) => void
  onProgressActive: (callback: (state: boolean) => void) => void
  onProgressLoading: (callback: () => void) => void
}

interface UpdaterAPI {
  getVersion: () => Promise<string>
  checkForUpdates: () => Promise<any>
  quitAndInstall: () => Promise<void>
  configureUpdates: (serverUrl: string | null) => Promise<any>
  onUpdateAvailable: (callback: (info: any) => void) => void
  onUpdateNotAvailable: (callback: (info: any) => void) => void
  onUpdateDownloaded: (callback: (info: any) => void) => void
  onDownloadProgress: (callback: (progress: any) => void) => void
  onError: (callback: (error: any) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    progressAPI: ProgressAPI
    updaterAPI: UpdaterAPI
  }
}
