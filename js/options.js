var options = function() {
    var isTransmission = true;
    var _engine = (chrome.extension.getBackgroundPage()).engine;
    var set_place_holder = function() {
        var def_settings = _engine.def_settings;
        var settings = _engine.settings;
        $.each(def_settings, function(k, v) {
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
            } else
            if (v.t === "checkbox") {
                $('input[name="' + k + '"]').prop('checked', settings[k]);
            } else
            if (v.t === "array") {
                if (k === "folders_array") {
                    var arr = settings[k];
                    var $select =  $('select[name="folders"]');
                    $select.empty();
                    for (var n = 0, len = arr.length; n < len; n++) {
                        $select.append( $('<option>', {text: arr[n][1], value: JSON.stringify(arr[n])}) );
                    }
                }
            }
        });
        write_sortable_tables();
        if (!isTransmission) {
            $('select[name="folder_arr"]').empty().off().on('click', function() {
                _engine.sendAction({action: 'list-dirs'});
                return 1;
            });
            $('input[name="add_folder"]').prop('disabled', !$('input[name="context_labels"]').prop('checked'));
        }
    };
    var saveAll = function() {
        localStorage['lang'] = $('select[name="language"]').val();
        var def_settings = _engine.def_settings;
        $.each(def_settings, function(key, value) {
            var $el = $('input[name="' + key + '"]');
            if (value.t === "text" || value.t === "password") {
                var val = $el.val();
                if (val.length === 0 && (key !== 'login' && key !== 'password') ) {
                    val = value.v;
                }
                localStorage[key] = val;
            } else
            if (value.t === "checkbox") {
                var val = ($el.prop('checked'))?1:0;
                localStorage[key] = val;
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
                localStorage[key] = val;
            }
        });
        var $f_select = $('select[name="folders"]').children('option');
        var f_select_len = $f_select.length;
        var folders_arr = new Array(f_select_len);
        for (var n = 0; n < f_select_len; n++) {
            folders_arr[n] = JSON.parse($f_select.eq(n).val());
        }
        localStorage['folders_array'] = JSON.stringify(folders_arr);

        var tr_colums = _engine.getColums();
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
        localStorage['colums'] = JSON.stringify(new_obj);
        var fl_colums = _engine.getFlColums();
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
        localStorage['fl_colums'] = JSON.stringify(new_obj);
    };
    var getBackup = function() {
        $('textarea[name="backup"]').val(JSON.stringify(localStorage));
    };
    var stngsRestore = function(text) {
        try {
            var rst = JSON.parse(text);
            localStorage.clear();
            for (var key in rst)
            {
                var value = rst[key];
                if (value === undefined || key === 'length')
                    continue;
                localStorage[key] = value;
            }
            write_language();
            _engine.updateSettings(lang_arr);
            set_place_holder();
            $('a[data-page="setup"]').trigger('click');
            chk_settings();
        } catch (err) {
            alert(lang_arr.settings[51] + "\n" + err);
        }
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
        t.append('<li class="item ui-state-default" data-key="' + k + '"><div class="info"><div>' + lang_arr[v.lang][1] + '</div>[<div>' + lang_arr.settings[50] + ': <label>' + v.size + '</label>px;</div> <div>' + lang_arr.settings[49] + ':<input type="checkbox"' + ((v.a) ? ' checked' : '') + '/>]</div></div><div class="size" style="width:' + v.size + 'px"></div></li>');
    };
    var write_sortable_tables = function() {
        var tr_colums = _engine.getColums();
        var tr_table = $("ul.tr_colums");
        tr_table.empty();
        $.each(tr_colums, function(k, v) {
            ap(tr_table, k, v);
        });
        var fl_colums = _engine.getFlColums();
        var fl_table = $("ul.fl_colums");
        fl_table.empty();
        $.each(fl_colums, function(k, v) {
            ap(fl_table, k, v);
        });
        $("ul.sortable").sortable({placeholder: "ui-state-highlight"});
        $("ul.sortable").disableSelection();
        $("ul.sortable").find("div.size").resizable({handles: "e", resize: function(event, ui) {
                $(this).parent().children('div').children("div").eq(1).children('label').html(ui.size.width);
            }});
    };
    var reset_table = function(table, arr) {
        table.empty();
        $.each(arr, function(k, v) {
            ap(table, k, v);
        });
        $("ul.sortable").sortable({placeholder: "ui-state-highlight"});
        $("ul.sortable").disableSelection();
        $("ul.sortable").find("div.size").resizable({handles: "e", resize: function(event, ui) {
                $(this).parent().children('div').children("div").eq(1).children('label').html(ui.size.width);
            }});
    };
    var setDirList = function (arr) {
        $('input[name="add_folder"]')[0].disabled = false;
        var f_select = $('select[name="folder_arr"]');
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
        if (language === undefined) {
            language = localStorage["lang"];
        }
        if (language === undefined) {
            language = 'en';
            if (chrome.i18n.getMessage("lang") === 'ru') {
                language = 'ru';
            } else
            if (chrome.i18n.getMessage("lang") === 'fr') {
                language = 'fr';
            }
        }
        window.lang_arr = get_lang(language);
        var lang = lang_arr.settings;
        $('select[name="language"]').val(language);
        $.each(lang, function(k, v) {
            var el = $('[data-lang=' + k + ']');
            if (el.length === 0)
                return true;
            var t = el.prop("tagName");
            if (t === "A" || t === "LEGEND" || t === "SPAN" || t === "LI") {
                el.text(v);
            } else
            if (t === "INPUT") {
                el.val(v);
            } else
                console.log(t);
        });
        write_sortable_tables();
    };
    var popup = function() {
        var isPopup = false;
        var windows = chrome.extension.getViews({type: 'popup'});
        for (var n = 0; n < windows.length; n++) {
            if ("options" in windows[n])
                isPopup = true;
        }
        return isPopup;
    };
    var chk_settings = function() {
        _engine.getToken(function() {
            $('div.page.save > div.status').css({'background': 'none', 'color': '#009900'}).text(lang_arr.settings[52]).animate({opacity: 0}, 3000, function() {
                $(this).empty().css("opacity", "1");
            });
            if (popup()) {
                window.location = "manager.html";
            }
        }, function() {
            $('div.page.save > div.status').css({'background': 'none', 'color': '#c40005'}).text(lang_arr.settings[53] + ' ' + _engine.cache.status);
        });
    };
    return {
        begin: function() {
            write_language();
            _engine.setOptionsWindow(window);
            $('select[name="language"]').on('change', function() {
                write_language($(this).val());
            });
            $('a.help').on('click', function(e) {
                e.preventDefault();
                $(this).parent().parent().children('div').toggle('fast');
            });
            $('ul.menu').on('click', 'a', function(e) {
                e.preventDefault();
                $('ul.menu').find('a.active').removeClass('active');
                $(this).addClass('active');
                $('body').find('div.page.active').removeClass('active');
                $('body').find('div.' + $(this).data('page')).addClass('active');
            });
            $('input[name="tr_reset"]').on("click", function() {
                reset_table($("ul.tr_colums"), _engine.getDefColums());
            });
            $('input[name="fl_reset"]').on("click", function() {
                reset_table($("ul.fl_colums"), _engine.getDefFlColums());
            });
            $('input[name="add_folder"]').on('click', function() {
                var arr = [isTransmission?'':$('select[name="folder_arr"]').val(), $(this).parent().children('input[type=text]').val()];
                if (arr[1].length < 1)
                    return;
                $('select[name="folders"]').append(new Option(arr[1], JSON.stringify(arr)));
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
                saveAll();
                $('div.page.save > div.status').css('background', 'url(images/loading.gif) center center no-repeat').text('');
                _engine.updateSettings(lang_arr);
                chk_settings();
            });
            if (!isTransmission) {
                $('input[name="context_labels"]').on('click', function() {
                    if (this.checked) {
                        $('input[name="add_folder"]')[0].disabled = false;
                    } else {
                        $('input[name="add_folder"]')[0].disabled = true;
                    }
                });
            }
            if (chrome.storage) {
                $('input[name="save_in_cloud"]').on('click', function() {
                    var obj = {};
                    obj['backup'] = JSON.stringify(localStorage);
                    chrome.storage.sync.set(obj);
                    $(this).val(lang_arr.settings[52]);
                    window.setTimeout(function() {
                        $('input[name="save_in_cloud"]').val(lang_arr.settings[59]);
                    }, 3000);
                    $('input[name="get_from_cloud"]')[0].disabled = false;
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
$(function() {
    options.begin();
});