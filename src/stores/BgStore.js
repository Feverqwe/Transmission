import {flow, types} from "mobx-state-tree";
import ConfigStore from "./ConfigStore";
import getLogger from "../tools/getLogger";
import loadConfig, {defaultConfig} from "../tools/loadConfig";
import ClientStore from "./ClientStore";

const logger = getLogger('BgStore');

/**
 * @typedef {Object} BgStore
 * @property {ConfigStore|undefined} config
 * @property {ClientStore} [client]
 * @property {function:Promise} fetchConfig
 * @property {function} flushClient
 */
const BgStore = types.model('BgStore', {
  config: types.maybe(ConfigStore),
  client: types.optional(ClientStore, {}),
}).actions((self) => {
  return {
    fetchConfig: flow(function* () {
      try {
        const config = yield loadConfig();
        self.config = {};
        Object.entries(config).forEach(([key, value]) => {
          try {
            self.config[key] = value;
          } catch (err) {
            logger.error(`fetchConfig key (${key}) error, use default value`, err);
            if (defaultConfig[key]) {
              self.config[key] = defaultConfig[key];
            }
          }
        });
      } catch (err) {
        logger.error('fetchConfig error, use default config', err);
        self.config = defaultConfig;
      }
    }),
    flushClient() {
      self.client = ClientStore.create();
    }
  };
}).views((self) => {
  return {};
});

export default BgStore;