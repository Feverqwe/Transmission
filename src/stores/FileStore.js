import {getRoot, types} from "mobx-state-tree";
import formatBytes from "../tools/formatBytes";

const priorityLocaleMap = ['MF_DONT', 'MF_LOW', 'MF_NORMAL', 'MF_HIGH'];

/**
 * @typedef {Object} FileStore
 * @property {string} name
 * @property {number} size
 * @property {number} downloaded
 * @property {number} priority
 * @property {*} progress
 * @property {*} progressStr
 * @property {*} sizeStr
 * @property {*} downloadedStr
 * @property {*} priorityStr
 * @property {*} selected
 * @property {*} nameParts
 * @property {*} normalizedName
 */
const FileStore = types.model('FileStore', {
  name: types.identifier,
  size: types.number,
  downloaded: types.number,
  priority: types.number,
}).views((self) => {
  let cachedNamePartsName = null;
  let cachedNameParts = null;

  return {
    get progress() {
      return Math.round((self.downloaded * 100 / self.size) * 10) / 10;
    },
    get progressStr() {
      const progress = self.progress;
      if (progress < 100) {
        return progress.toFixed(1) + '%';
      } else {
        return Math.round(progress) + '%';
      }
    },
    get sizeStr() {
      return formatBytes(self.size);
    },
    get downloadedStr() {
      return formatBytes(self.downloaded);
    },
    get priorityStr() {
      return chrome.i18n.getMessage(priorityLocaleMap[self.priority]);
    },
    get selected() {
      /**@type RootStore*/const rootStore = getRoot(self);
      return rootStore.fileList.selectedIds.indexOf(self.name) !== -1;
    },
    get nameParts() {
      if (cachedNamePartsName !== self.name) {
        cachedNamePartsName = self.name;
        cachedNameParts = cachedNamePartsName.split(/[\\/]/);
      }
      return cachedNameParts;
    },
    get normalizedName() {
      return self.nameParts.join('/');
    },
  };
});

export default FileStore;