import {fetch as fetchPolyfill} from "whatwg-fetch";
import getLogger from "../tools/getLogger";
import ErrorWithCode from "../tools/errorWithCode";
import readBlobAsArrayBuffer from "../tools/readBlobAsArrayBuffer";
import arrayBufferToBase64 from "../tools/arrayBufferToBase64";
import arrayDifferent from "../tools/arrayDifferent";
import splitByPart from "../tools/splitByPart";
import downloadFileFromUrl from "../tools/downloadFileFromUrl";

const logger = getLogger('TransmissionClient');

class TransmissionClient {
  constructor(/**Bg*/bg) {
    this.bg = bg;

    this.torrentsResponseTime = 0;
    this.token = null;
    this.url = this.bgStore.config.url;
  }

  /**
   * @return {BgStore}
   */
  get bgStore() {
    return this.bg.bgStore;
  }

  updateTorrents(force) {
    const now = Math.trunc(Date.now() / 1000);

    let isRecently = false;
    if (!force && now - this.torrentsResponseTime < 60) {
      isRecently = true;
    }

    return this.sendAction({
      method: 'torrent-get',
      arguments: {
        fields: [
          'id', 'name', 'totalSize',
          'percentDone', 'downloadedEver', 'uploadedEver',
          'rateUpload', 'rateDownload', 'eta',
          'peersSendingToUs', 'peersGettingFromUs', 'queuePosition',
          'addedDate', 'doneDate', 'downloadDir',
          'recheckProgress', 'status', 'error',
          'errorString', 'trackerStats', 'magnetLink'
        ],
        ids: isRecently ? 'recently-active' : undefined
      }
    }, safeParser).then((response) => {
      this.torrentsResponseTime = now;
      const previousActiveTorrentIds = this.bgStore.client.activeTorrentIds;

      if (isRecently) {
        const {removed, torrents} = response.arguments;

        this.bgStore.client.removeTorrentByIds(removed);

        this.bgStore.client.syncChanges(torrents.map(this.normalizeTorrent));
      } else {
        const {torrents} = response.arguments;

        this.bgStore.client.sync(torrents.map(this.normalizeTorrent));
      }

      if (this.bgStore.config.showDownloadCompleteNotifications) {
        const activeTorrentIds = this.bgStore.client.activeTorrentIds;
        arrayDifferent(previousActiveTorrentIds, activeTorrentIds).forEach((torrentId) => {
          // not active anymore
          const torrent = this.bgStore.client.torrents.get(torrentId);
          if (torrent) {
            this.bg.torrentCompleteNotify(torrent);
          }
        });
      }

      const {downloadSpeed, uploadSpeed} = this.bgStore.client.currentSpeed;
      this.bgStore.client.speedRoll.add(downloadSpeed, uploadSpeed);

      return response;
    });

    function safeParser(text) {
      try {
        return JSON.parse(text);
      } catch (err) {
        return JSON.parse(text.replace(/"(announce|scrape|lastAnnounceResult|lastScrapeResult)":"([^"]+)"/g, safeValue));
      }
    }

    function safeValue(match, key, value) {
      try {
        JSON.parse(`"${value}"`);
      } catch (err) {
        value = encodeURIComponent(value);
      }
      return `"${key}":"${value}"`;
    }
  }

  getFileList(id) {
    return this.sendAction({
      method: 'torrent-get',
      arguments: {
        fields: ["id", 'files', 'fileStats'],
        ids: [id]
      }
    }).then((response) => {
      let files = null;
      response.arguments.torrents.some((torrent) => {
        if (torrent.id === id) {
          return files = this.normalizeFiles(torrent);
        }
      });

      if (!files) {
        throw new ErrorWithCode('Files don\'t received');
      }
      return files;
    });
  }

  getSettings() {
    return this.sendAction({method: 'session-get'}).then((response) => {
      this.bgStore.client.setSettings(this.normalizeSettings(response.arguments));
    });
  }

  getFreeSpace(path) {
    return this.sendAction({
      method: "free-space",
      arguments: {path}
    }).then((response) => {
      return {
        path: response.arguments.path,
        sizeBytes: response.arguments['size-bytes'],
      };
    });
  }

