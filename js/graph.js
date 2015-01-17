var graph = (function() {
    var startTime;
    var trafficList;
    var limit;
    var isReady;

    var gX, gY, gLine, gSvg;

    var getInfo = function(trim) {
        var dlSpeedItem = trafficList[0];
        var upSpeedItem = trafficList[1];
        var dlSpeedList = dlSpeedItem.values;
        var upSpeedList = upSpeedItem.values;
        var len = dlSpeedList.length;
        if (len === 0) {
            var now = parseInt(Date.now() / 1000) - startTime;
            dlSpeedList.push({time: now, pos: 0});
            upSpeedList.push({time: now, pos: 0});
        }
        var startIndex = 0;
        if (len > limit) {
            startIndex = len - limit;
        }

        var endTime = dlSpeedList.slice(-1)[0].time;

        var startGTime = endTime - limit;
        var min = 0;
        var max = 0;
        var outIndex;
        for (var n = 0, speedItem; speedItem = trafficList[n]; n++) {
            for (var i = startIndex, item; item = speedItem.values[i]; i++) {
                if (item.time < startGTime) {
                    outIndex = i;
                    continue;
                }
                if (max < item.pos) {
                    max = item.pos;
                }
            }
            if (outIndex !== undefined && speedItem.values[outIndex].pos > max) {
                max = speedItem.values[outIndex].pos;
            }
        }
        if (outIndex !== undefined && (trim || len > limit * 1.5)) {
            dlSpeedList.splice(0, outIndex);
            upSpeedList.splice(0, outIndex);
        }
        return {x: [startGTime, endTime], y: [min, max]};
    };

    var updateLines = function() {
        var info = getInfo();
        gY.domain(info.y);
        gX.domain(info.x);
        gSvg.selectAll("path").transition().ease('quad').attr("d", function (d) {
            return gLine(d.values);
        });
    };

    var createLines = function() {
        var info = getInfo(1);
        gX.domain(info.x);
        gY.domain(info.y);

        var city = gSvg.selectAll(".city").data(trafficList).enter().append("g").attr("class", "city");
        city.append("path")
            .attr("class", "line")
            .attr("d", function (d) {
                return gLine(d.values);
            })
            .style("stroke", function (d) {
                return (d.name === 'download') ? '#3687ED' : '#41B541';
            });
        isReady = 1;
    };

    var createGraph = function() {
        var width = document.querySelector('li.graph').clientWidth;
        limit = parseInt(width / 10);
        var height = 30;

        gX = d3.time.scale().range([0, width]);
        gY = d3.scale.linear().range([height, 0]);

        gLine = d3.svg.line().interpolate("basis")
            .x(function (d) {
                return gX(d.time);
            })
            .y(function (d) {
                return gY(d.pos);
            });
        gSvg = d3.select("li.graph").append("svg").attr({"width": width, "height": height}).append("g");
        createLines();
    };

    var addData = function(dlSpeed, upSpeed) {
        var dlSpeedList = trafficList[0].values;
        var upSpeedList = trafficList[1].values;
        var now = parseInt(Date.now() / 1000) - startTime;
        dlSpeedList.push({time: now, pos: dlSpeed});
        upSpeedList.push({time: now, pos: upSpeed});
    };

    mono.sendMessage({action: 'getTraffic'}, function (response) {
        startTime = response.startTime;
        trafficList = response.trafficList;
        createGraph();

        if (typeof define !== "undefined" && define.amd) {
            define('graph');
        }
    });
    return {
        move: function(dlSpeed, upSpeed) {
            if (isReady !== 1) return;
            addData(dlSpeed, upSpeed);
            updateLines();
        }
    }
})();