import {getRoot, getSnapshot, types} from "mobx-state-tree";
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
 * @property {number|undefined} downloadSpeedLimit
 * @property {number|undefined} uploadSpeedLimit
 * @property {*} downloadSpeedLimitStr
 * @property {*} uploadSpeedLimitStr
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
}).views((self) => {
  return {
    get downloadSpeedLimitStr() {
      return speedToStr(self.downloadSpeedLimit * 1024);
    },
    get uploadSpeedLimitStr() {
      return speedToStr(self.uploadSpeedLimit * 1024);
    },
  };
});

/**
 * @typedef {Object} ClientStore
 * @property {Map<*,TorrentStore>} torrents
 * @property {LabelStore[]|undefined} labels
 * @property {SettingsStore|undefined} settings
 * @property {SpeedRollStore} [speedRoll]
 * @property {string|undefined} lastErrorMessage
 * @property {function} removeTorrentByIds
 * @property {function} sync
 * @property {function} syncChanges
 * @property {function} setTorrents
 * @property {function} setLabels
 * @property {function} setSettings
 * @property {function} setLastErrorMessage
 * @property {*} torrentIds
 * @property {*} downloadingTorrentIds
 * @property {*} pausedTorrentIds
 * @property {*} activeTorrentIds
 * @property {*} activeCount
 * @property {*} currentSpeed
 * @property {*} currentSpeedStr
 * @property {*} allLabels
 * @property {*} isSupportedApiRemoveTorrent
 * @property {*} isSupportedApiRemoveDataTorrent
 * @property {function} torrentsStart
 * @property {function} torrentsForceStart
 * @property {function} torrentsPause
 * @property {function} torrentsUnpause
 * @property {function} torrentsStop
 * @property {function} torrentsRecheck
 * @property {function} torrentsRemove
 * @property {function} torrentsRemoveTorrent
 * @property {function} torrentsRemoveFiles
 * @property {function} torrentsRemoveTorrentFiles
 * @property {function} torrentsQueueUp
 * @property {function} torrentsQueueDown
 * @property {function} torrentsSetLabel
 * @property {function} filesSetPriority
 * @property {function} setDownloadSpeedLimit
 * @property {function} setUploadSpeedLimit
 * @property {function} getTorrentFiles
 * @property {function} getSettings
 * @property {function} sendFiles
 * @property {function} getDownloadDirs
 * @property {function} getSnapshot
 * @property {function} syncUiClient
 */
const ClientStore = types.model('ClientStore', {
  torrents: types.map(TorrentStore),
  // files: types.map(types.array(FileStore)),
  labels: types.maybe(types.array(LabelStore)),
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
    setLabels(labels) {
      self.labels = labels;
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

  return {
    get torrentIds() {
      const result = [];
      for (const torrent of self.torrents.values()) {
        result.push(torrent.id);
      }
      return result;
    },
    get downloadingTorrentIds() {
      const result = [];
      for (const torrent of self.torrents.values()) {
        if (torrent.isDownloading) {
          result.push(torrent.id);
        }
      }
      return result;
    },
    get pausedTorrentIds() {
      const result = [];
      for (const torrent of self.torrents.values()) {
        if (torrent.isPaused) {
          result.push(torrent.id);
        }
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
    get allLabels() {
      /**@type RootStore*/const rootStore = getRoot(self);
      const result = rootStore.config.labels.slice(0);
      if (self.labels) {
        self.labels.forEach(({name}) => {
          if (result.indexOf(name) === -1) {
            result.push(name);
          }
        });
      }
      return result;
    },
    get isSupportedApiRemoveTorrent() {
      for (const torrent of self.torrents.values()) {
        return torrent.status !== undefined;
      }
      return false;
    },
    get isSupportedApiRemoveDataTorrent() {
      return self.isSupportedApiRemoveTorrent;
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
    torrentsQueueUp(ids) {
      return callApi({action: 'queueUp', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    torrentsQueueDown(ids) {
      return callApi({action: 'queueDown', ids: ids}).then(...exceptionLog()).then(syncUi);
    },
    filesSetPriority(id, fileIdxs, level) {
      return callApi({action: 'setPriority', level, id: id, fileIdxs}).then(...exceptionLog()).then(syncUi);
    },
    setDownloadSpeedLimit(speed) {
      return callApi({action: 'setDownloadSpeedLimit', speed}).then(...exceptionLog()).then(syncUi);
    },
    setUploadSpeedLimit(speed) {
      return callApi({action: 'setUploadSpeedLimit', speed}).then(...exceptionLog()).then(syncUi);
    },
    getTorrentFiles(id) {
      return callApi({action: 'getFileList', id: id}).then(...exceptionLog());
    },
    getSettings() {
      return callApi({action: 'getSettings'}).then(...exceptionLog()).then(syncUi);
    },
    sendFiles(urls, directory) {
      return callApi({action: 'sendFiles', urls, directory}).then(...exceptionLog()).then(syncUi);
    },
    getDownloadDirs() {
      return callApi({action: 'getDownloadDirs'}).then(...exceptionLog()).then(syncUi);
    },
    getSnapshot() {
      return getSnapshot(self);
    },
    syncUiClient() {
      return callApi({action: 'updateTorrentList'}).then((client) => {
        self.setTorrents(client.torrents);
        self.setLabels(client.labels);
        self.setSettings(client.settings);
        self.speedRoll.setData(client.speedRoll.data);
      }).then(...exceptionLog());
    }
  };
});

export default ClientStore;