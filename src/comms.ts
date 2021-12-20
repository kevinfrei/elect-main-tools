import { MakeError, MakeLogger, Type } from '@freik/core-utils';
import { ipcMain, ProtocolRequest, ProtocolResponse } from 'electron';
import { IpcMainInvokeEvent } from 'electron/main';
import { Persistence } from './persist';
import { getMainWindow } from './win';

export type FileResponse = string | ProtocolResponse;
export type BufferResponse = Buffer | ProtocolResponse;

const log = MakeLogger('emt-comms-log');
const err = MakeError('emt-comms-err');

export type Handler<R, T> = (arg: T) => Promise<R | void>;

/**
 * Registers with `ipcMain.handle` a function that takes a mandatory parameter
 * and returns *string* data untouched. It also requires a checker to ensure the
 * data is properly typed
 * @param  {string} key - The id to register a listener for
 * @param  {TypeHandler<T>} handler - the function that handles the data
 * @param  {(v:any)=>v is T} checker - a Type Check function for type T
 * @returns void
 */
export function registerChannel<R, T>(
  key: string,
  handler: Handler<R, T>,
  checker: (v: unknown) => v is T,
): void {
  ipcMain.handle(
    key,
    async (_event: IpcMainInvokeEvent, arg: unknown): Promise<R | void> => {
      if (checker(arg)) {
        log(`Received ${key} message: handling`);
        return await handler(arg);
      }
      err(`Invalid argument type to ${key} handler`);
      err(arg);
    },
  );
}

/**
 * Read a value from persistence by name, returning it's unprocessed contents
 *
 * @async @function
 * @param {string} name - the name of the value to read
 * @return {Promise<string>} The raw string contents of the value
 */
async function readFromStorage(name?: string): Promise<string> {
  if (!name) return '';
  try {
    log(`readFromStorage(${name})`);
    const value = await Persistence.getItemAsync(name);
    log(`Sending ${name} response:`);
    log(value);
    return value || '';
  } catch (e) {
    err(`error from readFromStorage(${name})`);
    err(e);
  }
  return '';
}

/**
 * Write a value to persistence by name.
 *
 * @async @function
 * @param {string?} keyValuePair - The key:value string to write
 */
async function writeToStorage([key, value]: [string, string]): Promise<void> {
  try {
    // First, split off the key name:
    log(`writeToStorage(${key} : ${value})`);
    // Push the data into the persistence system
    await Persistence.setItemAsync(key, value);
    log(`writeToStorage(${key}...) completed`);
  } catch (e) {
    err(`error from writeToStorage([${key}, ${value}])`);
    err(e);
  }
}

export function SendToMain(channel: string, ...data: unknown[]): void {
  log('Sending to main:');
  const mainWindow = getMainWindow();
  if (mainWindow && mainWindow.webContents) {
    log('Channel:');
    log(channel);
    log('Data:');
    log(data);
    mainWindow.webContents.send(channel, data);
  }
}

/**
 * Send a message to the rendering process
 *
 * @param  {unknown} message
 * The (flattenable) message to send.
 */
export function AsyncSend(message: unknown): void {
  SendToMain('async-data', { message });
}

function isKeyValue(obj: unknown): obj is [string, string] {
  return Type.is2TupleOf(obj, Type.isString, Type.isString);
}

export function SetupDefault(): void {
  // These are the general "just asking for something to read/written to disk"
  // functions. Media Info, Search, and MusicDB stuff needs a different handler
  // because they don't just read/write to disk.
  registerChannel('read-from-storage', readFromStorage, Type.isString);
  registerChannel('write-to-storage', writeToStorage, isKeyValue);
}

export type Registerer<T> = (
  scheme: string,
  handler: (
    request: ProtocolRequest,
    callback: (response: T | ProtocolResponse) => void,
  ) => void,
) => boolean;

const e404 = { error: 404 };
// Helper to check URL's & transition to async functions
export function registerProtocolHandler<ResponseType>(
  type: string,
  registerer: Registerer<ResponseType>,
  processor: (
    req: ProtocolRequest,
    trimmedUrl: string,
  ) => Promise<ProtocolResponse | ResponseType>,
  defaultValue: ProtocolResponse | ResponseType = e404,
) {
  const protName = type.substr(0, type.indexOf(':'));
  log(`Protocol ${type} (${protName})`);
  const handler = async (req: ProtocolRequest) => {
    if (!req.url) {
      err('Request with no URL');
      return { error: -324 };
    }
    if (req.url.startsWith(type)) {
      log(`Processing request ${type}`);
      const res = await processor(req, req.url.substr(type.length));
      log('Returning:');
      log(res);
      return res;
    }
    err('URL does not fully match type');
    err('Got ');
    err(req.url);
    err('Expected');
    err(type);
    return defaultValue;
  };
  registerer(protName, (req, callback) => {
    handler(req)
      .then(callback)
      .catch((reason) => {
        log('error');
        log(reason);
      });
  });
}
