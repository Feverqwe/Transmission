var graph = function () {
    var body;
    var x;
    var y;
    var line;
    var svg;
    //количество пиков на графике 1 пик - 1 секунда
    var _limit = 90;
    var traffic = undefined;
    var startTime = 0;

    var getInfo = function (data) {
        var min;
        var max;
        var start;
        var end;
        var traf0 = data[0].values;
        var values_len = traf0.length;
        var startItem = 0;
        if (values_len === 0) {
            return;
        }
        if ( values_len > _limit) {
            startItem = values_len - _limit;
        }
        end = traf0[values_len - 1].time;
        start = end - _limit;
        min = 0;
        max = traf0[values_len - 1].pos;
        data.forEach(function (subdata) {
            var out_index;
            for (var i = startItem, item; item = subdata.values[i]; i++) {
                if (item.time < start) {
                    out_index = i;
                    continue;
                }
                if (item.pos > max) {
                    max = item.pos;
                }
            }
            if (out_index !== undefined && subdata.values[out_index].pos > max) {
                max = subdata.values[out_index].pos;
            }
        });
        return {min: min, max: max, start: start, end: end};
    };

    var createLines = function (data) {
        if (data === undefined) {
            return;
        }
        var min = getInfo(data);
        if (min === undefined) {
            return;
        }
        var max = min.max;
        var start = min.start;
        var end = min.end;
        min = min.min;
        x.domain([start, end]);
        y.domain([min,max]);
        var city = svg.selectAll(".city").data(data).enter().append("g").attr("class", "city");
        city.append("path")
            .attr("class", "line")
            .attr("d", function (d) {
                return line(d.values);
            })
            .style("stroke", function(d) { return (d.name === 'download')?'#3687ED':'#41B541'; });
    };
    var updateLines = function (data) {
        var min = getInfo(data, true);
        var max = min.max;
        var start = min.start;
        var end = min.end;
        min = min.min;
        x.domain([start, end]);
        y.domain([min,max]);
        svg.selectAll("path").transition().ease('quad').attr("d", function (d) {
            return line(d.values);
        });
    };

    var init = function () {
        var width = body.width();
        var limit = parseInt(width / 10);
        if (limit < _limit) {
            _limit = limit;
        }
        var height = 30;
        x = d3.time.scale().range([0, width]);
        y = d3.scale.linear().range([height, 0]);

        line = d3.svg.line().interpolate("basis")
            .x(function (d) {
                return x(d.time);
            })
            .y(function (d) {
                return y(d.pos);
            });
        svg = d3.select("li.graph").append("svg").attr({"width": width, "height": height}).append("g");
        createLines(traffic);
    };
    var addData = function (dl_sum, up_sum) {
        var limit = 90;
        var time = parseInt(Date.now()/1000) - startTime;
        var traf0 = traffic[0];
        var traf1 = traffic[1];
        var values_len = traf0.values.length;
        if (values_len > 1 && time - limit > traf0.values[values_len - 1].time) {
            traf0.values = traf0.values.slice(-1);
            traf1.values = traf1.values.slice(-1);
        }
        traf0.values.push({time: time, pos: dl_sum});
        traf1.values.push({time: time, pos: up_sum});
        if (values_len > limit * 3) {
            traf0.values.splice(0, values_len - limit);
            traf1.values.splice(0, values_len - limit);
        }
    };
    return {
        move: function (dl, up) {
            if (!traffic) {
                return;
            }
            addData(dl, up);
            updateLines(traffic);
        },
        run: function () {
            body = $('li.graph');
            mono.sendMessage(['getTraffic', 'trafStartTime'], function(response) {
                traffic = response.getTraffic;
                startTime = traffic[0].values[0] - 1 || response.trafStartTime;
                init();
            }, 'bg');
        }
    }
}();
(function(){
    var n = 10;
    var check = function () {
        if (window.d3 === undefined) {
            if (n === 0) {
                console.log('graph timeout');
                return;
            }
            setTimeout(function() {
                check();
                n--;
            }, 100);
        } else {
            graph.run();
        }
    };
    check();
})();