import {getRoot, types} from "mobx-state-tree";

/**
 * @typedef {Object} RenameDialogStore
 * @property {string} id
 * @property {string} type
 * @property {string} path
 * @property {number[]} torrentIds
 * @property {function} close
 */
const RenameDialogStore = types.model('RenameDialogStore', {
  id: types.identifier,
  type: types.literal('rename'),
  path: types.string,
  torrentIds: types.array(types.number)
}).views((self) => {
  return {
    get name() {
      const parts = self.path.split(/[\\/]/);
      return parts.pop();
    },
    close() {
      /**@type RootStore*/const rootStore = getRoot(self);
      rootStore.destroyDialog(self.id);
    }
  };
});

export default RenameDialogStore;