  sendAction(body, customParser) {
    return this.retryIfTokenInvalid(() => {
      return fetchPolyfill(this.url, this.sign({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Transmission-Session-Id': this.token
        },
        body: JSON.stringify(body),
      })).then((response) => {
        if (!response.ok) {
          const error = new ErrorWithCode(`${response.status}: ${response.statusText}`, `RESPONSE_IS_NOT_OK`);
          error.status = response.status;
          error.statusText = response.statusText;
          if (error.status === 409) {
            error.token = response.headers.get('X-Transmission-Session-Id');
            error.code = 'INVALID_TOKEN';
          }
          throw error;
        }

        if (!this.bg.daemon.isActive) {
          this.bg.daemon.start();
        }

        if (customParser) {
          return response.text().then(text => customParser(text));
        } else {
          return response.json();
        }
      });
    }).then((response) => {
      if (response.result !== 'success') {
        throw new ErrorWithCode(response.result, 'TRANSMISSION_ERROR');
      }

      return response;
    });
  }

  sendFile({blob, url}, directory) {
    return Promise.resolve().then(() => {
      if (url) {
        return this.sendAction(putDirectory({
          method: 'torrent-add',
          arguments: {
            filename: url
          }
        }));
      } else {
        return readBlobAsArrayBuffer(blob).then(ab => arrayBufferToBase64(ab)).then((base64) => {
          return this.sendAction(putDirectory({
            method: 'torrent-add',
            arguments: {
              metainfo: base64
            }
          }));
        });
      }
    }).catch((err) => {
      if (err.code === 'TRANSMISSION_ERROR') {
        this.bg.torrentErrorNotify(err.message);
      } else {
        this.bg.torrentErrorNotify(chrome.i18n.getMessage('unexpectedError'));
      }
      throw err;
    });

    function putDirectory(query) {
      if (directory) {
        query.arguments['download-dir'] = directory.path;
      }
      return query;
    }
  }

  putTorrent({blob, url}, directory) {
    return this.sendFile({blob, url}, directory).then((response) => {
      const {'torrent-added': torrentAdded, 'torrent-duplicate': torrentDuplicate} = response.arguments;
      if (torrentAdded) {
        this.bg.torrentAddedNotify(torrentAdded);
      }

      if (torrentDuplicate) {
        this.bg.torrentIsExistsNotify(torrentDuplicate);
      }
    }, (err) => {
      if (err.code === 'TRANSMISSION_ERROR') {
        this.bg.torrentErrorNotify(err.message);
      } else {
        this.bg.torrentErrorNotify(chrome.i18n.getMessage('unexpectedError'));
      }
      throw err;
    });
  }

  start(ids) {
    return this.sendAction({
      method: 'torrent-start',
      arguments: {
        ids,
      }
    });
  }

  forcestart(ids) {
    return this.sendAction({
      method: 'torrent-start-now',
      arguments: {
        ids,
      }
    });
  }

  stop(ids) {
    return this.sendAction({
      method: 'torrent-stop',
      arguments: {
        ids,
      }
    });
  }

  recheck(ids) {
    return this.sendAction({
      method: 'torrent-verify',
      arguments: {
        ids,
      }
    });
  }

  removetorrent(ids) {
    return this.sendAction({
      method: 'torrent-remove',
      arguments: {
        ids,
      }
    });
  }

  removedatatorrent(ids) {
    return this.sendAction({
      method: 'torrent-remove',
      arguments: {
        ids,
        'delete-local-data': true
      }
    });
  }

  rename(ids, path, name) {
    return this.sendAction({
      method: 'torrent-rename-path',
      arguments: {ids, path, name}
    });
  }

  torrentSetLocation(ids, location) {
    return this.sendAction({
      method: 'torrent-set-location',
      arguments: {
        ids,
        location,
        move: true
      }
    });
  }

  reannounce(ids) {
    return this.sendAction({
      method: 'torrent-reannounce',
      arguments: {ids}
    });
  }

  queueTop(ids) {
    return this.sendAction({
      method: 'queue-move-top',
      arguments: {ids}
    });
  }

  queueUp(ids) {
    return this.sendAction({
      method: 'queue-move-up',
      arguments: {ids}
    });
  }

  queueDown(ids) {
    return this.sendAction({
      method: 'queue-move-down',
      arguments: {ids}
    });
  }

  queueBottom(ids) {
    return this.sendAction({
      method: 'queue-move-bottom',
      arguments: {ids}
    });
  }

  setPriority(id, level, idxs) {
    return Promise.all(splitByPart(idxs, 250).map((idxs) => {
      const args = {
        ids: [id]
      };

      if (level === 0) {
        args['files-unwanted'] = idxs;
      } else {
        args['files-wanted'] = idxs;
        switch (level) {
          case 1: {
            args['priority-low'] = idxs;
            break;
          }
          case 2: {
            args['priority-normal'] = idxs;
            break;
          }
          case 3: {
            args['priority-high'] = idxs;
            break;
          }
        }
      }

      return this.sendAction({
        method: 'torrent-set',
        arguments: args
      });
    }));
  }

  setDownloadSpeedLimitEnabled(enabled) {
    return this.sendAction({
      method: 'session-set',
      arguments: {
        'speed-limit-down-enabled': enabled
      }
    }).then(() => {
      return this.getSettings();
    });
  }

  setDownloadSpeedLimit(speed) {
    return this.sendAction({
      method: 'session-set',
      arguments: {
        'speed-limit-down-enabled': true,
        'speed-limit-down': speed
      }
    }).then(() => {
      return this.getSettings();
    });
  }

  setUploadSpeedLimitEnabled(enabled) {
    return this.sendAction({
      method: 'session-set',
      arguments: {
        'speed-limit-up-enabled': enabled
      }
    }).then(() => {
      return this.getSettings();
    });
  }

  setUploadSpeedLimit(speed) {
    return this.sendAction({
      method: 'session-set',
      arguments: {
        'speed-limit-up-enabled': true,
        'speed-limit-up': speed
      }
    }).then(() => {
      return this.getSettings();
    });
  }

  setAltSpeedEnabled(enabled) {
    return this.sendAction({
      method: 'session-set',
      arguments: {
        'alt-speed-enabled': enabled
      }
    }).then(() => {
      return this.getSettings();
    });
  }

  setAltDownloadSpeedLimit(speed) {
    return this.sendAction({
      method: 'session-set',
      arguments: {
        'alt-speed-enabled': true,
        'alt-speed-down': speed
      }
    }).then(() => {
      return this.getSettings();
    });
  }

  setAltUploadSpeedLimit(speed) {
    return this.sendAction({
      method: 'session-set',
      arguments: {
        'alt-speed-enabled': true,
        'alt-speed-up': speed
      }
    }).then(() => {
      return this.getSettings();
    });
  }

  sendFiles(urls, directory) {
    return Promise.all(urls.map((url) => {
      return downloadFileFromUrl(url).catch((err) => {
        if (err.code === 'FILE_SIZE_EXCEEDED') {
          this.bg.torrentErrorNotify(chrome.i18n.getMessage('fileSizeError'));
          throw err;
        }
        if (!/^https?:/.test(url)) {
          this.bg.torrentErrorNotify(chrome.i18n.getMessage('unexpectedError'));
          throw err;
        }
        if (err.code !== 'LINK_IS_NOT_SUPPORTED') {
          logger.error('sendFiles: downloadFileFromUrl error, fallback to url', err);
        }
        return {url};
      }).then((data) => {
        return this.putTorrent(data, directory);
      }).then(() => {
        return {result: true};
      }, (err) => {
        logger.error('sendFile error', url, err);
        return {error: err};
      });
    }));
  }

  retryIfTokenInvalid(callback) {
    return Promise.resolve(callback()).catch((err) => {
      if (err.code === 'INVALID_TOKEN') {
        this.token = err.token;
        return callback();
      }
      throw err;
    });
  }

  sign(fetchOptions = {}) {
    if (this.bgStore.config.authenticationRequired) {
      if (!fetchOptions.headers) {
        fetchOptions.headers = {};
      }
      fetchOptions.headers.Authorization = 'Basic ' + btoa([this.bgStore.config.login, this.bgStore.config.password].join(':'));
    }
    return fetchOptions;
  }

  normalizeTorrent = (torrent) => {
    const id = torrent.id;
    const statusCode = torrent.status;
    const errorCode = torrent.error;
    const errorString = torrent.errorString;
    const name = torrent.name;
    const size = torrent.totalSize;
    const percentDone = torrent.percentDone;
    const recheckProgress = torrent.recheckProgress;
    const downloaded = torrent.downloadedEver;
    const uploaded = torrent.uploadedEver;
    const shared = torrent.downloadedEver > 0 ? Math.round(torrent.uploadedEver / torrent.downloadedEver * 1000) : 0;
    const uploadSpeed = torrent.rateUpload;
    const downloadSpeed = torrent.rateDownload;
    const eta = torrent.eta < 0 ? 0 : torrent.eta;

    let _peers = 0;
    let _seeds = 0;
    Array.isArray(torrent.trackerStats) && torrent.trackerStats.forEach((tracker) => {
      if (tracker.leecherCount > 0) {
        _peers += tracker.leecherCount;
      }
      if (tracker.seederCount > 0) {
        _seeds += tracker.seederCount;
      }
    });

    const activePeers = torrent.peersGettingFromUs;
    const peers = _peers;
    const activeSeeds = torrent.peersSendingToUs;
    const seeds = _seeds;

    const order = torrent.queuePosition;
    const addedTime = torrent.addedDate;
    const completedTime = torrent.doneDate;
    const directory = torrent.downloadDir;
    const magnetLink = torrent.magnetLink;

    return {
      id, statusCode, errorCode, errorString,
      name, size, percentDone,
      recheckProgress, downloaded, uploaded, shared,
      uploadSpeed, downloadSpeed, eta,
      activePeers, peers, activeSeeds, seeds,
      order, addedTime, completedTime, directory,
      magnetLink
    };
  };

  normalizeFiles = (torrent) => {
    return torrent.files.map((file, index) => {
      const state = torrent.fileStats[index];

      const name = file.name;
      const shortName = name;
      const size = file.length;
      const downloaded = file.bytesCompleted;
      const priority = !state.wanted ? 0 : state.priority + 2;

      return {name, shortName, size, downloaded, priority};
    });
  };

  normalizeSettings = (settings) => {
    return {
      downloadSpeedLimit: settings['speed-limit-down'],
      downloadSpeedLimitEnabled: settings['speed-limit-down-enabled'],
      uploadSpeedLimit: settings['speed-limit-up'],
      uploadSpeedLimitEnabled: settings['speed-limit-up-enabled'],
      altSpeedEnabled: settings['alt-speed-enabled'],
      altDownloadSpeedLimit: settings['alt-speed-down'],
      altUploadSpeedLimit: settings['alt-speed-up'],
      downloadDir: settings['download-dir'],
      downloadDirFreeSpace: settings['download-dir-free-space'],
    };
  };

  destroy() {

  }
}

export default TransmissionClient;