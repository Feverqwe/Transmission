var mono = (typeof mono !== 'undefined') ? mono : undefined;

(function() {
    if (typeof window !== 'undefined') return;
    var self = require('sdk/self');
    window = require('sdk/window/utils').getMostRecentBrowserWindow();
    window.isModule = true;
    mono = require('toolkit/loader').main(require('toolkit/loader').Loader({
        paths: {
            'data/': self.data.url('js/')
        },
        name: self.name,
        prefixURI: self.data.url().match(/([^:]+:\/\/[^/]+\/)/)[1],
        globals: {
            console: console,
            _require: function(path) {
                switch (path) {
                    case 'sdk/simple-storage':
                        return require('sdk/simple-storage');
                    case 'sdk/window/utils':
                        return require('sdk/window/utils');
                    case 'sdk/self':
                        return require('sdk/self');
                    default:
                        console.log('Module not found!', path);
                }
            }
        }
    }), "data/mono");
})();

var engine = {
    settings: {},
    defaultSettings: {
        useSSL: 0,
        ip: "127.0.0.1",
        port: 8080,
        path: "gui/",
        displayActiveTorrentCountIcon: 1,
        showNotificationOnDownloadCompleate: 1,
        notificationTimeout: 5000,
        backgroundUpdateInterval: 120000,
        popupUpdateInterval: 1000,

        login: null,
        password: null,

        hideSeedStatusItem: 0,
        hideFnishStatusItem: 0,
        showSpeedGraph: 1,
        popupHeight: 350,
        selectDownloadCategoryOnAddItemFromContextMenu: 0,

        ctxMenuType: 1,
        treeViewContextMenu: 0,
        showDefaultFolderContextMenuItem: 0,

        fixCirilicTitle: 0,
        fixCirilicTorrentPath: 0
    },
    torrentListColumnList: {},
    defaultTorrentListColumnList: [
         {column: 'name',        display: 1, order: 1, width: 200, lang: 'OV_COL_NAME'},
         {column: 'order',       display: 0, order: 1, width: 20,  lang: 'OV_COL_ORDER'},
         {column: 'size',        display: 1, order: 1, width: 60,  lang: 'OV_COL_SIZE'},
         {column: 'remaining',   display: 0, order: 1, width: 60,  lang: 'OV_COL_REMAINING'},
         {column: 'done',        display: 1, order: 1, width: 70,  lang: 'OV_COL_DONE'},
         {column: 'status',      display: 1, order: 1, width: 70,  lang: 'OV_COL_STATUS'},
         {column: 'seeds',       display: 0, order: 1, width: 30,  lang: 'OV_COL_SEEDS'},
         {column: 'peers',       display: 0, order: 1, width: 30,  lang: 'OV_COL_PEERS'},
         {column: 'seeds_peers', display: 1, order: 1, width: 40,  lang: 'OV_COL_SEEDS_PEERS'},
         {column: 'downspd',     display: 1, order: 1, width: 60,  lang: 'OV_COL_DOWNSPD'},
         {column: 'upspd',       display: 1, order: 1, width: 60,  lang: 'OV_COL_UPSPD'},
         {column: 'eta',         display: 1, order: 1, width: 70,  lang: 'OV_COL_ETA'},
         {column: 'upped',       display: 0, order: 1, width: 60,  lang: 'OV_COL_UPPED'},
         {column: 'downloaded',  display: 0, order: 1, width: 60,  lang: 'OV_COL_DOWNLOADED'},
         {column: 'shared',      display: 0, order: 1, width: 60,  lang: 'OV_COL_SHARED'},
         {column: 'avail',       display: 0, order: 1, width: 60,  lang: 'OV_COL_AVAIL'},
         {column: 'label',       display: 0, order: 1, width: 100, lang: 'OV_COL_LABEL'},
         {column: 'added',       display: 0, order: 1, width: 120, lang: 'OV_COL_DATE_ADDED'},
         {column: 'completed',   display: 0, order: 1, width: 120, lang: 'OV_COL_DATE_COMPLETED'},
         {column: 'actions',     display: 1, order: 0, width: 57,  lang: 'Actions'}
    ],
    fileListColumnList: {},
    defaultFileListColumnList: [
         {column: 'checkbox',   display: 1, order: 0, width: 19,  lang: 'selectAll'},
         {column: 'name',       display: 1, order: 1, width: 300, lang: 'FI_COL_NAME'},
         {column: 'size',       display: 1, order: 1, width: 60,  lang: 'FI_COL_SIZE'},
         {column: 'downloaded', display: 1, order: 1, width: 60,  lang: 'OV_COL_DOWNLOADED'},
         {column: 'done',       display: 1, order: 1, width: 70,  lang: 'OV_COL_DONE'},
         {column: 'prio',       display: 1, order: 1, width: 74,  lang: 'FI_COL_PRIO'}
    ],
    icons: {
        complete: 'images/notification_done.png',
        add:      'images/notification_add.png',
        error:    'images/notification_error.png'
    },
    capitalize: function(string) {
        return string.substr(0, 1).toUpperCase()+string.substr(1);
    },
    varCache: {
        webUiUrl: undefined,
        token: undefined,
        cid: undefined,
        torrents: [],
        labels: [],
        settings: [],
        lastPublicStatus: '-_-',
        trafficList: [{name:'download', values: []}, {name:'upload', values: []}],
        startTime: parseInt(Date.now() / 1000),
        activeCount: 0,
        notifyList: {},

        folderList: [],
        labelList: []
    },
    param: function(params) {
        if (typeof params === 'string') return params;

        var args = [];
        if (params.token) {
            args.push(encodeURIComponent('token') + '=' + encodeURIComponent(params.token));
            delete params.token;
        }
        for (var key in params) {
            var value = params[key];
            if (value === null || value === undefined) {
                continue;
            }
            if (engine.settings.fixCirilicTorrentPath && key === 'path'&& params.download_dir !== undefined) {
                args.push(encodeURIComponent(key) + '=' + engine.inCp1251(value));
                continue;
            }
            args.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        }
        return args.join('&');
    },
    publicStatus: function(statusText) {
        if (engine.varCache.lastPublicStatus === statusText) return;

        engine.varCache.lastPublicStatus = statusText;
        mono.sendMessage({setStatus: statusText});
    },
    ajax: function(obj) {
        var url = obj.url;

        var method = obj.type || 'GET';
        method.toUpperCase();

        var data = obj.data;

        var isFormData = false;

        if (data && typeof data !== "string") {
            isFormData = String(data) === '[object FormData]';
            if (!isFormData) {
                data = engine.param(data);
            }
        }

        if (data && method === 'GET') {
            url += (url.indexOf('?') === -1 ? '?' : '&') + data;
            data = undefined;
        }

        if (obj.cache === false && ['GET','HEAD'].indexOf(method) !== -1) {
            var nc = '_=' + Date.now();
            url += (url.indexOf('?') === -1 ? '?' : '&') + nc;
        }

        var xhr = new engine.ajax.xhr();

        xhr.open(method, url, true);

        if (obj.timeout !== undefined) {
            xhr.timeout = obj.timeout;
        }

        if (obj.dataType) {
            obj.dataType = obj.dataType.toLowerCase();

            xhr.responseType = obj.dataType;
        }

        if (!obj.headers) {
            obj.headers = {};
        }

        if (obj.contentType) {
            obj.headers["Content-Type"] = obj.contentType;
        }

        if (data && !obj.headers["Content-Type"] && !isFormData) {
            obj.headers["Content-Type"] = 'application/x-www-form-urlencoded; charset=UTF-8';
        }

        if (obj.mimeType) {
            xhr.overrideMimeType(obj.mimeType);
        }
        if (obj.headers) {
            for (var key in obj.headers) {
                xhr.setRequestHeader(key, obj.headers[key]);
            }
        }

        if (obj.onTimeout !== undefined) {
            xhr.ontimeout = obj.onTimeout;
        }

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                var response = (obj.dataType) ? xhr.response : xhr.responseText;
                return obj.success && obj.success(response, xhr);
            }
            obj.error && obj.error(xhr);
        };

        xhr.onerror = function() {
            obj.error && obj.error(xhr);
        };

        xhr.send(data);

        return xhr;
    },
    timer: {
        clearInterval: typeof clearInterval !== 'undefined' ? clearInterval.bind() : undefined,
        setInterval: typeof setInterval !== 'undefined' ? setInterval.bind() : undefined,
        timer: undefined,
        state: 0,
        start: function() {
            this.state = 1;
            this.clearInterval(this.timer);
            if (engine.settings.backgroundUpdateInterval <= 1000) {
                return;
            }
            this.timer = this.setInterval(function() {
                engine.updateTrackerList();
            }, engine.settings.backgroundUpdateInterval);
        },
        stop: function() {
            this.clearInterval(this.timer);
            this.state = 0;
        }
    },
    getToken: function(onReady, onError, force) {
        if (engine.settings.login === null || engine.settings.password === null) {
            var errorText = 'Login or password is not found!';
            onError && onError({status: 0, statusText: errorText});
            return engine.publicStatus(errorText);
        }

        engine.publicStatus('Try get token!' + (force ? ' Retry: ' + force : ''));

        engine.ajax({
            url: engine.varCache.webUiUrl + 'token.html',
            headers: {
                Authorization: 'Basic ' + window.btoa(engine.settings.login + ":" + engine.settings.password)
            },
            success: function(data) {
                var token = data.match(/>([^<]+)</);
                if (token !== null) {
                    token = token[1];
                    engine.publicStatus('Token is found!');
                } else {
                    engine.publicStatus('Token not found!');
                }
                engine.varCache.token = token;
                engine.publicStatus('');
                onReady && onReady();
            },
            error: function(xhr) {
                engine.publicStatus('Get token error! Code: '+xhr.status);
                if (force === undefined) {
                    force = 0;
                }
                force++;
                if (force <= 5) {
                    return engine.getToken.call(engine, onReady, onError, force);
                }
                onError && onError({status: xhr.status, statusText: xhr.statusText});
            }
        });
    },
    sendAction: function(origData, onLoad, onError, force) {
        if (engine.varCache.token === undefined) {
            return engine.getToken(function onGetToken() {
                engine.sendAction.call(engine, origData, onLoad, onError, force || 1);
            });
        }

        var data = origData;
        if (typeof data === "string") {
            data = 'token='+engine.varCache.token+'&'+data;
        } else {
            data.token = engine.varCache.token;
        }

        var url = engine.varCache.webUiUrl;
        var type;
        if (data.hasOwnProperty('torrent_file')) {
            type = 'POST';
            var formData = new window.FormData();
            var file = data.torrent_file;
            formData.append("torrent_file", file);

            data = {};
            for (var key in origData) {
                data[key] = origData[key];
            }
            delete data.torrent_file;
            url += '?' + engine.param(data);
            data = formData;
        } else {
            type = 'GET';
        }

        engine.ajax({
            type: type,
            url: url,
            headers: {
                Authorization: 'Basic ' + window.btoa(engine.settings.login + ":" + engine.settings.password)
            },
            data: data,
            success: function(data, xhr) {
                var data = xhr.responseText;
                try {
                    if (engine.settings.fixCirilicTitle) {
                        data = engine.fixCirilicTitle(data);
                    }
                    data = JSON.parse(data);
                } catch (err) {
                    return engine.publicStatus('Data parse error!');
                }
                engine.publicStatus('');
                onLoad && onLoad(data);
                engine.readResponse(data, origData.cid);
            },
            error: function(xhr) {
                if (xhr.status === 400) {
                    if (force === undefined) {
                        force = 0;
                    }
                    force++;
                    engine.varCache.token = undefined;
                    if (force < 2) {
                        return engine.sendAction.call(engine, origData, onLoad, onError, force);
                    }
                }
                engine.publicStatus('Can\'t send action! '+xhr.statusText+' (Code: '+xhr.status+')');
                onError && onError();
            }
        });
    },
    readResponse: function(data, cid) {
        if (data.torrentm !== undefined) {
            // Removed torrents
            var list = engine.varCache.torrents;
            for (var i = 0, item_m; item_m = data.torrentm[i]; i++) {
                for (var n = 0, item_s; item_s = list[n]; n++) {
                    if (item_s[0] === item_m) {
                        list.splice(n, 1);
                        break;
                    }
                }
            }
        }

        var newTorrentList = data.torrents || data.torrentp;
        if (newTorrentList !== undefined) {
            engine.utils(engine.varCache.torrents, newTorrentList);
        }

        if (data.torrents !== undefined) {
            //Full torrent list
            engine.varCache.torrents = data.torrents;
        } else
        if (data.torrentp !== undefined) {
            // Updated torrent list with CID
            var list = engine.varCache.torrents;
            var newItem = [];
            for (var i = 0, item_p; item_p = data.torrentp[i]; i++) {
                var found = false;
                for (var n = 0, item_s; item_s = list[n]; n++) {
                    if (item_s[0] !== item_p[0]) {
                        continue;
                    }
                    list[n] = item_p;
                    found = true;
                    break;
                }
                if (found === false) {
                    newItem.push(item_p);
                    list.push(item_p);
                }
            }
            engine.varCache.newFileListener && engine.varCache.newFileListener(newItem, cid);
        }

        if (data.label !== undefined) {
            // Labels
            engine.varCache.labels = data.label;
        }

        if (data.settings !== undefined) {
            // Settings
            engine.varCache.settings = data.settings;
        }

        engine.settings.displayActiveTorrentCountIcon && engine.displayActiveItemsCountIcon(engine.varCache.torrents);
    },
    updateTrackerList: function() {
        engine.sendAction({list: 1, cid: engine.varCache.cid}, function(data) {
            if (data.torrentc !== undefined) {
                engine.varCache.cid = data.torrentc;
            }
        }, function() {
            engine.timer.stop();
        });
    },
    loadSettings: function(cb) {
        var defaultSettings = engine.defaultSettings;

        var optionsList = [];
        for (var item in defaultSettings) {
            optionsList.push(item);
        }

        var columnList = ['fileListColumnList', 'torrentListColumnList'];
        columnList.forEach(function(item) {
            optionsList.push(item);
        });

        optionsList.push('language');
        optionsList.push('folderList');
        optionsList.push('labelList');

        optionsList.push('ut_port');
        optionsList.push('ut_ip');
        optionsList.push('ut_path');
        optionsList.push('ssl');

        mono.storage.get(optionsList, function(storage) {
            var settings = {};

            // migration >>>
            if (!storage.hasOwnProperty('port') && storage.ut_port && !isNaN(parseInt(storage.ut_port))) {
                storage.port = parseInt(storage.ut_port);
            }
            if (!storage.hasOwnProperty('ip') && storage.ut_ip) {
                storage.ip = storage.ut_ip;
            }
            if (!storage.hasOwnProperty('path') && storage.path) {
                storage.path = storage.ut_path;
            }
            if (!storage.hasOwnProperty('useSSL') && storage.ssl === 1) {
                storage.useSSL = storage.ssl;
            }
            // <<< migration

            for (var item in defaultSettings) {
                settings[item] = storage.hasOwnProperty(item) ? storage[item] : defaultSettings[item];
            }

            settings.lang = storage.language;

            engine.varCache.folderList = storage.folderList || engine.varCache.folderList;
            engine.varCache.labelList = storage.labelList || engine.varCache.labelList;

            engine.settings = settings;

            columnList.forEach(function(item) {
                engine[item] = storage.hasOwnProperty(item) ? storage[item] : engine['default'+engine.capitalize(item)];
            });

            engine.varCache.webUiUrl = (settings.useSSL ? 'https://' : 'http://') + settings.ip + ':' + settings.port + '/' + settings.path;

            return cb();
        });
    },
    checkAvailableLanguage: function(lang) {
        lang = lang.substr(0, 2);
        return ['ru', 'fr', 'en'].indexOf(lang) !== -1 ? lang : 'en';
    },
    getLocale: function() {
        if (engine.getLocale.locale !== undefined) {
            return engine.getLocale.locale;
        }

        var getLang = mono.isFF ? function() {
            var window = require('sdk/window/utils').getMostRecentBrowserWindow();
            return String(window.navigator.language).toLowerCase();
        } : function() {
            return String(navigator.language).toLowerCase();
        };

        var lang = getLang();
        var match = lang.match(/\(([^)]+)\)/);
        if (match !== null) {
            lang = match[1];
        }

        var tPos = lang.indexOf('-');
        if (tPos !== -1) {
            var left = lang.substr(0, tPos);
            var right = lang.substr(tPos + 1);
            if (left === right) {
                lang = left;
            } else {
                lang = left + '-' + right.toUpperCase();
            }
        }
        return engine.getLocale.locale = lang;
    },
    detectLanguage: mono.isChrome ? function() {
        return chrome.i18n.getMessage('lang');
    } : window.isModule ? function() {
        var lang = require("sdk/l10n").get('lang');
        if (lang !== 'lang') {
            return lang;
        }
        return engine.getLocale();
    } : function() {
        return engine.getLocale();
    },
    readChromeLocale: function(lang) {
        var language = {};
        for (var key in lang) {
            language[key] = lang[key].message;
        }
        return language;
    },
    getLanguage: function(cb, force) {
        var lang = force || engine.checkAvailableLanguage((engine.settings.lang || engine.detectLanguage()));

        engine.settings.lang = engine.settings.lang || lang;

        var url = '_locales/' + lang + '/messages.json';
        if (mono.isFF) {
            try {
                engine.language = engine.readChromeLocale(JSON.parse(require('sdk/self').data.load(url)));
                cb();
            } catch (e) {
                console.log(e);
                if (lang !== 'en') {
                    return engine.getLanguage(cb, 'en');
                }
                console.error('Can\'t load language!');
            }
            return;
        }
        engine.ajax({
            url: url,
            dataType: 'JSON',
            success: function(data) {
                engine.language = engine.readChromeLocale(data);
                cb();
            },
            error: function() {
                if (lang !== 'en') {
                    return engine.getLanguage(cb, 'en');
                }
                console.error('Can\'t load language!');
            }
        });
    },
    trafficCounter: function(torrentList) {
        var limit = 90;
        var dlSpeed = 0;
        var upSpeed = 0;
        for (var i = 0, item; item = torrentList[i]; i++) {
            dlSpeed += item[9];
            upSpeed += item[8];
        }
        var dlSpeedList = engine.varCache.trafficList[0].values;
        var upSpeedList = engine.varCache.trafficList[1].values;
        var now = parseInt(Date.now() / 1000) - engine.varCache.startTime;
        dlSpeedList.push({time: now, pos: dlSpeed});
        upSpeedList.push({time: now, pos: upSpeed});
        if (dlSpeedList.length > limit) {
            dlSpeedList.shift();
            upSpeedList.shift();
        }
    },
    showNotification: window.isModule ? function(icon, title, desc) {
        var notification = require("sdk/notifications");
        notification.notify({title: String(title), text: String(desc), iconURL: icon});
    } : function(icon, title, desc, id) {
        var notifyId = 'notify';
        if (id !== undefined) {
            notifyId += id;
        } else {
            notifyId += Date.now();
        }
        var timerId = notifyId + 'Timer';

        var notifyList = engine.varCache.notifyList;

        if (id !== undefined && notifyList[notifyId] !== undefined) {
            clearTimeout(notifyList[timerId]);
            delete notifyList[notifyId];
            chrome.notifications.clear(notifyId, function(){});
        }
        /**
         * @namespace chrome.notifications
         */
        chrome.notifications.create(
            notifyId,
            {
                type: 'basic',
                iconUrl: icon,
                title: String(title),
                message: String(desc)
            },
            function(id) {
                notifyList[notifyId] = id;
            }
        );
        if (engine.settings.notificationTimeout > 0) {
            notifyList[timerId] = setTimeout(function () {
                notifyList[notifyId] = undefined;
                chrome.notifications.clear(notifyId, function(){});
            }, engine.settings.notificationTimeout);
        }
    },
    onCompleteNotification: function(oldTorrentList, newTorrentList) {
        if (oldTorrentList.length === 0) {
            return;
        }
        for (var i = 0, newItem; newItem = newTorrentList[i]; i++) {
            if (newItem[4] !== 1000) {
                continue;
            }
            for (var n = 0, oldItem; oldItem = oldTorrentList[n]; n++) {
                if (oldItem[0] !== newItem[0] || oldItem[4] === 1000 || oldItem[24]) {
                    continue;
                }
                engine.showNotification(engine.icons.complete, newItem[2], (newItem[21] !== undefined) ? engine.language.OV_COL_STATUS + ': ' + newItem[21] : '');
            }
        }
    },
    setBadgeText: mono.isChrome ? function(text) {
        chrome.browserAction.setBadgeText({
            text: text
        });
    } : function(text) {
        mono.setBadgeText(16, text, function(url16) {
            mono.setBadgeText(32, text, function(url32) {
                mono.setBadgeText(64, text, function(url64) {
                    mono.ffButton.icon = {
                        16: url16,
                        32: url32,
                        64: url64
                    };
                });
            });
        });
    },
    displayActiveItemsCountIcon: function(newTorrentList) {
        var activeCount = 0;
        for (var i = 0, item; item = newTorrentList[i]; i++) {
            if (item[4] !== 1000 && ( item[24] === undefined || item[24] === 0) ) {
                activeCount++;
            }
        }
        if (engine.varCache.activeCount === activeCount) {
            return;
        }
        engine.varCache.activeCount = activeCount;
        var text = activeCount ? String(activeCount) : '';
        engine.setBadgeText(text);
    },
    utils: function(oldTorrentList, newTorrentList) {
        engine.settings.showSpeedGraph && engine.trafficCounter(newTorrentList);
        engine.settings.showNotificationOnDownloadCompleate && engine.onCompleteNotification(oldTorrentList.slice(0), newTorrentList);
    },
    downloadFile: function (url, cb, referer) {
        var xhr = new engine.ajax.xhr();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        if (referer !== undefined) {
            xhr.setRequestHeader('Referer', referer);
        }
        xhr.onprogress = function (e) {
            if (e.total > 1048576 * 10 || e.loaded > 1048576 * 10) {
                xhr.abort();
                engine.showNotification(engine.icons.error, engine.language.OV_FL_ERROR, engine.language.fileSizeError);
            }
        };
        xhr.onload = function () {
            cb(xhr.response);
        };
        xhr.onerror = function () {
            if (xhr.status === 0) {
                engine.showNotification(engine.icons.error, xhr.status, engine.language.unexpectedError);
            } else {
                engine.showNotification(engine.icons.error, xhr.status, xhr.statusText);
            }
        };
        xhr.send();
    },
    setOnFileAddListener: function(label, requestCid) {
        engine.varCache.newFileListener = function(newFile, cid) {
            if (cid !== requestCid) return;
            delete engine.varCache.newFileListener;
            if (newFile.length === 0) {
                engine.showNotification(engine.icons.error, engine.language.torrentFileExists, '');
                return;
            }
            if (newFile.length !== 1) {
                return;
            }
            var item = newFile[0];
            if (label && !item[11]) {
                engine.sendAction({action: 'setprops', s: 'label', hash: item[0], v: label});
            }
            if (engine.settings.selectDownloadCategoryOnAddItemFromContextMenu) {
                mono.storage.set({selectedLabel: {label: 'DL', custom: 1}});
            }
            engine.showNotification(engine.icons.add, item[2], engine.language.torrentAdded);
        };
    },
    sendFile: function(url, folder, label, referer) {
        var isUrl;
        if (isUrl = typeof url === "string") {
            if (url.substr(0, 7).toLowerCase() !== 'magnet:') {
                engine.downloadFile(url, function (file) {
                    if (url.substr(0,5).toLowerCase() === 'blob:') {
                        window.URL.revokeObjectURL(url);
                    }
                    engine.sendFile(file, folder, label, referer);
                }, referer);
                return;
            }
        }
        engine.sendAction({list: 1}, function (data) {
            var cid = data.torrentc;
            var args = {};
            if (isUrl) {
                args.action = 'add-url';
                args.s = url;
            } else {
                args.action = 'add-file';
                args.torrent_file = url;
            }
            if (folder) {
                args.download_dir = folder.download_dir;
                args.path = folder.path;
            }
            engine.sendAction(args, function (data) {
                if (data.error !== undefined) {
                    engine.showNotification(engine.icons.error, engine.language.OV_FL_ERROR, data.error);
                    return;
                }
                engine.setOnFileAddListener(label, cid);
                engine.sendAction({list: 1, cid: cid});
            });
        });
    },
    fixCirilicTitle: function () {
        var cirilic = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя";
        var chars = ("\\u037777777720\\u037777777620 \\u037777777720\\u037777777621 " +
        "\\u037777777720\\u037777777622 \\u037777777720\\u037777777623 " +
        "\\u037777777720\\u037777777624 \\u037777777720\\u037777777625 " +
        "\\u037777777720\\u037777777601 \\u037777777720\\u037777777626 " +
        "\\u037777777720\\u037777777627 \\u037777777720\\u037777777630 " +
        "\\u037777777720\\u037777777631 \\u037777777720\\u037777777632 " +
        "\\u037777777720\\u037777777633 \\u037777777720\\u037777777634 " +
        "\\u037777777720\\u037777777635 \\u037777777720\\u037777777636 " +
        "\\u037777777720\\u037777777637 \\u037777777720\\u037777777640 " +
        "\\u037777777720\\u037777777641 \\u037777777720\\u037777777642 " +
        "\\u037777777720\\u037777777643 \\u037777777720\\u037777777644 " +
        "\\u037777777720\\u037777777645 \\u037777777720\\u037777777646 " +
        "\\u037777777720\\u037777777647 \\u037777777720\\u037777777650 " +
        "\\u037777777720\\u037777777651 \\u037777777720\\u037777777652 " +
        "\\u037777777720\\u037777777653 \\u037777777720\\u037777777654 " +
        "\\u037777777720\\u037777777655 \\u037777777720\\u037777777656 " +
        "\\u037777777720\\u037777777657 \\u037777777720\\u037777777660 " +
        "\\u037777777720\\u037777777661 \\u037777777720\\u037777777662 " +
        "\\u037777777720\\u037777777663 \\u037777777720\\u037777777664 " +
        "\\u037777777720\\u037777777665 \\u037777777721\\u037777777621 " +
        "\\u037777777720\\u037777777666 \\u037777777720\\u037777777667 " +
        "\\u037777777720\\u037777777670 \\u037777777720\\u037777777671 " +
        "\\u037777777720\\u037777777672 \\u037777777720\\u037777777673 " +
        "\\u037777777720\\u037777777674 \\u037777777720\\u037777777675 " +
        "\\u037777777720\\u037777777676 \\u037777777720\\u037777777677 " +
        "\\u037777777721\\u037777777600 \\u037777777721\\u037777777601 " +
        "\\u037777777721\\u037777777602 \\u037777777721\\u037777777603 " +
        "\\u037777777721\\u037777777604 \\u037777777721\\u037777777605 " +
        "\\u037777777721\\u037777777606 \\u037777777721\\u037777777607 " +
        "\\u037777777721\\u037777777610 \\u037777777721\\u037777777611 " +
        "\\u037777777721\\u037777777612 \\u037777777721\\u037777777613 " +
        "\\u037777777721\\u037777777614 \\u037777777721\\u037777777615 " +
        "\\u037777777721\\u037777777616 \\u037777777721\\u037777777617").split(' ');
        return function (data) {
            if (data.indexOf("\\u03777777772") === -1) {
                return data;
            }
            for (var i = 0, char_item; char_item = chars[i]; i++) {
                while (data.indexOf(char_item) !== -1) {
                    data = data.replace(char_item, cirilic[i]);
                }
            }
            return data;
        };
    }(),
    inCp1251: function(sValue) {
        var text = "", Ucode, ExitValue, s;
        for (var i = 0, sValue_len = sValue.length; i < sValue_len; i++) {
            s = sValue.charAt(i);
            Ucode = s.charCodeAt(0);
            var Acode = Ucode;
            if (Ucode > 1039 && Ucode < 1104) {
                Acode -= 848;
                ExitValue = "%" + Acode.toString(16);
            }
            else if (Ucode === 1025) {
                Acode = 168;
                ExitValue = "%" + Acode.toString(16);
            }
            else if (Ucode === 1105) {
                Acode = 184;
                ExitValue = "%" + Acode.toString(16);
            }
            else if (Ucode === 32) {
                Acode = 32;
                ExitValue = "%" + Acode.toString(16);
            }
            else if (Ucode === 10) {
                Acode = 10;
                ExitValue = "%0A";
            }
            else {
                ExitValue = s;
            }
            text = text + ExitValue;
        }
        return text;
    },
    onCtxMenuCall: function (e) {
        /**
         * @namespace e.linkUrl
         * @namespace e.menuItemId
         */
        var link = e.linkUrl;
        var id = e.menuItemId;
        var updateMenu = false;
        var contextMenu = engine.createFolderCtxMenu.contextMenu;
        var defaultItem = contextMenu[0] ? contextMenu[0] : ['0', ''];
        if (id === 'newFolder') {
            var path = window.prompt(engine.language.enterNewDirPath, defaultItem[1]);
            if (!path) {
                return;
            }
            var download_dir = defaultItem[0];
            id = -1;
            for (var i = 0, item; item = contextMenu[i]; i++) {
                if (item[1] === path && item[0] === download_dir) {
                    id = i;
                    break;
                }
            }
            if (id === -1) {
                id = contextMenu.length;
                contextMenu.push([download_dir, path]);
                engine.varCache.folderList.push([download_dir, path]);
                updateMenu = true;
            }
        }
        if (id === 'newLabel') {
            var newLabel = window.prompt(engine.language.enterNewLabel);
            if (!newLabel) {
                return;
            }
            id = -1;
            for (var i = 0, item; item = contextMenu[i]; i++) {
                if (item === newLabel) {
                    id = i;
                    break;
                }
            }
            if (id === -1) {
                id = contextMenu.length;
                contextMenu.push(newLabel);
                engine.varCache.labelList.push(newLabel);
                updateMenu = true;
            }
        }
        if (id === 'main' || id === 'default') {
            return engine.sendFile(link, undefined, undefined, e.referer);
        }
        var dir, label;
        var item = contextMenu[id];
        if (typeof item === 'string') {
            label = item;
        } else {
            dir = {download_dir: item[0], path: item[1]};
        }
        if (updateMenu) {
            mono.storage.set({
                folderList: engine.varCache.folderList,
                labelList: engine.varCache.labelList
            }, function() {
                engine.createFolderCtxMenu();
            });
        }
        engine.sendFile(link, dir, label, e.referer);
    },
    listToTreeList: function(contextMenu) {
        var tmp_folders_array = [];
        var tree = {};
        var sepType;
        var treeLen = 0;
        for (var i = 0, item; item = contextMenu[i]; i++) {
            var path = item[1];
            if (sepType === undefined) {
                sepType = path.indexOf('/') === -1 ? path.indexOf('\\') === -1 ? undefined : '\\' : '/';
            } else {
                if (sepType === '\\') {
                    item[1] = path.replace(/\//g, '\\');
                } else {
                    item[1] = path.replace(/\\/g, '/');
                }
            }
        }
        if (sepType === undefined) {
            sepType = '';
        }
        for (var i = 0, item; item = contextMenu[i]; i++) {
            var _disk = item[0];
            var path = item[1];
            if (!path) {
                continue;
            }

            var dblSep = sepType+sepType;
            var splitedPath = [];
            if (path.search(/[a-zA-Z]{1}:(\/\/|\\\\)/) === 0) {
                var disk = path.split(':'+dblSep);
                if (disk.length === 2) {
                    disk[0] += ':'+dblSep;
                    splitedPath.push(disk[0]);
                    path = disk[1];
                }
            }

            var pathList;
            if (sepType.length !== 0) {
                pathList = path.split(sepType);
            } else {
                pathList = [path];
            }

            splitedPath = splitedPath.concat(pathList);

            if (splitedPath[0] === '') {
                splitedPath.shift();
                splitedPath[0] = sepType + splitedPath[0];
            }

            if (splitedPath.slice(-1)[0] === '') {
                splitedPath.splice(-1);
            }

            var lastDir = undefined;
            var folderPath = undefined;
            for (var m = 0, len = splitedPath.length; m < len; m++) {
                var cPath = (lastDir !== undefined)?lastDir:tree;
                var jPath = splitedPath[m];
                if (folderPath === undefined) {
                    folderPath = jPath;
                } else {
                    if (m === 1 && folderPath.slice(-3) === ':'+dblSep) {
                        folderPath += jPath;
                    } else {
                        folderPath += sepType + jPath;
                    }
                }

                lastDir = cPath[ jPath ];
                if (lastDir === undefined) {
                    if (cPath === tree) {
                        treeLen++;
                    }
                    lastDir = cPath[ jPath ] = {
                        arrayIndex: tmp_folders_array.length,
                        currentPath: jPath
                    };
                    tmp_folders_array.push([ _disk , folderPath ]);
                }
            }
            if (lastDir) {
                lastDir.end = true;
            }
        }

        var smartTree = [];

        var createSubMenu = function(parentId, itemList) {
            var childList = [];
            for (var subPath in itemList) {
                var item = itemList[subPath];
                if (item.currentPath !== undefined) {
                    childList.push(item);
                }
            }
            var childListLen = childList.length;
            if (childListLen === 1 && itemList.end === undefined) {
                var cPath = itemList.currentPath;
                if (itemList.currentPath.slice(-1) !== sepType) {
                    cPath += sepType;
                }
                childList[0].currentPath = cPath + childList[0].currentPath;
                createSubMenu(parentId, childList[0]);
                return;
            }
            var hasChild = childListLen !== 0;
            var id = (hasChild) ? 'p'+String(itemList.arrayIndex) : String(itemList.arrayIndex);
            if (itemList.currentPath) {
                smartTree.push({
                    id: id,
                    parentId: parentId,
                    title: itemList.currentPath
                });
                if (hasChild) {
                    smartTree.push({
                        id: id.substr(1),
                        parentId: id,
                        title: engine.language.currentDirectory
                    });
                }
            }
            childList.forEach(function(item) {
                createSubMenu(id, item);
            });
        };

        for (var item in tree) {
            createSubMenu('main', tree[item]);
        }

        return {tree: smartTree, list: tmp_folders_array};
    },
    createFolderCtxMenu: window.isModule ? (function() {
        var contentScript = (function() {
            var onClick = function() {
                self.on("click", function(node) {
                    var href = node.href;
                    if (!href) {
                        return self.postMessage({error: -1});
                    }
                    if (href.substr(0, 7).toLowerCase() === 'magnet:') {
                        return self.postMessage({href: href});
                    }
                    self.postMessage({href: href, referer: window.location.href});
                });
            };
            var minifi = function(str) {
                var list = str.split('\n');
                var newList = [];
                list.forEach(function(line) {
                    newList.push(line.trim());
                });
                return newList.join('');
            };
            var onClickString = onClick.toString();
            var n_pos =  onClickString.indexOf('\n')+1;
            onClickString = onClickString.substr(n_pos, onClickString.length - 1 - n_pos).trim();
            return minifi(onClickString);
        })();

        var topLevel = undefined;

        var readData = function(data, cb) {
            if (typeof data !== 'object' || data.error === -1) {
                return engine.showNotification(engine.icons.error, engine.language.OV_FL_ERROR, engine.language.unexpectedError);
            }
            if (data.href) {
                return cb(data.href, data.referer);
            }
        };

        var createSingleTopMenu = function(self, cm) {
            return topLevel = cm.Item({
                label: engine.language.addInTorrentClient,
                context: cm.SelectorContext("a"),
                image: self.data.url('./icons/icon-16.png'),
                contentScript: contentScript,
                onMessage: function (data) {
                    readData(data, function(href, referer) {
                        engine.sendFile(href, undefined, undefined, referer);
                    });
                }
            });
        };

        var onSubMenuMessage = function(data) {
            var _this = this;
            readData(data, function(href, referer) {
                engine.onCtxMenuCall({
                    linkUrl: href,
                    menuItemId: _this.data,
                    referer: referer
                });
            });
        };

        var createTreeItems = function(cm, parentId, itemList) {
            var menuItemList = [];
            for (var i = 0, item; item = itemList[i]; i++) {
                if (item.parentId !== parentId) {
                    continue;
                }
                var itemOpt = { label: item.title, context: cm.SelectorContext("a") };
                var subItems = createTreeItems(cm, item.id, itemList );
                if (subItems.length !== 0) {
                    itemOpt.items = subItems;
                    menuItemList.push(cm.Menu(itemOpt));
                } else {
                    itemOpt.onMessage = onSubMenuMessage;
                    itemOpt.contentScript = contentScript;
                    itemOpt.data = item.id;
                    menuItemList.push(cm.Item(itemOpt));
                }
            }
            return menuItemList;
        };

        return function() {
            var self = require('sdk/self');
            var cm = require("sdk/context-menu");

            try {
                topLevel && topLevel.parentMenu && topLevel.parentMenu.removeItem(topLevel);
            } catch (e) {}
            topLevel = undefined;

            var enableFolders, enableLabels;
            if (!(enableFolders = engine.settings.ctxMenuType === 1) && !(enableLabels = engine.settings.ctxMenuType === 2)) {
                return;
            }

            var contextMenu = engine.createFolderCtxMenu.contextMenu = [];

            var folderList = engine.varCache.folderList;
            var labelList = engine.varCache.labelList;

            var items = [];

            if (enableFolders) {
                Array.prototype.push.apply(contextMenu, folderList);
                if (folderList.length > 0) {
                    if (engine.settings.treeViewContextMenu) {
                        var treeList = engine.listToTreeList(folderList.slice(0));
                        Array.prototype.push.apply(items, createTreeItems(cm, 'main', treeList.tree));
                        contextMenu.splice(0);
                        Array.prototype.push.apply(contextMenu, treeList.list);
                    } else {
                        for (var i = 0, item; item = folderList[i]; i++) {
                            items.push(cm.Item({
                                label: item[1],
                                data: String(i),
                                context: cm.SelectorContext("a"),
                                onMessage: onSubMenuMessage,
                                contentScript: contentScript
                            }));
                        }
                    }
                }
                if (engine.settings.showDefaultFolderContextMenuItem) {
                    items.push(cm.Item({
                        label: engine.language.defaultPath,
                        data: 'default',
                        context: cm.SelectorContext("a"),
                        onMessage: onSubMenuMessage,
                        contentScript: contentScript
                    }));
                }
                if (folderList.length > 0 || engine.settings.showDefaultFolderContextMenuItem) {
                    items.push(cm.Item({
                        label: engine.language.add+'...',
                        data: 'newFolder',
                        context: cm.SelectorContext("a"),
                        onMessage: onSubMenuMessage,
                        contentScript: contentScript
                    }));
                }
                if (items.length === 0) {
                    return createSingleTopMenu(self, cm);
                }
                topLevel = cm.Menu({
                    label: engine.language.addInTorrentClient,
                    context: cm.SelectorContext("a"),
                    image: self.data.url('./icons/icon-16.png'),
                    items: items
                });
            } else
            if (enableLabels) {
                if (labelList.length === 0) {
                    return createSingleTopMenu(self, cm);
                }

                Array.prototype.push.apply(contextMenu, labelList);
                for (var i = 0, item; item = labelList[i]; i++) {
                    items.push(cm.Item({
                        label: item,
                        data: String(i),
                        context: cm.SelectorContext("a"),
                        onMessage: onSubMenuMessage,
                        contentScript: contentScript
                    }));
                }
                items.push(cm.Item({
                    label: engine.language.add+'...',
                    data: 'newLabel',
                    context: cm.SelectorContext("a"),
                    onMessage: onSubMenuMessage,
                    contentScript: contentScript
                }));
                topLevel = cm.Menu({
                    label: engine.language.addInTorrentClient,
                    context: cm.SelectorContext("a"),
                    image: self.data.url('./icons/icon-16.png'),
                    items: items
                });
            }
        }
    })() : function() {
        chrome.contextMenus.removeAll(function () {
            var enableFolders, enableLabels;
            if (!(enableFolders = engine.settings.ctxMenuType === 1) && !(enableLabels = engine.settings.ctxMenuType === 2)) {
                return;
            }

            var contextMenu = engine.createFolderCtxMenu.contextMenu = [];

            var folderList = engine.varCache.folderList;
            var labelList = engine.varCache.labelList;

            chrome.contextMenus.create({
                id: 'main',
                title: engine.language.addInTorrentClient,
                contexts: ["link"],
                onclick: engine.onCtxMenuCall
            }, function () {
                if (enableFolders) {
                    Array.prototype.push.apply(contextMenu, folderList);
                    if (folderList.length > 0) {
                        if (engine.settings.treeViewContextMenu) {
                            var treeList = engine.listToTreeList(folderList.slice(0));
                            for (var i = 0, item; item = treeList.tree[i]; i++) {
                                chrome.contextMenus.create({
                                    id: item.id,
                                    parentId: item.parentId,
                                    title: item.title,
                                    contexts: ["link"],
                                    onclick: engine.onCtxMenuCall
                                });
                            }
                            contextMenu.splice(0);
                            Array.prototype.push.apply(contextMenu, treeList.list);
                        } else {
                            for (var i = 0, item; item = folderList[i]; i++) {
                                chrome.contextMenus.create({
                                    id: String(i),
                                    parentId: 'main',
                                    title: item[1],
                                    contexts: ["link"],
                                    onclick: engine.onCtxMenuCall
                                });
                            }
                        }
                    }
                    if (engine.settings.showDefaultFolderContextMenuItem) {
                        chrome.contextMenus.create({
                            id: 'default',
                            parentId: 'main',
                            title: engine.language.defaultPath,
                            contexts: ["link"],
                            onclick: engine.onCtxMenuCall
                        });
                    }
                    if (folderList.length > 0 || engine.settings.showDefaultFolderContextMenuItem) {
                        chrome.contextMenus.create({
                            id: 'newFolder',
                            parentId: 'main',
                            title: engine.language.add+'...',
                            contexts: ["link"],
                            onclick: engine.onCtxMenuCall
                        });
                    }
                } else
                if (enableLabels && labelList.length > 0) {
                    Array.prototype.push.apply(contextMenu, labelList);
                    for (var i = 0, item; item = labelList[i]; i++) {
                        chrome.contextMenus.create({
                            id: String(i),
                            parentId: 'main',
                            title: item,
                            contexts: ["link"],
                            onclick: engine.onCtxMenuCall
                        });
                    }
                    chrome.contextMenus.create({
                        id: 'newLabel',
                        parentId: 'main',
                        title: engine.language.add+'...',
                        contexts: ["link"],
                        onclick: engine.onCtxMenuCall
                    });
                }
            });
        });
    },
    run: function() {
        engine.loadSettings(function() {
            engine.getLanguage(function() {
                engine.varCache.isReady = 1;

                var msg;
                while ( msg = engine.varCache.msgStack.shift() ) {
                    engine.onMessage.apply(engine, msg);
                }

                engine.updateTrackerList();

                engine.timer.start();

                engine.createFolderCtxMenu();
            });
        });
    },
    onMessage: function(msgList, response) {
        if (engine.varCache.isReady !== 1) {
            return engine.varCache.msgStack.push([msgList, response]);
        }
        if (Array.isArray(msgList)) {
            var c_wait = msgList.length;
            var c_ready = 0;
            var resultList = {};
            var ready = function(key, data) {
                c_ready++;
                resultList[key] = data;
                if (c_wait === c_ready) {
                    response(resultList);
                }
            };
            msgList.forEach(function(message) {
                var fn = engine.actionList[message.action];
                fn && fn(message, function(response) {
                    ready(message.action, response);
                });
            });
            return;
        }
        var fn = engine.actionList[msgList.action];
        fn && fn(msgList, response);
    },
    storageCache: {},
    actionList: {
        getLanguage: function(message, response) {
            response(engine.language);
        },
        getSettings: function(message, response) {
            response(engine.settings);
        },
        getDefaultSettings: function(message, response) {
            response(engine.defaultSettings);
        },
        getTrColumnArray: function(message, response) {
            response(engine.torrentListColumnList);
        },
        getFlColumnArray: function(message, response) {
            response(engine.fileListColumnList);
        },
        getRemoteTorrentList: function(message, response) {
            response(engine.varCache.torrents);
        },
        getRemoteLabels: function(message, response) {
            response(engine.varCache.labels);
        },
        getRemoteSettings: function(message, response) {
            response(engine.varCache.settings);
        },
        getPublicStatus: function(message, responose) {
            responose(engine.varCache.lastPublicStatus);
        },
        api: function(message, response) {
            engine.sendAction(message.data, response);
        },
        setTrColumnArray: function(message, response) {
            engine.torrentListColumnList = message.data;
            mono.storage.set({torrentListColumnList: message.data}, response);
        },
        setFlColumnArray: function(message, response) {
            engine.fileListColumnList = message.data;
            mono.storage.set({fileListColumnList: message.data}, response);
        },
        onSendFile: function(message, response) {
            engine.sendFile(message.url, message.folder, message.label);
        },
        getTraffic: function(message, response) {
            response({list: engine.varCache.trafficList, startTime: engine.varCache.startTime});
        },
        getDirList: function(message, response) {
            engine.sendAction({action: 'list-dirs'}, response, function() {
                response({});
            });
        },
        checkSettings: function(message, response) {
            engine.loadSettings(function() {
                engine.getLanguage(function () {
                    engine.getToken(function() {
                        response({});
                    }, function(statusObj) {
                        response({error: statusObj});
                    });
                });
            });
        },
        reloadSettings: function(message, response) {
            engine.loadSettings(function() {
                engine.getLanguage(function () {
                    engine.createFolderCtxMenu();
                    if (!engine.settings.displayActiveTorrentCountIcon
                        && engine.varCache.activeCount > 0) {
                        engine.varCache.activeCount = 0;
                        engine.setBadgeText('');
                    }
                    response();
                });
            });
        },
        managerIsOpen: function(message, response) {
            mono.msgClean();
            if (engine.timer.state !== 1) {
                engine.timer.start();
            }
            response();
        }
    }
};

