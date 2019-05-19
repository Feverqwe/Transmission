import {flow, getRoot, isAlive, types} from "mobx-state-tree";
import getLogger from "../tools/getLogger";
import formatBytes from "../tools/formatBytes";

const logger = getLogger('SpaceWatcherStore');

/**
 * @typedef {Object} DownloadDirStore
 * @property {string} path
 * @property {number} available
 * @property {function} availableStr
 */
const DownloadDirStore = types.model('DownloadDirStore', {
  path: types.string,
  available: types.number
}).views((self) => {
  return {
    get availableStr() {
      return formatBytes(self.available * 1024 * 1024);
    }
  };
});

/**
 * @typedef {Object} SpaceWatcherStore
 * @property {string} [state]
 * @property {string} [errorMessage]
 * @property {boolean|undefined} isSupported
 * @property {DownloadDirStore[]} downloadDirs
 * @property {function:Promise} fetchDownloadDirs
 */
const SpaceWatcherStore = types.model('SpaceWatcherStore', {
  state: types.optional(types.enumeration(['idle', 'pending', 'done', 'error']), 'idle'),
  errorMessage: types.optional(types.string, ''),
  isSupported: types.maybe(types.boolean),
  downloadDirs: types.array(DownloadDirStore),
}).actions((self) => {
  return {
    fetchDownloadDirs: flow(function* () {
      if (self.state === 'pending') return;
      self.state = 'pending';
      self.errorMessage = '';
      try {
        /**@type RootStore*/const rootStore = getRoot(self);
        const result = yield rootStore.client.getDownloadDirs();
        if (isAlive(self)) {
          self.downloadDirs = result.downloadDirs;
          self.isSupported = true;
          self.state = 'done';
        }
      } catch (err) {
        logger.error('fetchDownloadDirs error', err);
        if (isAlive(self)) {
          self.state = 'error';
          self.errorMessage = `${err.name}: ${err.message}`;
          if (self.isSupported === undefined) {
            if (err.status === 300) {
              self.isSupported = false;
            }
          }
        }
      }
    })
  };
}).views((self) => {
  return {};
});

export default SpaceWatcherStore;