import "whatwg-fetch";
import ErrorWithCode from "../tools/errorWithCode";
import utFixCyrillic from "../tools/utFixCyrillic";
import getLogger from "../tools/getLogger";
import queryStringify from "../tools/utQueryStringify";
import splitByPart from "../tools/splitByPart";

const logger = getLogger('UTorrentClient');

const utSettingMap = {
  max_dl_rate: 'downloadSpeedLimit',
  max_ul_rate: 'uploadSpeedLimit',
};

class UTorrentClient {
  constructor(/**Bg*/bg) {
    this.bg = bg;

    this.token = null;
    this.cid = null;
    this.url = this.bgStore.config.url;
    this.tokenUrl = new URL('token.html', this.url).toString();
  }

  /**
   * @return {BgStore}
   */
  get bgStore() {
    return this.bg.bgStore;
  }

  updateTorrents() {
    const params = {
      list: 1
    };
    if (this.cid) {
      params.cid = this.cid;
    }
    return this.sendAction(params).then((result) => {
      this.cid = result.cid;
    });
  }

  getFileList(id) {
    return this.sendAction({action: 'getfiles', hash: id}).then((result) => {
      const files = result.files[id];
      if (!files) {
        throw new ErrorWithCode('Files don\'t received');
      }
      return files;
    });
  }

  getSettings() {
    return this.sendAction({action: 'getsettings'});
  }

  getDownloadDirs() {
    return this.sendAction({action: 'list-dirs'});
  }

  sendAction(query, body) {
    return this.retryIfTokenInvalid((token) => {
      const params = queryStringify(Object.assign({token}, query), this.bgStore.config.fixCyrillicDownloadPath);

      const init = {};
      if (body) {
        init.method = 'POST';
        init.body = body;
      }

      return fetch(this.url + '?' + params, this.sign(init)).then((response) => {
        // 300 for utorrent 1.8
        if (!response.ok || response.status === 300) {
          const error = new ErrorWithCode(`${response.status}: ${response.statusText}`, `RESPONSE_IS_NOT_OK`);
          error.status = response.status;
          error.statusText = response.statusText;
          if (error.status === 400) {
            error.code = 'INVALID_TOKEN';
          }
          throw error;
        }

        if (!this.bg.daemon.isActive) {
          this.bg.daemon.start();
        }

        if (this.bgStore.config.fixCyrillicTorrentName) {
          return response.text().then((body) => {
            return JSON.parse(utFixCyrillic(body));
          });
        } else {
          return response.json();
        }
      });
    }).then(this.normalizeResponse);
  }

  sendFile({blob, url}, directory) {
    return Promise.resolve().then(() => {
      if (url) {
        return this.sendAction(putDirectory({
          action: 'add-url',
          s: url
        }));
      } else {
        const formData = new FormData();
        formData.append("torrent_file", blob);

        return this.sendAction(putDirectory({
          action: 'add-file',
        }), formData);
      }
    }).catch((err) => {
      if (err.code === 'UTORRENT_ERROR') {
        this.bg.torrentErrorNotify(err.message);
      } else {
        this.bg.torrentErrorNotify(chrome.i18n.getMessage('unexpectedError'));
      }
      throw err;
    });

    function putDirectory(query) {
      if (directory) {
        query.download_dir = directory.volume;
        query.path = directory.path;
      }
      return query;
    }
  }

  putTorrent({blob, url}, directory, label) {
    return this.sendAction({list: 1}).then((result) => {
      const cid = result.cid;
      const previousTorrentIds = this.bgStore.client.torrentIds;

      return this.sendFile({blob, url}, directory).then(() => {
        return this.sendAction({list: 1, cid});
      }).then(() => {
        const torrentIds = this.bgStore.client.torrentIds;
        const newIds = arrayDifferent(torrentIds, previousTorrentIds);
        if (!newIds.length) {
          this.bg.torrentExistsNotify();
        } else {
          return Promise.all(newIds.map((torrentId) => {
            // new
            const torrent = this.bgStore.client.torrents.get(torrentId);
            if (torrent) {
              this.bg.torrentAddedNotify(torrent);

              if (label && !torrent.label) {
                return this.sendAction({action: 'setprops', s: 'label', hash: torrent.id, v: label}).catch((err) => {
                  logger.error('Set torrent label error', torrent.id, err);
                });
              }
            }
          }));
        }
      });
    }, (err) => {
      this.bg.torrentErrorNotify(chrome.i18n.getMessage('unexpectedError'));
      throw err;
    });
  }

