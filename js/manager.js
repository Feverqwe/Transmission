/**
 * Create new element
 * @param {string} tagName
 * @param {object} obj
 * @returns {Element}
 */
mono.create = function(tagName, obj) {
    var el;
    if ( typeof tagName === 'string') {
        el = document.createElement(tagName);
    } else {
        el = tagName;
    }
    if (obj !== undefined) {
        for (var attr in obj) {
            var value = obj[attr];
            if (mono.create.hookList[attr]) {
                mono.create.hookList[attr](el, value);
                continue;
            }
            if (value === undefined || value === null) {
                continue;
            }
            el[attr] = value;
        }
    }
    return el;
};
mono.create.hookList = {
    text: function(el, value) {
        el.textContent = value;
    },
    data: function(el, value) {
        if (!value) return;

        for (var item in value) {
            var val = value[item];
            if (val !== null && val !== undefined) {
                el.dataset[item] = val;
            }
        }
    },
    class: function(el, value) {
        if (typeof value !== 'string') {
            for (var i = 0, len = value.length; i < len; i++) {
                var className = value[i];
                if (!className) {
                    continue;
                }
                el.classList.add(className);
            }
            return;
        }
        el.setAttribute('class', value);
    },
    style: function(el, value) {
        if (typeof value !== 'string') {
            for (var item in value) {
                el.style[item] = value[item];
            }
            return;
        }
        el.setAttribute('style', value);
    },
    append: function(el, value) {
        if (Array.isArray(value)) {
            for (var i = 0, len = value.length; i < len; i++) {
                var subEl = value[i];
                if (!subEl) {
                    continue;
                }
                if (typeof (subEl) === 'string') {
                    subEl = document.createTextNode(subEl);
                }
                el.appendChild(subEl);
            }
            return;
        }
        el.appendChild(value);
    },
    on: function(el, args) {
        if (typeof args[0] !== 'string') {
            for (var i = 0, len = args.length; i < len; i++) {
                var subArgs = args[i];
                el.addEventListener(subArgs[0], subArgs[1], subArgs[2]);
            }
            return;
        }
        //type, onEvent, useCapture
        el.addEventListener(args[0], args[1], args[2]);
    },
    onCreate: function(el, value) {
        value(el);
    }
};
mono.isVisibleElement = function(el) {
    return el.offsetWidth > 0 && el.offsetHeight > 0;
};
mono.spaceToUnderline = function(string) {
    return string.replace(/\s/, '_');
};

