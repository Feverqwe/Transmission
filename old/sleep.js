(function () {
    mono.onMessage(function(message) {
        if (message === 'wake') {
            window.location = 'manager.html';
        }
    });
})();