"use strict";
var mono = (typeof mono !== 'undefined') ? mono : undefined;

(function(base, factory) {
  if (mono && mono.isLoaded) {
    return;
  }

  var _mono = mono;
  var fn = function(addon) {
    return factory(_mono, addon);
  };

  mono = base(fn);
}(function base(factory) {
  if (['interactive', 'complete'].indexOf(document.readyState) !== -1) {
    return factory();
  }

  var base = Object.create({
    isLoaded: true,
    onReadyStack: [],
    onReady: function() {
      base.onReadyStack.push([this, arguments]);
    }
  });

  var onLoad = function() {
    document.removeEventListener('DOMContentLoaded', onLoad, false);
    window.removeEventListener('load', onLoad, false);

    mono = factory();

    for (var key in base) {
      if (base.hasOwnProperty(key)) {
        mono[key] = base[key];
      }
    }

    var item;
    while (item = base.onReadyStack.shift()) {
      mono.onReady.apply(item[0], item[1]);
    }
  };

  document.addEventListener('DOMContentLoaded', onLoad, false);
  window.addEventListener('load', onLoad, false);

  return base;
}, function initMono(_mono, _addon) {
  var browserApi = function() {
    var api = {
      isFirefox: true,
      isFirefoxMobile: false,
      /**
       * @param {*} msg
       * @param {Function} [callback]
       */
      sendMessage: function(msg, callback) {
          browser.runtime.sendMessage(msg, callback);
      },
      onMessage: {
        /**
         * @param {Function} callback
         */
        addListener: function(callback) {
            browser.runtime.onMessage.addListener(callback);
        },
        /**
         * @param {Function} callback
         */
        removeListener: function(callback) {
            browser.runtime.onMessage.removeListener(callback);
        }
      }
    };

    api.storage = browser.storage;

    /**
     * @param {String} locale
     * @param {Function} cb
     */
    api.getLanguage = function (locale, cb) {
      var convert = function(messages) {
        var language = {};
        for (var key in messages) {
          if (messages.hasOwnProperty(key)) {
            language[key] = messages[key].message;
          }
        }
        return language;
      };

      var url = '_locales/{locale}/messages.json';

      var xhr = new XMLHttpRequest();
      try {
        xhr.open('GET', url.replace('{locale}', locale));
      } catch (e) {
        return cb(e);
      }
      xhr.onload = function () {
        var err = null;
        var obj = null;
        try {
          obj = convert(JSON.parse(xhr.responseText));
        } catch (e) {
          err = e;
        }
        return cb(err, obj);
      };
      xhr.onerror = function () {
        return cb(new Error(xhr.status + ' ' + xhr.statusText));
      };
      xhr.send();
    };

    api.getLoadedLocale = function () {
      return browser.i18n.getMessage('lang');
    };

    var notificationIdList = {};
    api.showNotification = function(icon, title, desc, details) {
      details = details || {};
      var id = details.id;
      var timeout = details.notificationTimeout;

      var notifyId = 'notify';
      if (id !== undefined) {
        notifyId += id;
      } else {
        notifyId += Date.now();
      }
      var timerId = notifyId + 'Timer';

      if (id !== undefined && notificationIdList[notifyId] !== undefined) {
        clearTimeout(notificationIdList[timerId]);
        delete notificationIdList[notifyId];
          browser.notifications.clear(notifyId, function(){});
      }
      /**
       * @namespace browser.notifications
       */
      browser.notifications.create(
          notifyId,
          {
            type: 'basic',
            iconUrl: icon,
            title: String(title),
            message: String(desc)
          },
          function(id) {
            notificationIdList[notifyId] = id;
          }
      );
      if (timeout > 0) {
        notificationIdList[timerId] = setTimeout(function () {
          notificationIdList[notifyId] = undefined;
            browser.notifications.clear(notifyId, function(){});
        }, timeout);
      }
    };

    api.addInClipboard = function (text) {
      var textArea = document.createElement('textarea');
      textArea.textContent = text;
      document.body.appendChild(textArea);
      textArea.select();
      setTimeout(function() {
        document.execCommand("copy", false, null);
        textArea.parentNode.removeChild(textArea);
      });
    };

    api.setBadgeText = function (text) {
        browser.browserAction.setBadgeText({
        text: text
      });
    };

    api.setBadgeBackgroundColor = function (color) {
      var chColor = color.split(',').map(function(i){return parseFloat(i);});
      if (chColor.length === 4) {
        chColor.push(parseInt(255 * chColor.splice(-1)[0]));
      }
        browser.browserAction.setBadgeBackgroundColor({
        color: chColor
      });
    };

    (function checkCompatibility() {
        var ua = navigator.userAgent;
        var m = /(Mobile|Tablet);/.exec(ua);
        if (m) {
            api.isFirefoxMobile = true;
        }
    })();

    api.openTab = function (url) {
        if (api.isFirefoxMobile) {
            return;
        }

        browser.tabs.create({url: url});
    };

    api.isTab = function () {
      return !browser.extension.getViews({
        type: 'popup'
      }).some(function (_window) {
        return window === _window;
      });
    };

    /**
     * @param {Function} [callback]
     */
    api.contextMenusRemoveAll = function (callback) {
        browser.contextMenus.removeAll(callback);
    };

    /**
     * @param {Object} [createProperties]
     * @param {String} [createProperties.id]
     * @param {String} [createProperties.parentId]
     * @param {Array} [createProperties.contexts]
     * @param {Function} [createProperties.onclick]
     * @param {Function} [callback]
     */
    api.contextMenusCreate = function (createProperties, callback) {
        browser.contextMenus.create(createProperties, callback);
    };

    return {
      api: api
    };
  };

  var mono = browserApi(_addon).api;
  mono.isLoaded = true;
  mono.onReady = function(cb) {
    return cb();
  };

  //@insert

  return mono;
}));