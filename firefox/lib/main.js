var ToggleButton = require('sdk/ui/button/toggle').ToggleButton;
var panels = require("sdk/panel");
var self = require("sdk/self");
var monoLib = require("./monoLib.js");
var pageMod = require("sdk/page-mod");

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

pageMod.PageMod({
    include: self.data.url('options.html'),
    contentScript: '('+monoLib.virtualPort.toString()+')()',
    contentScriptWhen: 'start',
    onAttach: function(tab) {
        monoLib.addPage('opt', tab);
    }
});

var sp = require("sdk/simple-prefs");
sp.on("settingsBtn", function() {
    var tabs = require("sdk/tabs");
    tabs.open( self.data.url('options.html') );
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

monoLib.addPage('bg', bg_addon);
monoLib.addPage('mgr', popup);
monoLib.addPage('opt', popup);

bg.init(bg_addon, button);