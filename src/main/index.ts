import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import Logger from './logger.js';
import { screen } from 'electron';
import './function.js';

const logger = Logger('main');

/**
 * Discovers available local update servers using UDP broadcast
 * @returns Array of server URLs found, empty if none
 */
async function discoverUpdateServers(): Promise<string[]> {
  try {
    logger.log('Discovering local update servers via UDP broadcast...');

    // Import getServerIP function
    const getServerIP = await import('../functions/getServerIP.js');

    // Try to discover server with 5 second timeout
    const serverUrl = await Promise.race([
      getServerIP.default(false),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)) // 5 second timeout
    ]);

    if (serverUrl) {
      logger.log('Discovered server:', serverUrl);

      // Verify it has update endpoints by checking health
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`${serverUrl}/api/updates/health`, {
          signal: controller.signal,
          method: 'GET'
        });

        clearTimeout(timeout);

        if (response.ok) {
          logger.log('Update server health check passed:', serverUrl);
          return [serverUrl]; // Return as array (could be extended to discover multiple servers)
        } else {
          logger.log('Server found but update endpoints not available');
        }
      } catch (error) {
        logger.log('Server found but health check failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    logger.log('No local update servers discovered');
    return [];
  } catch (error) {
    logger.log('Error during server discovery:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Configures the autoUpdater to use a specific update source
 * @param serverUrl Local server URL, or null to use GitHub
 */
function configureUpdateSource(serverUrl: string | null) {
  if (serverUrl) {
    logger.log('Configuring autoUpdater to use local server:', serverUrl);
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: `${serverUrl}/api/updates/${process.platform}`
    });
  } else {
    logger.log('Configuring autoUpdater to use GitHub directly');
    // Uses electron-builder.yml publish configuration (GitHub)
    // No need to set feed URL, it's already configured
  }
}

let updateCheckInterval: NodeJS.Timeout | null = null;

// Configurable update check interval (in minutes)
// Can be overridden via UPDATE_CHECK_INTERVAL_MINUTES environment variable
// Default: 5 minutes
const getUpdateCheckInterval = () => {
  const envInterval = process.env.UPDATE_CHECK_INTERVAL_MINUTES;
  const minutes = envInterval ? parseInt(envInterval, 10) : 5;

  // Validate interval (min 1 minute, max 60 minutes)
  if (isNaN(minutes) || minutes < 1 || minutes > 60) {
    logger.log(`Invalid UPDATE_CHECK_INTERVAL_MINUTES (${envInterval}), using default: 5 minutes`);
    return 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  logger.log(`Update check interval set to ${minutes} minute(s)`);
  return minutes * 60 * 1000; // Convert to milliseconds
};

/**
 * Sets up autoUpdater event handlers (call once on startup)
 */
function setupAutoUpdaterEvents() {
  autoUpdater.logger = logger;

  // Configure updater behavior
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // Install when user quits normally

  // Disable native notifications (we'll show our own modal)
  // @ts-ignore - These properties exist but may not be in types
  autoUpdater.fullChangelog = false;
  if (process.platform === 'darwin') {
    // @ts-ignore
    autoUpdater.allowPrerelease = false;
  }

  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    logger.log('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    logger.log('Update available.', info);

    // Show progress bar for update download
    import('../functions/utils.js').then(({ progressActive, progressLoading }) => {
      progressActive(true);
      progressLoading();
    });

    // Send to all windows
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('update-available', info);
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.log('Update not available.', info);

    // Hide progress bar if no update available
    import('../functions/utils.js').then(({ progressActive }) => {
      progressActive(false);
    });

    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('update-not-available', info);
    });
  });

  autoUpdater.on('error', (err) => {
    logger.error('Error in auto-updater. ' + err);

    // Hide progress bar on error
    import('../functions/utils.js').then(({ progressActive }) => {
      progressActive(false);
    });

    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('updater-error', err);
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
    logger.log(log_message);

    // Use the normal progress system
    import('../functions/utils.js').then(({ progressCallback }) => {
      progressCallback(progressObj.percent, 'Downloading Update');
    });

    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('download-progress', progressObj);
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.log('Update downloaded', info);

    // Hide progress bar when download is complete
    import('../functions/utils.js').then(({ progressActive, progressCallback }) => {
      progressCallback('100%', 'Update Ready');
      setTimeout(() => {
        progressActive(false);
      }, 1000);
    });

    // Send to renderer - modal will handle user choice
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('update-downloaded', info);
    });

    // Don't auto-install - let user decide via modal
    // Update will install automatically on next app quit via autoInstallOnAppQuit
  });
}

// Note: discoverAndConfigureUpdates was removed in favor of IPC-based approach
// Updates are now configured via 'discover-update-servers' and 'configure-updates' IPC handlers

