import {resolveIdentifier, types} from "mobx-state-tree";
import {defaultConfig} from "../tools/loadConfig";
import storageSet from "../tools/storageSet";

const url = require('url');

/**
 * @typedef {Object} ColumnsStore
 * @property {string} column
 * @property {number} display
 * @property {number} order
 * @property {number} width
 * @property {string} lang
 * @property {function} setWidth
 * @property {function} toggleDisplay
 */
const ColumnStore =  types.model('ColumnsStore', {
  column: types.identifier,
  display: types.number,
  order: types.number,
  width: types.number,
  lang: types.string,
}).actions((self) => {
  return {
    setWidth(value) {
      self.width = value;
    },
    toggleDisplay() {
      self.display = self.display ? 0 : 1;
    }
  };
});

/**
 * @typedef {ColumnStore} TorrentsColumnsStore
 */
const TorrentsColumnStore = types.compose('TorrentsColumnsStore', ColumnStore, types.model({}));

/**
 * @typedef {ColumnStore} FilesColumnsStore
 */
const FilesColumnStore = types.compose('FilesColumnsStore', ColumnStore, types.model({}));

/**
 * @typedef {Object} FolderStore
 * @property {string} volume
 * @property {string} name
 * @property {string} path
 */
const FolderStore = types.model('FolderStore', {
  volume: types.number,
  name: types.string,
  path: types.string
});

/**
 * @typedef {Object} SelectedLabelStore
 * @property {string} label
 * @property {boolean} custom
 * @property {*} id
 */
const SelectedLabelStore = types.model('SelectedLabelStore', {
  label: types.string,
  custom: types.boolean,
}).views((self) => {
  return {
    get id() {
      return JSON.stringify({
        label: self.label,
        custom: self.custom,
      });
    }
  };
});

/**
 * @typedef {Object} ConfigStore
 * @property {string} [hostname]
 * @property {boolean} [ssl]
 * @property {number} [port]
 * @property {string} [pathname]
 * @property {boolean} [authenticationRequired]
 * @property {string} [login]
 * @property {string} [password]
 * @property {boolean} [showActiveCountBadge]
 * @property {boolean} [showDownloadCompleteNotifications]
 * @property {number} [backgroundUpdateInterval]
 * @property {number} [uiUpdateInterval]
 * @property {boolean} [hideSeedingTorrents]
 * @property {boolean} [hideFinishedTorrents]
 * @property {boolean} [showSpeedGraph]
 * @property {number} [popupHeight]
 * @property {boolean} [selectDownloadCategoryAfterPutTorrentFromContextMenu]
 * @property {string} [contextMenuType]
 * @property {boolean} [treeViewContextMenu]
 * @property {boolean} [putDefaultPathInContextMenu]
 * @property {string} [badgeColor]
 * @property {boolean} [showFreeSpace]
 * @property {boolean} [fixCyrillicTorrentName]
 * @property {boolean} [fixCyrillicDownloadPath]
 * @property {FolderStore[]} folders
 * @property {string[]} labels
 * @property {TorrentsColumnStore[]} torrentColumns
 * @property {FilesColumnStore[]} filesColumns
 * @property {{by:string,[direction]:number}} [torrentsSort]
 * @property {{by:string,[direction]:number}} [filesSort]
 * @property {SelectedLabelStore} [selectedLabel]
 * @property {number} [configVersion]
 * @property {function} setKeyValue
 * @property {function} addFolder
 * @property {function} hasFolder
 * @property {function} moveTorrensColumn
 * @property {function} saveTorrentsColumns
 * @property {function} moveFilesColumn
 * @property {function} saveFilesColumns
 * @property {function} setTorrentsSort
 * @property {function} setFilesSort
 * @property {function} setSelectedLabel
 * @property {function} setOptions
 * @property {function} removeFolders
 * @property {function} moveFolders
 * @property {*} url
 * @property {*} webUiUrl
 * @property {*} visibleTorrentColumns
 * @property {*} visibleFileColumns
 * @property {function} afterCreate
 * @property {function} beforeDestroy
 */
