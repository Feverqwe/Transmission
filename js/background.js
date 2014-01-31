var engine = function () {
    var isTransmission = true;
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
        // Transmission
        // dostupno: {a: 0, size: 60, pos: 16, lang: 81, order: 1},
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
            url: var_cache.webui_url,
            beforeSend: function (xhr) {
                if (settings.login.length > 0) {
                    xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
                }
            },
            data: {
                method:'session-get'
            },
            error: function (xhr, textStatus) {
                if (xhr.status === 409) {
                    setStatus('getToken', [200]);
                    engine.cache = var_cache.client = {
                        status: var_cache.client.status,
                        token: xhr.getResponseHeader("X-Transmission-Session-Id")
                    };
                    if (onload !== undefined) {
                        onload();
                    }
                    bgTimer.start();
                    return;
                }
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
            uCode = 136;
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
            uCode = 233;
            Status = "Queued to download";
        } else
        if (code === 4) {
            uCode = 201;
            Status = "Downloading";
        } else
        if (code === 5) {
            uCode = 233;
            Status = "Queued to seed";
        } else
        if (code === 6) {
            uCode = 201;
            Status = "Seeding";
        } else {
            uCode = 201;
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
        ut['label'] = [];
        arguments = data['arguments'] || [];
        var up_limit = -1;
        var dl_limit = -1;
        $.each(arguments, function(key, value) {
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
                            file[0] = f_item.name;
                            file[1] = f_item.length;
                            file[2] = f_item.bytesCompleted;
                            file[3] = s_item.priority;
                            ut['files'][1].push(file);
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
                _send(function(window){
                    window.manager.setAltSpeedState(value === true)
                });
            }
        });
        if (up_limit !== -1 && dl_limit !== -1) {
            ut['settings'] = [['max_dl_rate', '', dl_limit], ['max_ul_rate', '', up_limit]];
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
            params = url;
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
        if (typeof data === 'string') {
            if (isTransmission && data.cid !== undefined) {
                data += '&cid=' + data.cid;
            } else {
                data += '&cid=' + var_cache.client.cid;
            }
        } else {
            if (isTransmission && data.cid !== undefined) {
                data.cid = data.cid;
            } else {
                data.cid = var_cache.client.cid;
            }
        }
        if (data.torrent_file !== undefined) {
            var reader = new FileReader();
            reader.readAsDataURL(data.torrent_file);
            reader.onloadend = function() {
                var xhr = new XMLHttpRequest();
                xhr.open("POST", var_cache.webui_url, true);
                xhr.setRequestHeader("X-Transmission-Session-Id", var_cache.client.token || '');
                if (settings.login.length > 0) {
                    xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
                }
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
                    if (var_cache.client.sendAction_error > 3 || xhr.status === 409) {
                        var_cache.client.token = undefined;
                        sendAction(data, onload);
                        return;
                    }
                    var_cache.client.sendAction_error = (var_cache.client.sendAction_error === undefined) ? 1 : var_cache.client.sendAction_error + 1;
                };
                var file_data_pos = reader.result.indexOf(',')
                var params = {
                    method: "torrent-add",
                    arguments: {
                        metainfo: reader.result.substr(file_data_pos + 1)
                    }
                };
                if (data.download_dir !== undefined) {
                    params.arguments['download-dir'] = data.path;
                }
                xhr.send(JSON.stringify(params));
            };
            return;
        }
        var data = uTorrent2Transmission(data);
        if (data.onload !== undefined) {
            onload = data.onload;
        }
        data = data.data;
        $.ajax({
            type: 'POST',
            dataType: 'json',
            data: data,
            url: var_cache.webui_url,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("X-Transmission-Session-Id", var_cache.client.token || '');
                if (settings.login.length > 0) {
                    xhr.setRequestHeader("Authorization", "Basic " + window.btoa(settings.login + ":" + settings.password));
                }
            },
            success: function (data) {
                var data = Transmission2uTorrentAPI(data);
                if (onload !== undefined) {
                    onload(data);
                }
                readResponse(data);
            },
            error: function (xhr, textStatus) {
                setStatus('sendAction', [xhr.status, textStatus, data]);
                if (var_cache.client.sendAction_error > 3 || xhr.status === 409) {
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
        if (!isTransmission && settings.context_labels) {
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