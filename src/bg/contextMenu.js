import "whatwg-fetch";
import getLogger from "../tools/getLogger";
import downloadFileFromTab from "../tools/downloadFileFromTab";
import isFirefox from "../tools/isFirefox";

const path = require('path');
const promiseLimit = require('promise-limit');

const logger = getLogger('ContextMenu');
const oneThread = promiseLimit(1);

class ContextMenu {
  constructor(/**Bg*/bg) {
    this.bg = bg;

    this.bindClick();
  }

  /**
   * @return {BgStore}
   */
  get bgStore() {
    return this.bg.bgStore;
  }

  bindClick() {
    if (!chrome.contextMenus.onClicked.hasListener(this.handleClick)) {
      chrome.contextMenus.onClicked.addListener(this.handleClick);
    }
  }

  onCreateFolder() {
    if (isFirefox()) {
      chrome.tabs.create({url: '/options.html#/ctx'});
      return;
    }

    const firstFolder = this.bg.bgStore.config.folders[0];
    const volume = firstFolder.volume;
    const path = prompt(chrome.i18n.getMessage('enterNewDirPath'), firstFolder.path);
    if (path) {
      if (!this.bg.bgStore.config.hasFolder(volume, path)) {
        this.bg.bgStore.config.addFolder(volume, path);
      }
    }
  }

  onCreateLabel() {
    if (isFirefox()) {
      chrome.tabs.create({url: '/options.html#/ctx'});
      return;
    }

    const label = prompt(chrome.i18n.getMessage('enterNewLabel'));
    if (label) {
      if (!this.bg.bgStore.config.hasLabel(label)) {
        this.bg.bgStore.config.addLabel(label);
      }
    }
  }

  onSendLink(url, tabId, frameId, directory, label) {
    return downloadFileFromTab(url, tabId, frameId).catch((err) => {
      if (err.code === 'FILE_SIZE_EXCEEDED') {
        this.bg.torrentErrorNotify(chrome.i18n.getMessage('fileSizeError'));
        throw err;
      }
      if (err.code !== 'LINK_IS_NOT_SUPPORTED') {
        logger.error('downloadFileFromTab error, fallback to url', err);
      }
      return {url};
    }).then((data) => {
      return this.bg.client.putTorrent(data, directory, label);
    }).then(() => {
      if (this.bgStore.config.selectDownloadCategoryAfterPutTorrentFromContextMenu) {
        this.bgStore.config.setSelectedLabel('DL', true);
      }
    }).catch((err) => {
      logger.error('onSendLink error', err);
    });
  }

  handleClick = (info, tab) => {
    const {menuItemId, linkUrl, frameId} = info;
    const itemInfo = JSON.parse(menuItemId);
    switch (itemInfo.type) {
      case 'action': {
        switch (itemInfo.name) {
          case 'default': {
            this.bg.whenReady().then(() => {
              return this.onSendLink(linkUrl, tab.id, frameId);
            });
            break;
          }
          case 'createFolder': {
            this.bg.whenReady().then(() => {
              return this.onCreateFolder();
            });
            break;
          }
          case 'createLabel': {
            this.bg.whenReady().then(() => {
              return this.onCreateLabel();
            });
            break;
          }
        }
        break;
      }
      case 'folder': {
        this.bg.whenReady().then(() => {
          const folder = this.bgStore.config.folders[itemInfo.index];
          return this.onSendLink(linkUrl, tab.id, frameId, folder);
        });
        break;
      }
      case 'label': {
        this.bg.whenReady().then(() => {
          const label = this.bgStore.config.labels[itemInfo.index];
          return this.onSendLink(linkUrl, tab.id, frameId, undefined, label);
        });
        break;
      }
    }
  };

  create() {
    return oneThread(() => {
      return contextMenusRemoveAll().then(() => {
        const menuId = JSON.stringify({type: 'action', name: 'default', source: 'main'});
        return contextMenusCreate({
          id: menuId,
          title: chrome.i18n.getMessage('addInTorrentClient'),
          contexts: ['link']
        }).then(() => {
          switch (this.bgStore.config.contextMenuType) {
            case 'folder': {
              return this.createFolderMenu(menuId);
            }
            case 'label': {
              return this.createLabelMenu(menuId);
            }
          }
        });
      });
    });
  }

