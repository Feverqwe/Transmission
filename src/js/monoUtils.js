/**
 * @param {string|Element|DocumentFragment} tagName
 * @param {Object} obj
 * @returns {Element|DocumentFragment}
 */
mono.create = function(tagName, obj) {
    "use strict";
    var el;
    var func;
    if (typeof tagName !== 'object') {
        el = document.createElement(tagName);
    } else {
        el = tagName;
    }
    for (var attr in obj) {
        var value = obj[attr];
        if (func = mono.create.hook[attr]) {
            func(el, value);
            continue;
        }
        el[attr] = value;
    }
    return el;
};
mono.create.hook = {
    text: function(el, value) {
        "use strict";
        el.textContent = value;
    },
    data: function(el, value) {
        "use strict";
        for (var item in value) {
            el.dataset[item] = value[item];
        }
    },
    class: function(el, value) {
        "use strict";
        if (Array.isArray(value)) {
            for (var i = 0, len = value.length; i < len; i++) {
                el.classList.add(value[i]);
            }
        } else {
            el.setAttribute('class', value);
        }
    },
    style: function(el, value) {
        "use strict";
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
    append: function(el, value) {
        "use strict";
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
    on: function(el, eventList) {
        "use strict";
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
    onCreate: function(el, value) {
        "use strict";
        value.call(el, el);
    }
};

mono.debounce = function(fn, delay) {
    var timer = null;
    return function () {
        var context = this, args = arguments;
        mono.clearTimeout(timer);
        timer = mono.setTimeout(function () {
            fn.apply(context, args);
        }, delay);
    };
};

mono.isVisibleElement = function(el) {
    return el.offsetWidth > 0 && el.offsetHeight > 0;
};

mono.spaceToUnderline = function(string) {
    return string.replace(/\s/, '_');
};

mono.param = function(params) {
    if (typeof params === 'string') return params;

    var args = [];
    for (var key in params) {
        var value = params[key];
        if (value === null || value === undefined) {
            continue;
        }
        if (!Array.isArray(value)) {
            value = [value];
        }
        for (var i = 0, len = value.length; i < len; i++) {
            args.push(encodeURIComponent(key) + '=' + encodeURIComponent(value[i]));
        }
    }
    return args.join('&');
};

mono.base64ToUrl = function(b64Data, contentType) {
    "use strict";
    var sliceSize = 256;
    contentType = contentType || '';
    var byteCharacters = mono.atob(b64Data);

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

    var blob = mono.createBlob(byteArrays, {type: contentType});

    var blobUrl = mono.urlCreateObjectURL(blob);

    return blobUrl;
};

/**
 * Clone array or object via JSON
 * @param {object|Array} obj
 * @returns {object|Array}
 */
mono.cloneObj = function(obj) {
    return JSON.parse(JSON.stringify({w: obj})).w;
};