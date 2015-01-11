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
        port: 9091,
        path: "transmission/rpc",
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

        treeViewContextMenu: 0,
        showDefaultFolderContextMenuItem: 0,

        showFreeSpace: 1,

        guiPath: ''
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
         /* Transmission
         {column: 'avail',       display: 0, order: 1, width: 60,  lang: 'OV_COL_AVAIL'},
         {column: 'label',       display: 0, order: 1, width: 100, lang: 'OV_COL_LABEL'},*/
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
        token: null,
        torrents: [],
        labels: [],
        settings: {},
        lastPublicStatus: '-_-',
        trafficList: [{name:'download', values: []}, {name:'upload', values: []}],
        startTime: parseInt(Date.now() / 1000),
        activeCount: 0,
        notifyList: {},

        folderList: [],

        rmLastScrapeResult: /"lastScrapeResult":"[^"]*","/gm
    },
    api: {
        getTorrentListRequest: {
            method: "torrent-get",
            arguments: {
                fields: ["id", "name", "totalSize", "percentDone", 'downloadedEver', 'uploadedEver',
                    'rateUpload', 'rateDownload', 'eta', 'peersSendingToUs', 'peersGettingFromUs',
                    'queuePosition', 'addedDate', 'doneDate', 'downloadDir', 'recheckProgress',
                    'status', 'error', 'errorString', 'trackerStats']
            },
            ids: undefined
        },
        getFileListRequest: {
            method: "torrent-get",
            arguments: {
                fields: ["id", 'files', 'fileStats'],
                ids: undefined
            }
        },
        trUtColumnList: ['id', 'statusCode', 'name', 'totalSize', 'progress', 'downloadedEver', 'uploadedEver'
            , 'shared', 'rateUpload', 'rateDownload', 'eta', '_label', 'peersGettingFromUs'
            , 'peers', 'peersSendingToUs', 'seeds', 'n_unk', 'queuePosition', 'n_uploaded'
            , 't_unk1', 't_unk2', 'statusText', 'n_sid', 'addedDate', 'doneDate', 't_unk3'
            , 'downloadDir', 't_unk4', 'n_unk5'],
        flUtColumnList: ['name', 'length', 'bytesCompleted', 'priority', 'origName', 'folderName']
    },
    param: function(params) {
        if (typeof params === 'string') return params;

        var args = [];
        for (var key in params) {
            var value = params[key];
            if (value === null || value === undefined) {
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
    tr2utStatus: function(code) {
        var uCode = 0;
        var Status = "";
        /*
         TR_STATUS_STOPPED        = 0, // Torrent is stopped
         TR_STATUS_CHECK_WAIT     = 1, // Queued to check files
         TR_STATUS_CHECK          = 2, // Checking files
         TR_STATUS_DOWNLOAD_WAIT  = 3, // Queued to download
         TR_STATUS_DOWNLOAD       = 4, // Downloading
         TR_STATUS_SEED_WAIT      = 5, // Queued to seed
         TR_STATUS_SEED           = 6  // Seeding
         */
        // todo: translate!
        if (code === 0) {
            uCode = 128;
            Status = "Stopped";
        } else
        if (code === 1) {
            uCode = 233;
            Status = "Queued to check files";
        } else
        if (code === 2) {
            uCode = 130;
            Status = "Checking";
        } else
        if (code === 3) {
            uCode = 200;
            Status = "Queued to download";
        } else
        if (code === 4) {
            uCode = 201;
            Status = "Downloading";
        } else
        if (code === 5) {
            uCode = 200;
            Status = "Queued to seed";
        } else
        if (code === 6) {
            uCode = 201;
            Status = "Seeding";
        } else {
            uCode = 152;
            Status = "Unknown";
        }
        return [uCode, Status];
    },
    tr2utTrList: function(response, request) {
        var data = response;
        data.ut = {};
        if (!request.arguments) {
            return data;
        }
        var type = request.arguments.ids === 'recently-active' ? 'torrentp' : 'torrents';
        var args = response.arguments;
        if (args.torrents !== undefined) {
            var firstField = args.torrents[0];
            if (firstField && firstField.files !== undefined) {
                var files = data.ut.files = [];
                files[0] = 'trId'+firstField.id;
                var fileList = files[1] = [];
                var firstSlashPosition;
                for (var n = 0, file; file = firstField.files[n]; n++) {
                    if (firstSlashPosition === undefined) {
                        firstSlashPosition = file.name.indexOf('/');
                        if (firstSlashPosition === -1) {
                            firstSlashPosition = null;
                            break;
                        }
                    }
                    if (file.name.indexOf('/') !== firstSlashPosition) {
                        firstSlashPosition = null;
                        break;
                    }
                }
                for (var n = 0, file; file = firstField.files[n]; n++) {
                    file.priority = (!firstField.fileStats[n].wanted) ? 0 : firstField.fileStats[n].priority + 2;
                    file.origName = file.name;
                    file.folderName = '';
                    if (firstSlashPosition !== null) {
                        file.folderName = file.name.substr(0, firstSlashPosition + 1);
                        file.name = file.name.substr(firstSlashPosition + 1);
                    }
                    var fileItem = [];
                    for (var i = 0, column; column = engine.api.flUtColumnList[i]; i++) {
                        fileItem.push(file[column]);
                    }
                    fileList.push(fileItem);
                }
                return data;
            }

            data.ut[type] = [];
            for (var field, i = 0; field = args.torrents[i]; i++) {
                field.id = 'trId'+field.id;
                // status>
                var utStatus = [];
                if (field.error > 0) {
                    utStatus[0] = 144;
                    utStatus[1] = field.errorString || "Unknown error";
                } else {
                    utStatus = engine.tr2utStatus(field.status);
                }
                field.statusCode = utStatus[0];
                field.statusText = utStatus[1];
                // <status
                field.percentDone = field.percentDone || 0;
                field.progress = parseInt((field.recheckProgress || field.percentDone) * 1000);
                field.shared = field.downloadedEver > 0 ? Math.round(field.uploadedEver / field.downloadedEver * 1000) : 0;
                if (field.eta < 0) {
                    field.eta = 0;
                }
                // seeds/peers in poe>
                var peers = 0;
                var seeds = 0;
                if (field.trackerStats !== undefined) {
                    for (var n = 0, item; item = field.trackerStats[n]; n++) {
                        if (item.leecherCount > 0) {
                            peers += item.leecherCount;
                        }
                        if (item.seederCount > 0) {
                            seeds += item.seederCount;
                        }
                    }
                }
                field.peers = peers;
                field.seeds = seeds;
                // <seeds/peers in poe

                field.queuePosition = field.queuePosition || 0;
                field.downloadDir = field.downloadDir || 0;

                var arrayItem = [];
                for (var n = 0, column; column = engine.api.trUtColumnList[n]; n++) {
                    if (field[column] !== undefined) {
                        arrayItem.push(field[column]);
                        continue;
                    }
                    var dataType = column[0];
                    if (dataType === 'n') {
                        arrayItem.push(0);
                        continue;
                    }
                    arrayItem.push('');
                }
                data.ut[type].push(arrayItem);
            }
        }
        if (type === 'torrents' && data.ut.torrents !== undefined) {
            var torrentm = [];
            for (var i = 0, item_s; item_s = engine.varCache.torrents[i]; i++) {
                var found = false;
                for (var n = 0, item_m; item_m = data.ut.torrents[n]; n++) {
                    if (item_m[0] === item_s[0]) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    torrentm.push(item_s[0]);
                }
            }
            if (torrentm.length > 0) {
                data.ut.torrentm = torrentm;
            }
        } else {
            if (args.removed !== undefined) {
                data.ut.torrentm = [];
                for (var i = 0, len = args.removed.length; i < len; i++) {
                    data.ut.torrentm.push('trId'+args.removed[i]);
                }
            }
        }
        data.ut.torrentc = Date.now();
        return data;
    },
    sendAction: function(origData, onLoad, onError, force) {
        var data = origData;

        var headers = {};

        if (engine.settings.login && engine.settings.password) {
            headers.Authorization = 'Basic ' + window.btoa(engine.settings.login + ":" + engine.settings.password);
        }
        if (engine.varCache.token !== null) {
            headers['X-Transmission-Session-Id'] = engine.varCache.token;
        }

        engine.ajax({
            type: 'POST',
            url: engine.varCache.webUiUrl,
            headers: headers,
            data: JSON.stringify(data),
            success: function(data, xhr) {
                var data = xhr.responseText;
                try {
                    data = data.replace(engine.varCache.rmLastScrapeResult, '"lastScrapeResult":"","');
                    data = JSON.parse(data);
                } catch (err) {
                    return engine.publicStatus('Data parse error!');
                }
                engine.publicStatus('');
                engine.tr2utTrList(data, origData);
                onLoad && onLoad(data);
                engine.readResponse(data, origData);
            },
            error: function(xhr) {
                if (xhr.status === 409) {
                    if (force === undefined) {
                        force = 0;
                    }
                    force++;
                    engine.varCache.token = xhr.getResponseHeader("X-Transmission-Session-Id");
                    if (force < 2) {
                        return engine.sendAction.call(engine, origData, onLoad, onError, force);
                    }
                }
                engine.publicStatus('Can\'t send action! '+xhr.statusText+' (Code: '+xhr.status+')');
                onError && onError();
            }
        });
    },
    readResponse: function(response, request) {
        var data = response.ut;
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
        }

        if (request.method === 'session-get') {
            engine.varCache.settings = response.arguments;
        }

        engine.settings.displayActiveTorrentCountIcon && engine.displayActiveItemsCountIcon(engine.varCache.torrents);
    },
    updateTrackerList: function() {
        engine.sendAction(engine.api.getTorrentListRequest, function(data) {
            // on ready
        }, function() {
            // on error
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
        delete engine.api.getTorrentListRequest.arguments.ids;
        engine.sendAction(engine.api.getTorrentListRequest, function () {
            var args = {
                method: 'torrent-add',
                arguments: {}
            };
            if (isUrl) {
                args.arguments.filename = url;
            } else {
                args.arguments.metainfo = url;
            }
            if (folder) {
                args.arguments['download-dir'] = folder.path;
            }
            var onRequestReady = function() {
                engine.sendAction(args, function(data) {
                    if (data.result && data.result !== 'success') {
                        engine.showNotification(engine.icons.error, engine.language.OV_FL_ERROR, data.result);
                        return;
                    }

                    if (data.arguments['torrent-added']) {
                        var name = data.arguments['torrent-added'].name;
                        if (engine.settings.selectDownloadCategoryOnAddItemFromContextMenu) {
                            mono.storage.set({selectedLabel: {label: 'DL', custom: 1}});
                        }
                        engine.showNotification(engine.icons.add, name, engine.language.torrentAdded);
                    } else
                    if (data.arguments['torrent-duplicate']) {
                        var name = data.arguments['torrent-duplicate'].name;
                        engine.showNotification(engine.icons.error, name, engine.language.torrentFileIsExists);
                    }

                    engine.api.getTorrentListRequest.arguments.ids = 'recently-active';
                    engine.sendAction(engine.api.getTorrentListRequest);
                });
            };
            if (args.arguments.filename !== undefined) {
                return onRequestReady();
            }
            var reader = new window.FileReader();
            reader.readAsDataURL(args.arguments.metainfo);
            reader.onloadend = function() {
                var fileDataPos = reader.result.indexOf(',');
                args.arguments.metainfo = reader.result.substr(fileDataPos + 1);
                onRequestReady();
            }
        });
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
                folderList: engine.varCache.folderList
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

            var contextMenu = engine.createFolderCtxMenu.contextMenu = [];

            var folderList = engine.varCache.folderList;

            var items = [];

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
        }
    })() : function() {
        chrome.contextMenus.removeAll(function () {
            var contextMenu = engine.createFolderCtxMenu.contextMenu = [];

            var folderList = engine.varCache.folderList;

            chrome.contextMenus.create({
                id: 'main',
                title: engine.language.addInTorrentClient,
                contexts: ["link"],
                onclick: engine.onCtxMenuCall
            }, function () {
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
    hookList: {
        getTorrentList: function(data, response) {
            if (data.cid) {
                engine.api.getTorrentListRequest.arguments.ids = 'recently-active';
            } else {
                delete engine.api.getTorrentListRequest.arguments.ids;
            }
            engine.sendAction(engine.api.getTorrentListRequest, function(data) {
                if (data.result !== 'success') {
                    return;
                }
                response(data.ut);
            });
        }
    },
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
        getRemoteSettings: function(message, response) {
            response(engine.varCache.settings);
        },
        getPublicStatus: function(message, responose) {
            responose(engine.varCache.lastPublicStatus);
        },
        api: function(message, response) {
            var hook = engine.hookList[message.data.action];
            if (hook !== undefined) {
                return hook(message.data, response);
            }
            engine.sendAction(message.data, response);
        },
        sessionSet: function(message, response) {
            engine.sendAction(message.data, function(data) {
                if (data.result === 'success') {
                    for (var key in message.data.arguments) {
                        engine.varCache.settings[key] = message.data.arguments[key];
                    }
                }
                response(data);
            });
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
                    engine.sendAction(engine.api.getTorrentListRequest, function() {
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
        },
        getFileList: function(message, response) {
            engine.api.getFileListRequest.arguments.ids = [parseInt(message.hash.substr(4))];
            engine.sendAction(engine.api.getFileListRequest, function(data) {
                if (data.result !== 'success') {
                    return;
                }
                response(data.ut);
            });
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
