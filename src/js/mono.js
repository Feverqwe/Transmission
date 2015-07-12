/**
 *
 * Created by Anton on 21.06.2014.
 *
 * Mono cross-browser engine.
 *
 **/

var mono = (typeof mono !== 'undefined') ? mono : undefined;

(function(window, factory) {
    "use strict";
    if (mono && mono.isLoaded) {
        return;
    }

    if (typeof window !== "undefined") {
        return mono = factory(null, mono);
    }

    exports.isFF = true;
    exports.isModule = true;

    exports.init = factory;

}(
    typeof window !== "undefined" ? window : undefined,
    function initMono(_addon, _mono) {
        var require;

        var mono = {
            isLoaded: 1,
            emptyFunc: function() {},
            msgType: undefined,
            storageType: undefined,
            msgList: {},
            storageList: {}
        };

        (function browserDefine() {

            if (typeof window === 'undefined') {
                mono.isFF = true;
                mono.msgType = 'firefox';
                mono.isModule = true;
                mono.addon = _addon;
                require = _require;
                return;
            }

            if (window.chrome) {
                mono.isChrome = true;
                mono.isChromeInject = !chrome.hasOwnProperty('tabs');
                mono.msgType = 'chrome';

                if (!(chrome.hasOwnProperty('runtime') && chrome.runtime.onMessage)) {
                    mono.msgType = 'oldChrome';
                }

                return;
            }

            if (navigator.userAgent.indexOf('Firefox') !== -1) {
                mono.isFF = true;
                mono.msgType = 'firefox';
                if (typeof addon !== 'undefined' && addon.hasOwnProperty('port')) {
                    mono.addon = addon;
                } else
                if (typeof self !== 'undefined' && self.hasOwnProperty('port')) {
                    mono.addon = self;
                } else {
                    mono.noAddon = true;
                }
                return;
            }

            console.error('Mono: can\'t define browser!');
        })();

        /**
         * Clone array or object via JSON
         * @param {object|Array} obj
         * @returns {object|Array}
         */
        mono.cloneObj = function(obj) {
            return JSON.parse(JSON.stringify(obj));
        };

        var msgTools = {
            cbObj: {},
            cbStack: [],
            id: 0,
            idPrefix: Math.floor(Math.random() * 1000) + '_',
            aliveTime: 120 * 1000,
            /**
             * Add callback function in cbObj and cbStack
             * @param {object} message - Message
             * @param {function} cb - Callback function
             */
            addCb: function(message, cb) {
                mono.onMessage.count === 0 && mono.onMessage(mono.emptyFunc);

                if (this.cbStack.length > mono.messageStack) {
                    this.clean();
                }
                var id = message.callbackId = this.idPrefix + (++this.id);
                this.cbObj[id] = {
                    fn: cb,
                    time: Date.now()
                };
                this.cbStack.push(id);
            },
            /**
             * Call function from callback list
             * @param {object} message
             */
            callCb: function(message) {
                var cb = this.cbObj[message.responseId];
                if (cb === undefined) return;
                delete this.cbObj[message.responseId];
                this.cbStack.splice(this.cbStack.indexOf(message.responseId), 1);
                cb.fn(message.data);
            },
            /**
             * Response function
             * @param {function} response
             * @param {string} callbackId
             * @param {*} responseMessage
             */
            mkResponse: function(response, callbackId, responseMessage) {
                responseMessage = {
                    data: responseMessage,
                    responseId: callbackId
                };
                response(responseMessage);
            },
            /**
             * Clear callback stack
             */
            clearCbStack: function() {
                for (var item in this.cbObj) {
                    delete this.cbObj[item];
                }
                this.cbStack.splice(0);
            },
            /**
             * Remove item from cbObj and cbStack by cbId
             * @param {string} cbId - Callback id
             */
            removeCb: function(cbId) {
                var cb = this.cbObj[cbId];
                if (cb === undefined) return;
                delete this.cbObj[cbId];
                this.cbStack.splice(this.cbStack.indexOf(cbId), 1);
            },
            /**
             * Remove old callback from cbObj
             * @param {number} [aliveTime] - Keep alive time
             */
            clean: function(aliveTime) {
                var now = Date.now();
                aliveTime = aliveTime || this.aliveTime;
                for (var item in this.cbObj) {
                    if (this.cbObj[item].time + aliveTime < now) {
                        delete this.cbObj[item];
                        this.cbStack.splice(this.cbStack.indexOf(item), 1);
                    }
                }
            }
        };

        mono.messageStack = 50;
        mono.msgClearStack = msgTools.clearCbStack;
        mono.msgRemoveCbById = msgTools.removeCb;
        mono.msgClean = msgTools.clean;

        /**
         * Send message if background page - to local pages, or to background page
         * @param {*} message - Message
         * @param {function} [cb] - Callback function
         * @param {string} [hook] - Hook string
         * @returns {*|string} - callback id
         */
        mono.sendMessage = function(message, cb, hook) {
            message = {
                data: message,
                hook: hook
            };
            if (cb) {
                msgTools.addCb(message, cb.bind(this));
            }
            mono.sendMessage.send.call(this, message);

            return message.callbackId;
        };

        /**
         * Send message to active page, background page only
         * @param {*} message - Message
         * @param {function} [cb] - Callback function
         * @param {string} [hook] - Hook string
         * @returns {*|string} - callback id
         */
        mono.sendMessageToActiveTab = function(message, cb, hook) {
            message = {
                data: message,
                hook: hook
            };
            if (cb) {
                msgTools.addCb(message, cb.bind(this));
            }
            mono.sendMessage.sendToActiveTab.call(this, message);

            return message.callbackId;
        };

        /**
         * Mono message hooks
         * @type {{}}
         */
        mono.sendHook = {};

        /**
         * Listen messages and call callback function
         * @param {function} cb - Callback function
         */
        mono.onMessage = function(cb) {
            var index = mono.onMessage.count++;
            var func = mono.onMessage.wrapFunc.bind(this, cb, index);
            cb.monoCbId = index;
            mono.onMessage.on.call(this, mono.onMessage.wrapper[index] = func);
        };
        mono.onMessage.count = 0;
        mono.onMessage.wrapper = {};
        mono.onMessage.wrapFunc = function(cb, index, message, response) {
            if (message.responseId !== undefined) {
                return msgTools.callCb(message);
            }
            var mResponse;
            if (message.callbackId === undefined) {
                mResponse = mono.emptyFunc;
            } else {
                mResponse = msgTools.mkResponse.bind(msgTools, response.bind(this), message.callbackId);
            }
            if (message.hook !== undefined) {
                if (index !== 0) {
                    return;
                }
                var hookFunc = mono.sendHook[message.hook];
                if (hookFunc !== undefined) {
                    return hookFunc(message.data, mResponse);
                }
            }
            cb.call(this, message.data, mResponse);
        };

        /**
         * Remove listener
         * @param {function} cb
         */
        mono.offMessage = function(cb) {
            var func = mono.onMessage.wrapper[cb.monoCbId];
            if (func === undefined) {
                return;
            }
            delete mono.onMessage.wrapper[cb.monoCbId];
            delete cb.monoCbId;
            mono.onMessage.off(func);
        };

        mono.msgList.chrome = function() {
            var lowLevelHook = {};

            var chromeMsg = {
                cbList: [],
                mkResponse: function(sender) {
                    if (sender.tab) {
                        // send to tab
                        return function(message) {
                            chromeMsg.sendTo(message, sender.tab.id);
                        }
                    }

                    if (sender.monoDirect) {
                        return function(message) {
                            sender(mono.cloneObj(message), chromeMsg.onMessage);
                        };
                    }

                    return function(message) {
                        // send to extension
                        chromeMsg.send(message);
                    }
                },
                sendTo: function(message, tabId) {
                    chrome.tabs.sendMessage(tabId, message);
                },
                onMessage: function(message, sender, _response) {
                    if (mono.isChromeBgPage) {
                        if (message.fromBgPage === 1) {
                            // block msg's from bg page to bg page.
                            return;
                        }
                    } else
                    if (message.toBgPage === 1) {
                        // block msg to bg page not in bg page.
                        return;
                    }

                    if (message.hook !== undefined) {
                        var hookFunc = lowLevelHook[message.hook];
                        if (hookFunc !== undefined) {
                            return hookFunc(message, sender, _response);
                        }
                    }

                    var response = chromeMsg.mkResponse(sender);
                    for (var i = 0, cb; cb = chromeMsg.cbList[i]; i++) {
                        cb(message, response);
                    }
                },
                on: function(cb) {
                    chromeMsg.cbList.push(cb);
                    if (chromeMsg.cbList.length !== 1) {
                        return;
                    }
                    chrome.runtime.onMessage.addListener(chromeMsg.onMessage);
                },
                off: function(cb) {
                    var cbList = chromeMsg.cbList;
                    var pos = cbList.indexOf(cb);
                    if (pos === -1) {
                        return;
                    }
                    cbList.splice(pos, 1);
                    if (cbList.length !== 0) {
                        return;
                    }
                    chrome.runtime.onMessage.removeListener(chromeMsg.onMessage);
                },
                sendToActiveTab: function(message) {
                    chrome.tabs.query({
                        active: true,
                        currentWindow: true
                    }, function(tabs) {
                        if (tabs[0] === undefined || tabs[0].id < 0) {
                            return;
                        }
                        chromeMsg.sendTo(message, tabs[0].id);
                    });
                },
                send: function(message) {
                    if (mono.isChromeBgPage) {
                        message.fromBgPage = 1;
                    } else {
                        message.toBgPage = 1;
                    }
                    chrome.runtime.sendMessage(message);
                }
            };

            chromeMsg.on.lowLevelHook = lowLevelHook;

            if (chrome.runtime.hasOwnProperty('getBackgroundPage')) {
                mono.isChromeBgPage = location.href.indexOf('_generated_background_page.html') !== -1;

                chrome.runtime.getBackgroundPage(function(bgWin) {
                    if (bgWin !== window) {
                        delete mono.isChromeBgPage;
                    } else {
                        mono.isChromeBgPage = true;
                    }

                    if (!mono.isChromeBgPage) {
                        chromeMsg.onMessage.monoDirect = true;
                        chromeMsg.send = mono.sendMessage.send = function(message) {
                            bgWin.mono.chromeDirectOnMessage(mono.cloneObj(message), chromeMsg.onMessage);
                        }
                    } else
                    if (mono.chromeDirectOnMessage === undefined) {
                        mono.chromeDirectOnMessage = function(message, sender) {
                            chromeMsg.onMessage(message, sender);
                        };
                    }

                });

            }

            mono.onMessage.on = chromeMsg.on;
            mono.onMessage.off = chromeMsg.off;
            mono.sendMessage.send = chromeMsg.send;
            mono.sendMessage.sendToActiveTab = chromeMsg.sendToActiveTab;
        };

        mono.msgList.oldChrome = function() {
            var lowLevelHook = {};

            var chromeMsg = {
                cbList: [],
                mkResponse: function(sender, _response) {
                    if (sender.tab && sender.tab.id > -1) {
                        // send to tab
                        return function(message) {
                            chromeMsg.sendTo(message, sender.tab.id);
                        }
                    }

                    return function(message) {
                        // send to extension
                        _response(message);
                    }
                },
                sendTo: function(message, tabId) {
                    chrome.tabs.sendRequest(tabId, message, function(message) {
                        if (message && message.responseId !== undefined) {
                            return msgTools.callCb(message);
                        }
                    });
                },
                onMessage: function(message, sender, _response) {
                    if (mono.isChromeBgPage) {
                        if (message.fromBgPage === 1) {
                            // block msg's from bg page to bg page.
                            return;
                        }
                    } else
                    if (message.toBgPage === 1) {
                        // block msg to bg page not in bg page.
                        return;
                    }

                    if (message.hook !== undefined) {
                        var hookFunc = lowLevelHook[message.hook];
                        if (hookFunc !== undefined) {
                            return hookFunc(message, sender, _response);
                        }
                    }

                    var response = chromeMsg.mkResponse(sender, _response);
                    for (var i = 0, cb; cb = chromeMsg.cbList[i]; i++) {
                        cb(message, response);
                    }
                },
                on: function(cb) {
                    chromeMsg.cbList.push(cb);
                    if (chromeMsg.cbList.length !== 1) {
                        return;
                    }
                    chrome.extension.onRequest.addListener(chromeMsg.onMessage);
                },
                off: function(cb) {
                    var cbList = chromeMsg.cbList;
                    var pos = cbList.indexOf(cb);
                    if (pos === -1) {
                        return;
                    }
                    cbList.splice(pos, 1);
                    if (cbList.length !== 0) {
                        return;
                    }
                    chrome.extension.onRequest.removeListener(chromeMsg.onMessage);
                },
                sendToActiveTab: function(message) {
                    chrome.tabs.query({
                        active: true,
                        currentWindow: true
                    }, function(tabs) {
                        if (tabs[0] === undefined || tabs[0].id < 0) {
                            return;
                        }
                        chromeMsg.sendTo(message, tabs[0].id);
                    });
                },
                send: function(message) {
                    if (mono.isChromeBgPage) {
                        message.fromBgPage = 1;
                    } else {
                        message.toBgPage = 1;
                    }
                    chrome.extension.sendRequest(message, function(message) {
                        if (message && message.responseId !== undefined) {
                            return msgTools.callCb(message);
                        }
                    });
                }
            };

            chromeMsg.on.lowLevelHook = lowLevelHook;

            try {
                if (chrome.runtime.getBackgroundPage !== undefined) {
                    mono.isChromeBgPage = location.href.indexOf('_generated_background_page.html') !== -1;

                }
            } catch (e) {}

            mono.onMessage.on = chromeMsg.on;
            mono.onMessage.off = chromeMsg.off;
            mono.sendMessage.send = chromeMsg.send;
            mono.sendMessage.sendToActiveTab = chromeMsg.sendToActiveTab;
        };

        mono.msgList.firefox = function() {
            if (mono.noAddon) {
                var onCollector = [];
                var onMessage = function(e) {
                    if (e.detail[0] !== '<') {
                        return;
                    }
                    var data = e.detail.substr(1);
                    var json = JSON.parse(data);
                    for (var i = 0, cb; cb = onCollector[i]; i++) {
                        cb(json);
                    }
                };
                mono.addon = {
                    port: {
                        emit: function(pageId, message) {
                            var msg = '>' + JSON.stringify(message);
                            window.postMessage(msg, "*");
                        },
                        on: function(pageId, func) {
                            onCollector.push(func);
                            if (onCollector.length > 1) {
                                return;
                            }
                            window.addEventListener('monoMessage', onMessage);
                        },
                        removeListener: function(pageId, func) {
                            var pos = onCollector.indexOf(func);
                            if (pos === -1) {
                                return;
                            }
                            onCollector.splice(pos, 1);
                            if (onCollector.length !== 0) {
                                return;
                            }
                            window.removeEventListener('monoMessage', onMessage);
                        }
                    }
                }
            }

            var firefoxMsg = {
                cbList: [],
                mkResponse: function(pageId) {
                    return function(message) {
                        firefoxMsg.sendTo(message, pageId);
                    }
                },
                onMessage: function(msg) {
                    var response = firefoxMsg.mkResponse(msg.from);
                    for (var i = 0, cb; cb = firefoxMsg.cbList[i]; i++) {
                        cb(msg, response);
                    }
                },
                on: function(cb) {
                    firefoxMsg.cbList.push(cb);
                    if (firefoxMsg.cbList.length !== 1) {
                        return;
                    }
                    mono.addon.port.on('mono', firefoxMsg.onMessage);
                },
                off: function(cb) {
                    var cbList = firefoxMsg.cbList;
                    var pos = cbList.indexOf(cb);
                    if (pos === -1) {
                        return;
                    }
                    cbList.splice(pos, 1);
                    if (cbList.length !== 0) {
                        return;
                    }
                    mono.addon.port.removeListener('mono', firefoxMsg.onMessage);
                },
                send: function(message) {
                    mono.addon.port.emit('mono', message);
                },
                sendTo: function(message, to) {
                    message.to = to;
                    mono.addon.port.emit('mono', message);
                },
                sendToActiveTab: function(message) {
                    message.hook = 'activeTab';
                    firefoxMsg.sendTo(message);
                }
            };

            mono.onMessage.on = firefoxMsg.on;
            mono.onMessage.off = firefoxMsg.off;
            mono.sendMessage.send = firefoxMsg.send;
            mono.sendMessage.sendToActiveTab = firefoxMsg.sendToActiveTab;
        };

        var func = mono.msgList[mono.msgType];
        if (func !== undefined) {
            func();
        } else {
            console.error('Msg transport is not defined!');
        }
        func = undefined;
        mono.msgList = undefined;

        (function storageDefine() {

            if (mono.isFF) {
                if (!mono.isModule) {
                    mono.storageType = 'externalStorage';
                } else {
                    mono.storageType = 'simpleStorage';
                }
                return;
            }

            if (mono.isChrome && chrome.hasOwnProperty('storage')) {
                mono.storageType = 'chrome';
                return;
            }

        })();

        mono.storageList.simpleStorage = function() {
            /**
             * Firefox simple storage
             * @returns {{get: Function, set: Function, remove: Function, clear: Function}}
             */
            var ffSimpleStorage = function() {
                var ss = require('sdk/simple-storage');
                return {
                    /**
                     * Get item from storage
                     * @param {string|number|null|undefined|Array} src - Item's, null/undefined - all items
                     * @param {function} cb - Callback function
                     */
                    get: function(src, cb) {
                        var key, obj = {};
                        if (src === undefined || src === null) {
                            for (key in ss.storage) {
                                if (!ss.storage.hasOwnProperty(key)) {
                                    continue;
                                }
                                obj[key] = ss.storage[key];
                            }
                            return cb(obj);
                        }
                        if (Array.isArray(src) === false) {
                            src = [src];
                        }
                        for (var i = 0, len = src.length; i < len; i++) {
                            key = src[i];
                            if (!ss.storage.hasOwnProperty(key)) {
                                continue;
                            }
                            obj[key] = ss.storage[key];
                        }
                        cb(obj);
                    },
                    /**
                     * Set item in storage
                     * @param {Object} obj
                     * @param {function} [cb]
                     */
                    set: function(obj, cb) {
                        for (var key in obj) {
                            if (obj[key] === undefined) {
                                delete ss.storage[key];
                            } else {
                                ss.storage[key] = obj[key];
                            }
                        }
                        cb && cb();
                    },
                    /**
                     * Remove item from storage
                     * @param {Array|string} arr
                     * @param {function} [cb]
                     */
                    remove: function(arr, cb) {
                        if (Array.isArray(arr) === false) {
                            arr = [arr];
                        }
                        for (var i = 0, len = arr.length; i < len; i++) {
                            var key = arr[i];
                            delete ss.storage[key];
                        }
                        cb && cb();
                    },
                    /**
                     * Clear storage
                     * @param {function} [cb]
                     */
                    clear: function(cb) {
                        for (var key in ss.storage) {
                            if (!ss.storage.hasOwnProperty(key)) {
                                continue;
                            }
                            delete ss.storage[key];
                        }
                        cb && cb();
                    }
                }
            };

            /**
             * FF Storage
             * @type {{get: Function, set: Function, remove: Function, clear: Function}}
             */
            mono.storage = ffSimpleStorage();
            mono.storage.local = mono.storage.sync = mono.storage;
        };

        mono.storageList.externalStorage = function() {
            /**
             * External storage mode
             * @type {{get: Function, set: Function, remove: Function, clear: Function}}
             */
            var externalStorage = {
                /**
                 * Get item from storage
                 * @param {string|number|null|undefined|Array} obj - Item's, null/undefined - all items
                 * @param {function} cb - Callback function
                 */
                get: function(obj, cb) {
                    mono.sendMessage({
                        action: 'get',
                        data: obj
                    }, cb, 'monoStorage');
                },
                /**
                 * Set item in storage
                 * @param {Object} obj
                 * @param {function} [cb]
                 */
                set: function(obj, cb) {
                    mono.sendMessage({
                        action: 'set',
                        data: obj,
                        keys: Object.keys(obj)
                    }, cb, 'monoStorage');
                },
                /**
                 * Remove item from storage
                 * @param {Array|string} obj
                 * @param {function} [cb]
                 */
                remove: function(obj, cb) {
                    mono.sendMessage({
                        action: 'remove',
                        data: obj
                    }, cb, 'monoStorage');
                },
                /**
                 * Clear storage
                 * @param {function} [cb]
                 */
                clear: function(cb) {
                    mono.sendMessage({
                        action: 'clear'
                    }, cb, 'monoStorage');
                }
            };

            /**
             * FF Storage
             * @type {{get: Function, set: Function, remove: Function, clear: Function}}
             */
            mono.storage = externalStorage;
            mono.storage.local = mono.storage.sync = mono.storage;
        };

        mono.storageList.chrome = function() {
            /**
             * Chrome storage
             * @type {{get: Function, set: Function, remove: Function, clear: Function}}
             */
            mono.storage = chrome.storage.local;
            /**
             * Chrome local
             * @type {{get: Function, set: Function, remove: Function, clear: Function}|mono.storage|*}
             */
            mono.storage.local = mono.storage;
            /**
             * Chrome sync storage
             * @type {{get: Function, set: Function, remove: Function, clear: Function}}
             */
            mono.storage.sync = chrome.storage.sync;
        };

        func = mono.storageList[mono.storageType];
        if (func !== undefined) {
            func();
        } else {
            console.error('Storage is not defined!');
        }
        func = undefined;
        mono.storageList = undefined;

        //@insert

        return mono;
    }
));
