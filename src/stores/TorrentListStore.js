import {getRoot, types} from "mobx-state-tree";
import ListSelectStore from "./ListSelectStore";

const customLabels = ['ALL', 'DL', 'SEEDING', 'COMPL', 'ACTIVE', 'INACTIVE'];

const byColumnMap = {
  done: 'progress',
  downspd: 'downloadSpeed',
  upspd: 'uploadSpeed',
  upped: 'uploaded',
  added: 'addedTime',
  completed: 'completedTime',
};

/**
 * @typedef {ListSelectStore} TorrentListStore
 * @property {*} filters
 * @property {*} filteredTorrents
 * @property {*} sortedTorrents
 * @property {*} sortedTorrentIds
 * @property {*} _sortedIds
 * @property {function} afterCreate
 * @property {function} beforeDestroy
 */
const TorrentListStore = types.compose('TorrentListStore', ListSelectStore, types.model({

})).views((self) => {
  return {
    get filters() {
      const result = [];
      customLabels.forEach(label => result.push({label, custom: true}));
      return result;
    },
    get filteredTorrents() {
      /**@type RootStore*/const rootStore = getRoot(self);
      const filter = rootStore.config.selectedLabel;

      const result = [];
      for (const torrent of rootStore.client.torrents.values()) {
        if (filter.custom) {
          switch (filter.label) {
            case 'ALL': {
              result.push(torrent);
              break;
            }
            case 'DL': {
              if (torrent.isDownloading){
                result.push(torrent);
              }
              break;
            }
            case 'SEEDING': {
              if (torrent.isSeeding){
                result.push(torrent);
              }
              break;
            }
            case 'COMPL': {
              if (torrent.isCompleted){
                result.push(torrent);
              }
              break;
            }
            case 'ACTIVE': {
              if (torrent.isActive){
                result.push(torrent);
              }
              break;
            }
            case 'INACTIVE': {
              if (!torrent.isActive){
                result.push(torrent);
              }
              break;
            }
          }
        } else
        if (torrent.label === filter.label) {
          result.push(torrent);
        }
      }

      const {hideSeedingTorrents, hideFinishedTorrents} = rootStore.config;
      if (hideSeedingTorrents || hideFinishedTorrents) {
        return result.filter((torrent) => {
          if (hideSeedingTorrents && torrent.isSeeding) {
            return false;
          }
          if (hideFinishedTorrents && torrent.isFinished) {
            return false;
          }
          return true;
        });
      } else {
        return result;
      }
    },
    get sortedTorrents() {
      /**@type RootStore*/const rootStore = getRoot(self);
      const {by, direction} = rootStore.config.torrentsSort;
      const torrents = self.filteredTorrents.slice(0);

      const byColumn = byColumnMap[by] || by;

      const upDown = [-1, 1];
      if (direction === 1) {
        upDown.reverse();
      }

      torrents.sort((aa, bb) => {
        let a = aa[byColumn];
        let b = bb[byColumn];
        const [up, down] = upDown;

        if (byColumn === 'eta') {
          if (a === -1) {
            a = Infinity;
          }
          if (b === -1) {
            b = Infinity;
          }
        }

        if (byColumn === 'added' || byColumn === 'completed') {
          if (!a) {
            a = Infinity;
          }
          if (!b) {
            b = Infinity;
          }
        }

        if (a === b) {
          return 0;
        }
        if (a > b) {
          return up;
        }
        return down;
      });

      return torrents;
    },
    get sortedTorrentIds() {
      return self.sortedTorrents.map(torrent => torrent.id);
    },
    get _sortedIds() {
      return self.sortedTorrentIds;
    },
    afterCreate() {
      self.startSortedIdsWatcher();
    },
    beforeDestroy() {
      self.stopSortedIdsWatcher();
    }
  };
});

export default TorrentListStore;