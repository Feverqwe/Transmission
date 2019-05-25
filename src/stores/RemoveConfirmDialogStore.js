import {getRoot, types} from "mobx-state-tree";

/**
 * @typedef {Object} RemoveConfirmDialogStore
 * @property {string} id
 * @property {string} type
 * @property {string[]} torrentIds
 * @property {function} close
 */
const RemoveConfirmDialogStore = types.model('RemoveConfirmDialogStore', {
  id: types.identifier,
  type: types.literal('removeConfirm'),
  torrentIds: types.array(types.number)
}).views((self) => {
  return {
    close() {
      /**@type RootStore*/const rootStore = getRoot(self);
      rootStore.destroyDialog(self.id);
    }
  };
});

export default RemoveConfirmDialogStore;