let iconPath: Promise<string>;
if (process.platform == 'linux') {
  iconPath = import('../../resources/icon.png?asset').then((module) => module.default);
} else if (process.platform == 'win32') {
  iconPath = import('../../resources/icon.ico?asset').then((module) => module.default);
} else if (process.platform == 'darwin') {
  iconPath = import('../../resources/icon.icns?asset').then((module) => module.default);
}

async function createWindow() {
  const icon = await iconPath;
  logger.log(icon);
  const primaryDisplay = screen.getPrimaryDisplay();
  const screenWidth = primaryDisplay.workAreaSize.width;
  const screenHeight = primaryDisplay.workAreaSize.height;

  // Create window title with PR info if applicable
  const version = app.getVersion();
  let windowTitle = 'Lan Nexus';

  if (version.includes('-pr')) {
    const prMatch = version.match(/-pr(\d+)/);
    if (prMatch) {
      windowTitle = `Lan Nexus - PR ${prMatch[1]}`;
    }
  }

  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 700,
    minHeight: 670,
    maxWidth: screenWidth,
    maxHeight: screenHeight,
    title: windowTitle,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  });

  // Set mainWindow for progress utils
  import('../functions/utils.js').then(({ setMainWindow }) => setMainWindow(mainWindow));

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Configure firewall for UDP port 50001
  try {
    const configureFirewall = await import('../functions/configureFirewall.js');
    await configureFirewall.default();
  } catch (error) {
    logger.error('Failed to configure firewall:', error);
  }

  // Set up auto-updater event handlers (but don't check for updates yet)
  setupAutoUpdaterEvents();

  // Don't automatically discover/configure updates
  // Updates will be configured when renderer calls 'configure-updates' after server selection

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  // Auto-updater IPC handlers
  ipcMain.handle('app-version', () => {
    return app.getVersion();
  });

  // Discover available update servers
  ipcMain.handle('discover-update-servers', async () => {
    try {
      logger.log('IPC: discover-update-servers called');
      return await discoverUpdateServers();
    } catch (error) {
      logger.error('Failed to discover update servers:', error);
      throw error;
    }
  });

  // Configure update source and start checking
  ipcMain.handle('configure-updates', async (_event, serverUrl: string | null) => {
    try {
      logger.log('IPC: configure-updates called with serverUrl:', serverUrl || 'GitHub');
      configureUpdateSource(serverUrl);

      // Clear any existing interval
      if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = null;
      }

      // Start checking for updates
      // If using a local server, always check (even in dev mode for testing)
      // If using GitHub, only check in production mode
      // Use checkForUpdates() instead of checkForUpdatesAndNotify() to avoid native notifications
      const shouldCheck = serverUrl || (!is.dev && app.getVersion() != '0.0.0');

      if (shouldCheck) {
        // Initial check
        const result = await autoUpdater.checkForUpdates();

        // Set up recurring check with configurable interval
        const intervalMs = getUpdateCheckInterval();
        updateCheckInterval = setInterval(async () => {
          try {
            logger.log('Periodic update check...');
            await autoUpdater.checkForUpdates();
          } catch (error) {
            logger.error('Periodic update check failed:', error);
          }
        }, intervalMs);

        logger.log(`Recurring update check enabled (every ${intervalMs / 60000} minute(s))`);
        return result;
      }

      return null;
    } catch (error) {
      logger.error('Failed to configure updates:', error);
      throw error;
    }
  });

  ipcMain.handle('check-for-updates', async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      throw error;
    }
  });

  ipcMain.handle('quit-and-install', async () => {
    try {
      autoUpdater.quitAndInstall();
    } catch (error) {
      logger.error('Failed to quit and install:', error);
      throw error;
    }
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Clean up update check interval
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ipcMain.on('function', async (event, arg) => {
//   const id = arg.id
//   const progressCallback = (...args) => event.reply('function-progress', id, ...args);
//   const activeCallback = (...args) => event.reply('function-active', id, ...args);

//   const safeFunctionName = arg.functionName.replace(/[^a-zA-Z0-9]/g, '');
//   if (
//     safeFunctionName !== arg.functionName ||
//     safeFunctionName.length === 0 ||
//     safeFunctionName.length > 100
//   ) {
//     event.reply('function-error', id, 'Invalid function name');
//     return;
//   }
//   logger.log('function called', safeFunctionName, { id }, arg.args);
//   const func = await import(`../functions/${safeFunctionName}.js`);

//   if (!func) {
//     event.reply('function-error', id, 'Function not found');
//     return;
//   }

//   logger.log('function called', safeFunctionName);
//   try {
//     const result = await func.default(progressCallback, activeCallback, ...arg.args);
//     logger.log('function result', id, result);
//     event.reply('function-reply', id, result);
//   } catch (e) {
//     logger.error(e);
//     event.reply('function-error', id, e);
//   }
// });
