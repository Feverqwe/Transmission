import {getRoot, types} from "mobx-state-tree";
import speedToStr from "../tools/speedToStr";
import getEta from "../tools/getEta";
import fecha from "fecha";
import formatBytes from "../tools/formatBytes";

/**
 * @typedef {Object} TorrentStore
 * @property {number} id
 * @property {number} statusCode
 * @property {number} errorCode
 * @property {string} errorString
 * @property {string} name
 * @property {number} size
 * @property {number} percentDone
 * @property {number} recheckProgress
 * @property {number} downloaded
 * @property {number} uploaded
 * @property {number} shared
 * @property {number} uploadSpeed
 * @property {number} downloadSpeed
 * @property {number} eta
 * @property {number} activePeers
 * @property {number} peers
 * @property {number} activeSeeds
 * @property {number} seeds
 * @property {number|undefined} order
 * @property {number} addedTime
 * @property {number} completedTime
 * @property {string|undefined} directory
 * @property {string|undefined} magnetLink
 * @property {function} start
 * @property {function} stop
 * @property {*} remaining
 * @property {*} remainingStr
 * @property {*} isCompleted
 * @property {*} sizeStr
 * @property {*} progress
 * @property {*} progressStr
 * @property {*} recheckProgressStr
 * @property {*} uploadSpeedStr
 * @property {*} downloadSpeedStr
 * @property {*} etaStr
 * @property {*} uploadedStr
 * @property {*} downloadedStr
 * @property {*} addedTimeStr
 * @property {*} completedTimeStr
 * @property {*} stateText
 * @property {*} selected
 * @property {*} isStopped
 * @property {*} isQueuedToCheckFiles
 * @property {*} isChecking
 * @property {*} isQueuedToDownload
 * @property {*} isDownloading
 * @property {*} isQueuedToSeed
 * @property {*} isSeeding
 * @property {*} actions
 * @property {*} isFinished
 * @property {*} isActive
 */
const TorrentStore = types.model('TorrentStore', {
  id: types.identifierNumber,
  statusCode: types.number,
  errorCode: types.number,
  errorString: types.string,
  name: types.string,
  size: types.number,
  percentDone: types.number,
  recheckProgress: types.number,
  downloaded: types.number,
  uploaded: types.number,
  shared: types.number,
  uploadSpeed: types.number,
  downloadSpeed: types.number,
  eta: types.number,
  activePeers: types.number,
  peers: types.number,
  activeSeeds: types.number,
  seeds: types.number,
  order: types.maybe(types.number),
  addedTime: types.number,
  completedTime: types.number,
  directory: types.maybe(types.string),
  magnetLink: types.maybe(types.string),
}).views((/**TorrentStore*/self) => {
  return {
    start() {
      /**@type RootStore*/const rootStore = getRoot(self);
      return rootStore.client.torrentsStart([self.id]);
    },
    stop() {
      /**@type RootStore*/const rootStore = getRoot(self);
      return rootStore.client.torrentsStop([self.id]);
    },
    get remaining() {
      let result = self.size - self.downloaded;
      if (result < 0) {
        result = 0;
      }
      return result;
    },
    get remainingStr() {
      return formatBytes(self.remaining);
    },
    get isCompleted() {
      return self.percentDone === 1;
    },
    get sizeStr() {
      return formatBytes(self.size);
    },
    get progress() {
      return Math.trunc((self.recheckProgress || self.percentDone) * 1000);
    },
    get progressStr() {
      let progress = self.progress / 10;
      if (progress < 100) {
        return progress.toFixed(1) + '%';
      } else {
        return Math.round(progress) + '%';
      }
    },
    get recheckProgressStr() {
      return (self.recheckProgress * 100).toFixed(1) + '%';
    },
    get uploadSpeedStr() {
      if (self.uploadSpeed === 0) {
        return '';
      } else {
        return speedToStr(self.uploadSpeed);
      }
    },
    get downloadSpeedStr() {
      if (self.downloadSpeed === 0) {
        return '';
      } else {
        return speedToStr(self.downloadSpeed);
      }
    },
    get etaStr() {
      return getEta(self.eta);
    },
    get uploadedStr() {
      return formatBytes(self.uploaded);
    },
    get downloadedStr() {
      return formatBytes(self.downloaded);
    },
    get addedTimeStr() {
      if (!self.addedTime) {
        return '∞';
      } else {
        return fecha.format(self.addedTime * 1000, 'YYYY-MM-DD HH:mm:ss');
      }
    },
    get completedTimeStr() {
      if (!self.completedTime) {
        return '∞';
      } else {
        return fecha.format(self.completedTime * 1000, 'YYYY-MM-DD HH:mm:ss');
      }
    },
    get stateText() {
      if (self.errorCode > 0) {
        let errorString = self.errorString;
        if (/^Error: /.test(errorString)) {
          errorString = errorString.substr(7);
        }
        if (errorString) {
          return chrome.i18n.getMessage('OV_FL_ERROR') + ': ' + errorString;
        }
        return chrome.i18n.getMessage('OV_FL_ERROR');
      }

      switch (self.statusCode) {
        case 0: {
          if (self.percentDone === 1) {
            return chrome.i18n.getMessage('OV_FL_FINISHED');
          } else {
            return chrome.i18n.getMessage('OV_FL_STOPPED');
          }
        }
        case 1:   // Queued to check files
        case 3: { // Queued to download
          return chrome.i18n.getMessage('OV_FL_QUEUED');
        }
        case 2: {
          return chrome.i18n.getMessage('OV_FL_CHECKED') + ' ' + self.recheckProgressStr;
        }
        case 4: {
          return chrome.i18n.getMessage('OV_FL_DOWNLOADING');
        }
        case 5: {
          return chrome.i18n.getMessage('OV_FL_QUEUED_SEED');
        }
        case 6: {
          return chrome.i18n.getMessage('OV_FL_SEEDING');
        }
        default: {
          return `Unknown (${self.statusCode})`;
        }
      }
    },
    get selected() {
      /**@type RootStore*/const rootStore = getRoot(self);
      return rootStore.torrentList.selectedIds.indexOf(self.id) !== -1;
    },
    get isStopped() {
      return self.statusCode === 0;
    },
    get isQueuedToCheckFiles() {
      return self.statusCode === 1;
    },
    get isChecking() {
      return self.statusCode === 2;
    },
    get isQueuedToDownload() {
      return self.statusCode === 3;
    },
    get isDownloading() {
      return self.statusCode === 4;
    },
    get isQueuedToSeed() {
      return self.statusCode === 5;
    },
    get isSeeding() {
      return self.statusCode === 6;
    },
    get actions() {
      const actions = [];

      if (!self.isChecking) {
        actions.push('recheck');
      }

      if (self.isStopped) {
        actions.push('start');
      } else {
        actions.push('stop');
      }

      if (self.isStopped || self.isQueuedToCheckFiles || self.isQueuedToDownload || self.isQueuedToSeed) {
        actions.push('forcestart');
      }

      return actions;
    },
    get isFinished() {
      return self.percentDone === 1 && self.isStopped;
    },
    get isActive() {
      return !!(self.downloadSpeed || self.uploadSpeed);
    }
  };
});

export default TorrentStore;