  start(ids) {
    return this.sendAction({list: 1, cid: this.cid, action: 'start', hash: ids});
  }

  forcestart(ids) {
    return this.sendAction({list: 1, cid: this.cid, action: 'forcestart', hash: ids});
  }

  unpause(ids) {
    return this.sendAction({list: 1, cid: this.cid, action: 'unpause', hash: ids});
  }

  pause(ids) {
    return this.sendAction({list: 1, cid: this.cid, action: 'pause', hash: ids});
  }

  stop(ids) {
    return this.sendAction({list: 1, cid: this.cid, action: 'stop', hash: ids});
  }

  recheck(ids) {
    return this.sendAction({list: 1, cid: this.cid, action: 'recheck', hash: ids});
  }

  remove(ids) {
    return this.sendAction({list: 1, cid: this.cid, action: 'remove', hash: ids});
  }

  async removetorrent(ids) {
    if (!ids.length) return;

    return this.sendAction({list: 1, cid: this.cid, action: 'removetorrent', hash: ids});
  }

  removedata(ids) {
    return this.sendAction({list: 1, cid: this.cid, action: 'removedata', hash: ids});
  }

  async removedatatorrent(ids) {
    if (!ids.length) return;

    return this.sendAction({list: 1, cid: this.cid, action: 'removedatatorrent', hash: ids});
  }

  queueUp(ids) {
    return this.sendAction({list: 1, cid: this.cid, action: 'queueup', hash: ids});
  }

  queueDown(ids) {
    return this.sendAction({list: 1, cid: this.cid, action: 'queuedown', hash: ids});
  }

  setLabel(ids, label = '') {
    return this.sendAction({list: 1, cid: this.cid, action: 'setprops', s: 'label', hash: ids, v: label});
  }

  setPriority(id, level, idxs) {
    return Promise.all(splitByPart(idxs, 500).map((idxs) => {
      return this.sendAction({action: 'setprio', p: level, hash: id, f: idxs});
    }));
  }

  setDownloadSpeedLimit(speed) {
    return this.sendAction({action: 'setsetting', s: 'max_dl_rate', v: speed}).then(() => {
      return this.getSettings();
    });
  }

  setUploadSpeedLimit(speed) {
    return this.sendAction({action: 'setsetting', s: 'max_ul_rate', v: speed}).then(() => {
      return this.getSettings();
    });
  }

  sendFiles(urls, directory, label) {
    return Promise.all(urls.map((url) => {
      return Promise.resolve().then(() => {
        if (!/^blob:/.test(url)) {
          return {url};
        }

        return fetch(url).then(response => {
          if (!response.ok) {
            throw new ErrorWithCode(`${response.status}: ${response.statusText}`, `RESPONSE_IS_NOT_OK`);
          }

          if (response.headers.get('Content-Length') > 1024 * 1024 * 10) {
            throw new ErrorWithCode(`Size is more then 10mb`, 'FILE_SIZE_EXCEEDED');
          }

          return response.blob();
        }).then((blob) => {
          URL.revokeObjectURL(url);
          return {blob};
        }, (err) => {
          if (err.code === 'FILE_SIZE_EXCEEDED') {
            this.bg.torrentErrorNotify(chrome.i18n.getMessage('fileSizeError'));
          } else {
            this.bg.torrentErrorNotify(chrome.i18n.getMessage('unexpectedError'));
          }
          throw err;
        });
      }).then((data) => {
        return this.putTorrent(data, directory, label);
      }).then(() => {
        return {result: true};
      }, (err) => {
        logger.error('sendFile error', url, err);
        return {error: err};
      });
    }));
  }

  retryIfTokenInvalid(callback) {
    return this.getValidToken().then(callback).catch((err) => {
      if (err.code === 'INVALID_TOKEN') {
        this.token = null;
        return this.getValidToken().then(callback);
      }
      throw err;
    });
  }

