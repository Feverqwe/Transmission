import getLogger from "./getLogger";
import storageGet from "./storageGet";
import storageSet from "./storageSet";

const logger = getLogger('loadConfig');

const defaultTorrentListColumnList = [
  {column: 'checkbox', display: 1, order: 0, width: 19, lang: 'selectAll'},
  {column: 'name', display: 1, order: 1, width: 200, lang: 'OV_COL_NAME'},
  {column: 'order', display: 0, order: 1, width: 20, lang: 'OV_COL_ORDER'},
  {column: 'size', display: 1, order: 1, width: 60, lang: 'OV_COL_SIZE'},
  {column: 'remaining', display: 0, order: 1, width: 60, lang: 'OV_COL_REMAINING'},
  {column: 'done', display: 1, order: 1, width: 70, lang: 'OV_COL_DONE'},
  {column: 'status', display: 1, order: 1, width: 70, lang: 'OV_COL_STATUS'},
  {column: 'seeds', display: 0, order: 1, width: 30, lang: 'OV_COL_SEEDS'},
  {column: 'peers', display: 0, order: 1, width: 30, lang: 'OV_COL_PEERS'},
  {column: 'seeds_peers', display: 1, order: 1, width: 40, lang: 'OV_COL_SEEDS_PEERS'},
  {column: 'downspd', display: 1, order: 1, width: 60, lang: 'OV_COL_DOWNSPD'},
  {column: 'upspd', display: 1, order: 1, width: 60, lang: 'OV_COL_UPSPD'},
  {column: 'eta', display: 1, order: 1, width: 70, lang: 'OV_COL_ETA'},
  {column: 'upped', display: 0, order: 1, width: 60, lang: 'OV_COL_UPPED'},
  {column: 'downloaded', display: 0, order: 1, width: 60, lang: 'OV_COL_DOWNLOADED'},
  {column: 'shared', display: 0, order: 1, width: 60, lang: 'OV_COL_SHARED'},
  // {column: 'avail', display: 0, order: 1, width: 60, lang: 'OV_COL_AVAIL'},
  // {column: 'label', display: 0, order: 1, width: 100, lang: 'OV_COL_LABEL'},
  {column: 'added', display: 0, order: 1, width: 120, lang: 'OV_COL_DATE_ADDED'},
  {column: 'completed', display: 0, order: 1, width: 120, lang: 'OV_COL_DATE_COMPLETED'},
  {column: 'actions', display: 1, order: 0, width: 36, lang: 'Actions'}
];

const defaultFileListColumnList = [
  {column: 'checkbox', display: 1, order: 0, width: 19, lang: 'selectAll'},
  {column: 'name', display: 1, order: 1, width: 300, lang: 'FI_COL_NAME'},
  {column: 'size', display: 1, order: 1, width: 60, lang: 'FI_COL_SIZE'},
  {column: 'downloaded', display: 1, order: 1, width: 60, lang: 'OV_COL_DOWNLOADED'},
  {column: 'done', display: 1, order: 1, width: 70, lang: 'OV_COL_DONE'},
  {column: 'prio', display: 1, order: 1, width: 74, lang: 'FI_COL_PRIO'}
];

const defaultConfig = {
  hostname: undefined,
  ssl: undefined,
  port: undefined,
  pathname: undefined,
  webPathname: undefined,

  authenticationRequired: undefined,
  login: undefined,
  password: undefined,

  showActiveCountBadge: undefined,
  showDownloadCompleteNotifications: undefined,
  backgroundUpdateInterval: undefined,
  uiUpdateInterval: undefined,

  hideSeedingTorrents: undefined,
  hideFinishedTorrents: undefined,
  showSpeedGraph: undefined,

  popupHeight: undefined,
  selectDownloadCategoryAfterPutTorrentFromContextMenu: undefined,
  contextMenuType: undefined,
  treeViewContextMenu: undefined,
  putDefaultPathInContextMenu: undefined,

  badgeColor: undefined,

  showFreeSpace: undefined,

  fixCyrillicTorrentName: undefined,
  fixCyrillicDownloadPath: undefined,

  folders: undefined,
  labels: undefined,

  torrentColumns: defaultTorrentListColumnList,
  filesColumns: defaultFileListColumnList,

  torrentsSort: undefined,
  filesSort: undefined,
  selectedLabel: undefined,

  configVersion: undefined
};

