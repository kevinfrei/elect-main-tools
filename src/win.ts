import { DebouncedEvery } from '@freik/core-utils';
import { BrowserWindow } from 'electron';
import { LoadWindowPos, SaveWindowPos, WindowPosition } from './persist';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow | null = null;
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

const windowPos: WindowPosition = LoadWindowPos();

// This will get called after a 1 second delay (and subsequent callers will
// not be registered if one is waiting) to not be so aggressive about saving
// the window position to disk
const windowPosUpdated = DebouncedEvery(() => {
  // Get the window state & save it
  const mainWindow = getMainWindow();
  if (mainWindow) {
    windowPos.isMaximized = mainWindow.isMaximized();
    if (!windowPos.isMaximized) {
      // only update bounds if the window isn’t currently maximized
      windowPos.bounds = mainWindow.getBounds();
    }
    SaveWindowPos(windowPos);
  }
}, 1000);

export function setMainWindow(win: BrowserWindow) {
  const first = mainWindow === null;
  mainWindow = win;
  if (first) {
    mainWindow
      .on('closed', () => {
        // Clear the reference to the window object.
        // Usually you would store windows in an array.
        // If your app supports multiple windows, this is the time when you should
        // delete the corresponding element.
        mainWindow = null;
      })
      // Save the window position when it's changed:
      .on('resize', windowPosUpdated)
      .on('move', windowPosUpdated);
  }
}
