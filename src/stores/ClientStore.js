import {getSnapshot, types} from "mobx-state-tree";
import SpeedRollStore from "./SpeedRollStore";
import speedToStr from "../tools/speedToStr";
import TorrentStore from "./TorrentStore";
import callApi from "../tools/callApi";
import getLogger from "../tools/getLogger";

const logger = getLogger('ClientStore');

/**
 * @typedef {Object} LabelStore
 * @property {string} name
 */
const LabelStore = types.model('LabelStore', {
  name: types.identifier,
});

/**
 * @typedef {Object} SettingsStore
 * @property {number} downloadSpeedLimit
 * @property {boolean} downloadSpeedLimitEnabled
 * @property {number} uploadSpeedLimit
 * @property {boolean} uploadSpeedLimitEnabled
 * @property {boolean} altSpeedEnabled
 * @property {number} altDownloadSpeedLimit
 * @property {number} altUploadSpeedLimit
 * @property {string} downloadDir
 * @property {number|undefined} downloadDirFreeSpace
 * @property {*} downloadSpeedLimitStr
 * @property {*} uploadSpeedLimitStr
 * @property {*} altDownloadSpeedLimitStr
 * @property {*} altUploadSpeedLimitStr
 * @property {*} hasDownloadDirFreeSpace
 */
const SettingsStore = types.model('SettingsStore', {
  downloadSpeedLimit:types.number,
  downloadSpeedLimitEnabled: types.boolean,
  uploadSpeedLimit:types.number,
  uploadSpeedLimitEnabled: types.boolean,
  altSpeedEnabled: types.boolean,
  altDownloadSpeedLimit:types.number,
  altUploadSpeedLimit:types.number,
  downloadDir: types.string,
  downloadDirFreeSpace: types.maybe(types.number),
}).views((self) => {
  return {
    get downloadSpeedLimitStr() {
      return speedToStr(self.downloadSpeedLimit * 1024);
    },
    get uploadSpeedLimitStr() {
      return speedToStr(self.uploadSpeedLimit * 1024);
    },
    get altDownloadSpeedLimitStr() {
      return speedToStr(self.altDownloadSpeedLimit * 1024);
    },
    get altUploadSpeedLimitStr() {
      return speedToStr(self.altUploadSpeedLimit * 1024);
    },
    get hasDownloadDirFreeSpace() {
      return typeof self.downloadDirFreeSpace === 'number';
    }
  };
});

/**
 * @typedef {Object} ClientStore
 * @property {Map<*,TorrentStore>} torrents
 * @property {SettingsStore|undefined} settings
 * @property {SpeedRollStore} [speedRoll]
 * @property {string|undefined} lastErrorMessage
 * @property {function} removeTorrentByIds
 * @property {function} sync
 * @property {function} syncChanges
 * @property {function} setTorrents
 * @property {function} setSettings
 * @property {function} setLastErrorMessage
 * @property {*} torrentIds
 * @property {*} activeTorrentIds
 * @property {*} activeCount
 * @property {*} currentSpeed
 * @property {*} currentSpeedStr
 * @property {function} torrentsStart
 * @property {function} torrentsForceStart
 * @property {function} torrentsStop
 * @property {function} torrentsRecheck
 * @property {function} torrentsRemoveTorrent
 * @property {function} torrentsRemoveTorrentFiles
 * @property {function} torrentsQueueTop
 * @property {function} torrentsQueueUp
 * @property {function} torrentsQueueDown
 * @property {function} torrentsQueueBottom
 * @property {function} filesSetPriority
 * @property {function} setDownloadSpeedLimitEnabled
 * @property {function} setDownloadSpeedLimit
 * @property {function} setUploadSpeedLimitEnabled
 * @property {function} setUploadSpeedLimit
 * @property {function} setAltSpeedEnabled
 * @property {function} setAltDownloadSpeedLimit
 * @property {function} setAltUploadSpeedLimit
 * @property {function} getTorrentFiles
 * @property {function} getSettings
 * @property {function} sendFiles
 * @property {function} getFreeSpace
 * @property {function} reannounce
 * @property {function} rename
 * @property {function} torrentSetLocation
 * @property {function} getSnapshot
 * @property {function} syncUiClient
 */
