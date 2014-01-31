var engine = function () {
    var complete_icon = 'images/notification_done.png';
    var add_icon = 'images/notification_add.png';
    var error_icon = 'images/notification_error.png';
    var var_cache = {
        client: {},
        traffic: [{name:'download', values: []}, {name:'upload', values: []}]
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
        context_labels: {v: 0, t: "checkbox"}
    };
    var settings = {};
    var loadSettings = function () {
        $.each(def_settings, function (key, item) {
            var value = localStorage[key];
            if (value === undefined) {
                settings[key] = item.v;
                return 1;
            }
            if (item.t === 'checkbox' || item.t === 'number') {
                if (item.min !== undefined && value < item.min) {
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
        var current_notifi;
        var notifi = 'showNotifi';
        if (one !== undefined) {
            notifi += '_' + one;
        }
        var timer = notifi + '_timer';
        if (one !== undefined && var_cache[notifi] !== undefined) {
            clearTimeout(var_cache[timer]);
            var_cache[notifi].cancel();
        }
        /**
         * @namespace webkitNotifications.createNotification
         */
        if (title === 0) {
            title = text;
            text = '';
        }
        var_cache[notifi] = current_notifi = webkitNotifications.createNotification(
            icon,
            title,
            text
        );
        var_cache[notifi].show();
        var_cache[timer] = setTimeout(function () {
            current_notifi.cancel();
        }, settings.notify_visbl_interval);
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
            _send(function (window) {
                window.manager.setStatus(var_cache.client.status);
            });
        } else {
            //for debug
            //console.log(type, data);
        }
    };
    var getToken = function (onload, onerror) {
        setStatus('getToken', [-1, 'Getting token...']);
        $.ajax({
            url: var_cache.webui_url + "token.html",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
            },
            success: function (data) {
                setStatus('getToken', [200]);
                engine.cache = var_cache.client = {
                    status: var_cache.client.status,
                    token: $(data).text()
                };
                if (onload !== undefined) {
                    onload();
                }
                bgTimer.start();
            },
            error: function (xhr, textStatus) {
                setStatus('getToken', [xhr.status, textStatus]);
                if (onerror !== undefined) {
                    onerror();
                }
                if (var_cache.client.getToken_error > 10) {
                    bgTimer.stop();
                }
                var_cache.client.getToken_error = (var_cache.client.getToken_error === undefined) ? 1 : var_cache.client.getToken_error + 1;
            }
        });
    };
    var sendAction = function (data, onload) {
        if (var_cache.client.token === undefined) {
            getToken(function () {
                sendAction(data, onload);
            });
            return;
        }
        if (typeof data === 'string') {
            data += '&token=' + var_cache.client.token;
            if (data.cid !== undefined) {
                data += '&cid' + var_cache.client.cid;
            }
        } else {
            data.token = var_cache.client.token;
            data.cid = var_cache.client.cid;
        }
        if (data.torrent_file !== undefined) {
            var form_data = new FormData();
            var file = data.torrent_file;
            form_data.append("torrent_file", file);
            var xhr = new XMLHttpRequest();
            delete data.torrent_file;
            xhr.open("POST", var_cache.webui_url + '?' + $.param(data), true);
            xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
            xhr.onload = function () {
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
            xhr.onerror = function () {
                showNotifi(error_icon, xhr.status, xhr.statusText, 'addFile');
                setStatus('sendFile', [xhr.status, xhr.statusText, data]);
                //400 - invalid request, когда token протухает
                if (var_cache.client.sendAction_error > 3 || xhr.status === 400) {
                    var_cache.client.token = undefined;
                    data.torrent_file = file;
                    sendAction(data, onload);
                    return;
                }
                var_cache.client.sendAction_error = (var_cache.client.sendAction_error === undefined) ? 1 : var_cache.client.sendAction_error + 1;
            };
            xhr.send(form_data);
            return;
        }
        $.ajax({
            dataType: 'json',
            data: data,
            url: var_cache.webui_url,
            beforeSend: function (xhr) {
                setStatus('sendAction', [200]);
                xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
            },
            success: function (data) {
                if (onload !== undefined) {
                    onload(data);
                }
                readResponse(data);
            },
            error: function (xhr, textStatus) {
                setStatus('sendAction', [xhr.status, textStatus, data]);
                if (var_cache.client.sendAction_error > 3 || xhr.status === 400) {
                    var_cache.client.token = undefined;
                    sendAction(data, onload);
                    return;
                }
                var_cache.client.sendAction_error = (var_cache.client.sendAction_error === undefined) ? 1 : var_cache.client.sendAction_error + 1;
            }
        });
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
            _send(function (window) {
                if (window.manager === undefined) {
                    console.log('deleteItem not found!');
                    return;
                }
                window.manager.deleteItem(data.torrentm);
            });
        }
        if (data.torrents !== undefined) {
            //Full torrent list
            var old_arr = (var_cache.client.torrents || []).slice(0);
            var_cache.client.torrents = data.torrents;
            trafficCounter(data.torrents);
            _send(function (window) {
                window.manager.updateList(data.torrents, 1);
            });
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
            _send(function (window) {
                window.manager.updateList(list, 1);
            });
            showOnCompleteNotification(old_arr, data.torrentp);
            showActiveCount(list);
            if (var_cache.newFileListener !== undefined) {
                var_cache.newFileListener(new_item);
            }
        }
        if (data['download-dirs'] !== undefined) {
            _sendOptions(function (window) {
                window.options.setDirList(data['download-dirs']);
            });
        }
        if (data.label !== undefined) {
            var labels = var_cache.client.labels || [];
            if (data.label.length !== labels.length) {
                var_cache.client.labels = data.label;
                _send(function (window) {
                    window.manager.setLabels(data.label);
                });
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
                        _send(function (window) {
                            window.manager.setLabels(data.label);
                        });
                        break;
                    }
                }
            }
        }
        if (data.settings !== undefined) {
            var_cache.client.settings = data.settings;
            _send(function (window) {
                window.manager.setSpeedLimit(var_cache.client.settings);
            });
        }
        if (data.files !== undefined) {
            _send(function (window) {
                window.manager.setFileList(data.files);
            });
        }
    };
    var _send = function (cb) {
        if (var_cache.popup === undefined || var_cache.popup.window === null || var_cache.popup.manager === undefined) {
            delete var_cache.popup;
            return;
        }
        cb(var_cache.popup);
    };
    var _sendOptions = function (cb) {
        if (var_cache.options === undefined || var_cache.options.window === null || var_cache.options.options === undefined) {
            delete var_cache.options;
            return;
        }
        cb(var_cache.options);
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
                if (item_old[4] === 1000 || item_old[24] !== 0 || item_old[0] !== item_new[0]) {
                    continue;
                }
                showNotifi(complete_icon, item_new[2], lang_arr[57] + item_new[21]);
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
        var time = parseInt((new Date()).getTime()/1000);
        var traf0 = var_cache.traffic[0];
        var traf1 = var_cache.traffic[1];
        var values_len = traf0.values.length;
        if (values_len > 1 && time - limit > traf0.values[values_len - 1].time) {
            traf0.values = traf0.values.slice(-1);
            traf1.values = traf1.values.slice(-1);
            values_len = 2;
        }
        traf0.values.push({time: time, pos: dl_sum});
        traf1.values.push({time: time, pos: up_sum});
        if (values_len > limit * 3) {
            traf0.values = traf0.values.slice(-limit);
            traf1.values = traf1.values.slice(-limit);
        }
    };
    var showActiveCount = function (arr) {
        if (!settings.show_active_tr_on_icon) {
            return;
        }
        var active = 0;
        for (var i = 0, item; item = arr[i]; i++) {
            if (item[4] !== 1000 && item[24] === 0) {
                active++;
            }
        }
        if (var_cache.client.active_torrent !== active) {
            var_cache.client.active_torrent = active;
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
                sendAction({action: 'setprops', s: 'label', v: label, hash: item[0]});
            }
            if (settings.change_downloads) {
                var ch_label = {label: 'download', custom: 1};
                _send(function (window) {
                    window.manager.setLabel(ch_label);
                });
                localStorage.selected_label = JSON.stringify(ch_label);
            }
            showNotifi(add_icon, item[2], lang_arr[102], 'addFile');
            var_cache.newFileListener = undefined;
        };
    };
    var downloadFile = function (url, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
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
                    sendAction($.extend({action: 'add-url', s: url}, dir), function (data) {
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
                    sendFile(file, dir, label);
                });
            }
        } else {
            sendAction({list: 1}, function () {
                sendAction($.extend({action: 'add-file', torrent_file: url}, dir), function (data) {
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
        if (id === 'main') {
            sendFile(link);
            return;
        }
        var dir, label;
        var item = settings.folders_array[id];
        if (settings.context_labels) {
            label = item[1];
        } else {
            dir = {download_dir: item[0], path: item[1]};
        }
        sendFile(link, dir, label);
    };
    var createCtxMenu = function () {
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
                if (settings.folders_array.length === 0) {
                    return;
                }
                for (var i = 0, item; item = settings.folders_array[i]; i++) {
                    chrome.contextMenus.create({
                        id: String(i),
                        parentId: 'main',
                        title: item[1],
                        contexts: ["link"],
                        onclick: onCtxMenuCall
                    });
                }
            });
        });
    };
    var clone_obj = function (obj) {
        return JSON.parse(JSON.stringify(obj));
    };
    return {
        bgTimer: bgTimer,
        loadSettings: loadSettings,
        settings: settings,
        def_settings: def_settings,
        sendAction: sendAction,
        cache: var_cache.client,
        traffic: var_cache.traffic,
        getToken: getToken,
        getColums: function () {
            return (localStorage.colums !== undefined) ? JSON.parse(localStorage.colums) : clone_obj(table_colums);
        },
        getDefColums: function () {
            return clone_obj(table_colums);
        },
        getFlColums: function () {
            return (localStorage.fl_colums !== undefined) ? JSON.parse(localStorage.fl_colums) : clone_obj(filelist_colums);
        },
        getDefFlColums: function () {
            return clone_obj(filelist_colums);
        },
        setFlColums: function (a) {
            localStorage.fl_colums = JSON.stringify(a);
        },
        setTrColums: function (a) {
            localStorage.colums = JSON.stringify(a);
        },
        setColums: function (a) {
            //setTrColums
            localStorage.colums = JSON.stringify(a);
        },
        setWindow: function (window) {
            var_cache.popup = window;
        },
        setOptionsWindow: function (window) {
            var_cache.options = window;
        },
        getDefSettings: function () {
            return clone_obj(def_settings);
        },
        updateSettings: function (lang) {
            if (lang) {
                window.lang_arr = lang;
            }
            loadSettings();
            engine.bgTimer.stop();
            engine.bgTimer.start();
            engine.cache = var_cache.client = {};
            createCtxMenu();
        },
        sendFile: sendFile,
        createCtxMenu: createCtxMenu
    };
}();
(function () {
    engine.loadSettings();
    engine.createCtxMenu();
    engine.bgTimer.start();
    /**
     * @namespace chrome.browserAction.setBadgeBackgroundColor
     */
    chrome.browserAction.setBadgeBackgroundColor({
        color: [0, 0, 0, 40]
    });
    chrome.browserAction.setBadgeText({
        text: ''
    });
})();