  async createFolderMenu(parentId) {
    const folders = this.bgStore.config.folders;
    if (this.bgStore.config.treeViewContextMenu) {
      await Promise.all(transformFoldersToTree(folders).map((folder) => {
        let name = folder.name;
        if (name === './') {
          name = chrome.i18n.getMessage('currentDirectory');
        }
        return contextMenusCreate({
          id: folder.id,
          parentId: folder.parentId || parentId,
          title: name,
          contexts: ['link']
        });
      }));
    } else {
      await Promise.all(folders.map((folder, index) => {
        return contextMenusCreate({
          id: JSON.stringify({type: 'folder', index}),
          parentId: parentId,
          title: folder.name || folder.path,
          contexts: ['link']
        });
      }));
    }

    if (folders.length) {
      if (this.bgStore.config.putDefaultPathInContextMenu) {
        await contextMenusCreate({
          id: JSON.stringify({type: 'action', name: 'default', source: 'folder'}),
          parentId: parentId,
          title: chrome.i18n.getMessage('defaultPath'),
          contexts: ['link']
        });
      }

      await contextMenusCreate({
        id: JSON.stringify({type: 'action', name: 'createFolder'}),
        parentId: parentId,
        title: chrome.i18n.getMessage('add') + '...',
        contexts: ['link']
      });
    }
  }

  async createLabelMenu(parentId) {
    const labels = this.bgStore.config.labels;
    await Promise.all(labels.map((label, index) => {
      return contextMenusCreate({
        id: JSON.stringify({type: 'label', index}),
        parentId: parentId,
        title: label,
        contexts: ['link']
      });
    }));

    if (labels.length) {
      await contextMenusCreate({
        id: JSON.stringify({type: 'action', name: 'createLabel'}),
        parentId: parentId,
        title: chrome.i18n.getMessage('add') + '...',
        contexts: ['link']
      });
    }
  }

  destroy() {

  }
}

function transformFoldersToTree(folders) {
  const placeFolderMap = {};
  const places = [];

  let sep = null;

  folders.forEach((folder) => {
    const place = folder.path;
    if (sep === null) {
      if (place.indexOf('\/') !== -1) {
        sep = '/';
      } else
      if (place.indexOf('\\') !== -1) {
        sep = '\\';
      }
    }
    let normPath = place.split(/[\\/]/).join('/');
    normPath = path.normalize(normPath);
    if (/\/$/.test(normPath)) {
      normPath = normPath.slice(0, -1);
    }
    placeFolderMap[normPath] = folder;
    places.push(normPath);
  });
  if (sep === null) {
    sep = '/';
  }

  const lowKeyMap = {};
  const tree = {};
  places.forEach((place) => {
    const parts = place.split('/');
    if (parts[0] === '') {
      parts.unshift(parts.splice(0, 2).join(sep));
    }

    let parentThree = tree;
    parts.forEach((part, index) => {
      const lowPart = parts.slice(0, index + 1).join('/').toLowerCase();
      let caseKey = lowKeyMap[lowPart];
      if (!caseKey) {
        caseKey = lowKeyMap[lowPart] = part;
      }
      let subTree = parentThree[caseKey];
      if (!subTree) {
        subTree = parentThree[caseKey] = {};
      }
      if (index === parts.length - 1) {
        subTree['./'] = place;
      }
      parentThree = subTree;
    });
  });

  const joinSingleParts = (tree, part) => {
    const subTree = tree[part];
    if (typeof subTree !== 'object') return;

    const subParts = Object.keys(subTree);
    if (subParts.length === 1) {
      const subPart = subParts.shift();
      if (subPart === './') {
        tree[part] = subTree[subPart];
      } else {
        const joinedPart = part + sep + subPart;
        delete tree[part];
        tree[joinedPart] = subTree[subPart];
        joinSingleParts(tree, joinedPart);
      }
    } else {
      subParts.forEach((subPart) => {
        joinSingleParts(subTree, subPart);
      });
    }
  };
  Object.keys(tree).forEach((part) => {
    joinSingleParts(tree, part);
  });

  const menus = [];
  const makeMenuItems = (tree, parentId) => {
    Object.entries(tree).forEach(([name, item]) => {
      if (typeof item === 'object') {
        const branch = item;
        const id = JSON.stringify({type: 'branch', index: menus.length});
        menus.push({
          name: name,
          id,
          parentId
        });
        makeMenuItems(branch, id);
      } else {
        const place = item;
        const folder = placeFolderMap[place];
        const id = JSON.stringify({type: 'folder', index: folders.indexOf(folder)});
        menus.push(Object.assign({}, folder, {
          name,
          id,
          parentId
        }));
      }
    });
  };
  makeMenuItems(tree);

  return menus;
}

const contextMenusRemoveAll = () => {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.removeAll(() => {
      const err = chrome.runtime.lastError;
      err ? reject(err) : resolve();
    });
  });
};

const contextMenusCreate = (details) => {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create(details, () => {
      const err = chrome.runtime.lastError;
      err ? reject(err) : resolve();
    });
  });
};

export default ContextMenu;