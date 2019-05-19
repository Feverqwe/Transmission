import getLogger from "../tools/getLogger";
import UTorrentClient from "./uTorrentClient";
import Daemon from "./daemon";
import ContextMenu from "./contextMenu";
import BgStore from "../stores/BgStore";
import {autorun} from "mobx";

const serializeError = require('serialize-error');
const logger = getLogger('background');

const notificationIcons = {
  complete: require('!file-loader!../assets/img/notification_done.png'),
  add: require('!file-loader!../assets/img/notification_add.png'),
  error: require('!file-loader!../assets/img/notification_error.png')
};

class Bg {
  constructor() {
    /**@type BgStore*/
    this.bgStore = BgStore.create();
    this.client = null;
    this.daemon = null;
    this.contextMenu = null;

    this.initPromise = null;

    this.init().catch((err) => {
      logger.error('init error', err);
    });
  }

  init() {
    chrome.runtime.onMessage.addListener(this.handleMessage);
    this.daemon = new Daemon(this);
    this.contextMenu = new ContextMenu(this);

    return this.initPromise = this.bgStore.fetchConfig().then(() => {
      const logger = getLogger('autorun');

      autorun(() => {
        logger.info('daemon');
        this.daemon.start();
      });

      autorun(() => {
        logger.info('client');
        const dep = [
          this.bgStore.config.ssl,
          this.bgStore.config.port,
          this.bgStore.config.hostname,
          this.bgStore.config.pathname,
          this.bgStore.config.authenticationRequired,
          this.bgStore.config.fixCyrillicTorrentName
        ];

        if (dep.length) {
          this.bgStore.flushClient();
          this.client = new UTorrentClient(this);
          this.client.getSettings().catch((err) => {
            logger.error('client', 'getSettings error', err);
          });
          this.client.updateTorrents().catch((err) => {
            logger.error('client', 'updateTorrents error', err);
          });
        }
      });

      autorun(() => {
        logger.info('badge');
        if (this.bgStore.config.showActiveCountBadge) {
          const count = this.bgStore.client.activeCount;
          if (count > 0) {
            setBadgeText('' + count);
          } else {
            setBadgeText('');
          }
        } else {
          setBadgeText('');
        }
      });

      autorun(() => {
        logger.info('badgeColor');
        setBadgeBackgroundColor(this.bgStore.config.badgeColor);
      });

      autorun(() => {
        logger.info('contextMenu');
        const dep = [
          this.bgStore.config.folders.length,
          this.bgStore.config.labels.length,
          this.bgStore.config.contextMenuType,
          this.bgStore.config.treeViewContextMenu,
          this.bgStore.config.putDefaultPathInContextMenu
        ];

        if (dep.length) {
          this.contextMenu.create();
        }
      });
    });
  }

  whenReady() {
    return this.initPromise;
  }

  handleMessage = (message, sender, response) => {
    let promise = null;

    switch (message && message.action) {
      case 'getClientStore': {
        promise = this.whenReady().then(() => {
          return this.bgStore.client.toJSON();
        });
        break;
      }
      case 'getConfigStore': {
        promise = this.whenReady().then(() => {
          return this.bgStore.config.toJSON();
        });
        break;
      }
      case 'updateTorrentList': {
        promise = this.whenReady().then(() => {
          return this.client.updateTorrents().then(() => {
            return this.bgStore.client.getSnapshot();
          });
        });
        break;
      }
      case 'start': {
        promise = this.client.start(message.ids);
        break;
      }
      case 'forcestart': {
        promise = this.client.forcestart(message.ids);
        break;
      }
      case 'unpause': {
        promise = this.client.unpause(message.ids);
        break;
      }
      case 'pause': {
        promise = this.client.pause(message.ids);
        break;
      }
      case 'stop': {
        promise = this.client.stop(message.ids);
        break;
      }
      case 'recheck': {
        promise = this.client.recheck(message.ids);
        break;
      }
      case 'remove': {
        promise = this.client.remove(message.ids);
        break;
      }
      case 'removetorrent': {
        promise = this.client.removetorrent(message.ids);
        break;
      }
      case 'removedata': {
        promise = this.client.removedata(message.ids);
        break;
      }
      case 'removedatatorrent': {
        promise = this.client.removedatatorrent(message.ids);
        break;
      }
      case 'queueUp': {
        promise = this.client.queueUp(message.ids);
        break;
      }
      case 'queueDown': {
        promise = this.client.queueDown(message.ids);
        break;
      }
      case 'setLabel': {
        promise = this.client.setLabel(message.ids, message.label);
        break;
      }
      case 'setPriority': {
        promise = this.client.setPriority(message.id, message.level, message.fileIdxs);
        break;
      }
      case 'getFileList': {
        promise = this.client.getFileList(message.id);
        break;
      }
      case 'setDownloadSpeedLimit': {
        promise = this.whenReady().then(() => {
          return this.client.setDownloadSpeedLimit(message.speed);
        });
        break;
      }
      case 'setUploadSpeedLimit': {
        promise = this.whenReady().then(() => {
          return this.client.setUploadSpeedLimit(message.speed);
        });
        break;
      }
      case 'getSettings': {
        promise = this.whenReady().then(() => {
          return this.client.getSettings();
        });
        break;
      }
      case 'sendFiles': {
        promise = this.whenReady().then(() => {
          return this.client.sendFiles(message.urls, message.directory, message.label);
        });
        break;
      }
      case 'getDownloadDirs': {
        promise = this.whenReady().then(() => {
          return this.client.getDownloadDirs();
        });
        break;
      }
      default: {
        promise = Promise.reject(new Error('Unknown request'));
      }
    }

    if (promise) {
      promise.then((result) => {
        response({result});
      }, (err) => {
        response({error: serializeError(err)});
      }).catch((err) => {
        logger.error('Send response error', err);
      });
      return true;
    }
  };

  torrentAddedNotify(torrent) {
    const icon = notificationIcons.add;
    const statusText = chrome.i18n.getMessage('torrentAdded');
    showNotification(torrent.id, icon, torrent.name, statusText);
  }

  torrentExistsNotify() {
    const icon = notificationIcons.error;
    const title = chrome.i18n.getMessage('torrentFileExists');
    showNotification(null, icon, title);
  }

  torrentCompleteNotify(torrent) {
    const icon = notificationIcons.complete;
    let statusText = '';
    if (torrent.status) {
      statusText = chrome.i18n.getMessage('OV_COL_STATUS') + ': ' + torrent.status;
    }
    showNotification(torrent.id, icon, torrent.name, statusText);
  }

  torrentErrorNotify(message) {
    const icon = notificationIcons.error;
    const title = chrome.i18n.getMessage('OV_FL_ERROR');
    showNotification(null, icon, title, message);
  }
}

function setBadgeText(text) {
  chrome.browserAction.setBadgeText({
    text: text
  });
}

function showNotification(id, iconUrl, title = '', message = '') {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: iconUrl,
    title: title,
    message: message
  });
}

function setBadgeBackgroundColor(color) {
  const colors = color.split(',').map(i => parseFloat(i));
  if (colors.length === 4) {
    colors.push(parseInt(255 * colors.pop(), 10));
  }
  chrome.browserAction.setBadgeBackgroundColor({
    color: colors
  });
}

const bg = window.bg = new Bg();

export default bg;