var manager = {
    language: {},
    settings: {},
    domCache: {
        body: document.body,
        menu: document.querySelector('ul.menu'),
        dlSpeed: document.querySelector('.status-panel td.speed.download'),
        upSpeed: document.querySelector('.status-panel td.speed.upload'),
        status: document.querySelector('.status-panel td.status div'),
        statusPanel: document.querySelector('.status-panel'),
        labelBox: document.querySelector('ul.menu li.select select'),
        trLayer: document.querySelector('.torrent-list-layer'),
        trTableMain: document.querySelector('.torrent-table-body'),
        trTableFixed: document.querySelector('.torrent-table-head'),
        trBody: document.querySelector('.torrent-table-body > tbody'),
        trHead: document.querySelector('.torrent-table-body > thead'),
        trFixedHead: document.querySelector('.torrent-table-head > thead'),
        fl: document.querySelector(".file-list"),
        flLayer: document.querySelector('.file-list > .fl-layer'),
        flTableMain: document.querySelector('.fl-table-body'),
        flTableFixed: document.querySelector('.fl-table-head'),
        flBody: document.querySelector('.fl-table-body > tbody'),
        flHead: document.querySelector('.fl-table-body > thead'),
        flFixedHead: document.querySelector('.fl-table-head > thead'),
        flBottom: document.querySelector('.file-list ul.bottom-menu'),
        dropLayer: document.querySelector('div.drop_layer')
    },
    varCache: {
        currentFilter: {label: 'ALL', custom: 1},
        trColumnList: {},
        trListItems: {},
        trSortColumn: 'name',
        trSortBy: 1,
        trSortList: [],

        flColumnList: {},
        flListLayer: {},
        flListItems: {},
        flSortColumn: 'name',
        flSortBy: 1,
        flSortList: [],
        trSelectedHashList: [],
        // filelist layer pos
        flWidth: 0,
        flHeight: 0,
        flLeft: 0,
        // show/hide filelist layer bottom
        flBottomIsHide: 0,
        flSmartName: {},
        labels: [],
        remoteLabels: [],
        speedLimit: {},
        folderList: [],
        webUiUrl: undefined,
        hasGraph: false,
        movebleStyleList: {},
        cid: undefined,
        settings: {},

        freeSpace: undefined
    },
    options: {
        scrollWidth: 17,
        trWordWrap: false,
        flWordWrap: true,
        windowMode: false,
        noSleep: false,
        trHasSelectCell: false,
        flHasSelectCell: false
    },
    api: function(data, onReady) {
        data.cid = manager.varCache.cid;
        mono.sendMessage({action: 'api', data: data}, onReady || function(data) {
            if (data.result !== 'success') {
                return;
            }
            mono.sendMessage({action: 'api', data: {action: 'getTorrentList'}}, function(data) {
                manager.writeTrList(data);
            });
        });
    },
    moveColumn: function(type, from, to) {
        var columnList = manager.varCache[type + 'ColumnArray'];
        var fromPos = -1;
        var toPos = -1;
        var toColumn;
        var fromColumn;
        for (var i = 0, column; column = columnList[i]; i++) {
            if (column.column === from) {
                fromPos = i;
                fromColumn = column;
            }
            if (column.column === to) {
                toPos = i;
                toColumn = column;
            }
        }
        if (fromPos === -1 || toPos === -1) {
            return;
        }

        columnList.splice(fromPos, 1);
        columnList.splice(toPos, 0, fromColumn);

        if (type === 'tr') {
            manager.timer.stop();
            manager.updateHead(type);
            manager.trFullUpdatePrepare([]);
            mono.sendMessage([
                {action: 'getRemoteTorrentList'},
                {action: 'setTrColumnArray', data: manager.varCache.trColumnArray}
            ], function(data) {
                manager.writeTrList({torrents: data.getRemoteTorrentList});
                manager.timer.start();
            });
        } else
        if (type === 'fl') {
            var flListLayer = manager.varCache.flListLayer;
            if (!flListLayer.param) {
                return;
            }
            manager.timer.stop();
            manager.updateHead(type);
            manager.flClearList();
            mono.sendMessage([
                {action: 'getFileList', hash: manager.varCache.flListLayer.hash},
                {action: 'setFlColumnArray', data: manager.varCache.flColumnArray}
            ], function(data) {
                manager.writeFlList(data.api);
                manager.timer.start();
            });
        }
    },
    onDragStart: function(e) {
        e.dataTransfer.setData("name", e.target.dataset.name);
        e.dataTransfer.setData("type", e.target.dataset.type);
    },
    onDragOver: function onDragOver(e) {
        var el = e.target;
        if (el.tagName !== 'TH' && el.parentNode.tagName !== 'TH') return;
        e.preventDefault();
        e.stopPropagation();
    },
    onDrop: function(e) {
        e.preventDefault();
        e.stopPropagation();
        var el = e.target;
        if (el.tagName !== 'TH') {
            el = el.parentNode;
        }
        if (el.tagName !== 'TH') {
            return;
        }

        var type = el.dataset.type;
        if (type !== e.dataTransfer.getData("type")) {
            return;
        }
        var toName = el.dataset.name;
        var fromName = e.dataTransfer.getData("name");
        if (toName === fromName) return;

        manager.moveColumn(type, fromName, toName);
    },
    trWriteHead: function() {
        var styleBody = '';
        var width = 0;
        manager.options.trHasSelectCell = false;
        var head = mono.create('tr', {
            append: (function() {
                var thList = [];
                var resizeEl;
                for (var i = 0, value; value = manager.varCache.trColumnArray[i]; i++) {
                    var key = value.column;
                    if (value.display !== 1) {
                        continue;
                    }
                    var orderClass = (manager.varCache.trSortColumn !== key) ? undefined : (manager.varCache.trSortBy === 1) ? 'sortDown' : 'sortUp';
                    thList.push(mono.create('th', {
                        class: [key, orderClass],
                        title: manager.language[value.lang],
                        data: {
                            name: key,
                            type: 'tr'
                        },
                        draggable: true,
                        on: [
                            ['dragstart', manager.onDragStart],
                            ['dragover', manager.onDragOver],
                            ['drop', manager.onDrop]
                        ],
                        append: [
                            (key === 'checkbox') ? mono.create('div', {
                                append: mono.create('input', {
                                    type: 'checkbox'
                                }),
                                onCreate: function() {
                                    manager.options.trHasSelectCell = true;
                                }
                            }) : mono.create('div', {
                                text: manager.language[value.lang+'_SHORT'] || manager.language[value.lang]
                            }),
                            resizeEl,
                            value.order === 0 ? null : mono.create('i', {
                                class: 'arrow'
                            })
                        ]
                    }));
                    resizeEl = mono.create('div', {
                        class: 'resize-el',
                        draggable: false,
                        on: [
                            ['click', function(e){e.stopPropagation();}],
                            ['mousedown', manager.tableResize]
                        ]
                    });
                    styleBody += '.torrent-list-layer th.' + key + ',' +
                    ' .torrent-list-layer td.' + key + ' {' +
                        'max-width:' + value.width + 'px;' +
                        'min-width:' + value.width + 'px;' +
                    '}';
                    //2px padding; 1-border size right; 2px ??
                    width += value.width + 2 + 1 + 2;
                }
                if (resizeEl) {
                    resizeEl.classList.add('last');
                    thList.slice(-1)[0].appendChild(resizeEl);
                }
                return thList;
            })()
        });

        if (manager.varCache['style.torrent-style']) {
            manager.varCache['style.torrent-style'].parentNode.removeChild(manager.varCache['style.torrent-style']);
            delete manager.varCache['style.torrent-style'];
        }
        document.body.appendChild(manager.varCache['style.torrent-style'] = mono.create('style', {
            class: 'torrent-style',
            text: styleBody
        }));

        //no border last element
        width -= 1;

        if (!manager.options.windowMode) {
            width = width + manager.options.scrollWidth;
            if (width > 800) {
                width = 800;
            }
            if (width < 723) {
                width = 723;
            }
            document.body.style.width = width + 'px';
            mono.isFF && mono.sendMessage({action: 'resize', width: width}, undefined, 'service');
        }

        manager.domCache.trFixedHead.appendChild(head);
        manager.domCache.trHead.appendChild(head.cloneNode(true));

        var graph = document.querySelector('li.graph');
        var selectBox = document.querySelector('li.select');
        graph.style.width = (selectBox.offsetLeft - graph.offsetLeft - 5) + 'px';
    },
    flWriteHead: function() {
        var styleBody = '';
        var width = 0;
        manager.options.flHasSelectCell = false;
        var head = mono.create('tr', {
            append: (function() {
                var thList = [];
                var resizeEl;
                for (var i = 0, value; value = manager.varCache.flColumnArray[i]; i++) {
                    var key = value.column;
                    if (value.display !== 1) {
                        continue;
                    }
                    var orderClass = (manager.varCache.flSortColumn !== key) ? undefined : (manager.varCache.flSortBy === 1) ? 'sortDown' : 'sortUp';
                    thList.push(mono.create('th', {
                        class: [key, orderClass],
                        title: manager.language[value.lang],
                        data: {
                            name: key,
                            type: 'fl'
                        },
                        draggable: true,
                        on: [
                            ['dragstart', manager.onDragStart],
                            ['dragover', manager.onDragOver],
                            ['drop', manager.onDrop]
                        ],
                        append: [
                            (key === 'checkbox') ? mono.create('div', {
                                append: mono.create('input', {
                                    type: 'checkbox'
                                }),
                                onCreate: function() {
                                    manager.options.flHasSelectCell = true;
                                }
                            }) : mono.create('div', {
                                text: manager.language[value.lang+'_SHORT'] || manager.language[value.lang]
                            }),
                            resizeEl,
                            value.order === 0 ? null : mono.create('i', {
                                class: 'arrow'
                            })
                        ]
                    }));
                    resizeEl = mono.create('div', {
                        class: 'resize-el',
                        on: [
                            ['click', function(e){e.stopPropagation();}],
                            ['mousedown', manager.tableResize]
                        ]
                    });
                    styleBody += '.fl-layer th.' + key + ',' +
                    ' .fl-layer td.' + key + ' {' +
                        'max-width:' + value.width + 'px;' +
                        'min-width:' + value.width + 'px;' +
                    '}';
                    //2px padding; 1-border size right; 2px ??
                    width += value.width + 2 + 1 + 2;
                }
                if (resizeEl) {
                    resizeEl.classList.add('last');
                    thList.slice(-1)[0].appendChild(resizeEl);
                }
                return thList;
            })()
        });
        //no border last element
        width -= 1;
        width += manager.options.scrollWidth;
        manager.varCache.flWidth = width;

        var windowWidth = document.body.clientWidth;
        if (width > windowWidth) {
            width = windowWidth;
            styleBody += 'div.file-list {max-width:' + windowWidth + 'px; border-radius: 0;}';
        }
        if (width < 100) {
            manager.domCache.flBottom.style.display = 'none';
            manager.varCache.flBottomIsHide = 1;
        } else
        if (manager.varCache.flBottomIsHide === 1) {
            manager.domCache.flBottom.style.display = 'block';
            manager.varCache.flBottomIsHide = 0;
        }
        var popupHeight = manager.settings.popupHeight;
        if (manager.options.windowMode || popupHeight === 0) {
            popupHeight = document.body.clientHeight;
        }

        var flBodyHeight = popupHeight - manager.domCache.menu.clientHeight - 1 - manager.domCache.statusPanel.clientHeight - 2;
        var flTableHeight = flBodyHeight - manager.domCache.menu.clientHeight;
        manager.varCache.flHeight = flBodyHeight;
        manager.varCache.flLeft = (windowWidth - width) / 2;
        styleBody += 'div.file-list {' +
            'left: ' + manager.varCache.flLeft + 'px;' +
            'height: ' + manager.varCache.flHeight + 'px;' +
            'width: ' + width + 'px;' +
        '}';
        styleBody += 'div.fl-layer {' +
            'max-height: ' + flTableHeight + 'px;' +
            'min-height: ' + flTableHeight + 'px;' +
        '}';

        if (manager.varCache['style.fileList-style']) {
            manager.varCache['style.fileList-style'].parentNode.removeChild(manager.varCache['style.fileList-style']);
            delete manager.varCache['style.fileList-style'];
        }
        document.body.appendChild(manager.varCache['style.fileList-style'] = mono.create('style', {
            class: 'fileList-style',
            text: styleBody
        }));

        manager.domCache.flFixedHead.appendChild(head);
        manager.domCache.flHead.appendChild(head.cloneNode(true));
    },
    getLabelOptionNode: function(item, isCustom) {
        var hasImage;
        if (isCustom) {
            hasImage = true;
        }
        return mono.create('option', {
            value: item,
            text: isCustom ? (item === 'SEEDING') ? manager.language['OV_FL_'+item.toUpperCase()] : manager.language['OV_CAT_'+item.toUpperCase()] : item,
            data: !isCustom ? undefined : {
                image: hasImage ? item : undefined,
                type: 'custom'
            }
        })
    },
    setLabels: function() {
        var selectedIndex = 0;
        var labels = manager.varCache.labels = [];
        var optionList = document.createDocumentFragment();
        var cIndex = 0;
        for (var item in manager.trCustomFilterObj) {
            labels.push({label: item, custom: 1});
            optionList.appendChild(manager.getLabelOptionNode(item, true));
            if (manager.varCache.currentFilter.custom && manager.varCache.currentFilter.label === item) {
                selectedIndex = cIndex;
            }
            cIndex++;
        }
        manager.domCache.labelBox.textContent = '';
        manager.domCache.labelBox.appendChild(optionList);
        manager.domCache.labelBox.selectedIndex = selectedIndex;
        manager.varCache.selectBox && manager.varCache.selectBox.update();
    },
    trCustomFilterObj: {
        ALL: function() {
            return true;
        },
        DL: function(item) {
            return item.api[4] !== 1000;
        },
        SEEDING: function(item) {
            return item.api[1] === 201 && item.api[4] === 1000;
        },
        COMPL: function(item) {
            return item.api[4] === 1000;
        },
        ACTIVE: function(item) {
            return item.api[9] !== 0 || item.api[8] !== 0;
        },
        INACTIVE: function(item) {
            return item.api[9] === 0 && item.api[8] === 0;
        }
    },
    trItemIsInFilter: function(item) {
        //проверяет запись на фильтр
        if (!manager.varCache.currentFilter.custom) {
            return false;
        }
        return !manager.trCustomFilterObj[manager.varCache.currentFilter.label](item);
    },
    trChangeFilterByLabelBox: function() {
        var selectedIndex = manager.domCache.labelBox.selectedIndex;
        var currentLabel = manager.varCache.currentFilter = manager.varCache.labels[selectedIndex];

        mono.storage.set({selectedLabel: currentLabel});

        if (manager.varCache['style.tr-filter']) {
            manager.varCache['style.tr-filter'].parentNode.removeChild(manager.varCache['style.tr-filter']);
        }

        if (!currentLabel.custom) {
            return document.body.appendChild(manager.varCache['style.tr-filter'] = mono.create('style', {
                class: 'tr-filter',
                text: '.torrent-table-body tbody > tr:not(.selected) {' +
                    'display: none;' +
                '}' +
                '.torrent-table-body tbody > tr[data-label="' + currentLabel.label + '"] {' +
                    'display: table-row;' +
                '}'
            }));
        }
        for (var key in manager.varCache.trListItems) {
            var item = manager.varCache.trListItems[key];
            if (manager.trItemIsInFilter(item)) {
                if (item.display === 1) {
                    item.node.classList.add('filtered');
                    item.display = 0;
                }
            } else
            if (item.display !== 1) {
                item.node.classList.remove('filtered');
                item.display = 1;
            }
        }
        if (currentLabel.label === 'all') return;

        document.body.appendChild(manager.varCache['style.tr-filter'] = mono.create('style', {
            class: 'tr-filter',
            text: '.torrent-table-body tbody > tr.filtered:not(.selected){' +
                'display: none;' +
            '}'
        }));
    },
    setStatus: function(statusText) {
        manager.domCache.status.textContent = statusText;
        manager.domCache.status.title = statusText;
    },
    apiGetDone: function(api, noRound) {
        var value = api[4] / 10;
        if (!noRound) {
            value = Math.round(value);
        }
        return value + '%';
    },
    trGetStatusInfo: function(api) {
        var state = api[1];
        var done = api[4];
        if (state & 32) { // paused
            if (state & 2) {
                //OV_FL_CHECKED //Progress
                return manager.language.OV_FL_CHECKED + ' ' + manager.apiGetDone(api);
            } else {
                //OV_FL_PAUSED
                return manager.language.OV_FL_PAUSED;
            }
        } else if (state & 1) { // started, seeding or leeching
            var status = '';
            if (done === 1000) {
                //OV_FL_SEEDING
                status = manager.language.OV_FL_SEEDING;
            } else {
                //OV_FL_DOWNLOADING
                status = manager.language.OV_FL_DOWNLOADING;
            }
            if (!(state & 64)) {
                return "[F] " + status;
            } else {
                return status;
            }
        } else if (state & 2) { // checking
            //OV_FL_CHECKED //Progress
            return manager.language.OV_FL_CHECKED + ' ' + manager.apiGetDone(api);
        } else if (state & 16) { // error
            //OV_FL_ERROR //Progress
            var error = api[21];
            if (error && manager.language.lang !== 'en' && error.substr(0, 6) === 'Error:') {
                var errMsg = manager.language.OV_FL_ERROR;
                error = errMsg+error.substr(5);
            }
            return error || manager.language.OV_FL_ERROR;
        } else if (state & 64) { // queued
            if (done === 1000) {
                //OV_FL_QUEUED_SEED
                return manager.language.OV_FL_QUEUED_SEED;
            } else {
                //OV_FL_QUEUED
                return manager.language.OV_FL_QUEUED;
            }
        } else if (done == 1000) { // finished
            //OV_FL_FINISHED
            return manager.language.OV_FL_FINISHED;
        } else { // stopped
            //OV_FL_STOPPED
            return manager.language.OV_FL_STOPPED;
        }
    },
    bytesToText: function(bytes, nan, ps) {
        //переводит байты в строчки
        var sizes = (ps === undefined) ? manager.language.sizeList : manager.language.sizePsList;
        sizes = JSON.parse(sizes);
        if (nan === undefined) {
            nan = 'n/a';
        }
        if (bytes === 0) {
            return nan;
        }
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        if (i === 0) {
            return (bytes / Math.pow(1024, i)) + ' ' + sizes[i];
        }
        var toFixed = 1;
        if (i > 2) {
            toFixed = 2;
        }
        return (bytes / Math.pow(1024, i)).toFixed(toFixed) + ' ' + sizes[i];
    },
    unixTimeToTextOut: function(i) {
        //выписывает отсчет времени из unixtime
        var timeAgoList = manager.language.timeOutList;
        timeAgoList = JSON.parse(timeAgoList);
        if (i === -1) {
            return '∞';
        }
        var day = Math.floor(i / 60 / 60 / 24);
        var week = Math.floor(day / 7);
        var hour = Math.floor((i - day * 60 * 60 * 24) / 60 / 60);
        var minutes = Math.floor((i - day * 60 * 60 * 24 - hour * 60 * 60) / 60);
        var seconds = Math.floor((i - day * 60 * 60 * 24 - hour * 60 * 60 - minutes * 60));
        day = Math.floor(i / 60 / 60 / 24 - 7 * week);
        if (week > 10)
            return '∞';
        if (week > 0)
            return week + timeAgoList[0] + ' ' + day + timeAgoList[1];
        if (day > 0)
            return day + timeAgoList[1] + ' ' + hour + timeAgoList[2];
        if (hour > 0)
            return hour + timeAgoList[2] + ' ' + minutes + timeAgoList[3];
        if (minutes > 0)
            return minutes + timeAgoList[3] + ' ' + seconds + timeAgoList[4];
        if (seconds > 0)
            return seconds + timeAgoList[4];
        return '∞';
    },
    unixTimeToTimeStamp: function(shtamp) {
        if (!shtamp) {
            return '∞';
        }
        var dt = new Date(shtamp * 1000);
        var m = dt.getMonth() + 1;
        if (m < 10)
            m = '0' + m.toString();
        var d = dt.getDate();
        if (d < 10)
            d = '0' + d.toString();
        var h = dt.getHours();
        if (h < 10)
            h = '0' + h.toString();
        var mi = dt.getMinutes();
        if (mi < 10)
            mi = '0' + mi.toString();
        var sec = dt.getSeconds();
        if (sec < 10)
            sec = '0' + sec.toString();
        return dt.getFullYear() + '-' + m + '-' + d + ' ' + h + ':' + mi + ':' + sec;
    },
    trCreateCell: {
        checkbox: function(columnName, api) {
            var node = mono.create('td', {
                class: columnName,
                append: mono.create('input', {
                    type: 'checkbox'
                })
            });
            return {
                node: node
            }
        },
        name: function(key, api) {
            var div, span;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div', {
                    append: span = mono.create('span')
                })
            });
            var update = function(api) {
                div.title = api[2];
                span.textContent = api[2];
                span.addEventListener('mouseenter', function reCaclSize() {
                    span.removeEventListener('mouseenter', reCaclSize);
                    manager.calculateMoveble(this, manager.varCache.trColumnList.name.width);
                });
            };
            update(api);
            return {
                node: node,
                update: update
            };
        },
        order: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = api[17];
                if (text < 0) {
                    text = '*';
                }
                div.textContent = text;
            };
            update(api);
            return {
                node: node,
                update: update
            };
        },
        size: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = manager.bytesToText(api[3]);
                div.title = text;
                div.textContent = text;
            };
            update(api);
            return {
                node: node,
                update: update
            };
        },
        remaining: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = api[3] - api[5];
                if (text < 0) {
                    text = 0;
                }
                div.textContent = manager.bytesToText(text, 0);
            };
            update(api);
            return {
                node: node,
                update: update
            };
        },
        done: function(key, api) {
            var div1, div2;
            var node = mono.create('td', {
                class: key,
                append: mono.create('div', {
                    class: 'progress_b',
                    append: [
                        div1 = mono.create('div', {
                            class: 'val'
                        }),
                        div2 = mono.create('div', {
                            class: 'progress_b_i'
                        })
                    ]
                })
            });
            var update = function(api) {
                var color = (api[1] === 201 && api[4] === 1000) ? '#41B541' : '#3687ED';
                div1.textContent = manager.apiGetDone(api, 1);
                div2.style.width = manager.apiGetDone(api);
                div2.style.backgroundColor = color;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        status: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = manager.trGetStatusInfo(api);
                div.textContent = text;
                div.title = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        seeds: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                div.textContent = api[15];
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        peers: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                div.textContent = api[13];
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        seeds_peers: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = api[14] + '/' + api[12];
                div.textContent = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        downspd: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = manager.bytesToText(api[9], '', 1);
                div.textContent = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        upspd: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = manager.bytesToText(api[8], '', 1);
                div.textContent = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        eta: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = manager.unixTimeToTextOut(api[10]);
                div.textContent = text;
                div.title = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        upped: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = manager.bytesToText(api[6], 0);
                div.textContent = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        downloaded: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = manager.bytesToText(api[5], 0);
                div.textContent = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        shared: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = api[7] / 1000;
                div.textContent = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        avail: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = Math.round((api[16] / 65535) * 1000) / 1000;
                div.textContent = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        label: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = api[11];
                div.textContent = text;
                div.title = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        added: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = manager.unixTimeToTimeStamp(api[23]);
                div.textContent = text;
                div.title = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        completed: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var text = manager.unixTimeToTimeStamp(api[24]);
                div.textContent = text;
                div.title = text;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        actions: function(key, api) {
            var div;
            var node = mono.create('td', {
                class: key,
                append: mono.create('div', {
                    class: 'btns',
                    append: [
                        mono.create('a', {
                            href: '#start',
                            title: manager.language['ML_START'],
                            class: 'start'
                        }),
                        mono.create('a', {
                            href: '#stop',
                            title: manager.language['ML_STOP'],
                            class: 'stop'
                        })
                    ]
                })
            });
            return {
                node: node
            }
        }
    },
    trItemCreate: function(item) {
        var api = item.api;
        item.cell = {};
        item.node = mono.create('tr', {
            id: api[0],
            data: {
                label: api[11],
                sid: api[22],
                path: api[26]
            },
            append: (function(){
                var tdList = [];
                for (var i = 0, column; column = manager.varCache.trColumnArray[i]; i++) {
                    var columnName = column.column;
                    if (column.display !== 1) {
                        continue;
                    }
                    var cell = manager.trCreateCell[columnName](columnName, item.api);
                    item.cell[columnName] = cell.update;
                    tdList.push(cell.node);
                }
                return tdList;
            }())
        });
        item.display = 1;

        if (manager.trItemIsInFilter(item)) {
            item.node.classList.add('filtered');
            item.display = 0;
        }
    },
    trGetApiDiff: function(oldArr, newArray) {
        var first = oldArr;
        var second = newArray;
        if (first.length < second.length) {
            second = first;
            first = newArray;
        }
        var diff = [];
        for (var i = 0, lenA = first.length; i < lenA; i++) {
            if (manager.trApiIndexToChanges[i] === undefined) {
                continue;
            }
            var itemA = first[i];
            var itemB = second[i];
            if (itemA !== itemB) {
                diff.push(i);
            }
        }
        return diff;
    },
    trApiIndexToChanges: {
        1: function(changes) {
            changes.status = manager.varCache.trColumnList.status.display;
            changes.done = manager.varCache.trColumnList.done.display;
        },
        2: function(changes) {
            changes.name = manager.varCache.trColumnList.name.display;
        },
        3: function(changes) {
            changes.size = manager.varCache.trColumnList.size.display;
            changes.remaining = manager.varCache.trColumnList.remaining.display;
        },
        4: function(changes) {
            changes.done = manager.varCache.trColumnList.done.display;
        },
        21: function(changes) {
            changes.status = manager.varCache.trColumnList.status.display;
        },
        9: function(changes) {
            changes.downspd = manager.varCache.trColumnList.downspd.display;
            changes.remaining = manager.varCache.trColumnList.remaining.display;
        },
        8: function(changes) {
            changes.upspd = manager.varCache.trColumnList.upspd.display;
        },
        12: function(changes) {
            changes.seeds_peers = manager.varCache.trColumnList.seeds_peers.display;
        },
        14: function(changes) {
            changes.seeds_peers = manager.varCache.trColumnList.seeds_peers.display;
        },
        17: function(changes) {
            changes.order = manager.varCache.trColumnList.order.display;
        },
        15: function(changes) {
            changes.seeds = manager.varCache.trColumnList.seeds.display;
        },
        13: function(changes) {
            changes.peers = manager.varCache.trColumnList.peers.display;
        },
        10: function(changes) {
            changes.eta = manager.varCache.trColumnList.eta.display;
        },
        6: function(changes) {
            changes.upped = manager.varCache.trColumnList.upped.display;
        },
        5: function(changes) {
            changes.downloaded = manager.varCache.trColumnList.downloaded.display;
        },
        7: function(changes) {
            changes.shared = manager.varCache.trColumnList.shared.display;
        },
        16: function(changes) {
            changes.avail = manager.varCache.trColumnList.avail.display;
        },
        11: function(changes) {
            changes.label = manager.varCache.trColumnList.label.display;
            changes.data_label = 1;
        },
        23: function(changes) {
            changes.added = manager.varCache.trColumnList.added.display;
        },
        24: function(changes) {
            changes.completed = manager.varCache.trColumnList.completed.display;
        },
        22: function(changes) {
            changes.data_sid = 1;
        },
        26: function(changes) {
            changes.data_path = 1;
        }
    },
    trItemNodeUpdate: {
        data_label: function(item) {
            item.node.dataset.label = item.api[11];
        },
        data_sid: function(item) {
            item.node.dataset.sid = item.api[22];
        },
        data_path: function(item) {
            item.node.dataset.path = item.api[26];
        }
    },
    trItemUpdate: function(diff, item) {
        if (manager.trItemIsInFilter(item)) {
            if (item.display === 1) {
                item.node.classList.add('filtered');
                item.display = 0;
            }
        } else
        if (item.display !== 1) {
            item.node.classList.remove('filtered');
            item.display = 1;
        }
        var changes = {};
        for (var i = 0, len = diff.length; i < len; i++) {
            var index = diff[i];
            manager.trApiIndexToChanges[index](changes);
        }
        for (var columnName in changes) {
            if (changes[columnName] !== 1) {
                continue;
            }
            var fn = item.cell[columnName];
            if (fn !== undefined) {
                fn(item.api);
                continue;
            }
            fn = manager.trItemNodeUpdate[columnName];
            if (fn !== undefined) {
                fn(item);
            }
        }
    },
    trSkipItem: function(api) {
        if (manager.settings.hideSeedStatusItem && api[4] === 1000 && api[1] === 201 ||
            manager.settings.hideFnishStatusItem && api[4] === 1000 && api[1] === 128) {
            return true;
        }
    },
    trColumnToApiIndex: {
        checkbox:    undefined,
        name:        2,
        order:       17,
        size:        3,
        remaining:   'remaining',
        done:        4,
        status:      1,
        seeds:       15,
        peers:       13,
        seeds_peers: 14,
        downspd:     9,
        upspd:       8,
        eta:         10,
        upped:       6,
        downloaded:  5,
        shared:      7,
        avail:       16,
        label:       11,
        added:       23,
        completed:   24,
        actions:     undefined
    },
    onSort: function(type, index, by, A, B) {
        var apiA = A.api;
        var apiB = B.api;
        var a;
        var b;
        if (typeof index === 'string') {
            if (index === 'remaining') {
                a = apiA[3] - apiA[5];
                b = apiB[3] - apiB[5];
            } else
            if (index === 'done') {
                a = apiA[2] * 100 / apiA[1];
                b = apiB[2] * 100 / apiB[1];
            }else {
                return 0;
            }
        } else {
            a = apiA[index];
            b = apiB[index];
        }
        if (type === 'tr') {
            if (index === 1) {
                if (a === 201 && apiA[4] < 1000) {
                    a += 50;
                }
                if (b === 201 && apiB[4] < 1000) {
                    b += 50;
                }
            }
            if (index === 24 && (a === 0 || b === 0)) {
                if (a === b) {
                    return 0;
                } else if (a < b) {
                    return (by === 1) ? 1 : -1;
                } else if (a > b) {
                    return (by === 1) ? -1 : 1;
                }
            }
        }
        if (a === b) {
            return 0;
        } else if (a < b) {
            return (by === 1) ? -1 : 1;
        } else if (a > b) {
            return (by === 1) ? 1 : -1;
        }
    },
    sortInsertList: function(type, sortedList, currentList) {
        var newPaste = [];
        var fromIndex = null;
        var elList = null;

        for (var i = 0, item; item = sortedList[i]; i++) {
            if (currentList[i] === item) {
                continue;
            }
            fromIndex = i;

            elList = document.createDocumentFragment();
            while (sortedList[i] !== undefined && sortedList[i] !== currentList[i]) {
                var pos = currentList.indexOf(sortedList[i], i);
                if (pos !== -1) {
                    currentList.splice(pos, 1);
                }
                currentList.splice(i, 0, sortedList[i]);

                elList.appendChild(sortedList[i].node);
                i++;
            }

            newPaste.push({
                pos: fromIndex,
                list: elList
            });
        }

        var table = manager.domCache[type+'Body'];
        for (var n = 0, item; item = newPaste[n]; n++) {
            if (item.pos === 0) {
                var firstChild = table.firstChild;
                if (firstChild === null) {
                    table.appendChild(item.list);
                } else {
                    table.insertBefore(item.list, firstChild)
                }
            } else
            if (table.childNodes[item.pos] !== undefined) {
                table.insertBefore(item.list, table.childNodes[item.pos]);
            } else {
                table.appendChild(item.list);
            }
        }

        manager.varCache[type+'SortList'] = currentList;
    },
    sort: function(type, column, by) {
        if (column === undefined) {
            column = manager.varCache[type+'SortColumn'];
        }
        if (by === undefined) {
            by = manager.varCache[type+'SortBy'];
        }
        manager.varCache[type+'SortColumn'] = column;
        manager.varCache[type+'SortBy'] = by;

        var columnIndex = manager[type+'ColumnToApiIndex'][column];
        if (columnIndex === undefined) {
            columnIndex = '';
        }

        var sortedList = [];
        for (var hash in manager.varCache[type+'ListItems']) {
            sortedList.push(manager.varCache[type+'ListItems'][hash]);
        }
        sortedList.sort(manager.onSort.bind(undefined, type, columnIndex, by));
        manager.sortInsertList(type, sortedList, manager.varCache[type+'SortList']);
    },
    setSummSpeed: function(type, value) {
        value = manager.bytesToText(value, '-', 1);
        if (!manager.domCache[type+'Spd']) {
            return manager.domCache[type+'Speed'].appendChild(manager.domCache[type+'Spd'] = mono.create('span', {
                class: 'sum '+type,
                text: value
            }));
        }
        manager.domCache[type+'Spd'].textContent = value;
    },
    trRemoveItem: function(hash) {
        var item = manager.varCache.trListItems[hash];
        if (!item) {
            return;
        }
        manager.varCache.trSortList.splice(manager.varCache.trSortList.indexOf(item), 1);
        item.node.parentNode.removeChild(item.node);
        delete manager.varCache.trListItems[hash];
    },
    trFullUpdatePrepare: function(list) {
        var rmList = [];
        for (var n = 0, item; item = manager.varCache.trSortList[n]; n++) {
            var itemHash = item.api[0];
            var found = false;
            for (var i = 0, apiNew; apiNew = list[i]; i++) {
                if (apiNew[0] === itemHash) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                rmList.push(itemHash);
            }
        }
        for (var i = 0, hash; hash = rmList[i]; i++) {
            manager.trRemoveItem(hash);
        }
    },
    labelsEqual: function(arr1, arr2) {
        var arr1Len = arr1.length;
        if (arr1Len !== arr2.length) {
            return false;
        }

        for (var i = arr1Len; i--;) {
            if(arr1[i][0] !== arr2[i][0]) {
                return false;
            }
        }

        return true;
    },
    writeTrList: function(data) {
        if (!data) {
            return;
        }

        if (data.torrentc !== undefined) {
            manager.varCache.cid = data.torrentc;
        }

        if (data.torrentm !== undefined) {
            // remove items from dom
            for (var i = 0, hash; hash = data.torrentm[i]; i++) {
                manager.trRemoveItem(hash);
            }
        }

        if (data.torrents !== undefined) {
            // remove old items
            manager.trFullUpdatePrepare(data.torrents);
        }

        var list = data.torrents || data.torrentp;
        if (list !== undefined) {
            var dlSpeed = 0;
            var upSpeed = 0;
            for (var i = 0, api; api = list[i]; i++) {
                dlSpeed += api[9];
                upSpeed += api[8];

                if (manager.trSkipItem(api)) {
                    continue;
                }

                var hash = api[0];
                var item = manager.varCache.trListItems[hash];
                if (item === undefined) {
                    item = manager.varCache.trListItems[hash] = {};
                    item.api = api;
                    manager.trItemCreate(item);
                } else {
                    var diffList = manager.trGetApiDiff(item.api, api);
                    if (diffList.length === 0) {
                        continue;
                    }
                    item.api = api;
                    manager.trItemUpdate(diffList, item);
                }
            }

            manager.setSummSpeed('dl', dlSpeed);
            manager.setSummSpeed('up', upSpeed);

            manager.sort('tr');
        }

        if (data.files !== undefined) {
            manager.writeFlList(data);
        }

        if (list !== undefined && manager.settings.showSpeedGraph && manager.varCache.hasGraph) {
            graph.move(dlSpeed, upSpeed);
        }
    },
    extend: function(objA, objB) {
        for (var key in objB) {
            objA[key] = objB[key];
        }
    },
    updateTrackerList: function(onReady) {
        manager.timer.wait = true;

        var onResponse = function(data) {
            manager.timer.wait = false;
            onReady && onReady();
            manager.writeTrList(data);
        };
        manager.api({action: 'getTorrentList'}, function(data) {
            if (manager.varCache.flListLayer.param !== undefined) {
                return mono.sendMessage({action: 'getFileList', hash: manager.varCache.flListLayer.hash}, function(flData) {
                    data.files = flData.files;
                    onResponse(data);
                });
            }
            onResponse(data);
        });
    },
    timer: {
        timer: undefined,
        wait: false,
        start: function() {
            var _this = this;
            this.wait = false;
            clearInterval(this.timer);
            this.timer = setInterval(function() {
                if (_this.wait) {
                    return;
                }
                manager.updateTrackerList();
            }, manager.settings.popupUpdateInterval);
        },
        stop: function() {
            clearInterval(this.timer);
        }
    },
    flCreateSmartName: function(item, level) {
        if (item.smartName === undefined) {
            item.smartName = {mod_name: false, show: false};
        }
        var addInCache = false;
        if (level === -1) {
            addInCache = true;
            level = 0;
        }
        if (level === undefined) {
            level = 0;
        }
        var text;
        var path = item.api[0];
        var linkList = [];
        if (addInCache) {
            var dirs = path.split('/');
            text = dirs.splice(-1)[0];
            var path = [];
            for (var i = 0, dir; dir = dirs[i]; i++) {
                path.push(dir);
                var key = path.join('/');
                linkList.push({path: key, name: dir, back: dirs.slice(0, i).join('/')});
                if (manager.varCache.flSmartName[key] === undefined) {
                    manager.varCache.flSmartName[key] = {
                        items: [],
                        path: dirs.slice(i),
                        level: i + 1,
                        links: linkList.slice(0)
                    };
                }
                if (manager.varCache.flSmartName[key].items.indexOf(item.index) === -1) {
                    manager.varCache.flSmartName[key].items.push(item.index);
                }
            }
        } else {
            var l_pos = path.lastIndexOf('/');
            var cache_path = path.substr(0, l_pos);
            text = path.substr(l_pos + 1);
            linkList = manager.varCache.flSmartName[cache_path].links;
        }

        var linkNodeList = document.createDocumentFragment();
        if (level !== 0) {
            var lev = level - 1;
            linkNodeList.appendChild(mono.create('a', {
                class: 'folder c' + lev,
                text: '←',
                href: '#',
                data: {
                    path: linkList[lev].back
                }
            }));
        }
        for (var i = level, link; link = linkList[i]; i++) {
            linkNodeList.appendChild(mono.create('a', {
                class: 'folder c' + i,
                text: link.name,
                href: '#',
                data: {
                    path: link.path
                }
            }));
        }
        return {text: text, link: linkNodeList};
    },
    flOnSmartNameClick: function(path) {
        var smartNamePathObj = manager.varCache.flSmartName[path];
        if (smartNamePathObj === undefined) {
            for (var index in manager.varCache.flListItems) {
                var item = manager.varCache.flListItems[index];
                if (item.smartName.mod_name !== true) {
                    continue;
                }
                var smartName = manager.flCreateSmartName(item);
                item.cell.name(undefined, smartName);
            }
            var style = manager.varCache['style.fl-filter'];
            delete manager.varCache['style.fl-filter'];
            style && style.parentNode.removeChild(style);
            return;
        }
        for (var index in manager.varCache.flListItems) {
            var item = manager.varCache.flListItems[index];
            if (item.smartName.show === true && smartNamePathObj.items.indexOf(item.index) === -1) {
                item.smartName.show = false;
                item.node.classList.remove('show');
            }
        }
        var level = smartNamePathObj.level;
        for (var i = 0, len = smartNamePathObj.items.length; i < len; i++) {
            var index = smartNamePathObj.items[i];
            var item = manager.varCache.flListItems[index];
            var smartName = manager.flCreateSmartName(item, level);
            if (item.smartName.show === false) {
                item.node.classList.add('show');
                item.smartName.show = true;
            }
            item.cell.name(undefined, smartName);
            item.smartName.mod_name = true;
        }

        var style = manager.varCache['style.fl-filter'];
        delete manager.varCache['style.fl-filter'];
        style && style.parentNode.removeChild(style);

        document.body.appendChild(manager.varCache['style.fl-filter'] = mono.create('style', {
            class: 'fl-filter',
            text: '.fl-table-body tbody > tr{' +
                'display: none;' +
            '}' +
            '.fl-table-body tbody > tr.show{' +
                'display:table-row;' +
            '}'
        }));
    },
    flCreateCell: {
        checkbox: function(columnName, api) {
            var node = mono.create('td', {
                class: columnName,
                append: mono.create('input', {
                    type: 'checkbox'
                })
            });
            return {
                node: node
            }
        },
        name: function(columnName, api, item) {
            var span;
            var node = mono.create('td', {
                class: columnName,
                append: mono.create('div', {
                    append: [
                        span = mono.create('span')
                    ]
                })
            });
            var update = function(api, smartName) {
                if (smartName === undefined) {
                    smartName = manager.flCreateSmartName(item, -1);
                }
                node.title = smartName.text;
                span.textContent = smartName.text;
                span.insertBefore(smartName.link, span.firstChild);
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        size: function(columnName, api) {
            var node = mono.create('td', {
                class: columnName,
                append: mono.create('div', {
                    text: manager.bytesToText(api[1], '0')
                })
            });
            return {
                node: node
            }
        },
        downloaded: function(columnName, api) {
            var div;
            var node = mono.create('td', {
                class: columnName,
                append: div = mono.create('div')
            });
            var update = function(api) {
                div.textContent = manager.bytesToText(api[2], '0');
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        done: function(columnName, api) {
            var div1, div2;
            var node = mono.create('td', {
                class: columnName,
                append: mono.create('div', {
                    class: 'progress_b',
                    append: [
                        div1 = mono.create('div', {
                            class: 'val'
                        }),
                        div2 = mono.create('div', {
                            class: 'progress_b_i'
                        })
                    ]
                })
            });
            var update = function(api) {
                var color = (api[1] === api[2] && api[3] !== 0) ? '#41B541' : '#3687ED';
                var progress = Math.round((api[2] * 100 / api[1]) * 10) / 10;
                div1.textContent = progress + '%';
                div2.style.width = Math.round(progress) + '%';
                div2.style.backgroundColor = color;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        },
        prio: function(columnName, api) {
            var priorityList = ['MF_DONT', 'MF_LOW', 'MF_NORMAL', 'MF_HIGH'];
            var div;
            var node = mono.create('td', {
                class: columnName,
                append: div = mono.create('div')
            });
            var update = function(api) {
                var priority = manager.language[priorityList[api[3]]];
                node.title = priority;
                div.textContent = priority;
            };
            update(api);
            return {
                node: node,
                update: update
            }
        }
    },
    flItemCreate: function(item) {
        item.cell = {};
        item.node = mono.create('tr', {
            data: {
                index: item.index
            },
            append: (function() {
                var tdList = [];
                for (var i = 0, column; column = manager.varCache.flColumnArray[i]; i++) {
                    var columnName = column.column;
                    if (column.display !== 1) {
                        continue;
                    }
                    var cell = manager.flCreateCell[columnName](columnName, item.api, item);
                    item.cell[columnName] = cell.update;
                    tdList.push(cell.node);
                }
                return tdList;
            }())
        });
    },
    flApiIndexToChanges: {
        0: function(changes) {
            changes.name = manager.varCache.flColumnList.name.display;
        },
        1: function(changes) {
            changes.size = manager.varCache.flColumnList.size.display;
        },
        2: function(changes) {
            changes.downloaded = manager.varCache.flColumnList.downloaded.display;
            changes.done = manager.varCache.flColumnList.done.display;
        },
        3: function(changes) {
            changes.prio = manager.varCache.flColumnList.prio.display;
            changes.done = manager.varCache.flColumnList.done.display;
        }
    },
    flGetApiDiff: function(oldArr, newArray) {
        var first = oldArr;
        var second = newArray;
        if (first.length < second.length) {
            second = first;
            first = newArray;
        }
        var diff = [];
        for (var i = 0, lenA = first.length; i < lenA; i++) {
            if (manager.flApiIndexToChanges[i] === undefined) {
                continue;
            }
            var itemA = first[i];
            var itemB = second[i];
            if (itemA !== itemB) {
                diff.push(i);
            }
        }
        return diff;
    },
    flItemUpdate: function(diff, item) {
        var changes = {};
        for (var i = 0, len = diff.length; i < len; i++) {
            var index = diff[i];
            manager.flApiIndexToChanges[index](changes);
        }
        for (var columnName in changes) {
            if (changes[columnName] !== 1) {
                continue;
            }
            var fn = item.cell[columnName];
            if (fn !== undefined) {
                fn(item.api);
            }
        }
    },
    flColumnToApiIndex: {
        checkbox: undefined,
        name: 0,
        size: 1,
        downloaded: 2,
        done: 'done',
        prio: 3
    },
    flClearList: function() {
        manager.varCache.flSmartName = {};
        manager.varCache.flSortList = [];
        manager.varCache.flListItems = {};
        manager.domCache.flBody.textContent = '';

        var style = manager.varCache['style.fl-filter'];
        delete manager.varCache['style.fl-filter'];
        style && style.parentNode.removeChild(style);
    },
    writeFlList: function(data) {
        if (!data.files) {
            return;
        }

        var flListLayer = manager.varCache.flListLayer;
        var hash = data.files[0];
        if (hash !== flListLayer.hash) {
            return;
        }

        var fileList = data.files[1];
        if (fileList.length === 0) {
            // if magnet is loading
            return;
        }

        if (manager.varCache.flListLayer.pathChanged === undefined) {
            var firstFile = fileList[0];
            manager.varCache.flListLayer.pathChanged = null;
            if (firstFile[5]) {
                manager.varCache.flListLayer.pathChanged = firstFile[5];
                var folderPath = flListLayer.origFolderPath + '/' + firstFile[5];
                mono.create(flListLayer.folderEl, {
                    title: folderPath,
                    value: folderPath
                });
            }
        }

        for (var index = 0, api; api = fileList[index]; index++) {
            var item = manager.varCache.flListItems[index];
            if (item === undefined) {
                item = manager.varCache.flListItems[index] = {};
                item.api = api;
                item.index = index;
                manager.flItemCreate(item);
            } else {
                var diffList = manager.flGetApiDiff(item.api, api);
                if (diffList.length === 0) {
                    continue;
                }
                item.api = api;
                manager.flItemUpdate(diffList, item);
            }
        }

        if (flListLayer.loading) {
            flListLayer.loading.parentNode.removeChild(flListLayer.loading);
            delete flListLayer.loading;
        }

        manager.sort('fl');
    },
    flListShow: function(hash) {
        var flListLayer = manager.varCache.flListLayer = {};
        flListLayer.hash = hash;

        var trItem = manager.varCache.trListItems[hash];
        var trNode = trItem.node;
        trNode.classList.add('selected');

        manager.unCheckAll('tr');
        var checkBox = !manager.options.flHasSelectCell ? undefined : trNode.getElementsByTagName('input')[0];
        if (checkBox) {
            checkBox.checked = true;
            checkBox.dispatchEvent(new CustomEvent('change', {bubbles: true}));
        }

        document.body.appendChild(flListLayer.closeLayer = mono.create('div', {
            class: 'file-list-layer-temp',
            on: ['mousedown', function() {
                flListLayer.close();
            }]
        }));

        manager.flWriteHead();
        manager.domCache.flLayer.appendChild(flListLayer.loading = mono.create('div', {
            class: 'file-list-loading',
            style: {
                top: (manager.varCache.flHeight / 2 - 15)+'px',
                left: (manager.varCache.flWidth / 2 - 15)+'px'
            }
        }));

        var folderEl = manager.domCache.flBottom.querySelector('li.path > input');
        var folder = trItem.api[26];
        flListLayer.origFolderPath = folder;
        flListLayer.folderEl = folderEl;
        mono.create(folderEl, {
            title: folder,
            value: folder
        });

        mono.sendMessage({action: 'getFileList', hash: hash}, function(data) {
            manager.writeFlList(data);
            flListLayer.param = 1;
        });

        manager.domCache.fl.style.display = 'block';

        folderEl.focus();

        flListLayer.close = function() {
            manager.varCache.flListLayer = {};
            manager.domCache.fl.style.display = 'none';
            flListLayer.closeLayer.parentNode.removeChild(flListLayer.closeLayer);
            trNode.classList.remove('selected');

            if (checkBox) {
                checkBox.checked = false;
                checkBox.dispatchEvent(new CustomEvent('change', {bubbles: true}));
            }

            manager.domCache.flFixedHead.removeChild(manager.domCache.flFixedHead.firstChild);
            manager.domCache.flHead.removeChild(manager.domCache.flHead.firstChild);

            manager.flClearList();

            if (flListLayer.loading) {
                flListLayer.loading.parentNode.removeChild(flListLayer.loading);
                delete flListLayer.loading;
            }
        }
    },
    setColumSort: function(node, columnName, by, type) {
        var thList = manager.domCache[type+'FixedHead'].querySelectorAll(['.sortDown', '.sortUp']);
        for (var i = 0, item; item = thList[i]; i++) {
            item.classList.remove('sortDown');
            item.classList.remove('sortUp');
        }

        if (by === undefined) {
            by = manager.varCache[type+'SortBy'];
        } else {
            by = by ? 0 : 1;
        }

        var storage = {};
        storage[type+'SortOptions'] = {
            column: columnName,
            by: by
        };

        manager.varCache[type+'SortBy'] = by;
        manager.varCache[type+'SortColumn'] = columnName;

        manager.sort(type);

        by && node.classList.add('sortDown');
        !by && node.classList.add('sortUp');

        mono.storage.set(storage);
    },
    updateHead: function(type) {
        var oldHead = manager.domCache[type+'FixedHead'].firstChild;
        if (oldHead) {
            oldHead.parentNode.removeChild(oldHead);
        }
        oldHead = manager.domCache[type+'Head'].firstChild;
        if (oldHead) {
            oldHead.parentNode.removeChild(oldHead);
        }

        manager[type+'WriteHead']();
    },
    capitalize: function(string) {
        return string.substr(0, 1).toUpperCase()+string.substr(1);
    },
    tableResize: function(e) {
        e.stopPropagation();
        if (e.button !== 0) {
            return;
        }

        var _this = manager.tableResize;
        _this.enable = true;

        var column = this.parentNode;
        if (!this.classList.contains('last')) {
            column = column.previousElementSibling;
        }
        if (column === null) {
            return;
        }
        var type = column.dataset.type;
        var columnName = column.dataset.name;

        var th = this.parentNode;
        th.draggable = false;

        var currentSize = column.clientWidth;

        var startXPos = e.clientX;
        var delta = 0;

        var styleType = type === 'tr' ? 'torrent-list' : 'fl';
        var styleBody = '.'+styleType+'-layer th.' + columnName + ',' +
        ' .'+styleType+'-layer td.' + columnName + ' {' +
            'max-width: {size}px;' +
            'min-width: {size}px;' +
        '}';

        var styleEl = mono.create('style');
        document.body.appendChild(styleEl);

        document.body.style.width = document.body.clientWidth+'px';

        var newSize = currentSize;
        var onMouseMove = function(e) {
            var xPos = e.clientX;
            delta = xPos - startXPos - 6;
            newSize = currentSize + delta;
            if (newSize < 16) {
                newSize = 16;
            }
            styleEl.textContent = styleBody.replace(/\{size}/g, newSize);
        };
        document.body.addEventListener('mousemove', onMouseMove);
        document.body.addEventListener('mouseup', function onMouseDown(e) {
            e.stopPropagation();
            _this.enable = false;

            document.body.removeEventListener('mousemove', onMouseMove);
            document.body.removeEventListener('mouseup', onMouseDown);
            styleEl.parentNode.removeChild(styleEl);
            document.body.style.width = 'initial';

            manager.varCache[type+'ColumnList'][columnName].width = newSize;
            mono.sendMessage({action: 'set'+manager.capitalize(type)+'ColumnArray', data: manager.varCache[type+'ColumnArray']});

            manager.updateHead(type);

            th.draggable = true;
        });
    },
    prepareColumnList: function(columnList) {
        var obj = {};
        for (var n = 0, item; item = columnList[n]; n++) {
            obj[item.column] = item;
        }
        return obj;
    },
    trReadStatus: function(api) {
        var stat = api[1];
        var loaded = !!(stat & 128);
        var queued = !!(stat & 64);
        var paused = !!(stat & 32);
        var error = !!(stat & 16);
        var checked = !!(stat & 8);
        var start_after_check = !!(stat & 4);
        var checking = !!(stat & 2);
        var started = !!(stat & 1);

        var actionList = {
            recheck: !checking ? 1 : 0,
            stop: checking || started || queued ? 1 : 0,
            unpause: (started || checking) && paused ? 1 : 0,
            pause: !paused && (checking || started || queued) ? 1 : 0,
            start: !queued || paused ? 1 : 0,
            forcestart: (!started || paused) && !checking ? 1 : 0
        };
        if (actionList.pause === 1) {
            actionList.unpause = 0;
        }

        return actionList;
    },
    getSpeedArray: function (currentSpeed, count) {
        if (currentSpeed === 0) {
            currentSpeed = 512;
        }
        if (currentSpeed < Math.round(count / 2)) {
            currentSpeed = Math.round(count / 2);
        }
        var arr = new Array(count);
        for (var i = 0; i < count; i++) {
            arr[i] = Math.round((i + 1) / Math.round(count / 2) * currentSpeed);
        }
        return arr;
    },
    setSpeedDom: function(type, speed) {
        var speedNode = manager.varCache.speedLimit[type+'Node'];
        if (speed === 0) {
            if (!speedNode) {
                return;
            }
            speedNode.parentNode.removeChild(speedNode);
            delete manager.varCache.speedLimit[type+'Node'];
            return;
        }
        var value = manager.bytesToText(speed * 1024, '-', 1);
        if (speedNode === undefined) {
            speedNode = manager.varCache.speedLimit[type+'Node'] = mono.create('span', {'class': 'limit '+type, text: value});
            manager.domCache[type+'Speed'].appendChild(speedNode);
            return;
        }
        speedNode.textContent = value;
    },
    updateSpeedCtxMenu: function() {
        var items = manager.varCache.speedLimit.ctxItems;
        var type = manager.varCache.speedLimit.type;
        if (!items) {
            return;
        }
        var speeds = manager.getSpeedArray(manager.varCache.speedLimit[type+'Speed'] || 0, manager.varCache.speedLimit.count);
        var n = 0;
        for (var key in items) {
            var value = items[key];
            if (value.name === undefined) {
                continue;
            }
            if (key !== 'unlimited') {
                if (value.speed !== speeds[n]) {
                    value.speed = speeds[n];
                    value.$node.children('span').text(manager.bytesToText(value.speed * 1024, undefined, 1));
                }
                n++;
            }
            if (value.type !== type) {
                value.type = type;
            }
            if (manager.varCache.speedLimit[type+'Speed'] !== value.speed) {
                value.labelNode && value.labelNode.remove();
                delete value.labelNode;
            } else
            if (value.labelNode === undefined) {
                value.$node.prepend(value.labelNode = $('<label>', {text: '●'}));
            }
        }
    },
    getFreeSpace: function(downloadDir, cb) {
        mono.sendMessage({action: 'api', data: {
            method: "free-space",
            arguments: {
                path: downloadDir
            }
        }}, function(data) {
            if (data.result !== 'success') {
                return;
            }
            cb(data.arguments && data.arguments['size-bytes']);
        });
    },
    onGetFreeSpace: function(freeSpace) {
        if (!freeSpace || manager.varCache.freeSpace === freeSpace) return;
        manager.varCache.freeSpace = freeSpace;
        var size = manager.bytesToText(freeSpace);
        var spaceItem = manager.domCache.statusPanel.querySelector('.space');
        spaceItem.classList.add('disk');
        spaceItem.title = manager.language.freeSpace + ': ' + size;
        spaceItem.textContent = '';
        spaceItem.appendChild(mono.create('div', {
            text: size,
            style: {
                width: spaceItem.clientWidth + 'px'
            },
            on: ['click', function() {
                manager.getFreeSpace(manager.varCache.settings.arguments['download-dir'], manager.onGetFreeSpace);
            }]
        }));
    },
    readSettings: function(data) {
        var dlSpeed = !data.arguments['speed-limit-down-enabled'] ? 0 : parseInt(data.arguments['speed-limit-down']);
        if (manager.varCache.speedLimit.dlSpeed !== dlSpeed) {
            manager.varCache.speedLimit.dlSpeed = dlSpeed;
            manager.setSpeedDom('dl', dlSpeed);
        }
        var upSpeed = !data.arguments['speed-limit-up-enabled'] ? 0 : parseInt(data.arguments['speed-limit-up']);
        if (manager.varCache.speedLimit.upSpeed !== upSpeed) {
            manager.varCache.speedLimit.upSpeed = upSpeed;
            manager.setSpeedDom('up', upSpeed);
        }
        if (data.arguments['alt-speed-enabled']) {
            manager.domCache.menu.querySelector('.alt_speed').classList.add('active');
        } else {
            manager.domCache.menu.querySelector('.alt_speed').classList.remove('active');
        }

        if (manager.settings.showFreeSpace) {
            if (data.arguments['download-dir-free-space'] !== undefined) {
                manager.onGetFreeSpace(data.arguments['download-dir-free-space']);
            } else
            if (data.arguments['download-dir'] !== undefined) {
                manager.getFreeSpace(data.arguments['download-dir'], manager.onGetFreeSpace);
            }
        }

        manager.varCache.settings = data;
        manager.updateSpeedCtxMenu();
    },
    trToggleColum: function(column) {
        manager.timer.stop();
        var columnObj = manager.varCache.trColumnList[column];
        columnObj.display = columnObj.display === 1 ? 0 : 1;
        manager.updateHead('tr');
        manager.trFullUpdatePrepare([]);
        mono.sendMessage([
            {action: 'getRemoteTorrentList'},
            {action: 'setTrColumnArray', data: manager.varCache.trColumnArray}
        ], function(data) {
            manager.writeTrList({torrents: data.getRemoteTorrentList});
            manager.timer.start();
        });
    },
    flToggleColum: function(column) {
        var flListLayer = manager.varCache.flListLayer;
        if (!flListLayer.param) {
            return;
        }
        manager.timer.stop();
        var columnObj = manager.varCache.flColumnList[column];
        columnObj.display = columnObj.display === 1 ? 0 : 1;
        manager.updateHead('fl');
        manager.flClearList();
        mono.sendMessage([
            {action: 'getFileList', hash: manager.varCache.flListLayer.hash},
            {action: 'setFlColumnArray', data: manager.varCache.flColumnArray}
        ], function(data) {
            manager.writeFlList(data.getFileList);
            manager.timer.start();
        });
    },
    setSpeedLimit: function(type, speed) {
        var request = type === 'dl' ? 'down' : 'up';
        var data = {
            method: "session-set",
            arguments: {}
        };
        if (speed <= 0) {
            data.arguments['speed-limit-'+request+'-enabled'] = false;
        } else {
            data.arguments['speed-limit-'+request+'-enabled'] = true;
            data.arguments['speed-limit-'+request+''] = speed;
        }
        var oldSpeed = manager.varCache.speedLimit[type + 'Speed'];
        mono.sendMessage({action: 'sessionSet', data: data}, function(data) {
            if (data.result === 'success') {
                oldSpeed = speed;
            }
            manager.varCache.speedLimit[type + 'Speed'] = oldSpeed;
            manager.setSpeedDom(type, oldSpeed);
        });
        manager.varCache.speedLimit[type+'Speed'] = speed;
        manager.setSpeedDom(type, speed);
    },
    getCheckBoxList: function(type, isChecked, isVisible) {
        if (!manager.options[type+'HasSelectCell']) return [];

        if (isChecked === 0) {
            isChecked = ':not(:checked)'
        } else
        if (isChecked === 1) {
            isChecked = ':checked'
        } else {
            isChecked = '';
        }
        var checkBoxList;
        if (isChecked === '') {
            checkBoxList = manager.domCache[type + 'Body'].getElementsByTagName('input');
        } else {
            checkBoxList = manager.domCache[type + 'Body'].querySelectorAll('input' + isChecked);
        }
        if (!isVisible) return checkBoxList;

        var visibleCheckBoxList = [];
        for (var i = 0, el; el = checkBoxList[i]; i++) {
            if (!mono.isVisibleElement(el)) {
                continue;
            }
            visibleCheckBoxList.push(el);
        }
        return visibleCheckBoxList;
    },
    selectAllCheckBox: function(type) {
        if (!manager.options[type+'HasSelectCell']) return;

        var checkBoxList = manager.getCheckBoxList(type, undefined, type === 'fl');
        var checkedInputCount = 0;
        for (var i = 0, el; el = checkBoxList[i]; i++) {
            if (!el.checked) {
                continue;
            }
            checkedInputCount++;
        }
        var checkbox = manager.domCache[type + 'FixedHead'].getElementsByTagName('input')[0];
        if (checkbox) {
            checkbox.checked = checkedInputCount === checkBoxList.length;
        }
    },
    unCheckAll: function(type, onlyVisible) {
        if (!manager.options[type+'HasSelectCell']) return;

        var checkBoxList = manager.getCheckBoxList(type, 1, onlyVisible);
        for (var i = 0, el; el = checkBoxList[i]; i++) {
            el.checked = false;
            el.parentNode.parentNode.classList.remove('selected');
        }
        manager.selectAllCheckBox(type);
    },
    flForceSetFilePriority: function(priority, fileIndexList) {
        for (var i = 0, len = fileIndexList.length; i < len; i++) {
            var index = fileIndexList[i];
            var item = manager.varCache.flListItems[index];
            if (!item) continue;
            item.api[3] = priority;
            item.cell.prio && item.cell.prio(item.api);
            item.cell.done && item.cell.done(item.api);
        }
    },
    setPriority: function(hash, fileIndexList, level) {
        var step = 250;
        var waitCount = 0;
        var doneCount = 0;
        var from = 0;
        var onReady = function(data) {
            if (data.result !== 'success') {
                return;
            }
            doneCount++;
            if (doneCount !== waitCount) {
                return;
            }
            if (hash !== manager.varCache.flListLayer.hash) {
                return;
            }
            manager.flForceSetFilePriority(level, fileIndexList);
            manager.unCheckAll('fl', 1);
        };
        while (fileIndexList[from] !== undefined) {
            waitCount++;
            var list = fileIndexList.slice(from, from+step);
            from+=step;

            var request = {
                method: "torrent-set",
                arguments: {
                    ids: [parseInt(hash.substr(4))]
                }
            };
            if (level === 0) {
                request.arguments['files-unwanted'] = list;
            } else {
                var priority = [,'low','normal','high'][level];
                request.arguments['files-wanted'] = list;
                request.arguments['priority-'+priority] = list;
            }
            mono.sendMessage({action: 'api', data: request}, onReady);
        }
    },
    setCheckboxState: function(type, node, state) {
        if (state) {
            if (node.classList.contains('selected')) {
                return node.classList.add('force');
            }

            node.classList.add('selected');

            if (!manager.options[type+'HasSelectCell']) return;
            var checkbox = node.getElementsByTagName('input')[0];
            if (checkbox !== undefined) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new CustomEvent('change', {bubbles: true}));
            }
            return;
        }

        if (node.classList.contains('selected')) {
            if (node.classList.contains('force')) {
                return node.classList.remove('force');
            }

            if (type === 'tr' && manager.varCache.flListLayer.hash === node.id) return;

            node.classList.remove('selected');

            if (!manager.options[type+'HasSelectCell']) return;
            var checkbox = node.getElementsByTagName('input')[0];
            if (checkbox !== undefined) {
                checkbox.checked = false;
                checkbox.dispatchEvent(new CustomEvent('change', {bubbles: true}));
            }
        }
    },
    onLoadContextMenu: function() {
        $.contextMenu.defaults.delay = 0;
        $.contextMenu.defaults.animation.hide = 'hide';
        $.contextMenu.defaults.animation.show = 'show';
        $.contextMenu.defaults.animation.duration = 0;
        $.contextMenu.defaults.position = function(opt, x, y) {
            var offset;
            // determine contextMenu position
            if (!x && !y) {
                opt.determinePosition.call(this, opt.$menu);
                return;
            } else
            if (x === "maintain" && y === "maintain") {
                // x and y must not be changed (after re-show on command click)
                offset = opt.$menu.position();
            } else {
                // x and y are given (by mouse event)
                offset = {top: y, left: x + 5};
            }

            var $win = $(window);
            // correct offset if viewport demands it
            opt.$menu.css({'height': 'initial', 'overflow': 'initial'});
            var hasSubMenu = opt.$menu[0].querySelector('.context-menu-submenu') !== null;

            var bottom = $win.scrollTop() + $win.height();
            var right = $win.scrollLeft() + $win.width();
            var height = opt.$menu.height();
            var width = opt.$menu.width();

            if (!hasSubMenu) {
                offset.overflow = 'auto';
            }

            if (offset.top + height > bottom) {
                offset.top -= (offset.top + height) - bottom + 1;
            }

            if (height + 2 >= bottom || offset.top < 0) {
                offset.top = 1;
                offset.height = bottom - 2;
            }

            if (offset.left + width > right) {
                offset.left -= width + 10;
            }

            opt.$menu.css(offset);
        };
        $.contextMenu.defaults.positionSubmenu = function($menu) {
            // determine contextMenu position
            var parentMenuItem = this;
            var parentMenuItemHeight = parentMenuItem.height() + 2;
            var parentMenuItemOffset = parentMenuItem.offset();
            var parentMenuItemTop = parentMenuItemOffset.top;


            var parentMenu = parentMenuItem.parent();
            var parentMenuOffset = parentMenu.offset();
            var parentMenuLeft = parentMenuOffset.left;
            // var parentMenuTop = parentMenuOffset.top;

            var parentMenuWidth = parentMenu.width();
            // var parentMenuHeight = parentMenu.height();

            var docWitdh = document.body.clientWidth;
            var docHeight = document.body.clientHeight;

            var menuHeight = $menu.height();
            var top = -parseInt((menuHeight - parentMenuItemHeight) / 2);
            var menuWidth = $menu.width();

            var left;
            if (menuWidth + parentMenuWidth + parentMenuLeft > docWitdh) {
                left = -menuWidth - 1;
            } else {
                left = this.outerWidth() - 1;
            }

            var changeDisplay = false;
            if (document.body.scrollHeight > docHeight) {
                changeDisplay = true;
                $menu[0].classList.add('forceHidden');
            }
            docHeight = document.body.clientHeight;
            if (changeDisplay) {
                $menu[0].classList.remove('forceHidden');
            }

            if (parentMenuItemTop + top + menuHeight < 0) {
                top = -parentMenuItemTop;
            } else
            if (parentMenuItemTop + top + menuHeight > docHeight) {
                top -= (parentMenuItemTop + top + menuHeight - docHeight) + 2;
            }

            $menu.css({
                top: top,
                left: left
            });
        };

        $.contextMenu({
            zIndex: 3,
            selector: ".torrent-table-body tr",
            className: "torrent",
            events: {
                show: function(trigger) {
                    manager.setCheckboxState('tr', this[0], 1);
                    manager.varCache.trSelectedHashList = [];

                    var hash = this[0].id;
                    if (!manager.options.trHasSelectCell) {
                        manager.varCache.trSelectedHashList.push(parseInt(hash.substr(4)));
                    } else {
                        var itemList = manager.getCheckBoxList('tr', 1, 1);
                        for (var i = 0, item; item = itemList[i]; i++) {
                            manager.varCache.trSelectedHashList.push(parseInt(item.parentNode.parentNode.id.substr(4)));
                        }
                    }

                    var api;
                    var availActions;
                    var isMany = false;
                    if (manager.varCache.trSelectedHashList.length > 1) {
                        isMany = true;
                        availActions = {
                            extra: 0,
                            order: 0,
                            torrent_files: 0
                        };
                        for (var n = 0, hash; hash = manager.varCache.trSelectedHashList[n]; n++) {
                            var actionList = manager.trReadStatus(manager.varCache.trListItems['trId'+hash].api);
                            for (var action in actionList) {
                                if (availActions[action] !== 1) {
                                    availActions[action] = actionList[action];
                                }
                            }
                        }
                    }  else {
                        api = manager.varCache.trListItems[hash].api;
                        availActions = manager.trReadStatus(api);
                    }
                    for (var action in trigger.items) {
                        var item = trigger.items[action];
                        var state = availActions[action];

                        if (action === 'remove_with') {
                            if (isMany) {
                                item.$node[0].classList.add('last');
                            } else {
                                item.$node[0].classList.remove('last');
                            }
                        }

                        if (state === undefined) {
                            if (item.display === 0) {
                                item.display = 1;
                                var el = item.$node[0];
                                el.classList.remove('hidden');
                                el.classList.remove('not-selectable');
                                el.style.display = 'block';
                            }
                            continue;
                        }

                        if (state !== item.display) {
                            item.display = state;
                            var el = item.$node[0];
                            if (state === 1) {
                                el.classList.remove('hidden');
                                el.classList.remove('not-selectable');
                                el.style.display = 'block';
                            } else {
                                el.classList.add('hidden');
                                el.classList.add('not-selectable');
                                el.style.display = 'none';
                            }
                        }
                    }
                },
                hide: function() {
                    manager.setCheckboxState('tr', this[0], 0);
                    manager.varCache.trSelectedHashList = [];
                }
            },
            items: {
                start: {
                    name: manager.language.ML_START,
                    callback: function () {
                        manager.api({
                            method: "torrent-start",
                            arguments: {
                                ids: manager.varCache.trSelectedHashList
                            }
                        });
                        manager.unCheckAll('tr', 1);
                    }
                },
                forcestart: {
                    name: manager.language.startNow,
                    callback: function () {
                        manager.api({
                            method: "torrent-start-now",
                            arguments: {
                                ids: manager.varCache.trSelectedHashList
                            }
                        });
                        manager.unCheckAll('tr', 1);
                    }
                },
                stop: {
                    name: manager.language.ML_STOP,
                    callback: function () {
                        manager.api({
                            method: "torrent-stop",
                            arguments: {
                                ids: manager.varCache.trSelectedHashList
                            }
                        });
                        manager.unCheckAll('tr', 1);
                    }
                },
                s1: '-',
                recheck: {
                    name: manager.language.ML_FORCE_RECHECK,
                    callback: function () {
                        manager.api({
                            method: "torrent-verify",
                            arguments: {
                                ids: manager.varCache.trSelectedHashList
                            }
                        });
                        manager.unCheckAll('tr', 1);
                    }
                },
                remove: {
                    name: manager.language.ML_REMOVE,
                    callback: function () {
                        var hash = this[0].id;
                        var _this = this;
                        this.addClass('force');
                        var list = manager.varCache.trSelectedHashList.slice(0);
                        var trTitle = list.length !== 1 ? '' : manager.varCache.trListItems[hash].api[2];
                        showNotification([
                            [{label: {text: (!trTitle) ? manager.language.OV_CONFIRM_DELETE_MULTIPLE.replace('%d', list.length) : manager.language.OV_CONFIRM_DELETE_ONE}},
                                {span: {text: trTitle, class: 'fileName'}}],
                            [
                                {input: {type: "button", value: manager.language.DLG_BTN_YES, on: [
                                    ['click', function() {
                                        this.close();
                                        manager.api({
                                            method: "torrent-remove",
                                            arguments: {
                                                ids: list
                                            }
                                        });
                                    }]
                                ]}},
                                {input: {type: "button", value: manager.language.DLG_BTN_NO, focus: true, on: [
                                    ['click', function() {
                                        this.close();
                                    }]
                                ]}}
                            ]
                        ], function() {
                            manager.unCheckAll('tr', 1);
                            _this.removeClass('selected');
                        });
                    }
                },
                remove_with: {
                    name: manager.language.ML_REMOVE_AND,
                    items: {
                        remove_torrent: {
                            name: manager.language.ML_DELETE_TORRENT,
                            callback: function () {
                                manager.api({
                                    method: "torrent-remove",
                                    arguments: {
                                        ids: manager.varCache.trSelectedHashList
                                    }
                                });
                                manager.unCheckAll('tr', 1);
                            }
                        },
                        remove_torrent_files: {
                            name: manager.language.ML_DELETE_DATATORRENT,
                            callback: function () {
                                var hash = this[0].id;
                                manager.api({
                                    method: "torrent-remove",
                                    arguments: {
                                        'delete-local-data': true,
                                        ids: manager.varCache.trSelectedHashList
                                    }
                                });
                                manager.unCheckAll('tr', 1);
                            }
                        }
                    }
                },
                's2': '-',
                extra: {
                    name: manager.language.extra,
                    items: {
                        rename: {
                            name: manager.language.rename,
                            callback: function (key, trigger) {
                                var hash = this[0].id;
                                var _this = this;
                                this.addClass('force');
                                var currentName = manager.varCache.trListItems[hash].api[2];
                                showNotification([
                                    [
                                        {label: {text: manager.language.renameText}},
                                        {input: {type: 'text', name: 'newName', value: currentName, focus: true, on: [
                                            ['keydown', function(e) {
                                                if (e.keyCode === 13) {
                                                    this.nodeCache.okBtn.trigger('click');
                                                }
                                            }]
                                        ]}}
                                    ],
                                    [
                                        {input: {type: "button", name: 'okBtn', value: manager.language.DLG_BTN_APPLY, on: [
                                            ['click', function() {
                                                var formData = this.getFormData();
                                                var name = formData.newName;
                                                this.close();
                                                if (!name) return;
                                                manager.api({
                                                    method: "torrent-rename-path",
                                                    arguments: {
                                                        ids: [parseInt(hash.substr(4))],
                                                        path: currentName,
                                                        name: name
                                                    }
                                                });
                                            }]
                                        ]}},
                                        {input: {type: "button", value: manager.language.DLG_BTN_CANCEL, on: [
                                            ['click', function() {
                                                this.close();
                                            }]
                                        ]}}
                                    ]
                                ], function() {
                                    manager.unCheckAll('tr', 1);
                                    _this.removeClass('selected');
                                });
                            }
                        },
                        move: {
                            name: manager.language.move,
                            callback: function (key, trigger) {
                                var hash = this[0].id;
                                var _this = this;
                                this.addClass('force');
                                var currentLocation = manager.varCache.trListItems[hash].api[26];
                                var folderTemplate = showNotification.selectFolderTemplate(1);
                                if (folderTemplate[1].select.append.length === 0) {
                                    folderTemplate = undefined;
                                }
                                showNotification([
                                    [
                                        {label: {text: manager.language.moveNewPath}},
                                        {input: {type: 'text', name: 'newLocation', value: currentLocation, focus: true, on: [
                                            ['keydown', function(e) {
                                                if (e.keyCode === 13) {
                                                    this.nodeCache.okBtn.trigger('click');
                                                }
                                            }]
                                        ]}}
                                    ],
                                    folderTemplate,
                                    [
                                        {input: {type: "button", name: 'okBtn', value: manager.language.DLG_BTN_APPLY, on: [
                                            ['click', function() {
                                                var formData = this.getFormData();
                                                var location = formData.newLocation;
                                                if (formData.folder > -1) {
                                                    location = manager.varCache.folderList[formData.folder][1];
                                                }
                                                this.close();
                                                mono.sendMessage({action: 'api', data: {
                                                    method: "torrent-set-location",
                                                    arguments: {
                                                        ids: [parseInt(hash.substr(4))],
                                                        location: location,
                                                        move: true
                                                    }
                                                }});
                                            }]
                                        ]}},
                                        {input: {type: "button", value: manager.language.DLG_BTN_CANCEL, on: [
                                            ['click', function() {
                                                this.close();
                                            }]
                                        ]}}
                                    ]
                                ], function() {
                                    manager.unCheckAll('tr', 1);
                                    _this.removeClass('selected');
                                });
                            }
                        },
                        reannounce: {
                            name: manager.language.reannounce,
                            callback: function (key, trigger) {
                                mono.sendMessage({action: 'api', data: {
                                    method: "torrent-reannounce",
                                    arguments: {
                                        ids: manager.varCache.trSelectedHashList
                                    }
                                }});
                            }
                        }
                    }
                },
                order: {
                    name: manager.language.OV_COL_ORDER,
                    items: {
                        top: {
                            name: manager.language.queueTop,
                            callback: function (key, trigger) {
                                manager.api({
                                    method: "queue-move-top",
                                    arguments: {
                                        ids: manager.varCache.trSelectedHashList
                                    }
                                });
                            }
                        },
                        up: {
                            name: manager.language.up,
                            callback: function (key, trigger) {
                                manager.api({
                                    method: "queue-move-up",
                                    arguments: {
                                        ids: manager.varCache.trSelectedHashList
                                    }
                                });
                            }
                        },
                        down: {
                            name: manager.language.down,
                            callback: function (key, trigger) {
                                manager.api({
                                    method: "queue-move-down",
                                    arguments: {
                                        ids: manager.varCache.trSelectedHashList
                                    }
                                });
                            }
                        },
                        bottom: {
                            name: manager.language.queueBottom,
                            callback: function (key, trigger) {
                                manager.api({
                                    method: "queue-move-bottom",
                                    arguments: {
                                        ids: manager.varCache.trSelectedHashList
                                    }
                                });
                            }
                        }
                    }
                },
                's3': '-',
                torrent_files: {
                    name: manager.language.showFileList,
                    callback: function () {
                        manager.flListShow(this[0].id);
                    }
                }
            }
        });

        $.contextMenu({
            selector: ".fl-table-body tr",
            className: "filelist",
            events: {
                show: function (trigger) {
                    manager.setCheckboxState('fl', this[0], 1);
                    manager.varCache.flListLayer.ctxSelectArray = [];

                    var index = this[0].dataset.index;
                    if (!manager.options.flHasSelectCell) {
                        manager.varCache.flListLayer.ctxSelectArray.push(index);
                    } else {
                        var itemList = manager.getCheckBoxList('fl', 1, 1);
                        for (var i = 0, item; item = itemList[i]; i++) {
                            manager.varCache.flListLayer.ctxSelectArray.push(parseInt(item.parentNode.parentNode.dataset.index));
                        }
                    }

                    var isManyItems = manager.varCache.flListLayer.ctxSelectArray.length > 1;

                    var priority = manager.varCache.flListItems[index].api[3];
                    for (var action in trigger.items) {
                        var item = trigger.items[action];

                        if (action === 'rename') {
                            var el = item.$node[0];
                            if (isManyItems) {
                                if (item.display !== 0) {
                                    item.display = 0;
                                    el.classList.add('hidden');
                                    el.classList.add('not-selectable');
                                    el.style.display = 'none';
                                }
                            } else {
                                if (item.display === 0) {
                                    item.display = 1;
                                    el.classList.remove('hidden');
                                    el.classList.remove('not-selectable');
                                    el.style.display = 'block';
                                }
                            }
                            continue;
                        }

                        if (item.priority === undefined) {
                            continue;
                        }
                        if (item.priority !== priority || isManyItems) {
                            item.labelNode && item.labelNode.remove();
                            delete item.labelNode;
                        } else
                        if (item.labelNode === undefined) {
                            item.$node.prepend(item.labelNode = $('<label>', {text: '●'}));
                        }
                    }
                },
                hide: function () {
                    manager.setCheckboxState('fl', this[0], 0);
                    manager.varCache.flListLayer.ctxSelectArray = [];
                }
            },
            items: {
                high: {
                    className: 'p3',
                    name: manager.language.MF_HIGH,
                    priority: 3,
                    callback: function () {
                        var hash = manager.varCache.flListLayer.hash;
                        var fileIndexList = manager.varCache.flListLayer.ctxSelectArray.slice(0);
                        manager.setPriority(hash, fileIndexList, 3);
                    }
                },
                normal: {
                    className: 'p2',
                    name: manager.language.MF_NORMAL,
                    priority: 2,
                    callback: function () {
                        var hash = manager.varCache.flListLayer.hash;
                        var fileIndexList = manager.varCache.flListLayer.ctxSelectArray.slice(0);
                        manager.setPriority(hash, fileIndexList, 2);
                    }
                },
                low: {
                    className: 'p1',
                    priority: 1,
                    name: manager.language.MF_LOW,
                    callback: function () {
                        var hash = manager.varCache.flListLayer.hash;
                        var fileIndexList = manager.varCache.flListLayer.ctxSelectArray.slice(0);
                        manager.setPriority(hash, fileIndexList, 1);
                    }
                },
                s: '-',
                dntdownload: {
                    className: 'p0',
                    priority: 0,
                    name: manager.language.MF_DONT,
                    callback: function () {
                        var hash = manager.varCache.flListLayer.hash;
                        var fileIndexList = manager.varCache.flListLayer.ctxSelectArray.slice(0);
                        manager.setPriority(hash, fileIndexList, 0);
                    }
                },
                rename: {
                    name: manager.language.rename,
                    callback: function (key, trigger) {
                        var _this = this;
                        this.addClass('force');
                        var hash = manager.varCache.flListLayer.hash;
                        var index = this[0].dataset.index;
                        var currentFileName = manager.varCache.flListItems[index].api[0];
                        var slashPos = currentFileName.lastIndexOf('/');
                        if (slashPos !== -1) {
                            currentFileName = currentFileName.substr(slashPos + 1);
                        }
                        var path = manager.varCache.flListItems[index].api[4];
                        showNotification([
                            [
                                {label: {text: manager.language.renameText}},
                                {input: {type: 'text', name: 'newName', value: currentFileName, focus: true, on: [
                                    ['keydown', function(e) {
                                        if (e.keyCode === 13) {
                                            this.nodeCache.okBtn.trigger('click');
                                        }
                                    }]
                                ]}}
                            ],
                            [
                                {input: {type: "button", name: 'okBtn', value: manager.language.DLG_BTN_APPLY, on: [
                                    ['click', function() {
                                        var formData = this.getFormData();
                                        var name = formData.newName;
                                        this.close();
                                        if (!name) return;
                                        mono.sendMessage({action: 'api', data: {
                                            method: "torrent-rename-path",
                                            arguments: {
                                                ids: [parseInt(hash.substr(4))],
                                                path: path,
                                                name: name
                                            }
                                        }});
                                    }]
                                ]}},
                                {input: {type: "button", value: manager.language.DLG_BTN_CANCEL, on: [
                                    ['click', function() {
                                        this.close();
                                    }]
                                ]}}
                            ]
                        ], function() {
                            manager.unCheckAll('fl');
                            _this.removeClass('selected');
                        });
                    }
                }
            }
        });

        $.contextMenu({
            zIndex: 2,
            className: 'speed',
            selector: 'table.status-panel td.speed',
            events: {
                show: function (trigger) {
                    manager.varCache.speedLimit.ctxItems = trigger.items;
                    manager.varCache.speedLimit.type = this.hasClass('download') ? 'dl' : 'up';
                    manager.updateSpeedCtxMenu();
                }
            },
            items: function () {
                //выстраивает внутренности контекстного меню для ограничения скорости
                var items = {};
                items.unlimited = {
                    name: manager.language.MENU_UNLIMITED,
                    speed: 0,
                    callback: function (key, toggle) {
                        var item = toggle.items[key];
                        manager.setSpeedLimit(item.type, 0);
                    }
                };
                items.s = '-';
                var popupHeight = manager.settings.popupHeight;
                if (manager.options.windowMode || popupHeight === 0) {
                    popupHeight = document.body.clientHeight;
                }
                var count = Math.round((popupHeight - 54) / 27);
                if (count > 10) {
                    count = 10;
                }
                if (manager.options.windowMode) {
                    count = 15;
                }
                manager.varCache.speedLimit.count = count;
                for (var i = 0; i < count; i++) {
                    items['s' + i] = {
                        name: '-',
                        speed: undefined,
                        callback: function (key, toggle) {
                            var item = toggle.items[key];
                            manager.setSpeedLimit(item.type, item.speed);
                        }
                    };
                }
                return items;
            }()
        });

        $.contextMenu({
            selector: 'table.torrent-table-head thead',
            events: {
                show: function (trigger) {
                    $.each(manager.varCache.trColumnList, function (key, value) {
                        var item = trigger.items[key];
                        if (value.display !== item.display) {
                            item.display = value.display;
                            if (value.display !== 1) {
                                item.labelNode && item.labelNode.remove();
                                delete item.labelNode;
                            } else
                            if (item.labelNode === undefined) {
                                item.$node.prepend(item.labelNode = $('<label>', {text: '●'}));
                            }
                        }
                    });
                }
            },
            items: function () {
                var items = {};
                $.each(manager.varCache.trColumnList, function (key, value) {
                    items[key] = {
                        name: manager.language[value.lang],
                        callback: function (key) {
                            manager.trToggleColum(key);
                        }
                    };
                });
                return items;
            }()
        });

        $.contextMenu({
            className: 'flColumSelect',
            selector: 'table.fl-table-head thead',
            events: {
                show: function (trigger) {
                    $.each(manager.varCache.flColumnList, function (key, value) {
                        var item = trigger.items[key];
                        if (value.display !== item.display) {
                            item.display = value.display;
                            if (value.display !== 1) {
                                item.labelNode && item.labelNode.remove();
                                delete item.labelNode;
                            } else
                            if (item.labelNode === undefined) {
                                item.$node.prepend(item.labelNode = $('<label>', {text: '●'}));
                            }
                        }
                    });
                }
            },
            items: function () {
                var items = {};
                $.each(manager.varCache.flColumnList, function (key, value) {
                    items[key] = {
                        name: manager.language[value.lang],
                        callback: function (key) {
                            manager.flToggleColum(key);
                        }
                    };
                });
                return items;
            }()
        });
    },
    onGotFiles: function(files) {
        var onClickYes = function(dataForm) {
            if (!dataForm) {
                dataForm = {};
            }
            var folder = manager.varCache.folderList[dataForm.folder];
            var folderRequest;
            if (folder) {
                folderRequest = {download_dir: folder[0], path: folder[1]}
            }
            for (var i = 0, file; file = files[i]; i++) {
                mono.sendMessage({
                    action: 'onSendFile',
                    url: URL.createObjectURL(file),
                    folder: folderRequest
                });
            }
        };
        var folderTemplate = showNotification.selectFolderTemplate();
        if (folderTemplate[1].select.append.length === 0) {
            return onClickYes();
        }
        showNotification([
            folderTemplate,
            [
                {input: {type: "button", value: manager.language.DLG_BTN_OK, focus: true, on: [
                    ['click', function() {
                        var dataForm = this.getFormData();
                        this.close();

                        onClickYes(dataForm);
                    }]
                ]}},
                {input: {type: "button", value: manager.language.DLG_BTN_CANCEL, on: [
                    ['click', function() {
                        this.close();
                    }]
                ]}}
            ]
        ], function onClise() {
            manager.options.noSleep = false;
        });
    },
    onLoadQuickNotification: function() {
        showNotification.selectFolderTemplate = function(noDefailtFolder) {
            return [
                {label: {text: manager.language.path}},
                {select: {append: (function(){
                    var folderList = [
                        $('<option>', {text: noDefailtFolder ? '' : manager.language.defaultPath, value: -1})
                    ];
                    for (var i = 0, item; item = manager.varCache.folderList[i]; i++) {
                        folderList.push($('<option>', {text: item[1], value: i}));
                    }
                    if (folderList.length === 1) {
                        return [];
                    }
                    return folderList;
                })(), name: 'folder'}}
            ];
        };
    },
    calculateMoveble: function(el, width) {
        var className = 'title';

        var styleList = undefined;

        var elWidth = el.offsetWidth;
        if (elWidth <= width) {
            el.parentNode.setAttribute('class', className);
            return;
        }
        elWidth = Math.ceil(elWidth / 10);
        if (elWidth > 10) {
            if (elWidth < 100) {
                var t1 = Math.round(elWidth / 10);
                if (t1 > elWidth / 10) {
                    elWidth = t1 * 10 * 10;
                } else {
                    elWidth = (t1 * 10 + 5) * 10;
                }
            } else {
                elWidth = elWidth * 10;
            }
        } else {
            elWidth = elWidth * 10;
        }

        var timeCalc = Math.round(parseInt(elWidth) / parseInt(width) * 3.5);
        var moveName = 'moveble' + '_' + width + '_' + elWidth;
        if (manager.varCache.movebleStyleList['style.' + moveName] === undefined) {
            if (styleList === undefined) {
                styleList = document.createDocumentFragment();
            }
            var keyFrames = ''
                + '{'
                + '0%{margin-left:2px;}'
                + '50%{margin-left:-' + (elWidth - width) + 'px;}'
                + '90%{margin-left:6px;}'
                + '100%{margin-left:2px;}'
                + '}';
            styleList.appendChild(manager.varCache.movebleStyleList['style.' + moveName] = mono.create('style', {
                class: moveName,
                text: ''
                + '@-webkit-keyframes a_' + moveName
                    + keyFrames
                + '@keyframes a_' + moveName
                    + keyFrames
                + '@-moz-keyframes a_' + moveName
                    + keyFrames
                + 'div.' + moveName + ':hover > span {'
                    + 'overflow: visible;'
                    + '-webkit-animation:a_' + moveName + ' ' + timeCalc + 's;'
                    + '-moz-animation:a_' + moveName + ' ' + timeCalc + 's;'
                    + 'animation:a_' + moveName + ' ' + timeCalc + 's;'
                + '}'
            }));
        }
        el.parentNode.setAttribute('class', className + ' ' + moveName);

        if (styleList !== undefined) {
            document.body.appendChild(styleList);
        }
    },
    writeLanguage: function(body) {
        var elList = (body || document).querySelectorAll('[data-lang]');
        for (var i = 0, el; el = elList[i]; i++) {
            var langList = el.dataset.lang.split('|');
            for (var m = 0, lang; lang = langList[m]; m++) {
                var args = lang.split(',');
                var locale = manager.language[args.shift()];
                if (locale === undefined) {
                    console.log('Language string is not found!', el.dataset.lang);
                    continue;
                }
                if (args.length !== 0) {
                    args.forEach(function (item) {
                        if (item === 'text') {
                            el.textContent = locale;
                            return 1;
                        }
                        el.setAttribute(item, locale);
                    });
                } else if (el.tagName === 'DIV') {
                    el.title = locale;
                } else if (['A', 'LEGEND', 'SPAN', 'LI', 'TH', 'P', 'OPTION', 'BUTTON', 'H2', 'H3'].indexOf(el.tagName) !== -1) {
                    el.textContent = locale;
                } else if (el.tagName === 'INPUT') {
                    el.value = locale;
                } else {
                    console.log('Tag name not found!', el.tagName);
                }
            }
        }
    },
    run: function() {
        console.time('manager');
        console.time('remote data');

        mono.onMessage(function(message) {
            if (!message) return;

            if (message === 'sleep') {
                if (manager.options.noSleep) {
                    setTimeout(function(){
                        if (manager.options.noSleep) {
                            manager.options.noSleep = false;
                            if (!mono.noAddon) {
                                mono.addon.postMessage('isShow');
                            }
                        }
                    }, 60*1000);
                    return;
                }
                window.location = 'sleep.html';
            }

            if (message.hasOwnProperty('setStatus')) {
                manager.setStatus(message.setStatus);
            }
        });

        mono.storage.get([
            'trSortOptions',
            'flSortOptions',
            'selectedLabel',
            'folderList',
        ], function(storage) {
            mono.sendMessage([
                {action: 'getLanguage'},
                {action: 'getSettings'},
                {action: 'getTrColumnArray'},
                {action: 'getFlColumnArray'},
                {action: 'getRemoteTorrentList'},
                {action: 'getRemoteSettings'},
                {action: 'getPublicStatus'},
                {action: 'managerIsOpen'}
            ], function(data) {
                console.timeEnd('remote data');
                console.time('manager render');

                manager.language = data.getLanguage;
                manager.settings = data.getSettings;

                if (manager.settings.login === null || manager.settings.password === null) {
                    console.timeEnd('manager render');
                    console.timeEnd('manager');
                    return window.location = "options.html";
                }

                if (mono.isChrome) {
                    manager.options.windowMode = window !== chrome.extension.getViews({type: 'popup'})[0];
                } else {
                    manager.options.windowMode = mono.isFF && mono.noAddon;
                    if (!manager.options.windowMode) {
                        var popupHeight = manager.settings.popupHeight;
                        if (popupHeight === 0) {
                            popupHeight = document.body.clientHeight;
                        }
                        document.body.style.overflow = 'hidden';
                        mono.sendMessage({action: 'resize', height: popupHeight}, undefined, "service");
                    }
                }

                if (manager.options.trWordWrap) {
                    document.body.appendChild(mono.create('style', {
                        text: 'div.torrent-list-layer td div {' +
                            'white-space: normal;word-wrap: break-word;' +
                        '}'
                    }));
                }
                if (manager.options.flWordWrap) {
                    document.body.appendChild(mono.create('style', {
                        text: 'div.fl-layer td div {' +
                            'white-space: normal;word-wrap: break-word;' +
                        '}'
                    }));
                }

                if (manager.options.windowMode) {
                    document.body.parentNode.style.height = '100%';
                    document.body.style.height = '100%';
                    manager.domCache.trLayer.style.maxHeight = 'calc(100% - 54px)';
                    manager.domCache.trLayer.style.minHeight = 'calc(100% - 54px)';
                    manager.domCache.trLayer.style.maxWidth = 'initial';
                } else
                if (manager.settings.popupHeight > 0) {
                    var panelsHeight = 54;
                    manager.domCache.trLayer.style.maxHeight = (manager.settings.popupHeight - panelsHeight) + 'px';
                    manager.domCache.trLayer.style.minHeight = (manager.settings.popupHeight - panelsHeight) + 'px';
                }

                manager.varCache.folderList = storage.folderList || manager.varCache.folderList;

                if (storage.trSortOptions) {
                    manager.varCache.trSortColumn = storage.trSortOptions.column;
                    manager.varCache.trSortBy = storage.trSortOptions.by;
                }
                if (storage.flSortOptions) {
                    manager.varCache.flSortColumn = storage.flSortOptions.column;
                    manager.varCache.flSortBy = storage.flSortOptions.by;
                }

                manager.varCache.trColumnList = manager.prepareColumnList(data.getTrColumnArray);
                manager.varCache.flColumnList = manager.prepareColumnList(data.getFlColumnArray);
                manager.varCache.trColumnArray = data.getTrColumnArray;
                manager.varCache.flColumnArray = data.getFlColumnArray;

                manager.domCache.trLayer.addEventListener('scroll', function() {
                    manager.domCache.trTableFixed.style.left = (-this.scrollLeft)+'px';
                });
                manager.domCache.flLayer.addEventListener('scroll', function() {
                    if (this.scrollLeft !== 0) {
                        manager.domCache.flTableFixed.style.left = (-this.scrollLeft + manager.varCache.flLeft) + 'px';
                    } else {
                        manager.domCache.flTableFixed.style.left = 'auto';
                    }
                });

                manager.trWriteHead();

                manager.varCache.currentFilter = storage.selectedLabel || manager.varCache.currentFilter;
                manager.setLabels(manager.varCache.remoteLabels = data.getRemoteLabels);
                manager.trChangeFilterByLabelBox();
                manager.domCache.labelBox.addEventListener('change', function() {
                    manager.trChangeFilterByLabelBox();
                });

                manager.setStatus(data.getPublicStatus);

                if (!manager.settings.hideSeedStatusItem && !manager.settings.hideFnishStatusItem) {
                    manager.trSkipItem = function(){
                        return false;
                    };
                }

                manager.writeTrList({torrents: data.getRemoteTorrentList});
                manager.updateTrackerList(function() {
                    manager.timer.start();
                });

                manager.readSettings({arguments: data.getRemoteSettings});
                mono.sendMessage({action: 'api', data: {method: 'session-get'}}, function(data) {
                    if (data.result !== 'success') {
                        return;
                    }
                    manager.readSettings(data);
                });

                manager.domCache.menu.addEventListener('click', function(e) {
                    var el = e.target;
                    if (el.tagName !== 'A') return;

                    if (!el.classList.contains('btn')) return;

                    if (el.classList.contains('start_all')) {
                        e.preventDefault();
                        var hashList = [];
                        for (var hash in manager.varCache.trListItems) {
                            var item = manager.varCache.trListItems[hash];
                            if (item.api[1] !== 128 || item.display !== 1) {
                                continue;
                            }
                            if (manager.varCache.currentFilter.custom === 0 && item.api[11] !== manager.varCache.currentFilter.label) {
                                continue;
                            }
                            hashList.push(parseInt(hash.substr(4)));
                        }
                        if (hashList.length === 0) {
                            return;
                        }
                        manager.api({
                            method: "torrent-start",
                            arguments: {
                                ids: hashList
                            }
                        });
                        return;
                    }
                    if (el.classList.contains('refresh')) {
                        e.preventDefault();
                        manager.varCache.cid = undefined;
                        manager.updateTrackerList(function() {
                            manager.timer.start();
                        });
                        return;
                    }
                    if (el.classList.contains('pause_all')) {
                        e.preventDefault();
                        var hashList = [];
                        for (var hash in manager.varCache.trListItems) {
                            var item = manager.varCache.trListItems[hash];
                            if (item.api[1] !== 201 || item.display !== 1) {
                                continue;
                            }
                            if (manager.varCache.currentFilter.custom === 0 && item.api[11] !== manager.varCache.currentFilter.label) {
                                continue;
                            }
                            hashList.push(parseInt(hash.substr(4)));
                        }
                        if (hashList.length === 0) {
                            return;
                        }
                        manager.api({
                            method: "torrent-stop",
                            arguments: {
                                ids: hashList
                            }
                        });
                        return;
                    }
                    if (el.classList.contains('add_file')) {
                        e.preventDefault();
                        manager.options.noSleep = true;
                        if (manager.varCache.selectFileInput !== undefined) {
                            document.body.removeChild(manager.varCache.selectFileInput);
                            delete manager.varCache.selectFileInput;
                        }
                        document.body.appendChild(manager.varCache.selectFileInput = mono.create('input', {
                            type: 'file',
                            multiple: true,
                            accept: 'application/x-bittorrent',
                            style: {
                                display: 'none'
                            },
                            on: ['change', function() {
                                manager.onGotFiles(this.files);
                                document.body.removeChild(manager.varCache.selectFileInput);
                                delete manager.varCache.selectFileInput;
                            }]
                        }));
                        manager.varCache.selectFileInput.click();
                        return;
                    }
                    if (el.classList.contains('add_magnet')) {
                        e.preventDefault();
                        var folderTemplate = showNotification.selectFolderTemplate();
                        if (folderTemplate[1].select.append.length === 0) {
                            folderTemplate = undefined;
                        }
                        showNotification([
                            [
                                {label: {text: manager.language.Paste_a_torrent_URL}},
                                {input: {type: 'text', name: 'link', focus: true, on: [
                                    ['keydown', function(e) {
                                        if (e.keyCode === 13) {
                                            this.nodeCache.okBtn.trigger('click');
                                        }
                                    }]
                                ]}}
                            ],
                            folderTemplate,
                            [
                                {input: {type: "button", value: manager.language.DLG_BTN_OK, name: 'okBtn', on: [
                                    ['click', function() {
                                        var dataForm = this.getFormData();
                                        this.close();
                                        var folder = manager.varCache.folderList[dataForm.folder];
                                        var folderRequest;
                                        if (folder) {
                                            folderRequest = {download_dir: folder[0], path: folder[1]};
                                        }
                                        mono.sendMessage({
                                            action: 'onSendFile',
                                            url: dataForm.link,
                                            folder: folderRequest/*,
                                            label: dataForm.label*/
                                        });
                                    }]
                                ]}},
                                {input: {type: "button", value: manager.language.DLG_BTN_CANCEL, on: [
                                    ['click', function() {
                                        this.close();
                                    }]
                                ]}}
                            ]
                        ]);
                        return;
                    }
                    if (el.classList.contains('alt_speed')) {
                        e.preventDefault();
                        var trigger = el.classList.contains('active');
                        if (trigger) {
                            el.classList.remove('active');
                        } else {
                            el.classList.add('active');
                        }
                        mono.sendMessage({action: 'sessionSet', data: {
                            method: "session-set",
                            arguments: {
                                'alt-speed-enabled': !trigger
                            }
                        }}, function(data) {
                            if (data.result !== 'success') {
                                trigger = !trigger;
                            }
                            manager.varCache.settings['alt-speed-enabled'] = trigger;
                            if (trigger) {
                                el.classList.remove('active');
                            } else {
                                el.classList.add('active');
                            }
                        });
                        return;
                    }
                });

                manager.domCache.trBody.addEventListener('dblclick', function(e) {
                    var parent = e.target;
                    while (parent && parent !== this) {
                        parent = parent.parentNode;
                        if (parent.tagName === 'TR') {
                            break;
                        }
                    }

                    if (!parent) return;

                    var hash = parent.id;
                    if (!hash) return;

                    manager.flListShow(hash);
                });

                var onColumntClick = function(e) {
                    var parent = e.target;
                    while (parent && parent !== this) {
                        parent = parent.parentNode;
                        if (parent.tagName === 'TH') {
                            break;
                        }
                    }

                    if (!parent) return;

                    var sortBy = parent.classList.contains('sortDown') ? 1 : parent.classList.contains('sortUp') ? 0 : undefined;
                    var columnName = parent.dataset.name;
                    var type = parent.dataset.type;
                    if (!type) {
                        return;
                    }
                    if (manager.varCache[type+'ColumnList'][columnName].order !== 1) {
                        return;
                    }
                    manager.setColumSort(parent, columnName, sortBy, type);
                };
                manager.domCache.trFixedHead.addEventListener('click', onColumntClick);
                manager.domCache.flFixedHead.addEventListener('click', onColumntClick);

                manager.varCache.selectBox = selectBox.wrap(manager.domCache.labelBox);
                manager.domCache.labelBox.classList.remove('prepare');

                manager.domCache.trBody.addEventListener('click', function(e) {
                    var el = e.target;
                    if (el.tagName !== 'A') return;

                    if (el.classList.contains('start')) {
                        e.preventDefault();
                        var hash = el.parentNode.parentNode.parentNode.id;
                        manager.api({
                            method: "torrent-start",
                            arguments: {
                                ids: [parseInt(hash.substr(4))]
                            }
                        });
                        return;
                    }
                    if (el.classList.contains('stop')) {
                        e.preventDefault();
                        var hash = el.parentNode.parentNode.parentNode.id;
                        manager.api({
                            method: "torrent-stop",
                            arguments: {
                                ids: [parseInt(hash.substr(4))]
                            }
                        });
                        return;
                    }
                });

                manager.domCache.fl.addEventListener('keydown', function(e) {
                    if ( e.keyCode === 27 ) {
                        e.preventDefault();
                        manager.varCache.flListLayer.close && manager.varCache.flListLayer.close();
                    }
                });

                manager.domCache.flBottom.addEventListener('click', function(e) {
                    var el = e.target;
                    if (el.tagName !== 'A') return;
                    if (el.classList.contains('update')) {
                        e.preventDefault();
                        mono.sendMessage({action: 'getFileList', hash: manager.varCache.flListLayer.hash}, function(data) {
                            manager.writeFlList(data);
                        });
                        return;
                    }
                    if (el.classList.contains('close')) {
                        e.preventDefault();
                        manager.varCache.flListLayer.close();
                        return;
                    }
                });

                manager.domCache.statusPanel.addEventListener('click', function(e) {
                    var el = e.target;
                    if (el.tagName !== 'SPAN') return;

                    if (!el.classList.contains('limit')) return;

                    var type = el.classList.contains('dl') ? 'dl' : 'up';

                    manager.setSpeedLimit(type, 0);
                });

                document.body.addEventListener('drop', function onDrop(e) {
                    e.preventDefault();
                    manager.domCache.dropLayer.classList.add('dropped');
                    var files = e.dataTransfer.files;
                    if (!files.length) return;
                    manager.onGotFiles(files);
                });

                document.body.addEventListener('dragover', function onDragOver(e) {
                    if (e.dataTransfer.types.length === 2) {
                        return;
                    }
                    e.preventDefault();
                    manager.domCache.dropLayer.style.display = 'block';
                    clearTimeout(onDragOver.timeout);
                    onDragOver.timeout = setTimeout(function () {
                        manager.domCache.dropLayer.style.display = 'none';
                        manager.domCache.dropLayer.classList.remove('dropped');
                    }, 300);
                });

                manager.domCache.flBody.addEventListener('click', function(e) {
                    var el = e.target;
                    if (el.tagName !== 'A') return;

                    if (!el.classList.contains('folder')) {
                        return;
                    }
                    manager.flOnSmartNameClick(el.dataset.path);
                    manager.selectAllCheckBox('fl');
                });

                manager.domCache.trBody.addEventListener('change', function(e) {
                    var el = e.target;
                    if (el.tagName !== 'INPUT') return;

                    if (el.checked) {
                        el.parentNode.parentNode.classList.add("selected");
                    } else {
                        el.parentNode.parentNode.classList.remove("selected");
                    }
                    manager.selectAllCheckBox('tr');
                });

                manager.domCache.flBody.addEventListener('change', function(e) {
                    var el = e.target;
                    if (el.tagName !== 'INPUT') return;

                    if (el.checked) {
                        el.parentNode.parentNode.classList.add("selected");
                    } else {
                        el.parentNode.parentNode.classList.remove("selected");
                    }
                    manager.selectAllCheckBox('fl');
                });

                manager.domCache.trFixedHead.addEventListener('change', function(e) {
                    var el = e.target;
                    if (el.tagName !== 'INPUT') return;

                    var checkBoxList;
                    if (el.checked) {
                        checkBoxList = manager.getCheckBoxList('tr', 0, 1);
                        for (var i = 0, item; item = checkBoxList[i]; i++) {
                            item.checked = true;
                            item.parentNode.parentNode.classList.add("selected");
                        }
                    } else {
                        checkBoxList = manager.getCheckBoxList('tr', 1, 1);
                        for (var i = 0, item; item = checkBoxList[i]; i++) {
                            item.checked = false;
                            item.parentNode.parentNode.classList.remove("selected");
                        }
                    }
                    manager.selectAllCheckBox('tr');
                });

                manager.domCache.flFixedHead.addEventListener('change', function(e) {
                    var el = e.target;
                    if (el.tagName !== 'INPUT') return;

                    var checkBoxList;
                    if (el.checked) {
                        checkBoxList = manager.getCheckBoxList('fl', 0, 1);
                        for (var i = 0, item; item = checkBoxList[i]; i++) {
                            item.checked = true;
                            item.parentNode.parentNode.classList.add("selected");
                        }
                    } else {
                        checkBoxList = manager.getCheckBoxList('fl', 1, 1);
                        for (var i = 0, item; item = checkBoxList[i]; i++) {
                            item.checked = false;
                            item.parentNode.parentNode.classList.remove("selected");
                        }
                    }
                });

                manager.varCache.webUiUrl = (manager.settings.useSSL ? 'https://' : 'http://') + manager.settings.login + ':' + manager.settings.password + '@' + manager.settings.ip + ':' + manager.settings.port + '/';
                mono.create(document.querySelector('a.btn.wui'), {
                    href: manager.varCache.webUiUrl + manager.settings.guiPath
                });
                manager.writeLanguage();

                !manager.options.windowMode && manager.domCache.upSpeed.appendChild(mono.create('div', {
                    class: 'openInTab',
                    title: manager.language.openInTab,
                    on: ['click', function(e) {
                        if (mono.isChrome) {
                            chrome.tabs.create({url: window.location.href});
                        } else {
                            mono.sendMessage({action: 'openTab', url: window.location.href}, undefined, 'service');
                        }
                    }]
                }));

                mono.isChrome && !manager.options.windowMode && setTimeout(function() {
                    var popupHeight = manager.settings.popupHeight;
                    if (popupHeight === 0) {
                        popupHeight = document.body.clientHeight;
                    }
                    document.body.style.minHeight = (popupHeight + 1) + 'px';
                    setTimeout(function() {
                        document.body.style.minHeight = manager.settings.popupHeight + 'px';
                    });
                }, 100);

                console.timeEnd('manager render');
                console.timeEnd('manager');

                setTimeout(function() {
                    console.time('jquery');
                    document.body.appendChild(mono.create('script', {src: 'js/jquery-2.1.3.min.js'}));
                }, 0);
            });
        });
    }
};

var define = function(name) {
    if (name === 'jquery') {
        console.timeEnd('jquery');

        console.time('contextMenu');
        document.body.appendChild(mono.create('script', {src: 'js/jquery.contextMenu.js'}));
        return;
    }
    if (name === 'contextMenu') {
        console.timeEnd('contextMenu');
        manager.onLoadContextMenu();

        console.time('quickNotification');
        document.body.appendChild(mono.create('script', {src: 'js/notifer.js'}));
        return;
    }
    if (name === 'quickNotification') {
        console.timeEnd('quickNotification');
        manager.onLoadQuickNotification();

        if (manager.settings.showSpeedGraph) {
            console.time('d3js');
            document.body.appendChild(mono.create('script', {src: 'js/d3.min.js'}));
        }
        return;
    }
    if (name === 'graph') {
        manager.varCache.hasGraph = true;
        return;
    }
    if (name.hasOwnProperty('version')) {
        console.timeEnd('d3js');

        document.body.appendChild(mono.create('script', {src: 'js/graph.js'}));
    }
};
define.amd = {};

manager.run();