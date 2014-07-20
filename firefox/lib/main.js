var ToggleButton = require('sdk/ui/button/toggle').ToggleButton;
var panels = require("sdk/panel");
var self = require("sdk/self");
var monoLib = require("./monoLib.js");
var lang = require("./lang.js");

var button = ToggleButton({
    id: "tTinyOpenBtn",
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
        popup.show({
            position: button
        });
    }
});

var displayState = false;
var popup = panels.Panel({
    width: 800,
    height: 350,
    contentURL: self.data.url("./manager.html"),
    onHide: function () {
        button.state('window', {checked: false});
        displayState = false;
        monoLib.sendToPage(popup, {
            data: 'sleep',
            monoTo: 'monoScope',
            monoFrom: 'system'
        });
    },
    onShow: function() {
        displayState = true;
        monoLib.sendToPage(popup, {
            data: 'wake',
            monoTo: 'monoScope',
            monoFrom: 'system'
        });
    },
    onMessage: function(msg) {
        if (msg === 'isShow') {
            if (!displayState) {
                monoLib.sendToPage(popup, {
                    data: 'sleep',
                    monoTo: 'monoScope',
                    monoFrom: 'system'
                });
            }
        }
    }
});


var bg = require("./background.js");
var bg_addon = monoLib.virtualAddon('bg');

monoLib.addPage('mgr', popup);
monoLib.addPage('opt', popup);
monoLib.addPage('bg', bg_addon);

bg.init(bg_addon, lang, button);