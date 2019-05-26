import {flow, getRoot, isAlive, types} from "mobx-state-tree";
import getLogger from "../tools/getLogger";
import formatBytes from "../tools/formatBytes";

const logger = getLogger('SpaceWatcherStore');

/**
 * @typedef {Object} DownloadDirStore
 * @property {string} path
 * @property {number} available
 * @property {*} availableStr
 */
const DownloadDirStore = types.model('DownloadDirStore', {
  path: types.string,
  available: types.number
}).views((self) => {
  return {
    get availableStr() {
      return formatBytes(self.available);
    }
  };
});

/**
 * @typedef {Object} SpaceWatcherStore
 * @property {string} [state]
 * @property {DownloadDirStore[]} downloadDirs
 * @property {string} [errorMessage]
 * @property {function:Promise} fetchDownloadDirs
 */
const SpaceWatcherStore = types.model('SpaceWatcherStore', {
  state: types.optional(types.enumeration(['idle', 'pending', 'done', 'error']), 'idle'),
  downloadDirs: types.array(DownloadDirStore),
  errorMessage: types.optional(types.string, ''),
}).actions((self) => {
  return {
    fetchDownloadDirs: flow(function* () {
      if (self.state === 'pending') return;
      self.state = 'pending';
      self.errorMessage = '';
      try {
        const result = [];
        /**@type RootStore*/const rootStore = getRoot(self);
        if (!rootStore.client.settings || rootStore.client.settings.hasDownloadDirFreeSpace) {
          yield rootStore.client.updateSettings();
        }
        if (isAlive(self)) {
          const {downloadDir, downloadDirFreeSpace, hasDownloadDirFreeSpace} = rootStore.client.settings;
          if (hasDownloadDirFreeSpace) {
            result.push({
              path: downloadDir,
              available: downloadDirFreeSpace,
            });
          } else {
            const {path, sizeBytes} = yield rootStore.client.getFreeSpace(downloadDir);
            result.push({
              path: path,
              available: sizeBytes,
            });
          }
        }
        if (isAlive(self)) {
          self.downloadDirs = result;
          self.state = 'done';
        }
      } catch (err) {
        logger.error('fetchDownloadDirs error', err);
        if (isAlive(self)) {
          self.state = 'error';
          self.errorMessage = `${err.name}: ${err.message}`;
        }
      }
    })
  };
}).views((self) => {
  return {};
});

export default SpaceWatcherStore;