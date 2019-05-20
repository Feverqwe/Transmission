import {types} from "mobx-state-tree";
import {autorun} from "mobx";

/**
 * @typedef {Object} ListSelectStore
 * @property {string[]} selectedIds
 * @property {function} addSelectedId
 * @property {function} isSelectedId
 * @property {function} removeSelectedId
 * @property {function} addMultipleSelectedId
 * @property {function} toggleSelectAll
 * @property {function} syncSelectedIds
 * @property {*} _sortedIds
 * @property {*} isSelectedAll
 * @property {function} startSortedIdsWatcher
 * @property {function} stopSortedIdsWatcher
 */
const ListSelectStore = types.model('ListSelectStore', {
  selectedIds: types.array(types.number),
}).actions((self) => {
  return {
    addSelectedId(id, reset) {
      const ids = self.selectedIds.slice(0);
      if (reset) {
        ids.splice(0);
      }
      const pos = ids.indexOf(id);
      if (pos === -1) {
        ids.push(id);
      }
      self.selectedIds = ids;
    },
    isSelectedId(id) {
      return self.selectedIds.indexOf(id) !== -1;
    },
    removeSelectedId(id) {
      const ids = self.selectedIds.slice(0);
      const pos = ids.indexOf(id);
      if (pos !== -1) {
        ids.splice(pos, 1);
      }
      self.selectedIds = ids;
    },
    addMultipleSelectedId(toId) {
      if (!self.selectedIds.length) {
        return self.selectedIds(toId);
      }

      const fromId = self.selectedIds.slice(-1)[0];
      const ids = self._sortedIds;
      const fromPos = ids.indexOf(fromId);
      const toPos = ids.indexOf(toId);
      if (fromPos < toPos) {
        self.selectedIds = ids.slice(fromPos, toPos + 1);
      } else {
        self.selectedIds = ids.slice(toPos, fromPos + 1);
      }
    },
    toggleSelectAll() {
      if (self.isSelectedAll) {
        self.selectedIds = [];
      } else {
        self.selectedIds = self._sortedIds.slice(0);
      }
    },
    syncSelectedIds() {
      self.selectedIds = self.selectedIds.filter(id => self._sortedIds.indexOf(id) !== -1);
    }
  };
}).views((self) => {
  let _autorun = null;

  return {
    get _sortedIds() {
      throw new Error('Overwrite me!');
    },
    get isSelectedAll() {
      const ids = self._sortedIds;
      if (ids.length > 0 && self.selectedIds.length === ids.length) {
        return self.selectedIds.every(id => ids.indexOf(id) !== -1);
      }
      return false;
    },
    startSortedIdsWatcher() {
      _autorun = autorun(() => {
        if (self._sortedIds) {
          self.syncSelectedIds();
        }
      });
    },
    stopSortedIdsWatcher() {
      _autorun && _autorun();
      _autorun = null;
    }
  };
});

export default ListSelectStore;