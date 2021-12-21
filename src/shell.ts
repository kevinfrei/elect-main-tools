import { Type, TypeCheckPair } from '@freik/core-utils';
import { dialog, OpenDialogOptions, shell } from 'electron';
import { getMainWindow } from './win';

function isFileFilter(o: unknown): o is Electron.FileFilter {
  return (
    Type.hasStr(o, 'name') &&
    Type.hasType(o, 'extensions', Type.isArrayOfString)
  );
}

type ODOProps =
  | 'openFile'
  | 'openDirectory'
  | 'multiSelections'
  | 'showHiddenFiles'
  | 'createDirectory'
  | 'promptToCreate'
  | 'noResolveAliases'
  | 'treatPackageAsDirectory'
  | 'dontAddToRecent';

function isODOProperty(o: unknown): o is ODOProps {
  switch (o) {
    case 'openFile':
    case 'openDirectory':
    case 'multiSelections':
    case 'showHiddenFiles':
    case 'createDirectory':
    case 'promptToCreate':
    case 'noResolveAliases':
    case 'treatPackageAsDirectory':
    case 'dontAddToRecent':
      return true;
  }
  return false;
}

const openDialogOptionTypes: TypeCheckPair[] = [
  ['title', Type.isString],
  ['defaultPath', Type.isString],
  ['buttonLabel', Type.isString],
  [
    'filters',
    (o: unknown): o is Electron.FileFilter[] => Type.isArrayOf(o, isFileFilter),
  ],
  [
    'properties',
    (o: unknown): o is ODOProps[] => Type.isArrayOf(o, isODOProperty),
  ],
  ['message', Type.isString],
  ['securityScopedBookmarks', Type.isBoolean],
];

/**
 * Type Check for
 * [OpenDialogOptions](https://www.electronjs.org/docs/latest/api/dialog)
 * @param obj The object to type check
 * @returns True if obj is
 * [OpenDialogOptions](https://www.electronjs.org/docs/latest/api/dialog)
 */
export function isOpenDialogOptions(obj: unknown): obj is OpenDialogOptions {
  return Type.isSpecificType(obj, openDialogOptionTypes);
}

/**
 * Show an "Open" dialog, configured according to `options`
 * @param options the
 * [OpenDialogOptions](https://www.electronjs.org/docs/latest/api/dialog) used
 * to show the dialog
 * @returns the list of files/folders selected by the user
 */
export async function ShowOpenDialog(
  options: OpenDialogOptions,
): Promise<string[] | void> {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    return;
  }
  const res = await dialog.showOpenDialog(mainWindow, options);
  if (res.canceled) {
    return;
  }
  return res.filePaths;
}

/**
 * Show a file or folder in the OS shell (Finder/Explorer/Linux whatever
 * you call it)
 * @param filePath - The path to the file or folder to show
 */
export function showFile(filePath?: string): Promise<void> {
  return new Promise((resolve) => {
    if (filePath) {
      shell.showItemInFolder(filePath);
    }
    resolve();
  });
}
