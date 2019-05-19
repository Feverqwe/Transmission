import {getRoot, types} from "mobx-state-tree";

/**
 * @typedef {Object} PutUrlDialogStore
 * @property {string} id
 * @property {string} type
 * @property {function} close
 */
const PutUrlDialogStore = types.model('PutUrlDialogStore', {
  id: types.identifier,
  type: types.literal('putUrl'),
}).views((self) => {
  return {
    close() {
      /**@type RootStore*/const rootStore = getRoot(self);
      rootStore.destroyDialog(self.id);
    }
  };
});

export default PutUrlDialogStore;