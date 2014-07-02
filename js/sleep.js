(function () {
    var actionReader = function(message, cb) {
        if (message === 'wake') {
            window.location = 'manager.html';
            return;
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
})();