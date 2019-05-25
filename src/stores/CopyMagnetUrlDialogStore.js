import {getRoot, types} from "mobx-state-tree";

/**
 * @typedef {Object} CopyMagnetUrlDialogStore
 * @property {string} id
 * @property {string} type
 * @property {string} magnetLink
 * @property {number[]} torrentIds
 * @property {function} close
 */
const CopyMagnetUrlDialogStore = types.model('CopyMagnetUrlDialogStore', {
  id: types.identifier,
  type: types.literal('copyMagnetUrl'),
  magnetLink: types.string,
  torrentIds: types.array(types.number)
}).views((self) => {
  return {
    close() {
      /**@type RootStore*/const rootStore = getRoot(self);
      rootStore.destroyDialog(self.id);
    }
  };
});

export default CopyMagnetUrlDialogStore;