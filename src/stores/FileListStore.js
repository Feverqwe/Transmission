import {flow, getRoot, isAlive, resolveIdentifier, types} from "mobx-state-tree";
import getLogger from "../tools/getLogger";
import ListSelectStore from "./ListSelectStore";
import FileStore from "./FileStore";
import TorrentStore from "./TorrentStore";

const qs = require('querystring');

const logger = getLogger('FileListStore');

const byColumnMap = {
  done: 'progress',
  prio: 'priority'
};

/**
 * @typedef {ListSelectStore} FileListStore
 * @property {string} id
 * @property {boolean} [removeSelectOnHide]
 * @property {string} [state]
 * @property {FileStore[]} files
 * @property {boolean} [isLoading]
 * @property {string} [filter]
 * @property {function:Promise} fetchFiles
 * @property {function} setFilter
 * @property {function} setRemoveSelectOnHide
 * @property {function} getFileById
 * @property {function} getFileIndexById
 * @property {function} getDownloadUrlById
 * @property {*} torrent
 * @property {*} filteredFiles
 * @property {*} sortedFiles
 * @property {*} _sortedIds
 * @property {*} isSelectedAll
 * @property {*} selectedIndexes
 * @property {*} filterLevel
 * @property {function} afterCreate
 * @property {function} beforeDestroy
 */
const FileListStore = types.compose('FileListStore', ListSelectStore, types.model({
  id: types.identifierNumber,
  removeSelectOnHide: types.optional(types.boolean, false),
  state: types.optional(types.enumeration(['idle', 'pending', 'done', 'error']), 'idle'),
  files: types.array(FileStore),
  isLoading: types.optional(types.boolean, true),
  filter: types.optional(types.string, ''),
  selectedIds: types.array(types.string),
})).actions((self) => {
  return {
    fetchFiles: flow(function* () {
      if (self.state === 'pending') return;
      self.state = 'pending';
      try {
        /**@type RootStore*/const rootStore = getRoot(self);
         const files = yield rootStore.client.getTorrentFiles(self.id);
         if (isAlive(self)) {
           self.files = files;
           self.isLoading = false;
           self.state = 'done';
         }
      } catch (err) {
        logger.error('fetchFiles error', err);
        if (isAlive(self)) {
          self.state = 'error';
        }
      }
    }),
    setFilter(value) {
      self.filter = value;
    },
    setRemoveSelectOnHide(value) {
      self.removeSelectOnHide = value;
    }
  };
}).views((self) => {
  return {
    getFileById(name) {
      return resolveIdentifier(FileStore, self, name);
    },
    getFileIndexById(name) {
      const file = self.getFileById(name);
      if (file) {
        return self.files.indexOf(file);
      }
      return null;
    },
    getDownloadUrlById(name) {
      const torrent = self.torrent;
      if (torrent && torrent.sid) {
        const index = self.getFileIndexById(name);
        if (index !== null) {
          /**@type RootStore*/const rootStore = getRoot(self);
          return new URL('/proxy?' + qs.stringify({
            sid: torrent.sid,
            file: index,
            disposition: 'ATTACHMENT',
            service: 'DOWNLOAD',
            qos: 0
          }), rootStore.config.webUiUrl).toString();
        }
      }
      return null;
    },
    get torrent() {
      return resolveIdentifier(TorrentStore, self, self.id);
    },
    get filteredFiles() {
      if (self.filter) {
        const filter = self.filter + '/';
        const filterLen = filter.length;
        return self.files.filter((file) => {
          return file.normalizedName.substr(0, filterLen) === filter;
        });
      } else {
        return self.files;
      }
    },
    get sortedFiles() {
      /**@type RootStore*/const rootStore = getRoot(self);
      const {by, direction} = rootStore.config.filesSort;
      const files = self.filteredFiles.slice(0);

      const byColumn = byColumnMap[by] || by;

      const upDown = [-1, 1];
      if (direction === 1) {
        upDown.reverse();
      }

      files.sort((aa, bb) => {
        const a = aa[byColumn];
        const b = bb[byColumn];
        const [up, down] = upDown;

        if (a === b) {
          return 0;
        }
        if (a > b) {
          return up;
        }
        return down;
      });

      return files;
    },
    get _sortedIds() {
      return self.sortedFiles.map(file => file.name);
    },
    get selectedIndexes() {
      return self.selectedIds.map(name => self.getFileIndexById(name));
    },
    get filterLevel() {
      const filter = self.filter;
      return !filter ? 0 : filter.split(/[\\/]/).length;
    },
    afterCreate() {
      self.startSortedIdsWatcher();
    },
    beforeDestroy() {
      self.stopSortedIdsWatcher();

      if (self.removeSelectOnHide) {
        /**@type RootStore*/const rootStore = getRoot(self);
        rootStore.torrentList.removeSelectedId(self.id);
      }
    }
  };
});

export default FileListStore;