const oldConfigMap = {
  useSSL: 'ssl',
  ip: 'hostname',
  path: 'pathname',
  displayActiveTorrentCountIcon: 'showActiveCountBadge',
  showNotificationOnDownloadCompleate: 'showDownloadCompleteNotifications',
  popupUpdateInterval: 'uiUpdateInterval',
  hideSeedStatusItem: 'hideSeedingTorrents',
  hideFnishStatusItem: 'hideFinishedTorrents',
  selectDownloadCategoryOnAddItemFromContextMenu: 'selectDownloadCategoryAfterPutTorrentFromContextMenu',
  ctxMenuType: 'contextMenuType',
  showDefaultFolderContextMenuItem: 'putDefaultPathInContextMenu',
  fixCirilicTitle: 'fixCyrillicTorrentName',
  fixCirilicTorrentPath: 'fixCyrillicDownloadPath',
  folderList: 'folders',
  labelList: 'labels',
  torrentListColumnList: 'torrentColumns',
  fileListColumnList: 'filesColumns',
};

const oldConfigDefaults = Object.keys(oldConfigMap);

const loadConfig = () => {
  return storageGet(Object.keys(defaultConfig)).then((config) => {
    ['torrentColumns', 'filesColumns'].forEach((key) => {
      if (config[key] === undefined) {
        config[key] = defaultConfig[key];
      }
    });

    if (config.configVersion !== 2) {
      return storageGet(oldConfigDefaults).then((oldConfig) => {
        return migrateConfig(oldConfig, config);
      }).then((config) => {
        config.configVersion = 2;
        return storageSet(config).then(() => config);
      });
    }
    return config;
  }).then((config) => {
    [{
      key: 'filesColumns',
      defColumns: defaultFileListColumnList,
    }, {
      key: 'torrentColumns',
      defColumns: defaultTorrentListColumnList,
    }].forEach(({key, defColumns}) => {
      let columns = null;
      try {
        columns = mergeColumns(config[key], defColumns);
      } catch (err) {
        logger.error(`mergeColumns ${key} error, use default`, err);
        columns = defColumns;
      }

      config[key] = columns;
    });

    if (config.selectedLabel) {
      if (typeof config.selectedLabel.custom === "number") {
        config.selectedLabel.custom = !!config.selectedLabel.custom;
      }
    }

    ['showSpeedGraph', 'treeViewContextMenu', 'showFreeSpace'].forEach((key) => {
      if (typeof config[key] === 'number') {
        config[key] = !!config[key];
      }
    });

    return config;
  });
};

function migrateConfig(oldConfig, config) {
  const transformMap = {
    useSSL: intToBoolean,
    displayActiveTorrentCountIcon: intToBoolean,
    showNotificationOnDownloadCompleate: intToBoolean,
    hideSeedStatusItem: intToBoolean,
    hideFnishStatusItem: intToBoolean,
    showSpeedGraph: intToBoolean,
    selectDownloadCategoryOnAddItemFromContextMenu: intToBoolean,
    ctxMenuType: value => value ? 'folder' : 'label',
    treeViewContextMenu: intToBoolean,
    showDefaultFolderContextMenuItem: intToBoolean,
    showFreeSpace: intToBoolean,
    fixCirilicTitle: intToBoolean,
    fixCirilicTorrentPath: intToBoolean,
    folderList: folderListToFolders,
    selectedLabel: selectedLabelToLabel,
  };

  Object.entries(oldConfig).forEach(([key, value]) => {
    const newKey = oldConfigMap[key];

    const transform = transformMap[key];
    if (transform) {
      value = transform(value);
    }

    config[newKey || key] = value;
  });

  function intToBoolean(value) {
    return typeof value === 'boolean' ? value : !!value;
  }

  function folderListToFolders(value) {
    return value.map(([volume, path, label]) => {
      return {
        volume: parseInt(volume, 10),
        path,
        label: label || ''
      };
    });
  }

  function selectedLabelToLabel(value) {
    return {
      label: value.label,
      custom: !!value.custom
    };
  }

  return config;
}

function mergeColumns(columns, defColumns) {
  const defIdIndex = {};

  const defIdColumn = defColumns.reduce((result, item, index) => {
    defIdIndex[item.column] = index;
    result[item.column] = item;
    return result;
  }, {});

  const removedIds = Object.keys(defIdColumn);
  const unknownColumns = [];

  columns.forEach((column) => {
    const id = column.column;

    const pos = removedIds.indexOf(id);
    if (pos !== -1) {
      removedIds.splice(pos, 1);
    } else {
      unknownColumns.push(column);
    }

    const normColumn = Object.assign({}, defIdColumn[id], column);

    Object.assign(column, normColumn);
  });

  removedIds.forEach((id) => {
    const column = Object.assign({}, defIdColumn[id]);
    columns.splice(defIdIndex[id], 0, column);
  });

  unknownColumns.forEach((column) => {
    const pos = columns.indexOf(column);
    if (pos !== -1) {
      columns.splice(pos, 1);
    }
  });

  return columns;
}

export default loadConfig;
export {defaultConfig, migrateConfig};