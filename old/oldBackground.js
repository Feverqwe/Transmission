/**
 * @namespace require
 */
var lang_arr;
(function() {
    if (typeof window !== 'undefined') return;

    var self = require('sdk/self');
    window = require('sdk/window/utils').getMostRecentBrowserWindow();
    window.ffLoader = require('toolkit/loader');
    window.ffDataLoader = window.ffLoader.Loader({
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
    });
    mono = window.ffLoader.main(window.ffDataLoader, "data/mono");
    window.get_lang = window.ffLoader.main(window.ffDataLoader, "data/lang").get_lang;
    window.isModule = true;
    window.ffButton = undefined;
    window.Notifications = require("sdk/notifications");
    XMLHttpRequest = require('sdk/net/xhr').XMLHttpRequest;
    var sdk_timers = require("sdk/timers");
    setTimeout = sdk_timers.setTimeout;
    clearTimeout = sdk_timers.clearTimeout;
    setInterval = sdk_timers.setInterval;
    clearInterval = sdk_timers.clearInterval;
})();
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
            if (engine.settings.fix_cirilic_path === 1 &&
                key === 'path' && obj.hasOwnProperty('download_dir')) {
                itemsList.push(encodeURIComponent(key) + '=' + engine.in_cp1251(obj[key]));
            } else {
                itemsList.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
            }
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
        mono = mono.init(env);
        window.ffButton = button;
    }

    mono.sendHook.opt = function(){};
    mono.sendHook.mgr = function(){};

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
            return engine.sendAction(message.data, function() {
                cb();
            });
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
        ut_port: {v: 8080, t: "number", min: 1},
        ut_path: {v: "gui/", t: "text"},
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
        fix_cirilic: {v: 0, t: "checkbox"},
        tree_view_menu: {v: 0, t: "checkbox"},
        show_default_dir: {v: 0, t: "checkbox"},
        fix_cirilic_path: {v: 0, t: "checkbox"}
    };
    var settings = {};
    var loadSettings = function (cb) {
        var keys = [];
        for (var key in def_settings) {
            keys.push(key);
        }
        mono.storage.get(keys, function(options) {
            jQ.each(def_settings, function (key, item) {
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
        dostupno: {a: 0, size: 60, pos: 16, lang: 81, order: 1},
        metka: {a: 0, size: 100, pos: 17, lang: 82, order: 1},
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
                sendAction({list: 1});
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

        var url = var_cache.webui_url + "token.html";
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
        var _onready = function() {
            setStatus('getToken', [200]);
            var token = xhr.responseText.match(/>([^<]+)</);
            if (token && token.length > 1) {
                token = token[1];
            } else {
                token = '';
            }
            engine.cache = var_cache.client = {
                status: var_cache.client.status,
                token: token
            };
            if (onload !== undefined) {
                onload();
            }
            bgTimer.start();
        };
        var _onerror = function() {
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
    var sendAction = function (data, onload) {
        if (var_cache.client.token === undefined) {
            getToken(function () {
                sendAction(data, onload);
            });
            return;
        }
        var _data;
        if (typeof data === 'string') {
            _data = 'token=' + var_cache.client.token + '&cid=' + var_cache.client.cid + '&' + data;
        } else {
            _data = jQ.extend({token: var_cache.client.token, cid: var_cache.client.cid}, data);
        }
        var onerror, onready;
        if (_data.torrent_file !== undefined) {
            var form_data = new window.FormData();
            var file = _data.torrent_file;
            form_data.append("torrent_file", file);
            var xhr = new XMLHttpRequest();
            delete _data.torrent_file;
            xhr.open("POST", var_cache.webui_url + '?' + jQ.param(_data), true);
            xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
            onready = function () {
                var_cache.get_token_count = 0;
                var data;
                try {
                    var responseText = xhr.responseText;
                    if (settings.fix_cirilic === 1) {
                        responseText = fixCirilic(responseText);
                    }
                    data = JSON.parse(responseText);
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
                if (var_cache.client.sendAction_error > 3 || xhr.status === 400) {
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
            xhr.send(form_data);
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', var_cache.webui_url + '?' + jQ.param(_data), true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
        onready = function() {
            var data = xhr.responseText;
            if (data.length === 0) {
                return;
            }
            try {
                if (settings.fix_cirilic === 1) {
                    data = fixCirilic(data);
                }
                data = JSON.parse(data);
            } catch (err) {
                console.log('Data parse error!', data);
                return;
            }
            var_cache.get_token_count = 0;
            setStatus('sendAction', [200]);
            if (onload !== undefined) {
                onload(data);
            }
            readResponse(data);
        };
        onerror = function() {
            setStatus('sendAction', [xhr.status, xhr.statusText, _data]);
            if (var_cache.client.sendAction_error > 3 || xhr.status === 400) {
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
        xhr.send();
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
            mono.sendMessage({action: 'setSpeedLimit', data: var_cache.client.settings}, undefined, 'mgr');
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
        var self = require('sdk/self');
        var xhr = new XMLHttpRequest();
        var url = self.data.url('./icons/icon-'+size+'.png');
        if (count === 0) {
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
            if (item[4] !== 1000 && ( item[24] === undefined || item[24] === 0) ) {
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
                        window.ffButton.icon = {
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
                        if (data.error !== undefined) {
                            showNotifi(error_icon, lang_arr[23], data.error, 'addFile');
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
                    if (data.error !== undefined) {
                        showNotifi(error_icon, lang_arr[23], data.error, 'addFile');
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
        if (settings.context_labels) {
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
            var self = require('sdk/self');
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
    var fixCirilic = function () {
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
    }();
    var in_cp1251 = function(sValue) {
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
                        window.ffButton.icon = {
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
                var self = require('sdk/self');
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
                    window.get_lang = window.ffLoader.main(window.ffDataLoader, "data/lang").get_lang;
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
        createCtxMenu: createCtxMenu,
        in_cp1251: in_cp1251
    };
}();