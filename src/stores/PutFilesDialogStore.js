import {getRoot, types} from "mobx-state-tree";

/**
 * @typedef {Object} PutFilesDialogStore
 * @property {string} id
 * @property {string} type
 * @property {boolean} [isReady]
 * @property {function} setReady
 * @property {*} files
 * @property {function} close
 */
const PutFilesDialogStore = types.model('PutFilesDialogStore', {
  id: types.identifier,
  type: types.literal('putFiles'),
  isReady: types.optional(types.boolean, false),
}).actions((self) => {
  return {
    setReady(value) {
      self.isReady = value;
    }
  };
}).views((self) => {
  let _files = null;
  return {
    set files(files) {
      _files = files;
    },
    get files() {
      return _files;
    },
    close() {
      /**@type RootStore*/const rootStore = getRoot(self);
      rootStore.destroyDialog(self.id);
    }
  };
});

export default PutFilesDialogStore;