const ClientStore = types.model('ClientStore', {
  torrents: types.map(TorrentStore),
  // files: types.map(types.array(FileStore)),
  settings: types.maybe(SettingsStore),
  speedRoll: types.optional(SpeedRollStore, {}),
  lastErrorMessage: types.maybe(types.string),
}).actions((self) => {
  return {
    removeTorrentByIds(ids) {
      ids.forEach(id => {
        self.torrents.delete(id);
        // self.files.delete(id);
      });
    },
    sync(torrents) {
      const removedIds = self.torrentIds;

      torrents.forEach((torrent) => {
        const id = torrent.id;

        const pos = removedIds.indexOf(id);
        if (pos !== -1) {
          removedIds.splice(pos, 1);
        }

        self.torrents.set(id, torrent);
      });

      self.removeTorrentByIds(removedIds);
    },
    syncChanges(torrents) {
      torrents.forEach((torrent) => {
        self.torrents.set(torrent.id, torrent);
      });
    },
    /*setFileList(torrentId, files) {
      self.files.set(torrentId, files);
    },*/
    setTorrents(torrents) {
      self.torrents = torrents;
    },
    setSettings(settings) {
      self.settings = settings;
    },
    setLastErrorMessage(message) {
      self.lastErrorMessage = message;
    },
  };
}).views((self) => {
  const exceptionLog = () => {
    return [
      (result) => {
        self.setLastErrorMessage(undefined);
        return result;
      },
      (err) => {
        logger.error('exceptionLog', err);
        self.setLastErrorMessage(`${err.name}: ${err.message || 'Unknown error'}`);
        throw err;
      }
    ];
  };

  const syncUi = (result) => {
    return self.syncUiClient().then(() => result);
  };

  const fetchUi = (result) => {
    return self.fetchUiClient().then(() => result);
  };

  return {
    get torrentIds() {
      const result = [];
      for (const torrent of self.torrents.values()) {
        result.push(torrent.id);
      }
      return result;
    },
    get activeTorrentIds() {
      const result = [];
      for (const torrent of self.torrents.values()) {
        if (!torrent.isCompleted) {
          result.push(torrent.id);
        }
      }
      return result;
    },
    get activeCount() {
      return self.activeTorrentIds.length;
    },
    get currentSpeed() {
      let downloadSpeed = 0;
      let uploadSpeed = 0;
      for (const torrent of self.torrents.values()) {
        downloadSpeed += torrent.downloadSpeed;
        uploadSpeed += torrent.uploadSpeed;
      }
      return {
        downloadSpeed,
        uploadSpeed
      };
    },
    get currentSpeedStr() {
      const {downloadSpeed, uploadSpeed} = self.currentSpeed;
      return {
        downloadSpeedStr: speedToStr(downloadSpeed),
        uploadSpeedStr: speedToStr(uploadSpeed),
      };
    },
    torrentsStart(ids) {
      return callApi({action: 'start', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    torrentsForceStart(ids) {
      return callApi({action: 'forcestart', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    torrentsStop(ids) {
      return callApi({action: 'stop', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    torrentsRecheck(ids) {
      return callApi({action: 'recheck', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    torrentsRemoveTorrent(ids) {
      return callApi({action: 'removetorrent', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    torrentsRemoveTorrentFiles(ids) {
      return callApi({action: 'removedatatorrent', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    torrentsQueueTop(ids) {
      return callApi({action: 'queueTop', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    torrentsQueueUp(ids) {
      return callApi({action: 'queueUp', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    torrentsQueueDown(ids) {
      return callApi({action: 'queueDown', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    torrentsQueueBottom(ids) {
      return callApi({action: 'queueBottom', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    filesSetPriority(id, fileIdxs, level) {
      return callApi({action: 'setPriority', level, id: id, fileIdxs}).then(...exceptionLog());
    },
    setDownloadSpeedLimitEnabled(enabled) {
      return callApi({action: 'setDownloadSpeedLimitEnabled', enabled}).then(...exceptionLog()).then(fetchUi);
    },
    setDownloadSpeedLimit(speed) {
      return callApi({action: 'setDownloadSpeedLimit', speed}).then(...exceptionLog()).then(fetchUi);
    },
    setUploadSpeedLimitEnabled(enabled) {
      return callApi({action: 'setUploadSpeedLimitEnabled', enabled}).then(...exceptionLog()).then(fetchUi);
    },
    setUploadSpeedLimit(speed) {
      return callApi({action: 'setUploadSpeedLimit', speed}).then(...exceptionLog()).then(fetchUi);
    },
    setAltSpeedEnabled(enabled) {
      return callApi({action: 'setAltSpeedEnabled', enabled}).then(...exceptionLog()).then(fetchUi);
    },
    setAltDownloadSpeedLimit(speed) {
      return callApi({action: 'setAltDownloadSpeedLimit', speed}).then(...exceptionLog()).then(fetchUi);
    },
    setAltUploadSpeedLimit(speed) {
      return callApi({action: 'setAltUploadSpeedLimit', speed}).then(...exceptionLog()).then(fetchUi);
    },
    getTorrentFiles(id) {
      return callApi({action: 'getFileList', id: id}).then(...exceptionLog());
    },
    getSettings() {
      return callApi({action: 'getSettings'}).then(...exceptionLog()).then(fetchUi);
    },
    sendFiles(urls, directory) {
      return callApi({action: 'sendFiles', urls, directory}).then(...exceptionLog()).then(syncUi);
    },
    getFreeSpace(path) {
      return callApi({action: 'getFreeSpace', path}).then(...exceptionLog());
    },
    reannounce(ids) {
      return callApi({action: 'reannounce', ids: ids}).then(...exceptionLog());
    },
    rename(ids, path, name){
      return callApi({action: 'rename', ids: ids, path, name}).then(...exceptionLog()).then(syncUi);
    },
    torrentSetLocation(ids, location){
      return callApi({action: 'torrentSetLocation', ids: ids, location}).then(...exceptionLog()).then(syncUi);
    },
    getSnapshot() {
      return getSnapshot(self);
    },
    syncUiClient(force) {
      return callApi({action: 'updateTorrentList', force}).then((client) => {
        self.setTorrents(client.torrents);
        self.setSettings(client.settings);
        self.speedRoll.setData(client.speedRoll.data);
      }).then(...exceptionLog());
    },
    fetchUiClient() {
      return callApi({action: 'getClientStore'}).then((client) => {
        self.setTorrents(client.torrents);
        self.setSettings(client.settings);
        self.speedRoll.setData(client.speedRoll.data);
      }).then(...exceptionLog());
    },
  };
});

export default ClientStore;