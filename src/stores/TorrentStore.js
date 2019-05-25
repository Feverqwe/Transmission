import {getRoot, types} from "mobx-state-tree";
import speedToStr from "../tools/speedToStr";
import getEta from "../tools/getEta";
import fecha from "fecha";
import utStateToText from "../tools/utStateToText";
import formatBytes from "../tools/formatBytes";

/**
 * @typedef {Object} TorrentStore
 * @property {number} id
 * @property {number} state
 * @property {string} name
 * @property {number} size
 * @property {number} progress
 * @property {number} downloaded
 * @property {number} uploaded
 * @property {number} shared
 * @property {number} uploadSpeed
 * @property {number} downloadSpeed
 * @property {number} eta
 * @property {string} label
 * @property {number} activePeers
 * @property {number} peers
 * @property {number} activeSeeds
 * @property {number} seeds
 * @property {number} available
 * @property {number} order
 * @property {string|undefined} status
 * @property {string|undefined} sid
 * @property {number|undefined} addedTime
 * @property {number|undefined} completedTime
 * @property {string|undefined} directory
 * @property {function} start
 * @property {function} pause
 * @property {function} stop
 * @property {*} remaining
 * @property {*} remainingStr
 * @property {*} isCompleted
 * @property {*} sizeStr
 * @property {*} progressStr
 * @property {*} uploadSpeedStr
 * @property {*} downloadSpeedStr
 * @property {*} etaStr
 * @property {*} uploadedStr
 * @property {*} downloadedStr
 * @property {*} availableStr
 * @property {*} addedTimeStr
 * @property {*} completedTimeStr
 * @property {*} stateText
 * @property {*} selected
 * @property {*} actions
 * @property {*} isSeeding
 * @property {*} isFinished
 * @property {*} isDownloading
 * @property {*} isPaused
 * @property {*} isActive
 * @property {*} isDownloadAvailable
 */
const TorrentStore = types.model('TorrentStore', {
  id: types.identifierNumber,
  state: types.number,
  name: types.string,
  size: types.number,
  progress: types.number,
  downloaded: types.number,
  uploaded: types.number,
  shared: types.number,
  uploadSpeed: types.number,
  downloadSpeed: types.number,
  eta: types.number,
  label: types.string,
  activePeers: types.number,
  peers: types.number,
  activeSeeds: types.number,
  seeds: types.number,
  order: types.maybe(types.number),
  status: types.string,
  addedTime: types.number,
  completedTime: types.number,
  directory: types.maybe(types.string),
  magnetLink: types.maybe(types.string),
}).views((self) => {
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
      return self.progress === 1000 || !!self.completedTime;
    },
    get sizeStr() {
      return formatBytes(self.size);
    },
    get progressStr() {
      let progress = self.progress / 10;
      if (progress < 100) {
        return progress.toFixed(1) + '%';
      } else {
        return Math.round(progress) + '%';
      }
    },
    get uploadSpeedStr() {
      return speedToStr(self.uploadSpeed);
    },
    get downloadSpeedStr() {
      return speedToStr(self.downloadSpeed);
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
      return utStateToText(self);
    },
    get selected() {
      /**@type RootStore*/const rootStore = getRoot(self);
      return rootStore.torrentList.selectedIds.indexOf(self.id) !== -1;
    },
    get actions() {
      const stat = self.state;
      const loaded = !!(stat & 128);
      const queued = !!(stat & 64);
      const paused = !!(stat & 32);
      const error = !!(stat & 16);
      const checked = !!(stat & 8);
      const start_after_check = !!(stat & 4);
      const checking = !!(stat & 2);
      const started = !!(stat & 1);

      const actions = [];
      if (!checking) {
        actions.push('recheck');
      }
      if (checking || started || queued) {
        actions.push('stop');
      }
      if ((started || checking) && paused) {
        actions.push('unpause');
      }
      if (!paused && (checking || started || queued)) {
        actions.push('pause');
      }
      if (!queued || paused) {
        actions.push('start');
      }
      if ((!started || paused) && !checking) {
        actions.push('forcestart');
      }

      if (actions.indexOf('pause') !== -1) {
        const pos = actions.indexOf('unpause');
        if (pos !== -1) {
          actions.splice(pos, 1);
        }
      }

      return actions;
    },
    get isSeeding() {
      return !!(self.state & 1 && self.progress === 1000);
    },
    get isFinished() {
      return !!(self.progress === 1000 && !(self.state & 32) && !(self.state & 1) && !(self.state & 2) && !(self.state & 16) && !(self.state & 64));
    },
    get isDownloading() {
      return !!(self.state & 1 && self.progress !== 1000);
    },
    get isPaused() {
      return !!(self.state & 32 && !(self.state & 2));
    },
    get isActive() {
      return !!(self.downloadSpeed || self.uploadSpeed);
    }
  };
});

export default TorrentStore;