import {flow, types} from "mobx-state-tree";
import ConfigStore, {configKeys, defaultFileListColumnList, defaultTorrentListColumnList} from "./ConfigStore";
import getLogger from "../tools/getLogger";
import loadConfig from "../tools/loadConfig";
import ClientStore from "./ClientStore";
import mergeColumns from "../tools/mergeColumns";
import MobxPatchLine from "../tools/mobxPatchLine";

const logger = getLogger('BgStore');

/**
 * @typedef {Object} BgStore
 * @property {ConfigStore|undefined} config
 * @property {ClientStore} [client]
 * @property {function:Promise} fetchConfig
 * @property {function} flushClient
 * @property {function} createPatchLine
 * @property {*} clientPatchLine
 * @property {function} afterCreate
 */
const BgStore = types.model('BgStore', {
  config: types.maybe(ConfigStore),
  client: types.optional(ClientStore, {}),
}).actions((self) => {
  return {
    fetchConfig: flow(function* () {
      try {
        const config = yield loadConfig(configKeys);

        [
          ['filesColumns', defaultFileListColumnList],
          ['torrentColumns', defaultTorrentListColumnList]
        ].forEach(([key, defColumns]) => {
          if (config[key]) {
            try {
              mergeColumns(config[key], defColumns);
            } catch (err) {
              logger.error(`mergeColumns ${key} error, use default`, err);
            }
          }
        });

        self.config = {};
        Object.entries(config).forEach(([key, value]) => {
          try {
            self.config[key] = value;
          } catch (err) {
            logger.error(`fetchConfig key (${key}) error, use default value`, err);
          }
        });
      } catch (err) {
        logger.error('fetchConfig error, use default config', err);
      }
    }),
    flushClient() {
      self.client = ClientStore.create();
      self.createPatchLine();
    }
  };
}).views((self) => {
  let clientPatchLine = null;

  return {
    createPatchLine() {
      if (clientPatchLine) {
        clientPatchLine.destroy();
      }
      clientPatchLine = new MobxPatchLine(self.client);
    },
    get clientPatchLine() {
      return clientPatchLine;
    },
    afterCreate() {
      self.createPatchLine();
    }
  };
});

export default BgStore;