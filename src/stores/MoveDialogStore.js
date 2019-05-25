import {getRoot, types} from "mobx-state-tree";

/**
 * @typedef {Object} MoveDialogStore
 * @property {string} id
 * @property {string} type
 * @property {string} path
 * @property {number[]} torrentIds
 * @property {function} close
 */
const MoveDialogStore = types.model('MoveDialogStore', {
  id: types.identifier,
  type: types.literal('move'),
  directory: types.string,
  torrentIds: types.array(types.number)
}).views((self) => {
  return {
    close() {
      /**@type RootStore*/const rootStore = getRoot(self);
      rootStore.destroyDialog(self.id);
    }
  };
});

export default MoveDialogStore;