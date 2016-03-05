(function() {
    "use strict";
    var self = require("sdk/self");
    var monoLib = require("./monoLib.js");
    var pageMod = require("sdk/page-mod");

    monoLib.flags.enableLocalScope = true;

    var button = require('sdk/ui/button/toggle').ToggleButton({
        id: "transmission-easy-client-btn",
        label: "Transmission easy client",
        icon: {
            "16": "./icons/icon-16.png",
            "32": "./icons/icon-32.png",
            "64": "./icons/icon-64.png"
        },
        onChange: function (state) {
            if (!state.checked) {
                return;
            }
            popup.show({position: button});
        }
    });

    var onPageModAttach = function(tab) {
        monoLib.addPage(tab);
    };

    pageMod.PageMod({
        include: self.data.url('options.html')+'*',
        contentScript: '('+monoLib.virtualPort.toString()+')()',
        contentScriptWhen: 'start',
        onAttach: onPageModAttach
    });

    pageMod.PageMod({
        include: self.data.url('manager.html')+'*',
        contentScript: '('+monoLib.virtualPort.toString()+')()',
        contentScriptWhen: 'start',
        onAttach: onPageModAttach
    });

    onPageModAttach = null;

    require("sdk/simple-prefs").on("settingsBtn", function() {
        var self = require("sdk/self");
        var tabs = require("sdk/tabs");
        tabs.open( self.data.url('options.html') );
    });

    var popup = (function() {
        var debug = false;
        var sleepTimeout = null;
        var currentPanel = null;
        var currentController = null;

        var setSleepTimeout = function() {
            debug && console.error('setSleepTimeout');

            sleepTimeout = require("sdk/timers").setTimeout(function() {
                sleepTimeout = null;
                destroyPanel();
            }, 30 * 1000);
        };

        var clearSleepTimeout = function() {
            if (!sleepTimeout) {
                return;
            }

            debug && console.error('clearSleepTimeout');

            require("sdk/timers").clearTimeout(sleepTimeout);
            sleepTimeout = null;
        };

        var destroyPanel = function() {
            debug && console.error('destroyPanel');

            currentController.detach();
            currentController = null;
            currentPanel.destroy();
            currentPanel = null;
        };

        var createPanel = function() {
            debug && console.error('createPanel');

            currentPanel = require("sdk/panel").Panel({
                width: 800,
                height: 350,
                contentURL: require("sdk/self").data.url("manager.html"),
                onHide: function() {
                    button.state('window', {checked: false});

                    if (!sleepTimeout) {
                        destroyPanel();
                    }
                },
                onMessage: function(msg) {
                    debug && console.error('msg', msg);

                    if (msg === 'hidePopup') {
                        currentPanel.hide();
                    }
                    if (msg === 'sleepTimeout') {
                        setSleepTimeout();
                    }
                }
            });

            currentController = monoLib.addPage(currentPanel);
        };

        return {
            show: function() {
                if (!currentPanel) {
                    createPanel();
                }

                clearSleepTimeout();
                currentPanel.show.apply(currentPanel, arguments);
            }
        }
    })();


    var bgAddon = monoLib.virtualAddon();
    monoLib.addPage(bgAddon);

    var bg = require("./background.js");
    bg.init(bgAddon, button);

    self = null;
    bg = null;
    bgAddon = null;

    pageMod = null;
})();