var lang_arr;
if (typeof window === 'undefined') {
    self = require("sdk/self");
    var ffLoader = require('toolkit/loader');
    var ffDataLoader = ffLoader.Loader({
        paths: {
            'data/': self.data.url('js/')
        },
        name: self.name,
        prefixURI: 'resource://'+self.id.slice(1, -1)+'/'
    });
    mono = ffLoader.main(ffDataLoader, "data/mono");
    window = require("sdk/window/utils").getMostRecentBrowserWindow();
    window.get_lang = ffLoader.main(ffDataLoader, "data/lang").get_lang;
    XMLHttpRequest = require('sdk/net/xhr').XMLHttpRequest;

    sdk_timers = require("sdk/timers");
    setTimeout = sdk_timers.setTimeout;
    clearTimeout = sdk_timers.clearTimeout;
    setInterval = sdk_timers.setInterval;
    clearInterval = sdk_timers.clearInterval;

    window.Notifications = require("sdk/notifications");
    window.isModule = true;
    var ffButton = undefined;
}
var jQ = {
    isPlainObject: function( obj ) {
        var class2type = {};
        var hasOwn = class2type.hasOwnProperty;
        if ( typeof obj !== "object" || obj.nodeType || obj === window ) {
            return false;
        }
        if ( obj.constructor &&
            !hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
            return false;
        }
        return true;
    },
    each: function(obj, cb) {
        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue;
            }
            cb(key, obj[key]);
        }
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
            if (obj[key] === undefined) {
                obj[key] = '';
            }
            itemsList.push(encodeURIComponent(key)+'='+encodeURIComponent(obj[key]));
        }
        return itemsList.join('&');
    },
    extend: function() {
        var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;
        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep = target;

            // skip the boolean and the target
            target = arguments[ i ] || {};
            i++;
        }
        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !typeof target === "function" ) {
            target = {};
        }
        // extend jQuery itself if only one argument is passed
        if ( i === length ) {
            target = this;
            i--;
        }
        for ( ; i < length; i++ ) {
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) != null ) {
                // Extend the base object
                for ( name in options ) {
                    src = target[ name ];
                    copy = options[ name ];

                    // Prevent never-ending loop
                    if ( target === copy ) {
                        continue;
                    }
                    // Recurse if we're merging plain objects or arrays
                    if ( deep && copy && ( jQ.isPlainObject(copy) || (copyIsArray = Array.isArray(copy)) ) ) {
                        if ( copyIsArray ) {
                            copyIsArray = false;
                            clone = src && Array.isArray(src) ? src : [];
                        } else {
                            clone = src && jQ.isPlainObject(src) ? src : {};
                        }
                        // Never move original objects, clone them
                        target[ name ] = jQ.extend( deep, clone, copy );
                        // Don't bring in undefined values
                    } else if ( copy !== undefined ) {
                        target[ name ] = copy;
                    }
                }
            }
        }
        // Return the modified object
        return target;
    }
};

var init = function(env, button) {
    if (env !== undefined) {
        mono = mono.init(env, {
            setTimeout: sdk_timers.setTimeout,
            simpleStorage: require("sdk/simple-storage")
        });
        ffButton = button;
    }

    mono.pageId = 'bg';
    var actionReader = function(message, cb) {
        if (message === 'lang_arr') {
            return cb(lang_arr);
        }
        if (message === 'settings') {
            return cb(engine.settings);
        }
        if (message === 'getColums') {
            return engine.getColums(cb);
        }
        if (message === 'getFlColums') {
            return engine.getFlColums(cb);
        }
        if (message === 'cache') {
            return cb(engine.cache);
        }
        if (message === 'trafStartTime') {
            return cb(engine.trafStartTime);
        }
        if (message === 'def_settings') {
            return cb(engine.def_settings);
        }
        if (message === 'getTraffic') {
            return cb(engine.traffic);
        }
        if (message.action === 'sendAction') {
            if (cb) {
                engine.sendAction(message.data, function() {
                    cb();
                });
            } else {
                engine.sendAction(message.data);
            }
            return;
        }
        if (message.action === 'setTrColums') {
            return engine.setTrColums(message.data);
        }
        if (message.action === 'setFlColums') {
            return engine.setFlColums(message.data);
        }
        if (message.action === 'sendFile') {
            return engine.sendFile(message.url, message.folder, message.label);
        }
        if (message.action === 'updateSettings') {
            return engine.updateSettings(message.data, cb);
        }
        if (message === 'getToken') {
            return engine.getToken(function(){
                cb(1);
            }, function(){
                cb(0);
            });
        }
        if (message === 'getDefColums') {
            return cb(engine.getDefColums());
        }
        if (message === 'getDefFlColums') {
            return cb(engine.getDefFlColums());
        }
        mono('>', message);
    };
    mono.onMessage(function(message, response) {
        if (Array.isArray(message)) {
            var c_wait = message.length;
            var c_ready = 0;
            var resultList = {};
            var ready = function(key, data) {
                c_ready+= 1;
                resultList[key] = data;
                if (c_wait === c_ready) {
                    response(resultList);
                }
            };
            message.forEach(function(action) {
                actionReader(action, function (data) {
                    ready(action, data);
                });
            });
            return;
        }
        actionReader(message, response);
    });

    mono.storage.get('lang', function(options) {
        lang_arr = window.get_lang(options.lang || window.navigator.language.substr(0,2));
        engine.boot();
    });
};
if (window.isModule) {
    exports.init = init;
} else {
    init();
}

