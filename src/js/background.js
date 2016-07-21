typeof window === 'undefined' && (function() {
    mono = require('./../data/js/mono.js');
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

        badgeColor: '0,0,0,0.40',

        showFreeSpace: 1,

        guiPath: '',

        requireAuthentication: 1
    },
    torrentListColumnList: {},
    defaultTorrentListColumnList: [
         {column: 'checkbox',    display: 1, order: 0, width: 19,  lang: 'selectAll'},
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
         {column: 'actions',     display: 1, order: 0, width: 36,  lang: 'Actions'}
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

        folderList: [],

        rmLastScrapeResult: /"lastScrapeResult":"[^"]+","/gm
    },
    api: {
        getTorrentListRequest: {
            method: "torrent-get",
            arguments: {
                fields: ["id", "name", "totalSize", "percentDone", 'downloadedEver', 'uploadedEver',
                    'rateUpload', 'rateDownload', 'eta', 'peersSendingToUs', 'peersGettingFromUs',
                    'queuePosition', 'addedDate', 'doneDate', 'downloadDir', 'recheckProgress',
                    'status', 'error', 'errorString', 'trackerStats', 'magnetLink'],
                ids: undefined
            }
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
            , 'downloadDir', 't_unk4', 'n_unk5', 'magnetLink'],
        flUtColumnList: ['name', 'length', 'bytesCompleted', 'priority', 'origName', 'folderName']
    },
    param: function(obj) {
        if (typeof obj === 'string') {
            return obj;
        }
        var itemsList = [];
        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue;
            }
            if (obj[key] === undefined || obj[key] === null) {
                obj[key] = '';
            }
            itemsList.push(encodeURIComponent(key)+'='+encodeURIComponent(obj[key]));
        }
        return itemsList.join('&');
    },
    publicStatus: function(statusText) {
        if (engine.varCache.lastPublicStatus === statusText) return;

        engine.varCache.lastPublicStatus = statusText;
        mono.sendMessage({setStatus: statusText});
    },
    parseXhrHeader: function(head) {
        head = head.split(/\r?\n/);
        var headers = {};
        head.forEach(function(line) {
            "use strict";
            var sep = line.indexOf(':');
            if (sep === -1) {
                return;
            }
            var key = line.substr(0, sep).trim().toLowerCase();
            var value = line.substr(sep + 1).trim();
            headers[key] = value;
        });
        return headers;
    },
    getTransport: function() {
        "use strict";
        if (mono.isModule) {
            return new (require('sdk/net/xhr').XMLHttpRequest)();
        }

        return new XMLHttpRequest();
    },
    request: function(obj, origCb) {
        "use strict";
        var result = {};
        var cb = function(e, body) {
            cb = null;
            if (request.timeoutTimer) {
                mono.clearTimeout(request.timeoutTimer);
            }

            var err = null;
            if (e) {
                err = String(e.message || e) || 'ERROR';
            }

            var response = getResponse(body);

            origCb && origCb(err, response, body);
        };

        var getResponse = function(body) {
            var response = {
                statusCode: 0,
                statusText: '',
                headers: {},
                body: ''
            };

            if (xhr) {
                response.statusCode = xhr.status;
                response.statusText = xhr.statusText;

                var headers = null;
                var allHeaders = xhr.getAllResponseHeaders();
                if (typeof allHeaders === 'string') {
                    headers = engine.parseXhrHeader(allHeaders);
                }
                response.headers = headers || {};

                response.body = body || '';
            }

            return response;
        };

        if (typeof obj !== 'object') {
            obj = {url: obj};
        }

        var url = obj.url;

        var method = obj.method || obj.type || 'GET';
        method = method.toUpperCase();

        var data = obj.data;

        var isFormData = false;

        if (typeof data !== "string") {
            isFormData = String(data) === '[object FormData]';
            if (!isFormData) {
                data = engine.param(data);
            }
        }

        if (data && method === 'GET') {
            url += (/\?/.test(url) ? '&' : '?') + data;
            data = undefined;
        }

        if (obj.cache === false && ['GET','HEAD'].indexOf(method) !== -1) {
            url += (/\?/.test(url) ? '&' : '?') + '_=' + Date.now();
        }

        obj.headers = obj.headers || {};

        if (data && !isFormData) {
            obj.headers["Content-Type"] = obj.contentType || obj.headers["Content-Type"] || 'application/x-www-form-urlencoded; charset=UTF-8';
        }

        var request = {};
        request.url = url;
        request.method = method;

        data && (request.data = data);
        obj.json && (request.json = true);
        obj.xml && (request.xml = true);
        obj.timeout && (request.timeout = obj.timeout);
        obj.mimeType && (request.mimeType = obj.mimeType);
        obj.withCredentials && (request.withCredentials = true);
        Object.keys(obj.headers).length && (request.headers = obj.headers);

        if (request.timeout > 0) {
            request.timeoutTimer = mono.setTimeout(function() {
                cb && cb(new Error('ETIMEDOUT'));
                xhr.abort();
            }, request.timeout);
        }

        var xhrSuccessStatus = {
            0: 200,
            1223: 204
        };

        var xhr = engine.getTransport(obj.localXHR);
        xhr.open(request.method, request.url, true);

        if (mono.isModule && request.xml) {
            request.mimeType = 'text/xml';
        }
        if (request.mimeType) {
            xhr.overrideMimeType(request.mimeType);
        }
        if (request.withCredentials) {
            xhr.withCredentials = true;
        }
        for (var key in request.headers) {
            xhr.setRequestHeader(key, request.headers[key]);
        }

        xhr.onload = function() {
            var status = xhrSuccessStatus[xhr.status] || xhr.status;
            try {
                if (status >= 200 && status < 300 || status === 304) {
                    var body = xhr.responseText;
                    if (request.json) {
                        body = JSON.parse(body);
                    } else
                    if (request.xml) {
                        if (mono.isModule) {
                            body = xhr.responseXML;
                        } else {
                            body = (new DOMParser()).parseFromString(body, "text/xml");
                        }
                    } else
                    if (typeof body !== 'string') {
                        console.error('Response is not string!', body);
                        throw new Error('Response is not string!');
                    }
                    return cb && cb(null, body);
                }
                throw new Error(xhr.status + ' ' + xhr.statusText);
            } catch (e) {
                return cb && cb(e);
            }
        };

        var errorCallback = xhr.onerror = function() {
            cb && cb(new Error(xhr.status + ' ' + xhr.statusText));
        };

        var stateChange = null;
        if (xhr.onabort !== undefined) {
            xhr.onabort = errorCallback;
        } else {
            stateChange = function () {
                if (xhr.readyState === 4) {
                    cb && mono.setTimeout(function () {
                        return errorCallback();
                    });
                }
            };
        }

        if (stateChange) {
            xhr.onreadystatechange = stateChange;
        }

        try {
            xhr.send(request.data || null);
        } catch (e) {
            mono.setTimeout(function() {
                cb && cb(e);
            });
        }

        result.abort = function() {
            cb = null;
            xhr.abort();
        };

        return result;
    },
    timer: {
        timer: null,
        state: 0,
        start: function() {
            this.state = 1;

            this.timer && mono.clearInterval(this.timer);
            this.timer = null;

            if (engine.settings.backgroundUpdateInterval <= 1000) {
                return;
            }

            this.timer = mono.setInterval(function() {
                engine.updateTrackerList();
            }, engine.settings.backgroundUpdateInterval);
        },
        stop: function() {
            this.timer && mono.clearInterval(this.timer);
            this.timer = null;

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
                    utStatus[1] = engine.language.OV_FL_ERROR + ': ' + (field.errorString || "Unknown error");
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


        if (engine.settings.requireAuthentication && engine.settings.login !== null && engine.settings.password !== null) {
            headers.Authorization = 'Basic ' + mono.btoa(engine.settings.login + ":" + engine.settings.password);
        }
        if (engine.varCache.token !== null) {
            headers['X-Transmission-Session-Id'] = engine.varCache.token;
        }

        engine.request({
            type: 'POST',
            url: engine.varCache.webUiUrl,
            headers: headers,
            data: JSON.stringify(data)
        }, function(err, resp, data) {
            if (err) {
                force = force || 0;
                force++;
                if (resp.statusCode === 409) {
                    engine.varCache.token = resp.headers["x-transmission-session-id"];
                }

                if (force < 2) {
                    return engine.sendAction.call(engine, origData, onLoad, onError, force);
                }

                engine.publicStatus('Can\'t send action! ' + err);
                return onError && onError(err);
            }

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
                var defItem = 'default'+engine.capitalize(item);
                engine[item] = storage.hasOwnProperty(item) ? storage[item] : engine[defItem];
                if (engine[defItem].length !== engine[item].length) {
                    for (var n = 0, dItem; dItem = engine[defItem][n]; n++) {
                        var found = false;
                        for (var g = 0, nItem; nItem = engine[item][g]; g++) {
                            if (nItem.column === dItem.column) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            if (dItem.column === 'checkbox') {
                                engine[item].unshift(dItem);
                            } else {
                                engine[item].push(dItem);
                            }
                        }
                    }
                }
            });

            engine.varCache.webUiUrl = (settings.useSSL ? 'https://' : 'http://') + settings.ip + ':' + settings.port + '/' + settings.path;

            return cb();
        });
    },
    setLanguage: function(_language) {
        var language = engine.language;
        for (var key in _language) {
            language[key] = _language[key];
        }
    },
    /**
     * @returns {string}
     */
    getNavLanguage: function () {
        var language = '';
        var navLanguage = mono.getNavigator().language;
        if (/^\w{2}-|^\w{2}$/.test(navLanguage)) {
            language = navLanguage;
        }
        return language;
    },
    loadLanguage: function(cb) {
        var langList = ['en', 'ru', 'fr', 'es', 'pt', 'zh'];
        var defaultLocale = langList[0];
        var customLang = engine.settings.lang;
        if (typeof customLang === 'string') {
            customLang = customLang.substr(0, 2);
        }
        var locale = customLang || mono.getLoadedLocale();
        if (!locale) {
            var navLanguage = engine.getNavLanguage().substr(0, 2).toLowerCase();
            if (langList.indexOf(navLanguage) !== -1) {
                locale = navLanguage;
            } else {
                locale = defaultLocale;
            }
        }

        (function getLanguage(locale, cb) {
            if (/^pt/.test(locale)) {
                locale = 'pt_BR';
            } else
            if (/^zh/.test(locale)) {
                locale = 'zh_CN';
            }

            mono.getLanguage(locale, function (err, _language) {
                if (err) {
                    if (locale !== defaultLocale) {
                        getLanguage(defaultLocale, cb);
                    } else {
                        cb();
                    }
                } else {
                    engine.setLanguage(_language);
                    cb();
                }
            });
        })(locale, cb);
    },
    getLanguage: function(cb) {
        engine.language = {};
        engine.loadLanguage(cb);
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
    showNotification: function(icon, title, desc, details) {
        details = details || {};
        details.notificationTimeout = engine.settings.notificationTimeout;
        mono.showNotification(icon, title, desc, details);
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
                var desc = (newItem[21] !== undefined) ? engine.language.OV_COL_STATUS + ': ' + newItem[21] : '';
                engine.showNotification(
                    engine.icons.complete,
                    newItem[2],
                    desc
                );
            }
        }
    },
    setBadgeText: function(text) {
        "use strict";
        engine.setBadgeText.lastText = text;

        mono.setBadgeText(text);

        if (engine.settings.badgeColor) {
            mono.setBadgeBackgroundColor(engine.settings.badgeColor);
        }
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
        var xhr = engine.getTransport();
        try {
            xhr.open('GET', url, true);
        } catch (e) {
            engine.showNotification(
                engine.icons.error,
                xhr.status,
                engine.language.unexpectedError
            );
            return;
        }
        xhr.responseType = 'blob';
        if (referer) {
            xhr.setRequestHeader('Referer', referer);
        }
        xhr.onprogress = function (e) {
            if (e.total > 1024 * 1024 * 10 || e.loaded > 1024 * 1024 * 10) {
                xhr.abort();
                engine.showNotification(
                    engine.icons.error,
                    engine.language.OV_FL_ERROR,
                    engine.language.fileSizeError
                );
            }
        };
        xhr.onload = function () {
            return cb(xhr.response);
        };
        xhr.onerror = function () {
            if (xhr.status === 0) {
                engine.showNotification(
                    engine.icons.error,
                    xhr.status,
                    engine.language.unexpectedError
                );
            } else {
                engine.showNotification(
                    engine.icons.error,
                    xhr.status,
                    xhr.statusText
                );
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
                        mono.urlRevokeObjectURL(url);
                    }
                    engine.sendFile(file, folder, label, referer);
                }, referer);
                return;
            }
        }
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
                    engine.showNotification(
                        engine.icons.error,
                        engine.language.OV_FL_ERROR,
                        data.result
                    );
                    return;
                }

                if (data.arguments['torrent-added']) {
                    var name = data.arguments['torrent-added'].name;
                    if (engine.settings.selectDownloadCategoryOnAddItemFromContextMenu) {
                        mono.storage.set({selectedLabel: {label: 'DL', custom: 1}});
                    }
                    engine.showNotification(
                        engine.icons.add,
                        name,
                        engine.language.torrentAdded
                    );
                } else
                if (data.arguments['torrent-duplicate']) {
                    var name = data.arguments['torrent-duplicate'].name;
                    engine.showNotification(
                        engine.icons.error,
                        name,
                        engine.language.torrentFileIsExists
                    );
                }

                engine.updateTrackerList();
            });
        };
        if (args.arguments.filename !== undefined) {
            return onRequestReady();
        }
        var reader = mono.getFileReader();
        reader.readAsDataURL(args.arguments.metainfo);
        reader.onloadend = function() {
            var fileDataPos = reader.result.indexOf(',');
            args.arguments.metainfo = reader.result.substr(fileDataPos + 1);
            onRequestReady();
        }
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
        var defaultItem = contextMenu[0] ? contextMenu[0] : ['0', '', ''];
        if (id === 'newFolder') {
            var path = mono.prompt(engine.language.enterNewDirPath, defaultItem[1]);
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
                contextMenu.push([download_dir, path, '']);
                engine.varCache.folderList.push([download_dir, path, '']);
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
    createFolderCtxMenu: function() {
        mono.contextMenusRemoveAll(function () {
            var contextMenu = engine.createFolderCtxMenu.contextMenu = [];

            var folderList = engine.varCache.folderList;

            mono.contextMenusCreate({
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
                            mono.contextMenusCreate({
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
                            mono.contextMenusCreate({
                                id: String(i),
                                parentId: 'main',
                                title: item[2] || item[1],
                                contexts: ["link"],
                                onclick: engine.onCtxMenuCall
                            });
                        }
                    }
                }
                if (engine.settings.showDefaultFolderContextMenuItem) {
                    mono.contextMenusCreate({
                        id: 'default',
                        parentId: 'main',
                        title: engine.language.defaultPath,
                        contexts: ["link"],
                        onclick: engine.onCtxMenuCall
                    });
                }
                if (folderList.length > 0 || engine.settings.showDefaultFolderContextMenuItem) {
                    mono.contextMenusCreate({
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
            var request = engine.api.getTorrentListRequest;
            if (data.cid) {
                request = mono.cloneObj(request);
                request.arguments.ids = 'recently-active';
            }
            engine.sendAction(request, function(data) {
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
            if (message.base64) {
                var b64Data = message.base64;
                var type = message.type;
                delete message.base64;
                delete message.type;

                message.url = mono.base64ToUrl(b64Data, type);
            }

            engine.sendFile(message.url, message.folder, message.label);
        },
        getTraffic: function(message, response) {
            response({trafficList: engine.varCache.trafficList, startTime: engine.varCache.startTime});
        },
        checkSettings: function(message, response) {
            engine.loadSettings(function() {
                engine.getLanguage(function () {
                    engine.sendAction(engine.api.getTorrentListRequest, function(data) {
                        if (data.result !== 'success') {
                            return response({error: data.result});
                        }
                        return response({});
                    }, function(err) {
                        return response({error: err});
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
        },
        changeBadgeColor: function(message) {
            engine.settings.badgeColor = message.color;
            engine.setBadgeText(engine.setBadgeText.lastText || '0');
        },
        copy: function(message) {
            "use strict";
            mono.addInClipboard(message.text);
        }
    },
    init: function() {
        engine.setBadgeText('');

        engine.varCache.msgStack = [];

        mono.onMessage.addListener(engine.onMessage);

        engine.run();
    }
};

engine.initModule = function(addon, button) {
    mono = mono.init(addon);

    mono.ffButton = button;

    var self = require('sdk/self');
    engine.icons.complete = self.data.url(engine.icons.complete);
    engine.icons.add = self.data.url(engine.icons.add);
    engine.icons.error = self.data.url(engine.icons.error);

    engine.init();
};

if (mono.isModule) {
    exports.init = engine.initModule;
} else
mono.onReady(function() {
    engine.init();
});