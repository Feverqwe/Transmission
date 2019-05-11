"use strict";
var utils = {};

/**
 * @param {string|Element|DocumentFragment} tagName
 * @param {Object} obj
 * @returns {Element|DocumentFragment}
 */
utils.create = function (tagName, obj) {
    var el;
    var func;
    if (typeof tagName !== 'object') {
        el = document.createElement(tagName);
    } else {
        el = tagName;
    }
    for (var attr in obj) {
        var value = obj[attr];
        if (func = utils.create.hook[attr]) {
            func(el, value);
            continue;
        }
        el[attr] = value;
    }
    return el;
};
utils.create.hook = {
    text: function (el, value) {
        el.textContent = value;
    },
    data: function (el, value) {
        for (var item in value) {
            el.dataset[item] = value[item];
        }
    },
    class: function (el, value) {
        if (Array.isArray(value)) {
            for (var i = 0, len = value.length; i < len; i++) {
                el.classList.add(value[i]);
            }
        } else {
            el.setAttribute('class', value);
        }
    },
    style: function (el, value) {
        if (typeof value === 'object') {
            for (var item in value) {
                var key = item;
                if (key === 'float') {
                    key = 'cssFloat';
                }
                var _value = value[item];
                if (Array.isArray(_value)) {
                    for (var i = 0, len = _value.length; i < len; i++) {
                        el.style[key] = _value[i];
                    }
                } else {
                    el.style[key] = _value;
                }
            }
        } else {
            el.setAttribute('style', value);
        }
    },
    append: function (el, value) {
        if (!Array.isArray(value)) {
            value = [value];
        }
        for (var i = 0, len = value.length; i < len; i++) {
            var node = value[i];
            if (!node && node !== 0) {
                continue;
            }
            if (typeof node !== 'object') {
                node = document.createTextNode(node);
            }
            el.appendChild(node);
        }
    },
    on: function (el, eventList) {
        if (typeof eventList[0] !== 'object') {
            eventList = [eventList];
        }
        for (var i = 0, len = eventList.length; i < len; i++) {
            var args = eventList[i];
            if (!Array.isArray(args)) {
                continue;
            }
            el.addEventListener(args[0], args[1], args[2]);
        }
    },
    onCreate: function (el, value) {
        value.call(el, el);
    }
};

utils.debounce = function (fn, delay) {
    var timer = null;
    return function () {
        var context = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
            fn.apply(context, args);
        }, delay);
    };
};

utils.isVisibleElement = function (el) {
    return el.offsetWidth > 0 && el.offsetHeight > 0;
};

utils.base64ToUrl = function (b64Data, contentType) {
    var sliceSize = 256;
    contentType = contentType || '';
    var byteCharacters = atob(b64Data);

    var byteCharacters_len = byteCharacters.length;
    var byteArrays = new Array(Math.ceil(byteCharacters_len / sliceSize));
    var n = 0;
    for (var offset = 0; offset < byteCharacters_len; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);
        var slice_len = slice.length;
        var byteNumbers = new Array(slice_len);
        for (var i = 0; i < slice_len; i++) {
            byteNumbers[i] = slice.charCodeAt(i) & 0xff;
        }

        byteArrays[n] = new Uint8Array(byteNumbers);
        n++;
    }

    var blob = new Blob(byteArrays, {type: contentType});

    var blobUrl = URL.createObjectURL(blob);

    return blobUrl;
};

/**
 * Clone array or object via JSON
 * @param {object|Array} obj
 * @returns {object|Array}
 */
utils.cloneObj = function (obj) {
    return JSON.parse(JSON.stringify({w: obj})).w;
};

utils.joinMessages = function (messages) {
    return Promise.all(messages.map(function (msg) {
        return new Promise(function (resolve) {
            mono.sendMessage(msg, resolve);
        }).then(function (result) {
            var obj = {};
            obj[msg.action] = result;
            return obj;
        });
    })).then(function (results) {
        var result = {};
        results.forEach(function (item) {
            Object.assign(result, item);
        });
        return result;
    });
};