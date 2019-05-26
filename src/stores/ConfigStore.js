import {getPropertyMembers, resolveIdentifier, types} from "mobx-state-tree";
import storageSet from "../tools/storageSet";

const url = require('url');

const defaultTorrentListColumnList = [
  {column: 'checkbox', display: 1, order: 0, width: 22, lang: 'selectAll'},
  {column: 'name', display: 1, order: 1, width: 204, lang: 'OV_COL_NAME'},
  {column: 'order', display: 0, order: 1, width: 24, lang: 'OV_COL_ORDER'},
  {column: 'size', display: 1, order: 1, width: 64, lang: 'OV_COL_SIZE'},
  {column: 'remaining', display: 0, order: 1, width: 64, lang: 'OV_COL_REMAINING'},
  {column: 'done', display: 1, order: 1, width: 74, lang: 'OV_COL_DONE'},
  {column: 'status', display: 1, order: 1, width: 74, lang: 'OV_COL_STATUS'},
  {column: 'seeds', display: 0, order: 1, width: 34, lang: 'OV_COL_SEEDS'},
  {column: 'peers', display: 0, order: 1, width: 34, lang: 'OV_COL_PEERS'},
  {column: 'seeds_peers', display: 1, order: 1, width: 44, lang: 'OV_COL_SEEDS_PEERS'},
  {column: 'downspd', display: 1, order: 1, width: 64, lang: 'OV_COL_DOWNSPD'},
  {column: 'upspd', display: 1, order: 1, width: 64, lang: 'OV_COL_UPSPD'},
  {column: 'eta', display: 1, order: 1, width: 74, lang: 'OV_COL_ETA'},
  {column: 'upped', display: 0, order: 1, width: 64, lang: 'OV_COL_UPPED'},
  {column: 'downloaded', display: 0, order: 1, width: 64, lang: 'OV_COL_DOWNLOADED'},
  {column: 'shared', display: 0, order: 1, width: 64, lang: 'OV_COL_SHARED'},
  // {column: 'avail', display: 0, order: 1, width: 60, lang: 'OV_COL_AVAIL'},
  // {column: 'label', display: 0, order: 1, width: 100, lang: 'OV_COL_LABEL'},
  {column: 'added', display: 0, order: 1, width: 124, lang: 'OV_COL_DATE_ADDED'},
  {column: 'completed', display: 0, order: 1, width: 124, lang: 'OV_COL_DATE_COMPLETED'},
  {column: 'actions', display: 1, order: 0, width: 40, lang: 'Actions'}
];

const defaultFileListColumnList = [
  {column: 'checkbox', display: 1, order: 0, width: 23, lang: 'selectAll'},
  {column: 'name', display: 1, order: 1, width: 304, lang: 'FI_COL_NAME'},
  {column: 'size', display: 1, order: 1, width: 64, lang: 'FI_COL_SIZE'},
  {column: 'downloaded', display: 1, order: 1, width: 64, lang: 'OV_COL_DOWNLOADED'},
  {column: 'done', display: 1, order: 1, width: 74, lang: 'OV_COL_DONE'},
  {column: 'prio', display: 1, order: 1, width: 78, lang: 'FI_COL_PRIO'}
];

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
 * @property {string} name
 * @property {string} path
 */
const FolderStore = types.model('FolderStore', {
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
 * @property {string} [webPathname]
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
 * @property {boolean} [treeViewContextMenu]
 * @property {boolean} [putDefaultPathInContextMenu]
 * @property {string} [badgeColor]
 * @property {boolean} [showFreeSpace]
 * @property {FolderStore[]} folders
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
  treeViewContextMenu: types.optional(types.boolean, false),
  putDefaultPathInContextMenu: types.optional(types.boolean, false),

  badgeColor: types.optional(types.string, '0,0,0,0.40'),

  showFreeSpace: types.optional(types.boolean, true),

  folders: types.array(FolderStore),

  torrentColumns: types.optional(types.array(TorrentsColumnStore), defaultTorrentListColumnList),
  filesColumns: types.optional(types.array(FilesColumnStore), defaultFileListColumnList),

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
    addFolder(path, name = '') {
      self.folders.push({path, name});
      return storageSet({
        folders: self.folders
      });
    },
    hasFolder(path) {
      return self.folders.some(folder => folder.path === path);
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
        if (configKeys.indexOf(key) !== -1) {
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


const configKeys = Object.keys(getPropertyMembers(ConfigStore).properties);

export default ConfigStore;
export {configKeys, SelectedLabelStore, defaultTorrentListColumnList, defaultFileListColumnList};