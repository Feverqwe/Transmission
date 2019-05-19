import {getRoot, types} from "mobx-state-tree";

/**
 * @typedef {Object} CreateLabelDialogStore
 * @property {string} id
 * @property {string} type
 * @property {string[]} torrentIds
 * @property {function} close
 */
const CreateLabelDialogStore = types.model('CreateLabelDialogStore', {
  id: types.identifier,
  type: types.literal('createLabel'),
  torrentIds: types.array(types.string)
}).views((self) => {
  return {
    close() {
      /**@type RootStore*/const rootStore = getRoot(self);
      rootStore.destroyDialog(self.id);
    }
  };
});

export default CreateLabelDialogStore;