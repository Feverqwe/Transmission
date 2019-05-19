import {flow, types} from "mobx-state-tree";
import ConfigStore from "./ConfigStore";
import getLogger from "../tools/getLogger";
import ClientStore from "./ClientStore";
import callApi from "../tools/callApi";
import FileListStore from "./FileListStore";
import TorrentListStore from "./TorrentListStore";
import PutFilesDialogStore from "./PutFilesDialogStore";
import CreateLabelDialogStore from "./CreateLabelDialogStore";
import RemoveConfirmDialogStore from "./RemoveConfirmDialogStore";
import PutUrlDialogStore from "./PutUrlDialogStore";
import SpaceWatcherStore from "./SpaceWatcherStore";

const logger = getLogger('RootStore');

let dialogIndex = 0;

/**
 * @typedef {Object} RootStore
 * @property {string} [state]
 * @property {ConfigStore|undefined} config
 * @property {ClientStore|undefined} client
 * @property {TorrentListStore} [torrentList]
 * @property {FileListStore|undefined} fileList
 * @property {SpaceWatcherStore|undefined} spaceWatcher
 * @property {Map<*,*>} dialogs
 * @property {function:Promise} init
 * @property {function} flushTorrentList
 * @property {function} createFileList
 * @property {function} destroyFileList
 * @property {function} createDialog
 * @property {function} destroyDialog
 * @property {function} createSpaceWatcher
 * @property {function} destroySpaceWatcher
 * @property {*} isPopup
 */
const RootStore = types.model('RootStore', {
  state: types.optional(types.enumeration(['idle', 'pending', 'done', 'error']), 'idle'),
  config: types.maybe(ConfigStore),
  client: types.maybe(ClientStore),
  torrentList: types.optional(TorrentListStore, {}),
  fileList: types.maybe(FileListStore),
  spaceWatcher: types.maybe(SpaceWatcherStore),
  dialogs: types.map(types.union(PutFilesDialogStore, PutUrlDialogStore, CreateLabelDialogStore, RemoveConfirmDialogStore)),
}).actions((self) => {
  return {
    init: flow(function* () {
      if (self.state === 'pending') return;
      self.state = 'pending';
      try {
        self.config = yield fetchConfig();
        self.client = yield fetchClient();
        self.state = 'done';
      } catch (err) {
        logger.error('init error', err);
        self.state = 'error';
      }
    }),
    flushTorrentList() {
      return self.torrentList = {};
    },
    createFileList(id) {
      return self.fileList = {id};
    },
    destroyFileList() {
      self.fileList = undefined;
    },
    createDialog(dialog) {
      const id = `dialog_${++dialogIndex}`;
      self.dialogs.set(id, Object.assign({id}, dialog));
      return self.dialogs.get(id);
    },
    destroyDialog(id) {
      self.dialogs.delete(id);
    },
    createSpaceWatcher() {
      self.spaceWatcher = {};
    },
    destroySpaceWatcher(id) {
      self.spaceWatcher = undefined;
    }
  };
}).views((self) => {
  return {
    get isPopup() {
      return location.hash === '#popup';
    }
  };
});

const fetchClient = () => {
  return callApi({
    action: 'getClientStore'
  });
};

const fetchConfig = () => {
  return callApi({
    action: 'getConfigStore'
  });
};

export default RootStore;