var engine = function () {
    var isTransmission = true;
    var complete_icon = 'images/notification_done.png';
    var add_icon = 'images/notification_add.png';
    var error_icon = 'images/notification_error.png';
    var var_cache = {
        startTime: parseInt(Date.now()/1000),
        client: {},
        traffic: [{name:'download', values: []}, {name:'upload', values: []}],
        //лимит на кол-во получений токена, сбрасывается при первом успешном sendAction
        get_token_count: 0
    };
    var def_settings = {
        ssl: {v: 0, t: "checkbox"},
        ut_ip: {v: "127.0.0.1", t: "text"},
        ut_port: {v: 9091, t: "number", min: 1},
        ut_path: {v: "transmission/rpc", t: "text"},
        show_active_tr_on_icon: {v: 1, t: "checkbox"},
        notify_on_dl_comp: {v: 1, t: "checkbox"},
        bg_update_interval: {v: 60000 * 2, t: "number", min: 5000},
        mgr_update_interval: {v: 2000, t: "number", min: 500},
        notify_visbl_interval: {v: 5000, t: "number"},
        login: {v: undefined, t: "text"},
        password: {v: undefined, t: "password"},
        hide_seeding: {v: 0, t: "checkbox"},
        hide_finished: {v: 0, t: "checkbox"},
        graph: {v: 1, t: "checkbox"},
        window_height: {v: 300, t: "number", min: 100},
        change_downloads: {v: 0, t: "checkbox"},
        context_menu_trigger: {v: 1, t: "checkbox"},
        folders_array: {v: [], t: "array"},
        context_labels: {v: 0, t: "checkbox"},
        free_space: {v: 1, t: "checkbox"},
        get_full_list: {v: 0, t: "checkbox"},
        tree_view_menu: {v: 0, t: "checkbox"},
        show_default_dir: {v: 0, t: "checkbox"}
    };
    var settings = {};
    var loadSettings = function (cb) {
        var keys = [];
        for (var key in def_settings) {
            keys.push(key);
        }
        mono.storage.get(keys, function(options) {
            jQ.each(def_settings, function (key, item) {
                if (isTransmission && key === 'context_labels') {
                    settings[key] = item.v;
                    return 1;
                }
                var value = options[key];
                if (value === undefined) {
                    settings[key] = item.v;
                    return 1;
                }
                if (item.t === 'checkbox' || item.t === 'number') {
                    if (item.min !== undefined && value < item.min) {
                        settings[key] = item.min;
                        return 1;
                    }
                    settings[key] = parseInt(value);
                } else if (item.t === 'text' || item.t === 'password') {
                    settings[key] = value;
                } else if (item.t === 'array') {
                    settings[key] = JSON.parse(value);
                }
            });

            var_cache.webui_url = ((settings.ssl) ? 'https' : 'http') + "://" + settings.ut_ip + ':' + settings.ut_port + '/' + settings.ut_path;
            cb && cb();
        });
    };
    var table_colums = {
        name: {a: 1, size: 200, pos: 1, lang: 13, order: 1},
        position: {a: 0, size: 20, pos: 2, lang: 74, order: 1},
        size: {a: 1, size: 60, pos: 3, lang: 14, order: 1},
        ostalos: {a: 0, size: 60, pos: 4, lang: 75, order: 1},
        progress: {a: 1, size: 70, pos: 5, lang: 15, order: 1},
        status: {a: 1, size: 70, pos: 6, lang: 16, order: 1},
        seeds: {a: 0, size: 30, pos: 7, lang: 76, order: 1},
        peers: {a: 0, size: 30, pos: 8, lang: 77, order: 1},
        seeds_peers: {a: 1, size: 40, pos: 9, lang: 20, order: 1},
        down_speed: {a: 1, size: 60, pos: 10, lang: 18, order: 1},
        uplo_speed: {a: 1, size: 60, pos: 11, lang: 19, order: 1},
        time: {a: 1, size: 70, pos: 12, lang: 17, order: 1},
        otdano: {a: 0, size: 60, pos: 13, lang: 78, order: 1},
        poluchino: {a: 0, size: 60, pos: 14, lang: 79, order: 1},
        koeficient: {a: 0, size: 60, pos: 15, lang: 80, order: 1},
        // Transmission
        // dostupno: {a: 0, size: 60, pos: 16, lang: 81, order: 1},
        // metka: {a: 0, size: 100, pos: 17, lang: 82, order: 1},
        time_dobavleno: {a: 0, size: 120, pos: 18, lang: 83, order: 1},
        time_zavircheno: {a: 0, size: 120, pos: 19, lang: 84, order: 1},
        controls: {a: 1, size: 57, pos: 20, lang: 21, order: 0}
    };
    var filelist_colums = {
        select: {a: 1, size: 19, pos: 1, lang: 113, order: 0},
        name: {a: 1, size: 300, pos: 2, lang: 88, order: 1},
        size: {a: 1, size: 60, pos: 3, lang: 14, order: 1},
        download: {a: 1, size: 60, pos: 4, lang: 79, order: 1},
        progress: {a: 1, size: 70, pos: 5, lang: 15, order: 1},
        priority: {a: 1, size: 74, pos: 6, lang: 89, order: 1}
    };
    var bgTimer = function () {
        var timer;
        var start = function () {
            if (bgTimer.isStart || (settings.show_active_tr_on_icon === 0 && settings.notify_on_dl_comp === 0)) {
                return;
            }
            clearInterval(timer);
            timer = setInterval(function () {
                sendAction({list: 1, cid: 0});
            }, settings.bg_update_interval);
            bgTimer.isStart = true;
        };
        var stop = function () {
            if (!bgTimer.isStart) {
                return;
            }
            clearInterval(timer);
            bgTimer.isStart = false;
        };
        return {
            isStart: false,
            start: start,
            stop: stop
        };
    }();
    var showNotifi = function (icon, title, text, one) {
        if (mono.isModule) {
            if (title === 0) {
                title = text;
                text = undefined;
            }
            window.Notifications.notify({title: title, text: text, iconURL: icon });
            return;
        }
        if (mono.isChrome && chrome.notifications !== undefined) {
            var note_id = 'showNotifi';
            if (one !== undefined) {
                note_id += '_' + one;
            } else {
                note_id += Date.now();
            }
            var timer = note_id + '_timer';
            if (one !== undefined && var_cache[note_id] !== undefined) {
                var_cache[note_id] = undefined;
                clearTimeout(var_cache[timer]);
                chrome.notifications.clear(note_id, function() {});
            }
            /**
             * @namespace chrome.notifications
             */
            if (title === 0) {
                title = text;
                text = undefined;
            }
            chrome.notifications.create(
                note_id,
                { type: 'basic',
                    iconUrl: icon,
                    title: title,
                    message: text },
                function(id) {
                    var_cache[note_id] = id;
                }
            );
            if (settings.notify_visbl_interval > 0) {
                var_cache[timer] = setTimeout(function () {
                    var_cache[note_id] = undefined;
                    chrome.notifications.clear(note_id, function() {});
                }, settings.notify_visbl_interval);
            }
            return;
        }
    };
    var setStatus = function (type, data) {
        if (type === 'getToken') {
            if (data[0] === -1) {
                var_cache.client.status = undefined;
            } else if (data[0] === 200) {
                var_cache.client.status = lang_arr[22];
            } else {
                if (data[0] === 404) {
                    data[1] = lang_arr[35];
                } else if (data[0] === 401) {
                    data[1] = lang_arr[34];
                } else if (data[0] === 400) {
                    data[1] = lang_arr[38];
                } else if (data[0] === 0) {
                    data[1] = lang_arr[36];
                }
                var_cache.client.status = data[0] + ', ' + data[1];
            }
            mono.sendMessage({action: 'setStatus', data: var_cache.client.status}, undefined, 'mgr');
        } else {
            //for debug
            //console.log(type, data);
        }
    };
    var getToken = function (onload, onerror) {
        if (var_cache.get_token_count > 5) {
            console.log('Get token timeout!');
            var_cache.get_token_count = 0;
            return;
        }
        var_cache.get_token_count++;
        setStatus('getToken', [-1, 'Getting token...']);

        var url = var_cache.webui_url + '?' + jQ.param({method:'session-get'});
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
        var _onready = function() {
            setStatus('getToken', [200]);
            engine.cache = var_cache.client = {
                status: var_cache.client.status,
                token: xhr.getResponseHeader("X-Transmission-Session-Id")
            };
            if (onload !== undefined) {
                onload();
            }
            bgTimer.start();
        };
        var _onerror = function() {
            if (xhr.status === 409) {
                return _onready();
            }
            setStatus('getToken', [xhr.status, xhr.statusText]);
            if (onerror !== undefined) {
                onerror();
            }
            if (var_cache.client.getToken_error > 10) {
                bgTimer.stop();
            }
            var_cache.client.getToken_error = (var_cache.client.getToken_error === undefined) ? 1 : var_cache.client.getToken_error + 1;
        };
        xhr.onload = function() {
            if (xhr.status !== 200 && xhr.status !== 204) {
                return _onerror();
            }
            _onready();
        };
        xhr.onerror = _onerror;
        xhr.send();
    };
    var getStatusTransmission2uTorrent = function(code) {
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
    };
    var Transmission2uTorrentAPI = function(data) {
        /*

         ,arr[i][0] /* ХЭШ = id
         ,arr[i][1] /* STATUS CODE
         ,arr[i][2] /* ИМЯ = name
         ,arr[i][3] /* РАЗМЕР = totalSize
         ,arr[i][4] /* ПРОЦЕНТ ВЫПОЛНЕНИЯ = percentDone
         ,arr[i][5]/*  загружено = sizeWhenDone - leftUntilDone
         ,arr[i][6]/*  РОЗДАНО = uploadedEver
         ,arr[i][7]/*  КОЭФФИЦИЕНТ = item[5] / item[6]
         ,arr[i][8] /* СКОРОСТЬ РАЗДАЧИ = rateUpload
         ,arr[i][9] /* СКОРОСТЬ ЗАГРУЗКИ = rateDownload
         ,arr[i][10] /*ETA = eta
         ,arr[i][11] /*МЕТКА
         ,arr[i][12] /*ПОДКЛЮЧЕНО ПИРОВ = peersSendingToUs
         ,arr[i][13] /*ПИРЫ В РОЕ
         ,arr[i][14] /*ПОДКЛЮЧЕНО СИДОВ = webseedsSendingToUs
         ,arr[i][15] /*СИДЫ В РОЕ
         ,arr[i][16]/* ДОСТУПНОСТЬ
         ,arr[i][17] /*ПОРЯДОК ОЧЕРЕДИ ТОРРЕНТОВ = queuePosition
         ,arr[i][18]/* отдано
         ,arr[i][19]/* ?
         ,arr[i][20]/* ?
         ,arr[i][21] /*статус тескстом
         ,arr[i][22]/* sid
         ,arr[i][23]/* время старта = addedDate
         ,arr[i][24]/* время завершения = doneDate
         ,arr[i][26]/* path_to_file = downloadDir

         */

        var ut = {};
        var ut_settings = [];
        ut['label'] = [];
        arguments = data['arguments'] || [];
        var up_limit = -1;
        var dl_limit = -1;
        jQ.each(arguments, function(key, value) {
            if (key === 'torrents') {
                var fileMode = 0;
                if (value.length === 1 && 'fileStats' in value[0]) {
                    fileMode = 1;
                }
                var type = 'torrents';
                if (fileMode === 1 || var_cache.client.cid !== 0) {
                    type = 'torrentp';
                }
                ut[type] = [];
                var l = value.length;
                for (var i = 0; i < l; i++) {
                    var field = value[i];
                    if (field === undefined) {
                        console.log("Field undefined!");
                        continue;
                    }
                    var item = ["", 0, "", 0, 0, 0, 0, 0, 0, 0, 0, "", 0, 0, 0, 0, 0, 0, 0, "", "", "", "", 0, 0, "", "", 0];
                          //     0, 1,  2, 3, 4, 5, 6, 7, 8, 9,10, 11,12,13,14,15,16,17,18, 19, 20, 21, 22,23,24, 25, 26, 28
                    var utStatus = [];
                    if (field.id === undefined) {
                        console.log("File ID is undefined!");
                        continue;
                    }
                    if (field.error > 0) {
                        utStatus[0] = 144;
                        utStatus[1] = field.errorString || "Unknown error!";
                    } else {
                        utStatus = getStatusTransmission2uTorrent(field.status);
                    }
                    item[0] = 'trID_'+field.id;
                    item[1] = utStatus[0];
                    item[2] = field.name || "Unknown name";
                    item[3] = field.totalSize || 0;
                    if (field.recheckProgress === undefined) {
                        field.recheckProgress = 0;
                    }
                    if (field.percentDone === undefined) {
                        field.percentDone = 0;
                    }
                    if (field.recheckProgress !== 0) {
                        item[4] = parseInt(field.recheckProgress * 1000);
                    } else {
                        item[4] = parseInt(field.percentDone * 1000);
                    }
                    item[5] = field.downloadedEver || 0;
                    item[6] = field.uploadedEver || 0;
                    if (field.downloadedEver > 0) {
                        item[7] = Math.round(field.uploadedEver / field.downloadedEver * 1000);
                    } else {
                        item[7] = 0;
                    }
                    if (isNaN(item[7])) {
                        item[7] = 0;
                    }
                    item[8] = field.rateUpload || 0;
                    item[9] = field.rateDownload || 0;
                    item[10] = field.eta || 0;
                    if (item[10] < 0) {
                        item[10] = 0;
                    }
                    item[12] = field.peersGettingFromUs || 0;
                    var l_c = 0;
                    var s_c = 0;
                    if (field.trackerStats === undefined) {
                        field.trackerStats = [];
                    }
                    field.trackerStats.forEach(function(itm) {
                        if (itm.leecherCount > 0) {
                            l_c += itm.leecherCount;
                        }
                        if (itm.seederCount > 0) {
                            s_c += itm.seederCount;
                        }
                    });
                    item[13] = l_c;
                    item[14] = field.peersSendingToUs || 0;
                    item[15] = s_c;
                    item[17] = field.queuePosition || 0;

                    item[21] = utStatus[1];

                    item[23] = field.addedDate || 0;
                    item[24] = field.doneDate || 0;
                    item[26] = field.downloadDir || "Unknown path";
                    if (fileMode) {
                        ut['files'] = [];
                        ut['files'][0] = item[0];
                        ut['files'][1] = [];
                        if (field.files === undefined) {
                            field.files = [];
                        }
                        if (field.fileStats === undefined) {
                            field.fileStats = [];
                        }
                        var fn = field.files.length;
                        if (fn > field.fileStats.length) {
                            fn = 0;
                            console.log("Files more fileStats!");
                        }
                        var file_name_first_slash_position = -1;
                        var file_folder = undefined;
                        var count_files_in_first_folder = 0;
                        for (var n = 0; n < fn; n++) {
                            var f_item = field.files[n];
                            var s_item = field.fileStats[n] || {priority: 0};
                            var file = ["", 0, 0, 0, 0, 0, false, -1, -1, -1, -1, -1, 0];
                            /*
                             * name = 0
                             * size = 1
                             * dwnload = 2
                             * dune = 2
                             * prio = 3
                             */
                            if (s_item.wanted === false) {
                                s_item.priority = 0;
                            } else {
                                s_item.priority += 2;
                            }
                            if (n === 0 && file_folder === undefined) {
                                file_name_first_slash_position = f_item.name.indexOf('/');
                                if (file_name_first_slash_position !== -1) {
                                    file_folder = f_item.name.substr(0, file_name_first_slash_position);
                                }
                            }
                            if (file_folder !== undefined && f_item.name.substr(0, file_name_first_slash_position) === file_folder) {
                                count_files_in_first_folder++;
                            }
                            file[0] = f_item.name;
                            file[15] = f_item.name;
                            file[1] = f_item.length;
                            file[2] = f_item.bytesCompleted;
                            file[3] = s_item.priority;
                            ut['files'][1].push(file);
                        }
                        if (file_folder !== undefined && count_files_in_first_folder === fn) {
                            if (item[26].substr(-1) === '/') {
                                item[26] += file_folder;
                            } else {
                                item[26] += '/' + file_folder;
                            }
                            ut['files'][1].forEach(function(file) {
                                file[0] = file[0].substr(file_name_first_slash_position + 1);
                            });
                        }
                    }
                    ut[type].push(item);
                }
                ut['torrentc'] = 1;
            } else
            if (key === 'removed') {
                var val_len = value.length;
                if (val_len > 0) {
                    for (var i = 0; i < val_len; i++) {
                        value[i] = 'trID_'+value[i];
                    }
                    ut['torrentm'] = value;
                }
            } else
            if (key === 'speed-limit-down') {
                if (dl_limit === -1) {
                    dl_limit = value;
                }
            } else
            if (key === 'speed-limit-down-enabled' && value === false) {
                dl_limit = 0;
            } else
            if (key === 'speed-limit-up') {
                if (up_limit === -1) {
                    up_limit = value;
                }
            } else
            if (key === 'speed-limit-up-enabled' && value === false) {
                up_limit = 0;
            } else
            if (key === 'alt-speed-enabled') {
                var_cache.client.alt_speed = value;
                mono.sendMessage({action: 'setAltSpeedState', data: value === true}, undefined, 'mgr');
            } else
            if (key === 'download-dir') {
                ut_settings.push(['download-dir', '', value]);
            } else
            if (key === 'download-dir-free-space') {
                ut_settings.push(['download-dir-free-space', '', value]);
            } else
            if (key === 'size-bytes') {
                ut.free_space = value;
            }
        });
        if (up_limit !== -1 && dl_limit !== -1) {
            ut_settings.push(['max_dl_rate', '', dl_limit], ['max_ul_rate', '', up_limit]);
        }
        if (ut_settings.length > 0) {
            ut['settings'] = ut_settings;
        }
        return ut;
    };
    var uTorrent2Transmission = function(url) {
        if (typeof url === 'string') {
            url = url.split('&');
            var params = {};
            for (var i = 0, item; item = url[i]; i++) {
                if (item.length === 0) {
                    continue;
                }
                var splitBy = item.indexOf('=');
                var key = item.substr(0, splitBy);
                var val = item.substr(splitBy+1);
                if (key === 'f') {
                    val = parseInt(val);
                }
                if (params[key] !== undefined) {
                    if (typeof (params[key]) !== "object") {
                        params[key] = [params[key]];
                    }
                    params[key].push(val);
                } else {
                    params[key] = val;
                }
            }
        } else {
            params = jQ.extend(true, {}, url);
        }
        if (params.hash !== undefined) {
            if (typeof params.hash !== 'object') {
                params.hash = parseInt(params.hash.substr(5));
            } else {
                for (var i = 0, item; item = params.hash[i]; i++) {
                    params.hash[i] = parseInt(item.substr(5));
                }
            }
        }
        if (params.p !== undefined) {
            params.p = parseInt(params.p);
        }
        if (params.f !== undefined && typeof params.f !== 'object' ) {
            params.f = [params.f];
        }
        var data = {};
        var dont_get_list = 0;
        var onload = undefined;
        if (params.action !== undefined) {
            if (params.action === 'getfiles') {
                dont_get_list = 1;
                data = {
                    method: "torrent-get",
                    arguments: {
                        fields: ["id", "name", "totalSize", "percentDone", 'downloadedEver', 'uploadedEver', 'rateUpload', 'rateDownload', 'eta', 'peersSendingToUs', 'peersGettingFromUs', 'queuePosition', 'addedDate', 'doneDate', 'downloadDir', 'recheckProgress', 'status', 'error', 'errorString', 'trackerStats', 'files', 'fileStats'],
                        ids: params.hash
                    }
                };
            } else
            if (params.action === 'start' || params.action === 'unpause') {
                data = {
                    method: "torrent-start"
                };
                if (params.hash !== undefined) {
                    data['arguments'] = {ids: params.hash};
                }
            } else
            if (params.action === 'stop' || params.action === 'pause') {
                data = {
                    method: "torrent-stop",
                    arguments: {
                        ids: params.hash
                    }
                };
            } else
            if (params.action === 'recheck') {
                data = {
                    method: "torrent-verify",
                    arguments: {
                        ids: params.hash
                    }
                };
            } else
            if (params.action === 'remove' || params.action === 'removetorrent') {
                data = {
                    method: "torrent-remove",
                    arguments: {
                        ids: params.hash
                    }
                };
            } else
            if (params.action === 'removedata' || params.action === 'removedatatorrent') {
                data = {
                    method: "torrent-remove",
                    arguments: {
                        'delete-local-data': true,
                        ids: params.hash
                    }
                };
            } else
            if (params.action === 'getsettings') {
                data = {method: "session-get"};
            } else
            if (params.action === 'setprio') {
                var files = params.f;
                onload = function() {
                    sendAction({action: 'getfiles', hash: 'trID_'+params.hash});
                };
                if (params.p === 2) {
                    data = {
                        method: "torrent-set",
                        arguments: {
                            'priority-normal': files,
                            'files-wanted': files,
                            ids: params.hash
                        }
                    };
                } else
                if (params.p === 1) {
                    data = {
                        method: "torrent-set",
                        arguments: {
                            'priority-low': files,
                            'files-wanted': files,
                            ids: params.hash
                        }
                    };
                } else
                if (params.p === 3) {
                    data = {
                        method: "torrent-set",
                        arguments: {
                            'priority-high': files,
                            'files-wanted': files,
                            ids: params.hash
                        }
                    };
                } else
                if (params.p === 0) {
                    data = {
                        method: "torrent-set",
                        arguments: {
                            'files-unwanted': files,
                            ids: params.hash
                        }
                    };
                }
            } else
            if (params.action === 'setsetting') {
                var speed = params.v;
                dont_get_list = 1;
                data = {
                    method: "session-set",
                    arguments: {}
                };
                if (params.s === "max_dl_rate") {
                    if (speed === 0) {
                        data.arguments['speed-limit-down-enabled'] = false;
                    } else {
                        data.arguments['speed-limit-down-enabled'] = true;
                        data.arguments['speed-limit-down'] = speed;
                    }
                }
                if (params.s === "max_ul_rate") {
                    if (speed === 0) {
                        data.arguments['speed-limit-up-enabled'] = false;
                    } else {
                        data.arguments['speed-limit-up-enabled'] = true;
                        data.arguments['speed-limit-up'] = speed;
                    }
                }
                if (params.s === "alt-speed-enabled") {
                    data.arguments['alt-speed-enabled'] = (speed !== 0);
                }
            } else
            if (params.action === 'add-url') {
                data = {
                    method: 'torrent-add',
                    arguments: {
                        filename: params.s
                    }
                };
                if (params.download_dir !== undefined) {
                    data.arguments['download-dir'] = params.path;
                }
            } else
            if (params.action === 'rename') {
                data = {
                    method: "torrent-rename-path",
                    arguments: {
                        ids: params.hash,
                        path: params.path,
                        name: params.name
                    }
                };
            } else
            if (params.action === 'move') {
                data = {
                    method: "torrent-set-location",
                    arguments: {
                        ids: params.hash,
                        location: params.location,
                        move: params.move === true
                    }
                };
            } else
            if (params.action === 'free-space') {
                data = {
                    method: "free-space",
                    arguments: {
                        path: params.path
                    }
                };
            }
        } else
        if (params.list !== undefined) {
            dont_get_list = 1;

            data = {
                method: "torrent-get",
                arguments: {
                    fields: ["id", "name", "totalSize", "percentDone", 'downloadedEver', 'uploadedEver', 'rateUpload', 'rateDownload', 'eta', 'peersSendingToUs', 'peersGettingFromUs', 'queuePosition', 'addedDate', 'doneDate', 'downloadDir', 'recheckProgress', 'status', 'error', 'errorString', 'trackerStats']
                }
            };
            if (params.cid !== 0) {
              data.arguments['ids'] = "recently-active";
            } else {
              var_cache.client.cid = 0;
            }
        }
        if (dont_get_list === 0 && onload === undefined && params.list !== undefined) {
            onload = function() {
                sendAction({list: 1});
            };
        }
        return {data: JSON.stringify(data), onload: onload};
    };
    var sendAction = function (data, onload) {
        if (var_cache.client.token === undefined) {
            getToken(function () {
                sendAction(data, onload);
            });
            return;
        }
        var _data;
        if (typeof data === 'string') {
            _data = data + '&cid=' + var_cache.client.cid;
        } else {
            _data = jQ.extend({cid: var_cache.client.cid}, data);
        }
        var onerror, onready;
        if (data.torrent_file !== undefined) {
            var reader = new window.FileReader();
            reader.readAsDataURL(data.torrent_file);
            reader.onloadend = function() {
                var xhr = new XMLHttpRequest();
                xhr.open("POST", var_cache.webui_url, true);
                xhr.setRequestHeader("X-Transmission-Session-Id", var_cache.client.token || '');
                if (settings.login.length > 0 || settings.password.length > 0) {
                    xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
                }
                onready = function () {
                    var_cache.get_token_count = 0;
                    var data;
                    try {
                        data = JSON.parse(xhr.responseText);
                    } catch (err) {
                        showNotifi(error_icon, lang_arr[103], '', 'addFile');
                        return;
                    }
                    if (onload !== undefined) {
                        onload(data);
                    }
                    readResponse(data);
                };
                onerror = function () {
                    showNotifi(error_icon, xhr.status, xhr.statusText, 'addFile');
                    setStatus('sendFile', [xhr.status, xhr.statusText, _data]);
                    //400 - invalid request, когда token протухает
                    if (var_cache.client.sendAction_error > 3 || xhr.status === 409) {
                        var_cache.client.token = undefined;
                        sendAction(data, onload);
                        return;
                    }
                    var_cache.client.sendAction_error = (var_cache.client.sendAction_error === undefined) ? 1 : var_cache.client.sendAction_error + 1;
                };
                var file_data_pos = reader.result.indexOf(',');
                var params = {
                    method: "torrent-add",
                    arguments: {
                        metainfo: reader.result.substr(file_data_pos + 1)
                    }
                };
                if (data.download_dir !== undefined) {
                    params.arguments['download-dir'] = data.path;
                }
                xhr.onload = function() {
                    if (xhr.status !== 200 && xhr.status !== 204) {
                        return onerror();
                    }
                    onready();
                };
                xhr.onerror = onerror;
                xhr.send(JSON.stringify(params));
            };
            return;
        }
        var tr_data = uTorrent2Transmission(_data);
        if (tr_data.onload !== undefined) {
            onload = tr_data.onload;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', var_cache.webui_url, true);
        xhr.responseType = 'json';
        xhr.setRequestHeader("X-Transmission-Session-Id", var_cache.client.token || '');
        if (settings.login.length > 0 || settings.password.length > 0) {
            xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
        }
        onready = function(e) {
            var data = xhr.response;
            var_cache.get_token_count = 0;
            var data = Transmission2uTorrentAPI(data);
            if (onload !== undefined) {
                onload(data);
            }
            readResponse(data);
        };
        onerror = function() {
            setStatus('sendAction', [xhr.status, xhr.statusText, _data]);
            if (var_cache.client.sendAction_error > 3 || xhr.status === 409) {
                var_cache.client.token = undefined;
                sendAction(data, onload);
                return;
            }
            var_cache.client.sendAction_error = (var_cache.client.sendAction_error === undefined) ? 1 : var_cache.client.sendAction_error + 1;
        };
        xhr.onload = function() {
            if (xhr.status !== 200 && xhr.status !== 204) {
                return onerror();
            }
            onready();
        };
        xhr.onerror = onerror;
        xhr.send(jQ.param(tr_data.data));
    };
    var readResponse = function (data) {
        /**
         * @namespace data.torrentc
         * @namespace data.torrents
         * @namespace data.torrentp
         * @namespace data.torrentm
         * @namespace data.label
         * @namespace data.settings
         * @namespace data.files
         */
        if (data.torrentc !== undefined) {
            //get CID
            var_cache.client.cid = data.torrentc;
        }
        if (data.torrentm !== undefined && data.torrentm.length > 0) {
            var list = var_cache.client.torrents || [];
            for (var i = 0, item_m; item_m = data.torrentm[i]; i++) {
                for (var n = 0, item_s; item_s = list[n]; n++) {
                    if (item_s[0] === item_m) {
                        list.splice(n, 1);
                        break;
                    }
                }
            }
            mono.sendMessage({action: 'deleteItem', data: data.torrentm}, undefined, 'mgr');
        }
        if (data.torrents !== undefined) {
            //Full torrent list
            var old_arr = (var_cache.client.torrents || []).slice(0);
            var_cache.client.torrents = data.torrents;
            trafficCounter(data.torrents);
            mono.sendMessage({action: 'updateList', data1: data.torrents, data2: 1}, undefined, 'mgr');
            showOnCompleteNotification(old_arr, data.torrents);
            showActiveCount(data.torrents);
        } else if (data.torrentp !== undefined) {
            //update with CID
            var old_arr = (var_cache.client.torrents || []).slice(0);
            var list = var_cache.client.torrents || [];
            var new_item = [];
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
                    new_item.push(item_p);
                    list.push(item_p);
                }
            }
            var_cache.client.torrents = list;
            trafficCounter(data.torrentp);
            mono.sendMessage({action: 'updateList', data1: list, data2: 1}, undefined, 'mgr');
            showOnCompleteNotification(old_arr, data.torrentp);
            showActiveCount(list);
            if (var_cache.newFileListener !== undefined) {
                var_cache.newFileListener(new_item);
            }
        }
        if (data['download-dirs'] !== undefined) {
            mono.sendMessage({action: 'setDirList', data: data['download-dirs']}, undefined, 'opt');
        }
        if (data.label !== undefined) {
            var labels = var_cache.client.labels || [];
            if (data.label.length !== labels.length) {
                var_cache.client.labels = data.label;
                mono.sendMessage({action: 'setLabels', data: data.label}, undefined, 'mgr');
            } else {
                for (var i = 0, item_d; item_d = data.label[i]; i++) {
                    var found = false;
                    for (var n = 0, item_s; item_s = labels[n]; n++) {
                        if (item_d[0] === item_s[0]) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        var_cache.client.labels = data.label;
                        mono.sendMessage({action: 'setLabels', data: data.label}, undefined, 'mgr');
                        break;
                    }
                }
            }
        }
        if (data.settings !== undefined) {
            var_cache.client.settings = data.settings;
            mono.sendMessage([{action: 'setSpeedLimit', data: var_cache.client.settings},
                {action: 'setSpace', data: var_cache.client.settings}], undefined, 'mgr');
        }
        if (data.files !== undefined) {
            mono.sendMessage({action: 'setFileList', data: data.files}, undefined, 'mgr');
        }
    };
    var showOnCompleteNotification = function (old_array, new_array) {
        if (!settings.notify_on_dl_comp || old_array.length === 0) {
            return;
        }
        for (var i = 0, item_new; item_new = new_array[i]; i++) {
            if (item_new[4] !== 1000) {
                continue;
            }
            for (var n = 0, item_old; item_old = old_array[n]; n++) {
                if (item_old[4] === 1000 || ( item_old[24] !== 0 && item_old[24] !== undefined ) || item_old[0] !== item_new[0]) {
                    continue;
                }
                showNotifi(complete_icon, item_new[2], (item_new[21]!== undefined)?lang_arr[57] + item_new[21]:'');
            }
        }
    };
    var trafficCounter = function (arr) {
        if (!settings.graph) {
            return;
        }
        var limit = 90;
        var dl_sum = 0;
        var up_sum = 0;
        for (var i = 0, item; item = arr[i]; i++) {
            dl_sum += item[9];
            up_sum += item[8];
        }
        var time = parseInt(Date.now()/1000) - var_cache.startTime;
        var traf0 = var_cache.traffic[0];
        var traf1 = var_cache.traffic[1];
        var values_len = traf0.values.length;
        if (values_len > 1 && time - limit > traf0.values[values_len - 1].time) {
            traf0.values = traf0.values.slice(-1);
            traf1.values = traf1.values.slice(-1);
        }
        traf0.values.push({time: time, pos: dl_sum});
        traf1.values.push({time: time, pos: up_sum});
        if (values_len > limit * 3) {
            traf0.values.splice(0, values_len - limit);
            traf1.values.splice(0, values_len - limit);
        }
    };

    var mkFFIconWithText = function(size, count, cb) {
        var xhr = new XMLHttpRequest();
        var url = self.data.url('./icons/icon-'+size+'.png');
        if (count === 0) {
            return cb(url, count);
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
                if (count < 10) {
                    box_w = 8;
                }
                if (size === 32) {
                    box_w = 20;
                    box_h = 16;
                    text_p = 2;
                    fSize = 16;
                    if (count < 10) {
                        box_w = 12;
                    }
                }
                if (size === 64) {
                    box_w = 38;
                    box_h = 30;
                    text_p = 4;
                    fSize = 30;
                    if (count < 10) {
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
                    '">'+count+'</text>'+'</svg>';
                cb(img, count);
            };
            reader.readAsDataURL(xhr.response);
        };
        xhr.send();
    };

    var showActiveCount = function (arr) {
        if (!settings.show_active_tr_on_icon) {
            return;
        }
        var active = 0;
        for (var i = 0, item; item = arr[i]; i++) {
            if (item[4] !== 1000 && ( item[24] === undefined || item[24] === 0)) {
                active++;
            }
        }
        if (var_cache.client.active_torrent === active) {
            return;
        }
        var_cache.client.active_torrent = active;
        if (mono.isFF) {
            mkFFIconWithText(16, active, function(url16, count) {
                mkFFIconWithText(32, count, function(url32) {
                    mkFFIconWithText(64, count, function(url64) {
                        ffButton.icon = {
                            "16": url16,
                            "32": url32,
                            "64": url64
                        };
                    });
                });
            });
        }
        if (mono.isChrome) {
            /**
             * @namespace chrome.browserAction.setBadgeText
             */
            chrome.browserAction.setBadgeText({
                text: (active > 0) ? String(active) : ''
            });
        }
    };
    var setOnFileAddListener = function (label) {
        var_cache.newFileListener = function (new_file) {
            if (new_file.length === 0) {
                var_cache.newFileListener = undefined;
                showNotifi(error_icon, lang_arr[112], '', 'addFile');
                return;
            }
            if (new_file.length !== 1) {
                var_cache.newFileListener = undefined;
                return;
            }
            var item = new_file[0];
            if (label !== undefined && item[11].length === 0) {
                sendAction({action: 'setprops', s: 'label', hash: item[0], v: label});
            }
            if (settings.change_downloads) {
                var ch_label = {label: 'download', custom: 1};
                mono.sendMessage({action: 'setLabel', data: ch_label}, undefined, 'mgr');
                mono.storage.set({selected_label: ch_label});
            }
            showNotifi(add_icon, item[2], lang_arr[102], 'addFile');
            var_cache.newFileListener = undefined;
        };
    };
    var downloadFile = function (url, cb, referer) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        if (referer !== undefined) {
            xhr.setRequestHeader('Referer', referer);
        }
        xhr.onprogress = function (e) {
            /**
             * @namespace e.total
             * @namespace e.loaded
             */
            if (e.total > 1048576 * 10 || e.loaded > 1048576 * 10) {
                xhr.abort();
                showNotifi(error_icon, lang_arr[122][0],  lang_arr[122][1], 'addFile');
            }
        };
        xhr.onload = function () {
            cb(xhr.response);
        };
        xhr.onerror = function () {
            if (xhr.status === 0) {
                showNotifi(error_icon, xhr.status, lang_arr[103], 'addFile');
            } else {
                showNotifi(error_icon, xhr.status, xhr.statusText, 'addFile');
            }
            setStatus('downloadFile', [xhr.status, xhr.statusText]);
        };
        xhr.send();
    };
    var sendFile = function (url, dir, label) {
        if (typeof url === "string") {
            if (url.substr(0, 7).toLowerCase() === 'magnet:') {
                sendAction({list: 1}, function () {
                    sendAction(jQ.extend({action: 'add-url', s: url}, dir), function (data) {
                        setOnFileAddListener(label);
                        if (data.result && data.result !== 'success') {
                            showNotifi(error_icon, lang_arr[23], data.result, 'addFile');
                            var_cache.newFileListener = undefined;
                        }
                        sendAction({list: 1});
                    });
                });
            } else {
                downloadFile(url, function (file) {
                    if (url.substr(0,5) === 'blob:') {
                        window.URL.revokeObjectURL(url);
                    }
                    sendFile(file, dir, label);
                });
            }
        } else {
            sendAction({list: 1}, function () {
                sendAction(jQ.extend({action: 'add-file', torrent_file: url}, dir), function (data) {
                    setOnFileAddListener(label);
                    if (data.result && data.result !== 'success') {
                        showNotifi(error_icon, lang_arr[23], data.result, 'addFile');
                        var_cache.newFileListener = undefined;
                    }
                    sendAction({list: 1});
                });
            });
        }
    };
    var onCtxMenuCall = function (e) {
        /**
         * @namespace e.linkUrl
         * @namespace e.menuItemId
         */
        var link = e.linkUrl;
        var id = e.menuItemId;
        var updateMenu = false;
        if (id === 'new') {
            var path = window.prompt(lang_arr.cmNewPathDialog, var_cache.folders_array[0][1]);
            if (!path) {
                return;
            }
            var download_dir = var_cache.folders_array[0][0];
            id = var_cache.folders_array.length;
            var_cache.folders_array.push([download_dir, path]);
            settings.folders_array.push([download_dir, path]);
            updateMenu = true;
        }
        if (id === 'main' || id === 'default') {
            sendFile(link);
            return;
        }
        var dir, label;
        var item = var_cache.folders_array[id];
        if (!isTransmission && settings.context_labels) {
            label = item[1];
        } else {
            dir = {download_dir: item[0], path: item[1]};
        }
        if (updateMenu) {
            mono.storage.set({ folders_array: JSON.stringify(settings.folders_array) }, function() {
                createCtxMenu();
            });
        }
        sendFile(link, dir, label);
    };

    var listToTreeList = function() {
        var tmp_folders_array = [];
        var tree = {};
        var sepType;
        var treeLen = 0;
        for (var i = 0, item; item = var_cache.folders_array[i]; i++) {
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
        for (var i = 0, item; item = var_cache.folders_array[i]; i++) {
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
                        title: lang_arr.cmCf
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
    };

    var createCtxMenu = function () {
        var_cache.folders_array = settings.folders_array.slice(0);
        if (mono.isModule) {
            var contentScript = (function() {
                var onClick = function() {
                    self.on("click", function(node) {
                        var href = node.href;
                        if (!href) {
                            return cb({error: 0});
                        }
                        if (href.substr(0, 7).toLowerCase() === 'magnet:') {
                            return self.postMessage(node.href);
                        }
                        var downloadFile = function (url, cb) {
                            var xhr = new XMLHttpRequest();
                            xhr.open('GET', url, true);
                            xhr.responseType = 'blob';
                            xhr.onprogress = function (e) {
                                if (e.total > 1048576 * 10 || e.loaded > 1048576 * 10) {
                                    xhr.abort();
                                    cb({error: 0});
                                }
                            };
                            xhr.onload = function () {
                                cb( URL.createObjectURL(xhr.response) );
                            };
                            xhr.onerror = function () {
                                if (xhr.status === 0) {
                                    cb({error: 1, url: url, referer: window.location.href});
                                } else {
                                    cb({error: 1, status: xhr.status, statusText: xhr.statusText});
                                }
                            };
                            xhr.send();
                        };
                        downloadFile(href, self.postMessage);
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
            var cm = require("sdk/context-menu");
            try {
                if (var_cache.topLevel && var_cache.topLevel.parentMenu) {
                    var_cache.topLevel.parentMenu.removeItem(var_cache.topLevel);
                }
            } catch (e) {
                var_cache.topLevel = undefined;
            }
            if (!settings.context_menu_trigger) {
                return;
            }
            if (var_cache.folders_array.length === 0) {
                var_cache.topLevel = cm.Item({
                    label: lang_arr[104],
                    context: cm.SelectorContext("a"),
                    image: self.data.url('./icons/icon-16.png'),
                    contentScript: contentScript,
                    onMessage: function (data) {
                        if (typeof data === 'object') {
                            if (data.error === 0) {
                                return showNotifi(error_icon, lang_arr[122][0],  lang_arr[122][1], 'addFile');
                            }
                            if (data.error === 1) {
                                if (data.url) {
                                    return downloadFile(data.url, function(data) {
                                        sendFile(data);
                                    }, data.referer);
                                }
                                return showNotifi(error_icon, data.status, lang_arr[103], 'addFile');
                            }
                            if (data.error === 2) {
                                return showNotifi(error_icon, data.status, data.statusText, 'addFile');
                            }
                        }
                        sendFile(data);
                    }
                });
            } else {
                var onMessage = function(data) {
                    var _this = this;
                    if (typeof data === 'object') {
                        if (data.error === 0) {
                            return showNotifi(error_icon, lang_arr[122][0],  lang_arr[122][1], 'addFile');
                        }
                        if (data.error === 1) {
                            if (data.url) {
                                return downloadFile(data.url, function(data) {
                                    onCtxMenuCall({
                                        linkUrl: data,
                                        menuItemId: _this.data
                                    }, data.referer);
                                });
                            }
                            return showNotifi(error_icon, data.status, lang_arr[103], 'addFile');
                        }
                        if (data.error === 2) {
                            return showNotifi(error_icon, data.status, data.statusText, 'addFile');
                        }
                    }
                    onCtxMenuCall({
                        linkUrl: data,
                        menuItemId: this.data
                    });
                };
                var items = [];
                if (settings.tree_view_menu) {
                    var treeList = listToTreeList();
                    var createItems = function(parentId, itemList) {
                        var menuItemList = [];
                        for (var i = 0, item; item = itemList[i]; i++) {
                            if (item.parentId !== parentId) {
                                continue;
                            }
                            var itemOpt = { label: item.title, context: cm.SelectorContext("a") };
                            var subItems = createItems( item.id, itemList );
                            if (subItems.length !== 0) {
                                itemOpt.items = subItems;
                                menuItemList.push(cm.Menu(itemOpt));
                            } else {
                                itemOpt.onMessage = onMessage;
                                itemOpt.contentScript = contentScript;
                                itemOpt.data = item.id;
                                menuItemList.push(cm.Item(itemOpt));
                            }
                        }
                        return menuItemList;
                    };
                    items = createItems('main', treeList.tree);
                    var_cache.folders_array = treeList.list;
                } else {
                    for (var i = 0, item; item = var_cache.folders_array[i]; i++) {
                        items.push(cm.Item({ label: item[1], data: String(i), context: cm.SelectorContext("a"), onMessage: onMessage, contentScript: contentScript }));
                    }
                }

                if (settings.show_default_dir) {
                    items.push(cm.Item({ label: lang_arr.cmDf, data: 'default', context: cm.SelectorContext("a"), onMessage: onMessage, contentScript: contentScript }));
                }
                items.push(cm.Item({ label: lang_arr.cmCreateItem, data: 'new', context: cm.SelectorContext("a"), onMessage: onMessage, contentScript: contentScript }));

                var_cache.topLevel = cm.Menu({
                    label: lang_arr[104],
                    context: cm.SelectorContext("a"),
                    image: self.data.url('./icons/icon-16.png'),
                    items: items
                });
            }
        } else
        if (mono.isChrome) {
            /**
             * @namespace chrome.contextMenus.removeAll
             * @namespace chrome.contextMenus.create
             */
            chrome.contextMenus.removeAll(function () {
                if (!settings.context_menu_trigger) {
                    return;
                }
                chrome.contextMenus.create({
                    id: 'main',
                    title: lang_arr[104],
                    contexts: ["link"],
                    onclick: onCtxMenuCall
                }, function () {
                    if (var_cache.folders_array.length === 0) {
                        return;
                    }
                    if (settings.tree_view_menu) {
                        var treeList = listToTreeList();
                        for (var i = 0, item; item = treeList.tree[i]; i++) {
                            chrome.contextMenus.create({
                                id: item.id,
                                parentId: item.parentId,
                                title: item.title,
                                contexts: ["link"],
                                onclick: onCtxMenuCall
                            });
                        }
                        var_cache.folders_array = treeList.list;
                    } else {
                        for (var i = 0, item; item = var_cache.folders_array[i]; i++) {
                            chrome.contextMenus.create({
                                id: String(i),
                                parentId: 'main',
                                title: item[1],
                                contexts: ["link"],
                                onclick: onCtxMenuCall
                            });
                        }
                    }
                    if (settings.show_default_dir) {
                        chrome.contextMenus.create({
                            id: 'default',
                            parentId: 'main',
                            title: lang_arr.cmDf,
                            contexts: ["link"],
                            onclick: onCtxMenuCall
                        });
                    }
                    chrome.contextMenus.create({
                        id: 'new',
                        parentId: 'main',
                        title: lang_arr.cmCreateItem,
                        contexts: ["link"],
                        onclick: onCtxMenuCall
                    });
                });
            });
        }
    };
    var clone_obj = function (obj) {
        return jQ.extend(true, {}, obj);
    };
    var fastMigration = function(lStorage) {
        var settings = {};
        for (var key in def_settings) {
            var def_item = def_settings[key];
            var value = lStorage[key];
            if (value === undefined) {
                value = def_item.v;
            }
            if ( ['number', 'checkbox'].indexOf(def_item.t) !== -1 ) {
                value = parseInt(value);
                if (!isNaN(value)) {
                    settings[key] = value;
                }
            } else
            if (value) {
                settings[key] = value;
            }
        }
        if (['ru', 'en', 'fr'].indexOf(lStorage.lang) !== -1) {
            settings.lang = lStorage.lang;
        }
        ['fl_colums', 'fl_sort_by', 'fl_sort_colum', 'colums', 'tr_sort_by', 'tr_sort_colum'].forEach(function(key) {
            if (lStorage[key]) {
                settings[key] = lStorage[key];
            }
        });
        mono.storage.set(settings, function() {
            lStorage.migrated = true;
            window.location.reload();
        });
    };
    var emptyIconText = function() {
        if (mono.isChrome) {
            chrome.browserAction.setBadgeText({
                text: ''
            });
        }
        if (mono.isFF) {
            mkFFIconWithText(16, 0, function(url16, count) {
                mkFFIconWithText(32, count, function(url32) {
                    mkFFIconWithText(64, count, function(url64) {
                        ffButton.icon = {
                            "16": url16,
                            "32": url32,
                            "64": url64
                        };
                    });
                });
            });
        }
    };
    return {
        boot: function() {
            if (mono.isChrome) {
                if ( window.localStorage && localStorage.length > 0 && !localStorage.migrated ) {
                    fastMigration(localStorage);
                }
            }
            if (mono.isModule) {
                complete_icon = self.data.url(complete_icon);
                add_icon = self.data.url(add_icon);
                error_icon = self.data.url(error_icon);
            }
            engine.loadSettings(function() {
                engine.createCtxMenu();
                bgTimer.start();
            });
            if (mono.isChrome) {
                /**
                 * @namespace chrome.browserAction.setBadgeBackgroundColor
                 */
                chrome.browserAction.setBadgeBackgroundColor({
                    color: [0, 0, 0, 40]
                });
                emptyIconText();
            }
        },
        bgTimer: bgTimer,
        loadSettings: loadSettings,
        settings: settings,
        def_settings: def_settings,
        sendAction: sendAction,
        trafStartTime: var_cache.startTime,
        cache: var_cache.client,
        traffic: var_cache.traffic,
        getToken: getToken,
        getColums: function (cb) {
            mono.storage.get('colums', function(storage) {
                var value = storage.colums;
                if (value === undefined) {
                    return cb(clone_obj(table_colums));
                }
                cb( JSON.parse(value) );
            });
        },
        getDefColums: function () {
            return clone_obj(table_colums);
        },
        getFlColums: function (cb) {
            mono.storage.get('fl_colums', function(storage) {
                var value = storage.fl_colums;
                if (value === undefined) {
                    return cb(clone_obj(filelist_colums));
                }
                cb( JSON.parse(value) );
            });
        },
        getDefFlColums: function () {
            return clone_obj(filelist_colums);
        },
        setFlColums: function (a) {
            mono.storage.set({ fl_colums: JSON.stringify(a) });
        },
        setTrColums: function (a) {
            mono.storage.set({ colums: JSON.stringify(a) });
        },
        updateSettings: function (lang_type, cb) {
            if (lang_type) {
                if (mono.isFF) {
                    window.get_lang = ffLoader.main(ffDataLoader, "data/lang").get_lang;
                }
                lang_arr = window.get_lang(lang_type);
            }
            loadSettings(function() {
                engine.bgTimer.stop();
                engine.bgTimer.start();
                var_cache.get_token_count = 0;
                engine.cache = var_cache.client = {};
                var_cache.traffic[0].values = [];
                var_cache.traffic[1].values = [];
                createCtxMenu();
                emptyIconText();
                cb && cb();
            });
        },
        sendFile: sendFile,
        createCtxMenu: createCtxMenu
    };
}();