const ConfigStore = types.model('ConfigStore', {
  hostname: types.optional(types.string, ''),
  ssl: types.optional(types.boolean, false),
  port: types.optional(types.number, 9091),
  pathname: types.optional(types.string, '/transmission/rpc'),
  webPathname: types.optional(types.string, ''),

  authenticationRequired: types.optional(types.boolean, true),
  login: types.optional(types.string, ''),
  password: types.optional(types.string, ''),

  showActiveCountBadge: types.optional(types.boolean, true),
  showDownloadCompleteNotifications: types.optional(types.boolean, true),
  backgroundUpdateInterval: types.optional(types.number, 120000),
  uiUpdateInterval: types.optional(types.number, 1000),

  hideSeedingTorrents: types.optional(types.boolean, false),
  hideFinishedTorrents: types.optional(types.boolean, false),
  showSpeedGraph: types.optional(types.boolean, true),

  popupHeight: types.optional(types.number, 300),
  selectDownloadCategoryAfterPutTorrentFromContextMenu: types.optional(types.boolean, false),
  contextMenuType: types.optional(types.enumeration(['folder', 'label']), 'folder'),
  treeViewContextMenu: types.optional(types.boolean, false),
  putDefaultPathInContextMenu: types.optional(types.boolean, false),

  badgeColor: types.optional(types.string, '0,0,0,0.40'),

  showFreeSpace: types.optional(types.boolean, true),

  fixCyrillicTorrentName: types.optional(types.boolean, false),
  fixCyrillicDownloadPath: types.optional(types.boolean, false),

  folders: types.array(FolderStore),
  labels: types.array(types.string),

  torrentColumns: types.array(TorrentsColumnStore),
  filesColumns: types.array(FilesColumnStore),

  torrentsSort: types.optional(types.model({
    by: types.string,
    direction: types.optional(types.number, 1)
  }), {by: 'name'}),

  filesSort: types.optional(types.model({
    by: types.string,
    direction: types.optional(types.number, 1)
  }), {by: 'name'}),

  selectedLabel: types.optional(SelectedLabelStore, {label: 'ALL', custom: true}),

  configVersion: types.optional(types.number, 2),
}).actions((self) => {
  return {
    setKeyValue(keyValue) {
      Object.assign(self, keyValue);
    },
    addFolder(volume, path, name = '') {
      self.folders.push({volume, path, name});
      return storageSet({
        folders: self.folders
      });
    },
    hasFolder(volume, path) {
      return self.folders.some((folder) => folder.volume === volume &&  folder.path === path);
    },
    moveTorrensColumn(from, to) {
      const column = resolveIdentifier(TorrentsColumnStore, self, from);
      const columnTarget = resolveIdentifier(TorrentsColumnStore, self, to);

      const columns = moveColumn(self.torrentColumns.slice(0), column, columnTarget);

      self.torrentColumns = columns;
      return storageSet({
        torrentColumns: columns
      });
    },
    saveTorrentsColumns() {
      return storageSet({
        torrentColumns: self.torrentColumns,
      });
    },
    moveFilesColumn(from, to) {
      const column = resolveIdentifier(FilesColumnStore, self, from);
      const columnTarget = resolveIdentifier(FilesColumnStore, self, to);

      const columns = moveColumn(self.filesColumns.slice(0), column, columnTarget);

      self.filesColumns = columns;
      return storageSet({
        filesColumns: columns
      });
    },
    saveFilesColumns() {
      return storageSet({
        filesColumns: self.filesColumns,
      });
    },
    setTorrentsSort(by, direction) {
      self.torrentsSort = {by, direction};
      return storageSet({
        torrentsSort: self.torrentsSort
      });
    },
    setFilesSort(by, direction) {
      self.filesSort = {by, direction};
      return storageSet({
        filesSort: self.filesSort
      });
    },
    setSelectedLabel(label, isCustom) {
      self.selectedLabel = {label, custom: isCustom};
      return storageSet({
        selectedLabel: self.selectedLabel
      });
    },
    setOptions(obj) {
      Object.assign(self, obj);
      return storageSet(obj);
    },
    removeFolders(selectedFolders) {
      self.folders = removeItems(self.folders.slice(0), selectedFolders);
      return storageSet({
        folders: self.folders
      });
    },
    moveFolders(selectedFolders, index) {
      self.folders = moveItems(self.folders.slice(0), selectedFolders, index);
      return storageSet({
        folders: self.folders
      });
    },
  };
}).views((self) => {
  const storageChangeListener = (changes, namespace) => {
    if (namespace === 'local') {
      const keyValue = {};
      Object.entries(changes).forEach(([key, {newValue}]) => {
        if (defaultConfig.hasOwnProperty(key)) {
          keyValue[key] = newValue;
        }
      });
      self.setKeyValue(keyValue);
    }
  };

  return {
    get url() {
      return url.format({
        protocol: self.ssl ? 'https' : 'http',
        port: self.port,
        hostname: self.hostname,
        pathname: self.pathname,
      });
    },
    get webUiUrl() {
      const urlObject = {
        protocol: self.ssl ? 'https' : 'http',
        port: self.port,
        hostname: self.hostname,
        pathname: self.pathname,
      };
      if (self.authenticationRequired) {
        urlObject.auth = [self.login, self.password].join(':');
      }
      return url.format(urlObject);
    },
    get visibleTorrentColumns() {
      return self.torrentColumns.filter(column => column.display);
    },
    get visibleFileColumns() {
      return self.filesColumns.filter(column => column.display);
    },
    afterCreate() {
      chrome.storage.onChanged.addListener(storageChangeListener);
    },
    beforeDestroy() {
      chrome.storage.onChanged.removeListener(storageChangeListener);
    },
  };
});

function moveColumn(columns, column, columnTarget) {
  const pos = columns.indexOf(column);
  const posTarget = columns.indexOf(columnTarget);

  columns.splice(pos, 1);

  if (pos < posTarget) {
    columns.splice(columns.indexOf(columnTarget) + 1, 0, column);
  } else {
    columns.splice(columns.indexOf(columnTarget), 0, column);
  }

  return columns;
}

function removeItems(array, items) {
  items.forEach((folder) => {
    const pos = array.indexOf(folder);
    if (pos !== -1) {
      array.splice(pos, 1);
    }
  });
  return array;
}

function moveItems(array, items, index) {
  let startPos = null;
  items.forEach((folder) => {
    let pos = array.indexOf(folder);
    if (pos !== -1) {
      if (startPos === null) {
        startPos = pos;
      }
      array.splice(pos, 1);
    }
  });

  if (index < 0) {
    array.splice(startPos - 1, 0, ...items);
  } else {
    array.splice(startPos + 1, 0, ...items);
  }

  return array;
}

export default ConfigStore;
export {SelectedLabelStore};