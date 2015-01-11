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
mono.debounce = function(fn, delay) {
    var timer = null;
    return function () {
        var context = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
            fn.apply(context, args);
        }, delay);
    };
};

var options = function() {
    "use strict";
    var activePage = null;
    var activeItem = undefined;
    var domCache = {};
    var varCache = {};

    var set_place_holder = function() {
        for (var key in options.defaultSettings) {
            var defaultValue = options.defaultSettings[key];
            var el = document.querySelector('input[data-option="' + key + '"]');
            if (el === null) {
                console.log('El not found!', key);
                continue;
            }
            if (['text', 'number', 'password'].indexOf(el.type) !== -1) {
                if (options.settings[key] !== defaultValue) {
                    el.value = options.settings[key];
                } else {
                    el.value = '';
                }
                if (defaultValue || defaultValue === '' || defaultValue === 0) {
                    el.placeholder = defaultValue;
                }
            } else if (el.type === "checkbox") {
                el.checked = !!options.settings[key];
            } else if (el.type === "radio") {
                var _el = document.querySelector('input[data-option="' + key + '"][value="'+options.settings[key]+'"]');
                if (_el !== null) {
                    el = _el;
                }
                el.checked = true;
            }
        }
    };

    var onHashChange = function() {
        var hash = location.hash.substr(1) || 'client';
        var activeItem = document.querySelector('a[data-page="'+hash+'"]');
        if (activeItem === null) {
            activeItem = document.querySelector('a[data-page="client"]');
        }
        activeItem.dispatchEvent(new CustomEvent('click', {bubbles: true}));
    };

    var saveChange = function(e) {
        var el = e.target;
        if (el.tagName !== 'INPUT') {
            return;
        }
        var key = el.dataset.option;
        if (!key) {
            return;
        }
        var value;
        if (el.type === 'checkbox') {
            value = el.checked ? 1 : 0;
        } else
        if (el.type === 'radio') {
            value = parseInt(el.value);
        } else
        if (el.type === 'number') {
            var number = parseInt(el.value);
            if (isNaN(number)) {
                number = parseInt(el.placeholder);
            }
            var min = parseInt(el.min);
            if (!isNaN(min) && number < min) {
                number = min;
                el.value = number;
            }
            if (isNaN(number)) {
                return;
            }
            value = number;
        } else
        if (['text', 'password'].indexOf(el.type) !== -1) {
            value = el.value;
            var placehoder = el.placeholder;
            if (!value && placehoder) {
                value = placehoder;
            }
        }

        var obj = {};
        obj[key] = value;

        var cb = this.cb;
        mono.storage.set(obj, function() {
            mono.sendMessage({action: 'reloadSettings'}, cb);
        });
    };

    var getBackupJson = function(cb) {
        mono.storage.get(null, function(storage) {
            cb && cb(JSON.stringify(storage));
        });
    };

    var restoreSettings = function(storage) {
        mono.storage.clear();
        var data = {};
        for (var item in storage) {
            var value = storage[item];
            if (storage.hasOwnProperty(item) === false || value === null) {
                continue;
            }
            data[item] = value;
        }
        mono.storage.set(data, function() {
            mono.sendMessage({action: 'reloadSettings'}, function() {
                window.location.reload();
            });
        });
    };

    var makeBackupForm = function() {
        domCache.backupUpdateBtn.on('click', function() {
            getBackupJson(function(json) {
                domCache.backupInp.val( json );
            });
        });
        domCache.restoreBtn.on('click', function() {
            try {
                var data = JSON.parse(domCache.restoreInp.val());
            } catch (error) {
                return alert(options.language.OV_FL_ERROR + "\n" + error);
            }
            restoreSettings(data);
        });
        domCache.clearCloudStorageBtn.on('click', function() {
            mono.storage.sync.clear();
            domCache.getFromCloudBtn.prop('disabled', true);
        });
        domCache.saveInCloudBtn.on('click', function() {
            var _this = this;
            _this.disabled = true;
            setTimeout(function() {
                _this.disabled = false;
            }, 750);
            getBackupJson(function(json) {
                mono.storage.sync.set({backup: json}, function() {
                    domCache.getFromCloudBtn.prop('disabled', false);
                });
            });
        });
        domCache.getFromCloudBtn.on('click', function() {
            mono.storage.sync.get('backup', function(storage) {
                domCache.restoreInp.val( storage.backup );
            });
        });
    };

    var writeLanguage = function(body) {
        var elList = (body || document).querySelectorAll('[data-lang]');
        for (var i = 0, el; el = elList[i]; i++) {
            var langList = el.dataset.lang.split('|');
            for (var m = 0, lang; lang = langList[m]; m++) {
                var args = lang.split(',');
                var locale = options.language[args.shift()];
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
    };

    var folderLoadList = function(folderList) {
        for (var i = 0, item; item = folderList[i]; i++) {
            domCache.folderList.appendChild(mono.create('option', {
                text: item[1],
                data: {
                    dir: item[0],
                    subPath: item[1]
                }
            }));
        }
    };

    var folderSaveList = window.folderSaveList = function() {
        var optionList = [];
        var optionNodeList = domCache.folderList.childNodes;
        for (var i = 0, item; item = optionNodeList[i]; i++) {
            optionList.push([item.dataset.dir, item.dataset.subPath]);
        }
        mono.storage.set({folderList: optionList}, function() {
            mono.sendMessage({action: 'reloadSettings'});
        });
    };

    var removeOption = function(type) {
        var container = domCache[type+'List'];
        var rmList = [];
        var optionNodeList = container.childNodes;
        for (var i = 0, item; item = optionNodeList[i]; i++) {
            if (!item.selected) continue;
            rmList.push(item);
        }
        for (var i = 0, item; item = rmList[i]; i++) {
            item.parentNode.removeChild(item);
        }

        window[type+'SaveList']();
    };

    var optionUp = function(type) {
        var container = domCache[type+'List'];
        var optionIndex = container.selectedIndex;
        if (optionIndex === -1) {
            return;
        }
        var option = container.childNodes[optionIndex];
        if (!option.previousElementSibling) return;
        container.insertBefore(option, option.previousElementSibling);

        window[type+'SaveList']();
    };

    var optionDown = function(type) {
        var container = domCache[type+'List'];
        var optionIndex = container.selectedIndex;
        if (optionIndex === -1) {
            return;
        }
        var option = container.childNodes[optionIndex];
        var next = option.nextElementSibling;
        if (!next) return;
        if (!next.nextElementSibling) {
            container.appendChild(option);
        } else {
            container.insertBefore(option, next.nextElementSibling);
        }

        window[type+'SaveList']();
    };

    return {
        start: function() {
            mono.onMessage(function(message) {
                if (message === 'sleep') {
                    window.location = 'sleep.html';
                }
            });

            mono.storage.get([
                'folderList'/*,
                'labelList'*/
            ], function(storage) {
                mono.sendMessage([
                    {action: 'getLanguage'},
                    {action: 'getSettings'},
                    {action: 'getTrColumnArray'},
                    {action: 'getFlColumnArray'},
                    {action: 'getDefaultSettings'}
                ], function (data) {
                    options.settings = data.getSettings;
                    options.defaultSettings = data.getDefaultSettings;
                    options.language = data.getLanguage;

                    !(mono.isFF && mono.noAddon) && mono.sendMessage({action: 'resize', height: 480, width: 800}, undefined, "service");

                    var langSelect = document.getElementById("language");
                    var langPos = ['ru', 'en', 'fr'].indexOf(options.language.lang);
                    if (langPos === -1) {
                        langPos = 1;
                    }
                    langSelect.selectedIndex = langPos;
                    langSelect.addEventListener('change', function() {
                        var index = langSelect.selectedIndex;
                        var option = langSelect.childNodes[index];
                        var lang = option.value;
                        mono.storage.set({language: lang}, function() {
                            mono.sendMessage({action: 'reloadSettings'}, function() {
                                location.reload();
                            });
                        });
                    });

                    writeLanguage();

                    domCache.folderList = document.getElementById('folderList');
                    folderLoadList(storage.folderList || []);
                    domCache.subPath = document.getElementById('subPath');
                    domCache.addSubPath = document.getElementById('addSubPath');
                    domCache.addSubPath.addEventListener('click', function() {
                        var dir = '0';
                        var subPath = domCache.subPath.value;
                        if (!subPath) {
                            return;
                        }
                        domCache.folderList.appendChild(mono.create('option', {
                            text: subPath,
                            data: {
                                dir: dir,
                                subPath: subPath
                            }
                        }));

                        domCache.subPath.value = '';
                        folderSaveList();
                    });
                    domCache.subPath.addEventListener('keydown', function(e) {
                        if (e.keyCode === 13) {
                            domCache.addSubPath.dispatchEvent(new CustomEvent('click'));
                        }
                    });

                    domCache.folderDeleteSelected = document.getElementById('folderDeleteSelected');
                    domCache.folderDeleteSelected.addEventListener('click', removeOption.bind(null, 'folder'));
                    domCache.folderUp = document.getElementById('folderUp');
                    domCache.folderUp.addEventListener('click', optionUp.bind(null, 'folder'));
                    domCache.folderDown = document.getElementById('folderDown');
                    domCache.folderDown.addEventListener('click', optionDown.bind(null, 'folder'));

                    domCache.backupUpdateBtn = $('#backupUpdate');
                    domCache.restoreBtn = $('#restoreBtn');
                    domCache.saveInCloudBtn = $('#saveInCloud');
                    domCache.getFromCloudBtn = $('#getFromCloudBtn');
                    domCache.clearCloudStorageBtn = $('#clearCloudStorage');
                    domCache.backupInp = $('#backupInp');
                    domCache.restoreInp = $('#restoreInp');

                    set_place_holder();

                    if (!mono.isChrome) {
                        domCache.saveInCloudBtn.hide();
                        domCache.getFromCloudBtn.hide();
                        domCache.clearCloudStorageBtn.hide();
                    }

                    makeBackupForm();

                    domCache.menu = document.querySelector('.menu');
                    domCache.menu.addEventListener('click', function(e) {
                        var el = e.target;
                        if (el.tagName !== 'A') return;

                        if (el.classList.contains('active')) {
                            return;
                        }
                        activeItem && activeItem.classList.remove('active');
                        activeItem = el;
                        activeItem.classList.add('active');
                        activePage && activePage.classList.remove('active');
                        var page = el.dataset.page;
                        activePage = document.querySelector('.page.' + page);
                        activePage.classList.add('active');
                        if (page === 'backup') {
                            domCache.backupUpdateBtn.trigger('click');
                        }
                        if (page === 'restore') {
                            mono.storage.sync.get('backup', function(storage) {
                                if (storage.backup !== undefined) {
                                    return;
                                }
                                domCache.getFromCloudBtn.prop('disabled', true);
                            });
                        }
                    });
                    window.addEventListener("hashchange", onHashChange);
                    onHashChange();

                    domCache.clientCheckBtn = document.getElementById('clientCheckBtn');
                    domCache.clientCheckBtn.addEventListener('click', function(e) {
                        var statusEl = document.getElementById('clientStatus');
                        statusEl.textContent = '';
                        statusEl.appendChild(mono.create('img', {
                            src: 'images/loading.gif'
                        }));
                        mono.sendMessage({action: 'checkSettings'}, function(response) {
                            statusEl.textContent = '';
                            var span;
                            if (response.error) {
                                span = mono.create('span', {
                                    text: response.error.statusText+' (code: '+response.error.status+')',
                                    style: {
                                        color: 'red'
                                    }
                                });
                            } else {
                                span = mono.create('span', {
                                    text: options.language.DLG_BTN_OK,
                                    style: {
                                        color: 'green'
                                    }
                                });
                                var windowMode;
                                if (mono.isChrome) {
                                    windowMode = window !== chrome.extension.getViews({type: 'popup'})[0];
                                } else {
                                    windowMode = mono.isFF && mono.noAddon;
                                }
                                if (!windowMode) {
                                    return window.location = "manager.html";
                                }
                            }
                            statusEl.appendChild(span);

                            clearTimeout(varCache.statusTimer);
                            varCache.statusTimer = setTimeout(function() {
                                statusEl.textContent = '';
                            }, 2500);
                        });
                    });

                    var checkInputList = document.querySelectorAll('input[data-option="login"], input[data-option="password"], input[data-option="ip"], input[data-option="port"]');
                    for (var i = 0, el; el = checkInputList[i]; i++) {
                        el.addEventListener('keydown', function(e) {
                            if (e.keyCode === 13) {
                                saveChange.call({cb: function() {
                                    domCache.clientCheckBtn.dispatchEvent(new CustomEvent('click'));
                                }}, {target: this});
                            }
                        });
                    }

                    var inputList = document.querySelectorAll('input[type=text], input[type=password], input[type=number]');

                    for (var i = 0, el; el = inputList[i]; i++) {
                        el.addEventListener('keyup', mono.debounce(saveChange, 500));
                    }

                    document.body.addEventListener('click', saveChange);
                });
            });
        }
    }
}();

options.start();