  getValidToken() {
    return Promise.resolve().then(() => {
      if (!this.token) {
        return this.requestToken().then((token) => {
          return this.token = token;
        });
      }
      return this.token;
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

  requestToken() {
    const init = this.sign();
    return fetch(this.tokenUrl, init).then((response) => {
      if (!response.ok) {
        const error = new ErrorWithCode(`${response.status}: ${response.statusText}`, `RESPONSE_IS_NOT_OK`);
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }
      return response.text();
    }).then((body) => {
      const m = />([^<]+)</.exec(body);
      if (!m) {
        throw new ErrorWithCode('Token not found', 'TOKEN_NOT_FOUND');
      }
      return m[1];
    });
  }

  normalizeResponse = (response) => {
    const previousActiveTorrentIds = this.bgStore.client.activeTorrentIds;

    const result = {};

    if (response.error) {
      throw new ErrorWithCode(response.error, 'UTORRENT_ERROR');
    }

    if (response.torrentc) {
      result.cid = response.torrentc;
    }

    if (response.torrentm) {
      // Removed torrents
      result.removedTorrentIds = response.torrentm;
      this.bgStore.client.removeTorrentByIds(result.removedTorrentIds);
    }

    let torrentsChanged = false;
    if (response.torrentp) {
      // sync part of list
      result.changedTorernts = response.torrentp.map(this.normalizeTorrent);
      this.bgStore.client.syncChanges(result.changedTorernts);
      torrentsChanged = true;
    }

    if (response.torrents) {
      // sync full list
      result.torrents = response.torrents.map(this.normalizeTorrent);
      this.bgStore.client.sync(result.torrents);
      torrentsChanged = true;
    }

    if (response.label) {
      // labels
      result.labels = response.label.map(this.normalizeLabel);
      this.bgStore.client.setLabels(result.labels);
    }

    if (response.settings) {
      // settings
      result.settings = this.normalizeSettings(response.settings);
      this.bgStore.client.setSettings(result.settings);
    }

    if (response['download-dirs']) {
      // downlaod dirs
      result.downloadDirs = this.normalizeDownloadDirs(response['download-dirs']);
    }

    if (response.files) {
      const [torrentId, files] = response.files;
      result.files = {
        [torrentId]: files.map(this.normalizeFile)
      };
      // this.bgStore.client.setFileList(torrentId, files.map(this.normalizeFile));
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

    if (torrentsChanged) {
      const {downloadSpeed, uploadSpeed} = this.bgStore.client.currentSpeed;
      this.bgStore.client.speedRoll.add(downloadSpeed, uploadSpeed);
    }

    return result;
  };

  normalizeTorrent = (torrent) => {
    const id = torrent[0];
    const state = torrent[1];
    const name = torrent[2];
    const size = torrent[3];
    const progress = torrent[4];
    const downloaded = torrent[5];
    const uploaded = torrent[6];
    const shared = torrent[7];
    const uploadSpeed = torrent[8];
    const downloadSpeed = torrent[9];
    const eta = torrent[10];
    const label = torrent[11];
    const activePeers = torrent[12];
    const peers = torrent[13];
    const activeSeeds = torrent[14];
    const seeds = torrent[15];
    const available = torrent[16];
    const order = torrent[17];
    const status = torrent[21];
    const sid = torrent[22];
    const addedTime = torrent[23];
    const completedTime = torrent[24];
    const directory = torrent[26];

    return {
      id, state, name, size, progress,
      downloaded, uploaded, shared, uploadSpeed, downloadSpeed,
      eta, label, activePeers, peers, activeSeeds,
      seeds, available, order, status, sid,
      addedTime, completedTime, directory
    };
  };

  normalizeFile = (file) => {
    const name = file[0];
    const size = file[1];
    const downloaded = file[2];
    const priority = file[3];

    return {name, size, downloaded, priority};
  };

  normalizeLabel = (label) => {
    const name = label[0];

    return {name};
  };

  normalizeSettings = (settings) => {
    const result = {};
    settings.forEach(([key, type, value]) => {
      // type 0 - integer, 1 - bool, 2 - string
      if (key === 'max_dl_rate' || key === 'max_ul_rate') {
        const localKey = utSettingMap[key] || key;
        result[localKey] = utSettingParse(type, value);
      }
    });
    return result;
  };

  normalizeDownloadDirs = (downloadDirs) => {
    const result = [];
    downloadDirs.forEach(({available, path}) => {
      result.push({
        path,
        available: parseInt(available, 10),
      });
    });
    return result;
  };

  destroy() {

  }
}

function utSettingParse(type, value) {
  switch (type) {
    case 0: {
      return parseInt(value, 10);
    }
    case 1: {
      return value === 'true';
    }
    case 2: {
      return value;
    }
  }
}

function arrayDifferent(prev, current) {
  return prev.filter(i => current.indexOf(i) === -1);
}

export default UTorrentClient;