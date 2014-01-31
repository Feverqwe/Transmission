var graph = function () {
    var body;
    var x;
    var y;
    var line;
    var svg;
    var currentData;
    //количество пиков на графике 1 пик - 1 секунда
    var _limit = 90;
    var created = false;

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
        if ( values_len > _limit ) {
            startItem = values_len - _limit;
        }
        end = traf0[values_len - 1].time;
        start = end - _limit;
        min = 0;
        max = traf0[values_len - 1].pos;
        data.forEach(function (subdata) {
            for (var i = startItem, item; item = subdata.values[i]; i++) {
                if (item.time < start) {
                    continue;
                }
                if (item.pos > max) {
                    max = item.pos;
                }
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
        created = true;
    };
    var updateLines = function (data) {
        if (created === false) {
            createLines(data);
            return;
        }
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
        currentData = _engine.traffic;
        createLines(currentData);
    };
    return {
        move: function () {
            updateLines(currentData);
        },
        run: function () {
            body = $('li.graph');
            init();
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
    }
    check();
})();