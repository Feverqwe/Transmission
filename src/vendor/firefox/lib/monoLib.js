/**
 * Created by Anton on 21.06.2014.
 *
 * Mono cross-browser engine. Firefox lib.
 *
 */

(function() {
  var map = {};
  var flags = exports.flags = {
    enableLocalScope: false
  };

  var pageIndex = 0;
  /**
   * Response id for page
   * @returns {number}
   */
  var getPageId = function() {
    return pageIndex++;
  };

  /**
   * Get mono page from map
   * @param page
   * @returns {Object}
   */
  var getMonoPage = function(page) {
    for (var index in map) {
      if (map[index].page === page) {
        return map[index];
      }
    }
    return null;
  };

  var virtualPageList = [];
  /**
   * Virtual port for background page
   */
  exports.virtualAddon = function() {
    var subscribClientList = {};
    var subscribServerList = {};
    var obj = {
      port: {
        /**
         * Send message from bg page
         * @param {number} to
         * @param message
         */
        emit: function(to, message) {
          var list = subscribServerList[to] || [];
          for (var i = 0, item; item = list[i]; i++) {
            item(message);
          }
        },
        /**
         * Listener for background page
         * @param {number} to
         * @param {function} cb - Callback function
         */
        on: function(to, cb) {
          var list = subscribClientList[to];
          if (!list) {
            list = subscribClientList[to] = [];
          }
          if (list.indexOf(cb) === -1) {
            list.push(cb);
          }
        },
        removeListener: function(to, cb) {
          var cbList = subscribClientList[to] || [];
          var pos = cbList.indexOf(cb);
          if (pos !== -1) {
            cbList.splice(pos, 1);
          }
        }
      },
      lib: {
        /**
         * Send message to bg page
         * @param {number} to
         * @param message
         */
        emit: function(to, message) {
          var list = subscribClientList[to] || [];
          for (var i = 0, item; item = list[i]; i++) {
            item(message);
          }
        },
        /**
         * Listener for monoLib
         * @param {number} to
         * @param {function} cb - Callback function
         */
        on: function(to, cb) {
          var list = subscribServerList[to];
          if (!list) {
            list = subscribServerList[to] = [];
          }
          if (list.indexOf(cb) === -1) {
            list.push(cb);
          }
        },
        removeListener: function(to, cb) {
          var cbList = subscribServerList[to] || [];
          var pos = cbList.indexOf(cb);
          if (pos !== -1) {
            cbList.splice(pos, 1);
          }
        }
      },
      isVirtual: true
    };
    virtualPageList.push(obj);
    return obj;
  };

  /**
   * Virtual port function for pages without addon, but with mono.js work like bridge
   */
  exports.virtualPort = function() {
    window.addEventListener('message', function(e) {
      if (e.data[0] !== '>') {
        return;
      }
      var json = JSON.parse(e.data.substr(1));
      self.port.emit('mono', json);
    });
    self.port.on('mono', function(message) {
      var msg = '<' + JSON.stringify(message);
      var event = new CustomEvent("monoMessage", {
        detail: msg
      });
      window.dispatchEvent(event);
    });
  };

  var bindPage = function(mPage) {
    if (mPage.page.isVirtual) {
      mPage.active = true;
      map[mPage.id] = mPage;
      return;
    }

    var onPageShow = function() {
      mPage.active = true;
    };

    var onPageHide = function() {
      mPage.active = false;
    };

    var onAttach = function() {
      mPage.active = true;
      map[mPage.id] = mPage;

      mPage.page.removeListener('pagehide', onPageHide);
      mPage.page.removeListener('pageshow', onPageShow);
      mPage.page.removeListener('detach', onDetach);
      mPage.page.on('detach', onDetach);
      mPage.page.on('pageshow', onPageShow);
      mPage.page.on('pagehide', onPageHide);
    };

    var onDetach = function() {
      delete map[mPage.id];
      mPage.active = false;

      mPage.page.removeListener('pagehide', onPageHide);
      mPage.page.removeListener('pageshow', onPageShow);
      mPage.page.removeListener('attach', onAttach);
      mPage.page.on('attach', onAttach);
    };

    mPage.detach = onDetach;

    onAttach();
  };

  var responseFn = function(message) {
    return function(msg) {
      if (message.hasCallback) {
        monoOnMessage({
          mono: true,
          data: msg,
          to: message.from,
          responseId: message.callbackId
        });
      }
    }
  };

  var monoOnMessage = function(message) {
    var mPage = null;
    if (message.hook) {
      var hookFunc = sendHook[message.hook];
      if (hookFunc !== undefined) {
        return hookFunc(message, responseFn(message));
      }
    }
    if (message.to !== undefined) {
      mPage = map[message.to];
      if (!mPage || mPage.active === false) {
        return;
      }
      var type = (mPage.page.isVirtual !== undefined) ? 'lib' : 'port';
      return mPage.page[type].emit('mono', message);
    }

    var fmPage = map[message.from];
    for (var i = 0, item; item = virtualPageList[i]; i++) {
      if (fmPage.page === item) continue;
      item.lib.emit('mono', message);
    }

    if (flags.enableLocalScope && fmPage !== undefined && fmPage.page.isVirtual && message.from !== undefined) {
      for (var index in map) {
        mPage = map[index];
        if (fmPage === mPage || mPage.isLocal === false || mPage.active === false) continue;
        mPage.page.port.emit('mono', message);
      }
    }
  };

  var localUrl = require("sdk/self").data.url().match(/([^:]+:\/\/[^/]+)\//)[1];
  exports.addPage = function(page) {
    var mPage = getMonoPage(page);
    if (mPage) {
      return;
    }
    mPage = {
      page: page,
      id: getPageId(),
      isLocal: page.isVirtual === undefined && page.url && page.url.indexOf(localUrl) === 0
    };

    bindPage(mPage);

    var type = (page.isVirtual !== undefined) ? 'lib' : 'port';
    page[type].on('mono', function(message) {
      message.from = mPage.id;
      monoOnMessage(message);
    });

    return {
      detach: function() {
        mPage.detach();
      }
    };
  };

  var ffSimpleStorage = (function() {
    var ss = require('sdk/simple-storage');

    return {
      /**
       * @param {String|[String]|Object|null|undefined} [keys]
       * @param {Function} callback
       */
      get: function(keys, callback) {
        var items = {};
        var defaultItems = {};

        var _keys = [];
        if (keys === undefined || keys === null) {
          _keys = Object.keys(ss.storage);
        } else
        if (Array.isArray(keys)) {
          _keys = keys;
        } else
        if (typeof keys === 'object') {
          _keys = Object.keys(keys);
          defaultItems = keys;
        } else {
          _keys = [keys];
        }

        _keys.forEach(function(key) {
          var value = undefined;
          if (ss.storage.hasOwnProperty(key)) {
            value = ss.storage[key];
          } else {
            value = defaultItems[key];
          }
          if (value !== undefined) {
            items[key] = value;
          }
        });

        callback(items);
      },
      /**
       * @param {Object} items
       * @param {Function} [callback]
       */
      set: function(items, callback) {
        Object.keys(items).forEach(function(key) {
          if (items[key] !== undefined) {
            ss.storage[key] = items[key];
          }
        });

        callback && callback();
      },
      /**
       * @param {String|[String]} [keys]
       * @param {Function} [callback]
       */
      remove: function(keys, callback) {
        var _keys = [];
        if (Array.isArray(keys)) {
          _keys = keys;
        } else {
          _keys = [keys];
        }

        _keys.forEach(function(key) {
          delete ss.storage[key];
        });

        callback && callback();
      },
      /**
       * @param {Function} [callback]
       */
      clear: function(callback) {
        this.remove(Object.keys(ss.storage), callback);
      }
    }
  })();
  exports.storage = ffSimpleStorage;

  var sendHook = {};

  sendHook.storage = function(message, response) {
    var msg = message.data || {};
    if (msg.get !== undefined) {
      ffSimpleStorage.get(msg.get, response);
    } else
    if (msg.set !== undefined) {
      ffSimpleStorage.set(msg.set, response);
    } else
    if (msg.remove !== undefined) {
      ffSimpleStorage.remove(msg.remove, response);
    } else
    if (msg.clear !== undefined) {
      ffSimpleStorage.clear(response);
    }
  };

  var serviceList = exports.serviceList = {};

  serviceList.getActiveWindowActiveTab = function(msg, response) {
    var tabs = [];
    var activeWindow = require("sdk/windows").browserWindows.activeWindow;
    var activeTab = activeWindow && activeWindow.tabs.activeTab;
    if (!activeTab) {
      return response(tabs);
    }

    for (var index in map) {
      if (map[index].page.tab === activeTab) {
        tabs.push({
          id: index
        });
      }
    }
    return response(tabs);
  };

  serviceList.resize = function(msg, reponse, message) {
    var mPage = map[message.from];
    if (!mPage || mPage.active === false) {
      return;
    }

    if (msg.width) {
      mPage.page.width = msg.width;
    }
    if (msg.height) {
      mPage.page.height = msg.height;
    }
  };

  serviceList.openTab = function(msg) {
    var self = require("sdk/self");
    var tabs = require("sdk/tabs");
    tabs.open((msg.dataUrl) ? self.data.url(msg.url) : msg.url);
  };

  sendHook.service = function(message, response) {
    var msg = message.data || {};
    var service = serviceList[msg.action];
    if (service !== undefined) {
      service(msg, response, message);
    }
  };
})();