(function() {
    var init = function(addon, button) {
        if (addon) {
            mono = mono.init(addon);

            mono.setBadgeText = function(size, text, cb) {
                var self = require('sdk/self');
                var xhr = new engine.ajax.xhr();
                var url = self.data.url('./icons/icon-'+size+'.png');
                if (!text) {
                    return cb(url);
                }
                xhr.open('GET', url);
                xhr.responseType = 'blob';
                xhr.onload = function() {
                    var reader = new window.FileReader();
                    reader.onloadend = function() {
                        var base64data = reader.result;
                        var pos = base64data.indexOf(';');
                        base64data = base64data.substr(pos);
                        base64data = 'data:image/png'+base64data;

                        var box_w = 14;
                        var box_h = 10;
                        var text_p = 2;
                        var fSize = 10;
                        if (text < 10) {
                            box_w = 8;
                        }
                        if (size === 32) {
                            box_w = 20;
                            box_h = 16;
                            text_p = 2;
                            fSize = 16;
                            if (text < 10) {
                                box_w = 12;
                            }
                        }
                        if (size === 64) {
                            box_w = 38;
                            box_h = 30;
                            text_p = 4;
                            fSize = 30;
                            if (text < 10) {
                                box_w = 21;
                            }
                        }
                        var left_p = size - box_w;

                        var img = 'data:image/svg+xml;utf8,'+'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
                            'width="'+size+'" height="'+size+'">'
                            +'<image x="0" y="0" width="'+size+'" height="'+size+'" xlink:href="'+base64data+'" />'
                            +'<rect rx="4" ry="4" x="'+left_p+'" y="'+(size-box_h)+'" '
                            +'width="'+box_w+'" height="'+box_h+'" '
                            +'style="fill:rgba(60,60,60,0.8);stroke:black;stroke-width:1;opacity:0.6;"/>'
                            +'<text fill="white" x="'+(left_p+parseInt( text_p / 2 ))+'" y="'+(size-text_p)+'" style="' +
                            'font-family: Arial;' +
                            'font-weight: bolder;' +
                            'font-size: '+fSize+'px;' +
                            'background-color: black;'+
                            '">'+text+'</text>'+'</svg>';
                        cb(img);
                    };
                    reader.readAsDataURL(xhr.response);
                };
                xhr.send();
            };

            mono.ffButton = button;

            var sdkTimers = require("sdk/timers");
            engine.timer.setInterval = sdkTimers.setInterval;
            engine.timer.clearInterval = sdkTimers.clearInterval;

            var self = require('sdk/self');
            engine.icons.complete = self.data.url(engine.icons.complete);
            engine.icons.add = self.data.url(engine.icons.add);
            engine.icons.error = self.data.url(engine.icons.error);

            engine.ajax.xhr = require('sdk/net/xhr').XMLHttpRequest;
        } else {
            engine.ajax.xhr = XMLHttpRequest;
            chrome.browserAction.setBadgeBackgroundColor({
                color: [0, 0, 0, 40]
            });
        }

        engine.varCache.msgStack = [];

        mono.onMessage(engine.onMessage);

        engine.run();
    };
    if (window.isModule) {
        exports.init = init;
    } else {
        init();
    }
})();
