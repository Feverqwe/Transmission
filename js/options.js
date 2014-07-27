(function () {
    mono.pageId = 'opt';
    var actionReader = function(message, cb) {
        if (message.action === 'setDirList') {
            return options.setDirList(message.data);
        }
        if (message === 'sleep') {
            window.location = 'sleep.html';
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
    $(function () {
        options.boot();
    });
})();
var options = function() {
    var isTransmission = true;
    var var_cache = {};
    var dom_cache = {};
    var currentLanguage = navigator.language.substr(0,2);
    var def_settings = undefined;
    var set_place_holder = function() {
        mono.sendMessage('settings', function(settings) {
            $.each(def_settings, function (k, v) {
                if (v.t === "text" || v.t === "number" || v.t === "password") {
                    var dom_obj = $('input[name="' + k + '"]');
                    dom_obj.removeAttr("value");
                    if (settings[k] === undefined) {
                        settings[k] = v.v;
                    }
                    if (settings[k] !== v.v) {
                        if (k === "bg_update_interval" || k === "notify_visbl_interval" || k === "mgr_update_interval") {
                            dom_obj.attr("value", settings[k] / 1000);
                        } else {
                            dom_obj.attr("value", settings[k]);
                        }
                    }
                    if (v.v !== undefined) {
                        if (k === "bg_update_interval" || k === "notify_visbl_interval" || k === "mgr_update_interval") {
                            dom_obj.attr("placeholder", v.v / 1000);
                        } else {
                            dom_obj.attr("placeholder", v.v);
                        }
                    }
                } else if (v.t === "checkbox") {
                    $('input[name="' + k + '"]').prop('checked', settings[k]);
                } else if (v.t === "array") {
                    if (k === "folders_array") {
                        var arr = settings[k];
                        var $select = dom_cache.sel_folders;
                        $select.empty();
                        for (var n = 0, len = arr.length; n < len; n++) {
                            $select.append($('<option>', {text: arr[n][1], value: JSON.stringify(arr[n])}));
                        }
                    }
                }
            });
            write_sortable_tables();
        }, 'bg');
        if (!isTransmission) {
            dom_cache.sel_folder_arr.empty().off().on('click', function () {
                if ($(this).children().length !== 0) {
                    return;
                }
                mono.sendMessage({action: 'sendAction', data: {action: 'list-dirs'} }, undefined, 'bg');
                return 1;
            });
        }
    };
    var saveAll = function(cb) {
        var changes = {};
        changes['lang'] = dom_cache.select_language.val();
        $.each(def_settings, function(key, value) {
            var $el = $('input[name="' + key + '"]');
            if (value.t === "text" || value.t === "password") {
                var val = $el.val();
                if (val.length === 0 && key !== 'login' && key !== 'password') {
                    val = value.v;
                }
                changes[key] = val;
            } else
            if (value.t === "checkbox") {
                var val = ($el.prop('checked'))?1:0;
                changes[key] = val;
            } else
            if (value.t === "number") {
                var val = $el.val();
                if (val.length <= 0) {
                    //берется из placeholder потому, что bg_update_interval итп именют кратные значения
                    val = $el.attr('placeholder');
                }
                if (key === "bg_update_interval" || key === "notify_visbl_interval" || key === "mgr_update_interval") {
                    val = val * 1000;
                }
                if (value.min !== undefined && val < value.min) {
                    val = value.min;
                }
                changes[key] = val;
            }
        });
        var $f_select = dom_cache.sel_folders.children('option');
        var f_select_len = $f_select.length;
        var folders_arr = new Array(f_select_len);
        for (var n = 0; n < f_select_len; n++) {
            folders_arr[n] = JSON.parse($f_select.eq(n).val());
        }
        changes['folders_array'] = JSON.stringify(folders_arr);

        mono.storage.set(changes, function() {
            cb && cb();
        });

        mono.sendMessage(['getColums', 'getFlColums'], function(data) {
            var tr_colums = data.getColums;
            var table = $('ul.tr_colums');
            var new_obj = {};
            var items = table.children('li');
            var c = items.length;
            for (var n = 0; n < c; n++) {
                var item = items.eq(n);
                var key = item.data('key');
                var active = (item.children('div.info').children('div').eq(2).children('input').eq(0)[0].checked) ? 1 : 0;
                var size = parseInt(item.children('div.info').children('div').eq(1).children('label').text());
                new_obj[key] = tr_colums[key];
                new_obj[key].size = size;
                new_obj[key].a = active;
            }
            mono.storage.set({colums: JSON.stringify(new_obj)});

            var fl_colums = data.getFlColums;
            var table = $('ul.fl_colums');
            var new_obj = {};
            var items = table.children('li');
            var c = items.length;
            for (var n = 0; n < c; n++) {
                var item = items.eq(n);
                var key = item.data('key');
                var active = (item.children('div.info').children('div').eq(2).children('input').eq(0)[0].checked) ? 1 : 0;
                var size = parseInt(item.children('div.info').children('div').eq(1).children('label').text());
                new_obj[key] = fl_colums[key];
                new_obj[key].size = size;
                new_obj[key].a = active;
            }
            mono.storage.set({fl_colums: JSON.stringify(new_obj)});
        }, 'bg');
    };
    var getBackup = function() {
        mono.storage.get(undefined, function(data) {
            $('textarea[name="backup"]').val(JSON.stringify(data));
        });
    };
    var stngsRestore = function(text) {
        var rst;
        try {
            rst = JSON.parse(text);
        } catch (err) {
            alert(lang_arr.settings[51] + "\n" + err);
        }
        if (rst === undefined) {
            return;
        }
        mono.storage.clear();
        var changes = {};
        for (var key in rst)
        {
            var value = rst[key];
            if (value === undefined || key === 'length')
                continue;
            changes[key] = value;
        }
        mono.storage.set(changes, function() {
            write_language(rst.lang || currentLanguage);
            mono.sendMessage({action: 'updateSettings', data: lang_arr.t}, function() {
                set_place_holder();
                $('a[data-page="setup"]').trigger('click');
                chk_settings();
            }, 'bg');
        });
    };
    var make_bakup_form = function() {
        $('div.backup_form div').children('a.backup_tab').on('click', function(e) {
            e.preventDefault();
            $(this).parents().eq(1).children('div.restore').slideUp('fast');
            $(this).parent().children('a.restore_tab').removeClass('active');
            $(this).parents().eq(1).children('div.backup').slideDown('fast');
            $(this).parent().children('a.backup_tab').addClass('active');
            getBackup();
        });
        $('div.backup_form div').children('a.restore_tab').on('click', function(e) {
            e.preventDefault();
            $(this).parents().eq(1).children('div.backup').slideUp('fast');
            $(this).parent().children('a.backup_tab').removeClass('active');
            $(this).parents().eq(1).children('div.restore').slideDown('fast');
            $(this).parent().children('a.restore_tab').addClass('active');
        });
        $('div.backup').find('input[name=backup]').on('click', function(e) {
            e.preventDefault();
            getBackup();
        });
        $('div.restore').find('input[name=restore]').on('click', function(e) {
            e.preventDefault();
            stngsRestore($(this).parent().children('textarea').val());
            $('textarea[name="backup"]').empty();
        });
    };
    var ap = function(t, k, v) {
        return $('<li>', {'class': 'item ui-state-default'}).data('key', k).append( $('<div>', {'class': 'info'}).append(
                    $('<div>', {text: lang_arr[v.lang][1]}),
                    '[',
                    $('<div>', {text: lang_arr.settings[50]+': '}).append(
                        $('<label>', {text: v.size}),
                        'px;'
                    ),
                    ' ',
                    $('<div>', {text: lang_arr.settings[49]+':'}).append(
                        $('<input>',{type: 'checkbox', checked: (v.a)?true:false}),
                        ']'
                    )
                ),
                $('<div>', {'class': 'size'}).css('width', v.size +'px')
            );
    };
    var write_sortable_tables = function() {
        var items;
        mono.sendMessage(['getColums', 'getFlColums'], function(data) {
            var tr_colums = data.getColums;
            var tr_table = $("ul.tr_colums");
            tr_table.empty();
            items = [];
            $.each(tr_colums, function(k, v) {
                items.push(ap(tr_table, k, v));
            });
            tr_table.append(items);
            var fl_colums = data.getFlColums;
            var fl_table = $("ul.fl_colums");
            fl_table.empty();
            items = [];
            $.each(fl_colums, function(k, v) {
                items.push(ap(fl_table, k, v));
            });
            fl_table.append(items);
            var ul_sortable = $("ul.sortable");
            ul_sortable.sortable({placeholder: "ui-state-highlight"});
            ul_sortable.disableSelection();
            ul_sortable.find("div.size").resizable({handles: "e", resize: function(event, ui) {
                $(this).parent().children('div').children("div").eq(1).children('label').html(ui.size.width);
            }});
        }, 'bg');
    };
    var reset_table = function(table, arr) {
        var items;
        table.empty();
        items = [];
        $.each(arr, function(k, v) {
            items.push(ap(table, k, v));
        });
        table.append(items);
        var ul_sortable = $("ul.sortable");
        ul_sortable.sortable({placeholder: "ui-state-highlight"});
        ul_sortable.disableSelection();
        ul_sortable.find("div.size").resizable({handles: "e", resize: function(event, ui) {
                $(this).parent().children('div').children("div").eq(1).children('label').html(ui.size.width);
            }});
    };
    var setDirList = function (arr) {
        dom_cache.inp_add_folder[0].disabled = false;
        var f_select = dom_cache.sel_folder_arr;
        f_select.empty();
        $(this).unbind('click');
        $.each(arr, function(key, value) {
            var name = '[' + bytesToSize(value['available'] * 1024 * 1024) + ' ' + lang_arr[107][1] + '] ' + value['path'];
            f_select.append( $('<option>', {value: key, text: name}) );
        });
    };
    var bytesToSize = function(bytes, nan) {
        //переводит байты в строчки
        var sizes = lang_arr[59];
        if (nan === undefined)
            nan = 'n/a';
        if (bytes == 0)
            return nan;
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        if (i === 0) {
            return (bytes / Math.pow(1024, i)) + ' ' + sizes[i];
        }
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    };
    var write_language = function(language) {
        window.lang_arr = get_lang(language);
        currentLanguage = window.lang_arr.t;
        var lang = lang_arr.settings;
        dom_cache.select_language.val(language);
        $.each(lang, function(k, v) {
            var el = $('[data-lang=' + k + ']');
            if (el.length === 0) {
                return true;
            }
            var t = el.prop("tagName");
            if (t === "A" || t === "LEGEND" || t === "SPAN" || t === "LI") {
                el.text(v);
            } else
            if (t === "INPUT") {
                el.val(v);
            } else {
                console.log(t);
            }
        });
        write_sortable_tables();
    };
    var popup = function() {
        var isPopup = false;
        if (mono.isFF) {
            if (mono.noAddon) {
                return false;
            }
            return true;
        }
        var windows = chrome.extension.getViews({type: 'popup'});
        for (var n = 0; n < windows.length; n++) {
            if ("options" in windows[n])
                isPopup = true;
        }
        return isPopup;
    };
    var chk_settings = function() {
        mono.sendMessage('getToken', function(getToken) {
            if (getToken === 1) {
                $('div.page.save > div.status').css({'background': 'none', 'color': '#009900'}).text(lang_arr.settings[52]).animate({opacity: 0}, 3000, function() {
                    $(this).empty().css("opacity", "1");
                });
                if (popup()) {
                    window.location = "manager.html";
                }
            } else {
                mono.sendMessage('cache', function(cache) {
                    $('div.page.save > div.status').css({'background': 'none', 'color': '#c40005'}).text(lang_arr.settings[53] + ' ' + cache.status);
                }, 'bg');
            }
        }, 'bg');
    };
    return {
        boot: function() {
            if (mono.isFF) {
                if (!mono.noAddon) {
                    addon.postMessage('isShow');
                }
                $('input[name="notify_visbl_interval"]').parent().parent().parent().hide();
            }
            mono.sendMessage({action: 'resize', height: 600}, undefined, 'service');
            mono.storage.get('lang', function(data) {
                currentLanguage = data.lang || currentLanguage;
                mono.sendMessage(['def_settings'], function(data) {
                    def_settings = data.def_settings;
                    $(function() {
                        options.begin();
                    });
                }, 'bg');
            });
        },
        begin: function() {
            dom_cache.select_language = $('select[name="language"]');
            dom_cache.body = $('body');
            dom_cache.ul_menu = $('ul.menu');
            dom_cache.ul_tr_colums = $("ul.tr_colums");
            dom_cache.inp_add_folder = $('input[name="add_folder"]');
            dom_cache.sel_folder_arr = $('select[name="folder_arr"]');
            dom_cache.sel_folders = $('select[name="folders"]');
            dom_cache.ctx_labels = $('input[name="context_labels"]');

            write_language(currentLanguage);
            dom_cache.select_language.on('change', function() {
                write_language(this.value);
            });
            $('a.help').on('click', function(e) {
                e.preventDefault();
                $(this).parent().parent().children('div').toggle('fast');
            });
            dom_cache.ul_menu.on('click', 'a', function(e) {
                e.preventDefault();
                dom_cache.ul_menu.find('a.active').removeClass('active');
                $(this).addClass('active');
                dom_cache.body.find('div.page.active').removeClass('active');
                dom_cache.body.find('div.' + $(this).data('page')).addClass('active');
            });
            $('input[name="tr_reset"]').on("click", function() {
                mono.sendMessage('getDefColums', function(data) {
                    reset_table(dom_cache.ul_tr_colums, data);
                }, 'bg');
            });
            $('input[name="fl_reset"]').on("click", function() {
                mono.sendMessage('getDefFlColums', function(data) {
                    reset_table($("ul.fl_colums"), data);
                }, 'bg');
            });
            dom_cache.inp_add_folder.on('click', function() {
                var arr = [isTransmission?'':dom_cache.sel_folder_arr.val(), $(this).parent().children('input[type=text]').val()];
                if (arr[1].length < 1)
                    return;
                dom_cache.sel_folders.append(new Option(arr[1], JSON.stringify(arr)));
                $(this).parent().children('input[type=text]').val("");
            });
            $('input[name="rm_folder"]').on('click', function() {
                $('select[name="folders"] :selected').remove();
            });
            $('input[name="option_down"]').on('click', function() {
                var $this = $('select[name="folders"] :selected').eq(0);
                var $next = $this.next();
                $next.after($this);
            });
            $('input[name="option_up"]').on('click', function() {
                var $this = $('select[name="folders"] :selected').eq(0);
                var $next = $this.prev();
                $next.before($this);
            });
            $('input[name="save"]').on('click', function() {
                $('div.page.save > div.status').css('background', 'url(images/loading.gif) center center no-repeat').text('');
                saveAll(function() {
                    mono.sendMessage({action: 'updateSettings', data: lang_arr.t}, function() {
                        chk_settings();
                    }, 'bg');
                });
            });
            if (!isTransmission) {
                dom_cache.ctx_labels.on('click', function() {
                    dom_cache.inp_add_folder[0].disabled = !this.checked;
                });
            }
            if (mono.isChrome && chrome.storage) {
                $('input[name="save_in_cloud"]').on('click', function() {
                    var _this = this;
                    mono.storage.get(undefined, function(data) {
                        var obj = {
                            backup: JSON.stringify(data)
                        };
                        mono.storage.sync.set(obj, function() {
                            $(_this).val(lang_arr.settings[52]);
                            window.setTimeout(function() {
                                $('input[name="save_in_cloud"]').val(lang_arr.settings[59]);
                            }, 3000);
                            $('input[name="get_from_cloud"]')[0].disabled = false;
                        });
                    });
                });
                $('input[name="get_from_cloud"]').on('click', function() {
                    chrome.storage.sync.get("backup", function(val) {
                        if ("backup" in val === false)
                            return;
                        this.disabled = true;
                        $('textarea[name="restore"]').val(val.backup);
                    }
                    );
                });
                chrome.storage.sync.get("backup",
                        function(val) {
                            if ("backup" in val === false) {
                                $('input[name="get_from_cloud"]').eq(0)[0].disabled = true;
                            }
                        }
                );
            } else {
                $('input[name="get_from_cloud"]').css('display', 'none');
                $('input[name="save_in_cloud"]').css('display', 'none');
            }
            set_place_holder();
            make_bakup_form();
        },
        setDirList: setDirList
    };
}();