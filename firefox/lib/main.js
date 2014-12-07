(function(){
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
        include: self.data.url('options.html') +'*',
        contentScript: '('+monoLib.virtualPort.toString()+')()',
        contentScriptWhen: 'start',
        onAttach: function(tab) {
            monoLib.addPage(tab);
        }
    });

    pageMod.PageMod({
        include: self.data.url('manager.html')+'*',
        contentScript: '('+monoLib.virtualPort.toString()+')()',
        contentScriptWhen: 'start',
        onAttach: function(tab) {
            monoLib.addPage(tab);
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
            popup.port.emit('mono', {data: 'sleep'});
        },
        onShow: function() {
            displayState = true;
            popup.port.emit('mono', {data: 'wake'});
        },
        onMessage: function(msg) {
            if (msg === 'isShow') {
                if (!displayState) {
                    popup.port.emit('mono', {data: 'sleep'});
                }
            }
        }
    });
    monoLib.addPage(popup);


    var bgAddon = monoLib.virtualAddon();
    monoLib.addPage(bgAddon);
    var bg = require("./background.js");
    bg.init(bgAddon, button);
})();