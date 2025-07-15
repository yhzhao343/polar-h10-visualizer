var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/smoothie/smoothie.js
var require_smoothie = __commonJS({
  "node_modules/smoothie/smoothie.js"(exports) {
    (function(exports2) {
      Date.now = Date.now || function() {
        return (/* @__PURE__ */ new Date()).getTime();
      };
      var Util = {
        extend: function() {
          arguments[0] = arguments[0] || {};
          for (var i = 1; i < arguments.length; i++) {
            for (var key in arguments[i]) {
              if (arguments[i].hasOwnProperty(key)) {
                if (typeof arguments[i][key] === "object") {
                  if (arguments[i][key] instanceof Array) {
                    arguments[0][key] = arguments[i][key];
                  } else {
                    arguments[0][key] = Util.extend(arguments[0][key], arguments[i][key]);
                  }
                } else {
                  arguments[0][key] = arguments[i][key];
                }
              }
            }
          }
          return arguments[0];
        },
        binarySearch: function(data, value) {
          var low = 0, high = data.length;
          while (low < high) {
            var mid = low + high >> 1;
            if (value < data[mid][0])
              high = mid;
            else
              low = mid + 1;
          }
          return low;
        },
        // So lines (especially vertical and horizontal) look a) consistent along their length and b) sharp.
        pixelSnap: function(position, lineWidth) {
          if (lineWidth % 2 === 0) {
            return Math.round(position);
          } else {
            return Math.floor(position) + 0.5;
          }
        }
      };
      function TimeSeries2(options) {
        this.options = Util.extend({}, TimeSeries2.defaultOptions, options);
        this.disabled = false;
        this.clear();
      }
      TimeSeries2.defaultOptions = {
        resetBoundsInterval: 3e3,
        resetBounds: true
      };
      TimeSeries2.prototype.clear = function() {
        this.data = [];
        this.maxValue = Number.NaN;
        this.minValue = Number.NaN;
      };
      TimeSeries2.prototype.resetBounds = function() {
        if (this.data.length) {
          this.maxValue = this.data[0][1];
          this.minValue = this.data[0][1];
          for (var i = 1; i < this.data.length; i++) {
            var value = this.data[i][1];
            if (value > this.maxValue) {
              this.maxValue = value;
            }
            if (value < this.minValue) {
              this.minValue = value;
            }
          }
        } else {
          this.maxValue = Number.NaN;
          this.minValue = Number.NaN;
        }
      };
      TimeSeries2.prototype.append = function(timestamp, value, sumRepeatedTimeStampValues) {
        if (isNaN(timestamp) || isNaN(value)) {
          return;
        }
        var lastI = this.data.length - 1;
        if (lastI >= 0) {
          var i = lastI;
          while (true) {
            var iThData = this.data[i];
            if (timestamp >= iThData[0]) {
              if (timestamp === iThData[0]) {
                if (sumRepeatedTimeStampValues) {
                  iThData[1] += value;
                  value = iThData[1];
                } else {
                  iThData[1] = value;
                }
              } else {
                this.data.splice(i + 1, 0, [timestamp, value]);
              }
              break;
            }
            i--;
            if (i < 0) {
              this.data.splice(0, 0, [timestamp, value]);
              break;
            }
          }
        } else {
          this.data.push([timestamp, value]);
        }
        this.maxValue = isNaN(this.maxValue) ? value : Math.max(this.maxValue, value);
        this.minValue = isNaN(this.minValue) ? value : Math.min(this.minValue, value);
      };
      TimeSeries2.prototype.dropOldData = function(oldestValidTime, maxDataSetLength) {
        var removeCount = 0;
        while (this.data.length - removeCount >= maxDataSetLength && this.data[removeCount + 1][0] < oldestValidTime) {
          removeCount++;
        }
        if (removeCount !== 0) {
          this.data.splice(0, removeCount);
        }
      };
      function SmoothieChart3(options) {
        this.options = Util.extend({}, SmoothieChart3.defaultChartOptions, options);
        this.seriesSet = [];
        this.currentValueRange = 1;
        this.currentVisMinValue = 0;
        this.lastRenderTimeMillis = 0;
        this.lastChartTimestamp = 0;
        this.mousemove = this.mousemove.bind(this);
        this.mouseout = this.mouseout.bind(this);
      }
      SmoothieChart3.tooltipFormatter = function(timestamp, data) {
        var timestampFormatter = this.options.timestampFormatter || SmoothieChart3.timeFormatter, elements = document.createElement("div"), label;
        elements.appendChild(document.createTextNode(
          timestampFormatter(new Date(timestamp))
        ));
        for (var i = 0; i < data.length; ++i) {
          label = data[i].series.options.tooltipLabel || "";
          if (label !== "") {
            label = label + " ";
          }
          var dataEl = document.createElement("span");
          dataEl.style.color = data[i].series.options.strokeStyle;
          dataEl.appendChild(document.createTextNode(
            label + this.options.yMaxFormatter(data[i].value, this.options.labels.precision)
          ));
          elements.appendChild(document.createElement("br"));
          elements.appendChild(dataEl);
        }
        return elements.innerHTML;
      };
      SmoothieChart3.defaultChartOptions = {
        millisPerPixel: 20,
        enableDpiScaling: true,
        yMinFormatter: function(min, precision) {
          return parseFloat(min).toFixed(precision);
        },
        yMaxFormatter: function(max, precision) {
          return parseFloat(max).toFixed(precision);
        },
        yIntermediateFormatter: function(intermediate, precision) {
          return parseFloat(intermediate).toFixed(precision);
        },
        maxValueScale: 1,
        minValueScale: 1,
        interpolation: "bezier",
        scaleSmoothing: 0.125,
        maxDataSetLength: 2,
        scrollBackwards: false,
        displayDataFromPercentile: 1,
        grid: {
          fillStyle: "#000000",
          strokeStyle: "#777777",
          lineWidth: 2,
          millisPerLine: 1e3,
          verticalSections: 2,
          borderVisible: true
        },
        labels: {
          fillStyle: "#ffffff",
          disabled: false,
          fontSize: 10,
          fontFamily: "monospace",
          precision: 2,
          showIntermediateLabels: false,
          intermediateLabelSameAxis: true
        },
        title: {
          text: "",
          fillStyle: "#ffffff",
          fontSize: 15,
          fontFamily: "monospace",
          verticalAlign: "middle"
        },
        horizontalLines: [],
        tooltip: false,
        tooltipLine: {
          lineWidth: 1,
          strokeStyle: "#BBBBBB"
        },
        tooltipFormatter: SmoothieChart3.tooltipFormatter,
        nonRealtimeData: false,
        responsive: false,
        limitFPS: 0
      };
      SmoothieChart3.AnimateCompatibility = /* @__PURE__ */ function() {
        var requestAnimationFrame = function(callback, element) {
          var requestAnimationFrame2 = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback2) {
            return window.setTimeout(function() {
              callback2(Date.now());
            }, 16);
          };
          return requestAnimationFrame2.call(window, callback, element);
        }, cancelAnimationFrame = function(id) {
          var cancelAnimationFrame2 = window.cancelAnimationFrame || function(id2) {
            clearTimeout(id2);
          };
          return cancelAnimationFrame2.call(window, id);
        };
        return {
          requestAnimationFrame,
          cancelAnimationFrame
        };
      }();
      SmoothieChart3.defaultSeriesPresentationOptions = {
        lineWidth: 1,
        strokeStyle: "#ffffff"
      };
      SmoothieChart3.prototype.addTimeSeries = function(timeSeries, options) {
        this.seriesSet.push({ timeSeries, options: Util.extend({}, SmoothieChart3.defaultSeriesPresentationOptions, options) });
        if (timeSeries.options.resetBounds && timeSeries.options.resetBoundsInterval > 0) {
          timeSeries.resetBoundsTimerId = setInterval(
            function() {
              timeSeries.resetBounds();
            },
            timeSeries.options.resetBoundsInterval
          );
        }
      };
      SmoothieChart3.prototype.removeTimeSeries = function(timeSeries) {
        var numSeries = this.seriesSet.length;
        for (var i = 0; i < numSeries; i++) {
          if (this.seriesSet[i].timeSeries === timeSeries) {
            this.seriesSet.splice(i, 1);
            break;
          }
        }
        if (timeSeries.resetBoundsTimerId) {
          clearInterval(timeSeries.resetBoundsTimerId);
        }
      };
      SmoothieChart3.prototype.getTimeSeriesOptions = function(timeSeries) {
        var numSeries = this.seriesSet.length;
        for (var i = 0; i < numSeries; i++) {
          if (this.seriesSet[i].timeSeries === timeSeries) {
            return this.seriesSet[i].options;
          }
        }
      };
      SmoothieChart3.prototype.bringToFront = function(timeSeries) {
        var numSeries = this.seriesSet.length;
        for (var i = 0; i < numSeries; i++) {
          if (this.seriesSet[i].timeSeries === timeSeries) {
            var set = this.seriesSet.splice(i, 1);
            this.seriesSet.push(set[0]);
            break;
          }
        }
      };
      SmoothieChart3.prototype.streamTo = function(canvas, delayMillis) {
        this.canvas = canvas;
        this.clientWidth = parseInt(this.canvas.getAttribute("width"));
        this.clientHeight = parseInt(this.canvas.getAttribute("height"));
        this.delay = delayMillis;
        this.start();
      };
      SmoothieChart3.prototype.getTooltipEl = function() {
        if (!this.tooltipEl) {
          this.tooltipEl = document.createElement("div");
          this.tooltipEl.className = "smoothie-chart-tooltip";
          this.tooltipEl.style.pointerEvents = "none";
          this.tooltipEl.style.position = "absolute";
          this.tooltipEl.style.display = "none";
          document.body.appendChild(this.tooltipEl);
        }
        return this.tooltipEl;
      };
      SmoothieChart3.prototype.updateTooltip = function() {
        if (!this.options.tooltip) {
          return;
        }
        var el = this.getTooltipEl();
        if (!this.mouseover || !this.options.tooltip) {
          el.style.display = "none";
          return;
        }
        var time = this.lastChartTimestamp;
        var t = this.options.scrollBackwards ? time - this.mouseX * this.options.millisPerPixel : time - (this.clientWidth - this.mouseX) * this.options.millisPerPixel;
        var data = [];
        for (var d = 0; d < this.seriesSet.length; d++) {
          var timeSeries = this.seriesSet[d].timeSeries;
          if (timeSeries.disabled) {
            continue;
          }
          var closeIdx = Util.binarySearch(timeSeries.data, t);
          if (closeIdx > 0 && closeIdx < timeSeries.data.length) {
            data.push({ series: this.seriesSet[d], index: closeIdx, value: timeSeries.data[closeIdx][1] });
          }
        }
        if (data.length) {
          el.innerHTML = this.options.tooltipFormatter.call(this, t, data);
          el.style.display = "block";
        } else {
          el.style.display = "none";
        }
      };
      SmoothieChart3.prototype.mousemove = function(evt) {
        this.mouseover = true;
        this.mouseX = evt.offsetX;
        this.mouseY = evt.offsetY;
        this.mousePageX = evt.pageX;
        this.mousePageY = evt.pageY;
        if (!this.options.tooltip) {
          return;
        }
        var el = this.getTooltipEl();
        el.style.top = Math.round(this.mousePageY) + "px";
        el.style.left = Math.round(this.mousePageX) + "px";
        this.updateTooltip();
      };
      SmoothieChart3.prototype.mouseout = function() {
        this.mouseover = false;
        this.mouseX = this.mouseY = -1;
        if (this.tooltipEl)
          this.tooltipEl.style.display = "none";
      };
      SmoothieChart3.prototype.resize = function() {
        var dpr = !this.options.enableDpiScaling || !window ? 1 : window.devicePixelRatio, width, height;
        if (this.options.responsive) {
          width = this.canvas.offsetWidth;
          height = this.canvas.offsetHeight;
          if (width !== this.lastWidth) {
            this.lastWidth = width;
            this.canvas.setAttribute("width", Math.floor(width * dpr).toString());
            this.canvas.getContext("2d").scale(dpr, dpr);
          }
          if (height !== this.lastHeight) {
            this.lastHeight = height;
            this.canvas.setAttribute("height", Math.floor(height * dpr).toString());
            this.canvas.getContext("2d").scale(dpr, dpr);
          }
          this.clientWidth = width;
          this.clientHeight = height;
        } else {
          width = parseInt(this.canvas.getAttribute("width"));
          height = parseInt(this.canvas.getAttribute("height"));
          if (dpr !== 1) {
            if (Math.floor(this.clientWidth * dpr) !== width) {
              this.canvas.setAttribute("width", Math.floor(width * dpr).toString());
              this.canvas.style.width = width + "px";
              this.clientWidth = width;
              this.canvas.getContext("2d").scale(dpr, dpr);
            }
            if (Math.floor(this.clientHeight * dpr) !== height) {
              this.canvas.setAttribute("height", Math.floor(height * dpr).toString());
              this.canvas.style.height = height + "px";
              this.clientHeight = height;
              this.canvas.getContext("2d").scale(dpr, dpr);
            }
          } else {
            this.clientWidth = width;
            this.clientHeight = height;
          }
        }
      };
      SmoothieChart3.prototype.start = function() {
        if (this.frame) {
          return;
        }
        this.canvas.addEventListener("mousemove", this.mousemove);
        this.canvas.addEventListener("mouseout", this.mouseout);
        var animate = function() {
          this.frame = SmoothieChart3.AnimateCompatibility.requestAnimationFrame(function() {
            if (this.options.nonRealtimeData) {
              var dateZero = /* @__PURE__ */ new Date(0);
              var maxTimeStamp = this.seriesSet.reduce(function(max, series) {
                var dataSet = series.timeSeries.data;
                var indexToCheck = Math.round(this.options.displayDataFromPercentile * dataSet.length) - 1;
                indexToCheck = indexToCheck >= 0 ? indexToCheck : 0;
                indexToCheck = indexToCheck <= dataSet.length - 1 ? indexToCheck : dataSet.length - 1;
                if (dataSet && dataSet.length > 0) {
                  var lastDataTimeStamp = dataSet[indexToCheck][0];
                  max = max > lastDataTimeStamp ? max : lastDataTimeStamp;
                }
                return max;
              }.bind(this), dateZero);
              this.render(this.canvas, maxTimeStamp > dateZero ? maxTimeStamp : null);
            } else {
              this.render();
            }
            animate();
          }.bind(this));
        }.bind(this);
        animate();
      };
      SmoothieChart3.prototype.stop = function() {
        if (this.frame) {
          SmoothieChart3.AnimateCompatibility.cancelAnimationFrame(this.frame);
          delete this.frame;
          this.canvas.removeEventListener("mousemove", this.mousemove);
          this.canvas.removeEventListener("mouseout", this.mouseout);
        }
      };
      SmoothieChart3.prototype.updateValueRange = function() {
        var chartOptions = this.options, chartMaxValue = Number.NaN, chartMinValue = Number.NaN;
        for (var d = 0; d < this.seriesSet.length; d++) {
          var timeSeries = this.seriesSet[d].timeSeries;
          if (timeSeries.disabled) {
            continue;
          }
          if (!isNaN(timeSeries.maxValue)) {
            chartMaxValue = !isNaN(chartMaxValue) ? Math.max(chartMaxValue, timeSeries.maxValue) : timeSeries.maxValue;
          }
          if (!isNaN(timeSeries.minValue)) {
            chartMinValue = !isNaN(chartMinValue) ? Math.min(chartMinValue, timeSeries.minValue) : timeSeries.minValue;
          }
        }
        if (chartOptions.maxValue != null) {
          chartMaxValue = chartOptions.maxValue;
        } else {
          chartMaxValue *= chartOptions.maxValueScale;
        }
        if (chartOptions.minValue != null) {
          chartMinValue = chartOptions.minValue;
        } else {
          chartMinValue -= Math.abs(chartMinValue * chartOptions.minValueScale - chartMinValue);
        }
        if (this.options.yRangeFunction) {
          var range = this.options.yRangeFunction({ min: chartMinValue, max: chartMaxValue });
          chartMinValue = range.min;
          chartMaxValue = range.max;
        }
        if (!isNaN(chartMaxValue) && !isNaN(chartMinValue)) {
          var targetValueRange = chartMaxValue - chartMinValue;
          var valueRangeDiff = targetValueRange - this.currentValueRange;
          var minValueDiff = chartMinValue - this.currentVisMinValue;
          this.isAnimatingScale = Math.abs(valueRangeDiff) > 0.1 || Math.abs(minValueDiff) > 0.1;
          this.currentValueRange += chartOptions.scaleSmoothing * valueRangeDiff;
          this.currentVisMinValue += chartOptions.scaleSmoothing * minValueDiff;
        }
        this.valueRange = { min: chartMinValue, max: chartMaxValue };
      };
      SmoothieChart3.prototype.render = function(canvas, time) {
        var nowMillis = Date.now();
        if (this.options.limitFPS > 0 && nowMillis - this.lastRenderTimeMillis < 1e3 / this.options.limitFPS)
          return;
        time = (time || nowMillis) - (this.delay || 0);
        time -= time % this.options.millisPerPixel;
        if (!this.isAnimatingScale) {
          var sameTime = this.lastChartTimestamp === time;
          if (sameTime) {
            var needToRenderInCaseCanvasResized = nowMillis - this.lastRenderTimeMillis > 1e3 / 6;
            if (!needToRenderInCaseCanvasResized) {
              return;
            }
          }
        }
        this.lastRenderTimeMillis = nowMillis;
        this.lastChartTimestamp = time;
        this.resize();
        canvas = canvas || this.canvas;
        var context = canvas.getContext("2d"), chartOptions = this.options, dimensions = { top: 0, left: 0, width: this.clientWidth, height: this.clientHeight }, oldestValidTime = time - dimensions.width * chartOptions.millisPerPixel, valueToYPosition = function(value, lineWidth2) {
          var offset = value - this.currentVisMinValue, unsnapped = this.currentValueRange === 0 ? dimensions.height : dimensions.height * (1 - offset / this.currentValueRange);
          return Util.pixelSnap(unsnapped, lineWidth2);
        }.bind(this), timeToXPosition = function(t2, lineWidth2) {
          var unsnapped = chartOptions.scrollBackwards ? (time - t2) / chartOptions.millisPerPixel : dimensions.width - (time - t2) / chartOptions.millisPerPixel;
          return Util.pixelSnap(unsnapped, lineWidth2);
        };
        this.updateValueRange();
        context.font = chartOptions.labels.fontSize + "px " + chartOptions.labels.fontFamily;
        context.save();
        context.translate(dimensions.left, dimensions.top);
        context.beginPath();
        context.rect(0, 0, dimensions.width, dimensions.height);
        context.clip();
        context.save();
        context.fillStyle = chartOptions.grid.fillStyle;
        context.clearRect(0, 0, dimensions.width, dimensions.height);
        context.fillRect(0, 0, dimensions.width, dimensions.height);
        context.restore();
        context.save();
        context.lineWidth = chartOptions.grid.lineWidth;
        context.strokeStyle = chartOptions.grid.strokeStyle;
        if (chartOptions.grid.millisPerLine > 0) {
          context.beginPath();
          for (var t = time - time % chartOptions.grid.millisPerLine; t >= oldestValidTime; t -= chartOptions.grid.millisPerLine) {
            var gx = timeToXPosition(t, chartOptions.grid.lineWidth);
            context.moveTo(gx, 0);
            context.lineTo(gx, dimensions.height);
          }
          context.stroke();
          context.closePath();
        }
        for (var v = 1; v < chartOptions.grid.verticalSections; v++) {
          var gy = Util.pixelSnap(v * dimensions.height / chartOptions.grid.verticalSections, chartOptions.grid.lineWidth);
          context.beginPath();
          context.moveTo(0, gy);
          context.lineTo(dimensions.width, gy);
          context.stroke();
          context.closePath();
        }
        if (chartOptions.grid.borderVisible) {
          context.beginPath();
          context.strokeRect(0, 0, dimensions.width, dimensions.height);
          context.closePath();
        }
        context.restore();
        if (chartOptions.horizontalLines && chartOptions.horizontalLines.length) {
          for (var hl = 0; hl < chartOptions.horizontalLines.length; hl++) {
            var line = chartOptions.horizontalLines[hl], lineWidth = line.lineWidth || 1, hly = valueToYPosition(line.value, lineWidth);
            context.strokeStyle = line.color || "#ffffff";
            context.lineWidth = lineWidth;
            context.beginPath();
            context.moveTo(0, hly);
            context.lineTo(dimensions.width, hly);
            context.stroke();
            context.closePath();
          }
        }
        for (var d = 0; d < this.seriesSet.length; d++) {
          var timeSeries = this.seriesSet[d].timeSeries, dataSet = timeSeries.data;
          timeSeries.dropOldData(oldestValidTime, chartOptions.maxDataSetLength);
          if (dataSet.length <= 1 || timeSeries.disabled) {
            continue;
          }
          context.save();
          var seriesOptions = this.seriesSet[d].options, drawStroke = seriesOptions.strokeStyle && seriesOptions.strokeStyle !== "none", lineWidthMaybeZero = drawStroke ? seriesOptions.lineWidth : 0;
          context.beginPath();
          var firstX = timeToXPosition(dataSet[0][0], lineWidthMaybeZero), firstY = valueToYPosition(dataSet[0][1], lineWidthMaybeZero), lastX = firstX, lastY = firstY, draw;
          context.moveTo(firstX, firstY);
          switch (seriesOptions.interpolation || chartOptions.interpolation) {
            case "linear":
            case "line": {
              draw = function(x2, y2, lastX2, lastY2) {
                context.lineTo(x2, y2);
              };
              break;
            }
            case "bezier":
            default: {
              draw = function(x2, y2, lastX2, lastY2) {
                context.bezierCurveTo(
                  // startPoint (A) is implicit from last iteration of loop
                  Math.round((lastX2 + x2) / 2),
                  lastY2,
                  // controlPoint1 (P)
                  Math.round(lastX2 + x2) / 2,
                  y2,
                  // controlPoint2 (Q)
                  x2,
                  y2
                );
              };
              break;
            }
            case "step": {
              draw = function(x2, y2, lastX2, lastY2) {
                context.lineTo(x2, lastY2);
                context.lineTo(x2, y2);
              };
              break;
            }
          }
          for (var i = 1; i < dataSet.length; i++) {
            var iThData = dataSet[i], x = timeToXPosition(iThData[0], lineWidthMaybeZero), y = valueToYPosition(iThData[1], lineWidthMaybeZero);
            draw(x, y, lastX, lastY);
            lastX = x;
            lastY = y;
          }
          if (drawStroke) {
            context.lineWidth = seriesOptions.lineWidth;
            context.strokeStyle = seriesOptions.strokeStyle;
            context.stroke();
          }
          if (seriesOptions.fillStyle) {
            context.lineTo(lastX, dimensions.height + lineWidthMaybeZero + 1);
            context.lineTo(firstX, dimensions.height + lineWidthMaybeZero + 1);
            context.fillStyle = seriesOptions.fillStyle;
            context.fill();
          }
          context.restore();
        }
        if (chartOptions.tooltip && this.mouseX >= 0) {
          context.lineWidth = chartOptions.tooltipLine.lineWidth;
          context.strokeStyle = chartOptions.tooltipLine.strokeStyle;
          context.beginPath();
          context.moveTo(this.mouseX, 0);
          context.lineTo(this.mouseX, dimensions.height);
          context.closePath();
          context.stroke();
        }
        this.updateTooltip();
        var labelsOptions = chartOptions.labels;
        if (!labelsOptions.disabled && !isNaN(this.valueRange.min) && !isNaN(this.valueRange.max)) {
          var maxValueString = chartOptions.yMaxFormatter(this.valueRange.max, labelsOptions.precision), minValueString = chartOptions.yMinFormatter(this.valueRange.min, labelsOptions.precision), maxLabelPos = chartOptions.scrollBackwards ? 0 : dimensions.width - context.measureText(maxValueString).width - 2, minLabelPos = chartOptions.scrollBackwards ? 0 : dimensions.width - context.measureText(minValueString).width - 2;
          context.fillStyle = labelsOptions.fillStyle;
          context.fillText(maxValueString, maxLabelPos, labelsOptions.fontSize);
          context.fillText(minValueString, minLabelPos, dimensions.height - 2);
        }
        if (labelsOptions.showIntermediateLabels && !isNaN(this.valueRange.min) && !isNaN(this.valueRange.max) && chartOptions.grid.verticalSections > 0) {
          var step = (this.valueRange.max - this.valueRange.min) / chartOptions.grid.verticalSections;
          var stepPixels = dimensions.height / chartOptions.grid.verticalSections;
          for (var v = 1; v < chartOptions.grid.verticalSections; v++) {
            var gy = dimensions.height - Math.round(v * stepPixels), yValue = chartOptions.yIntermediateFormatter(this.valueRange.min + v * step, labelsOptions.precision), intermediateLabelPos = labelsOptions.intermediateLabelSameAxis ? chartOptions.scrollBackwards ? 0 : dimensions.width - context.measureText(yValue).width - 2 : chartOptions.scrollBackwards ? dimensions.width - context.measureText(yValue).width - 2 : 0;
            context.fillText(yValue, intermediateLabelPos, gy - chartOptions.grid.lineWidth);
          }
        }
        if (chartOptions.timestampFormatter && chartOptions.grid.millisPerLine > 0) {
          var textUntilX = chartOptions.scrollBackwards ? context.measureText(minValueString).width : dimensions.width - context.measureText(minValueString).width + 4;
          for (var t = time - time % chartOptions.grid.millisPerLine; t >= oldestValidTime; t -= chartOptions.grid.millisPerLine) {
            var gx = timeToXPosition(t, 0);
            if (!chartOptions.scrollBackwards && gx < textUntilX || chartOptions.scrollBackwards && gx > textUntilX) {
              var tx = new Date(t), ts = chartOptions.timestampFormatter(tx), tsWidth = context.measureText(ts).width;
              textUntilX = chartOptions.scrollBackwards ? gx + tsWidth + 2 : gx - tsWidth - 2;
              context.fillStyle = chartOptions.labels.fillStyle;
              if (chartOptions.scrollBackwards) {
                context.fillText(ts, gx, dimensions.height - 2);
              } else {
                context.fillText(ts, gx - tsWidth, dimensions.height - 2);
              }
            }
          }
        }
        if (chartOptions.title.text !== "") {
          context.font = chartOptions.title.fontSize + "px " + chartOptions.title.fontFamily;
          var titleXPos = chartOptions.scrollBackwards ? dimensions.width - context.measureText(chartOptions.title.text).width - 2 : 2;
          if (chartOptions.title.verticalAlign == "bottom") {
            context.textBaseline = "bottom";
            var titleYPos = dimensions.height;
          } else if (chartOptions.title.verticalAlign == "middle") {
            context.textBaseline = "middle";
            var titleYPos = dimensions.height / 2;
          } else {
            context.textBaseline = "top";
            var titleYPos = 0;
          }
          context.fillStyle = chartOptions.title.fillStyle;
          context.fillText(chartOptions.title.text, titleXPos, titleYPos);
        }
        context.restore();
      };
      SmoothieChart3.timeFormatter = function(date) {
        function pad2(number) {
          return (number < 10 ? "0" : "") + number;
        }
        return pad2(date.getHours()) + ":" + pad2(date.getMinutes()) + ":" + pad2(date.getSeconds());
      };
      exports2.TimeSeries = TimeSeries2;
      exports2.SmoothieChart = SmoothieChart3;
    })(typeof exports === "undefined" ? exports : exports);
  }
});

// node_modules/fili/dist/fili.min.js
var require_fili_min = __commonJS({
  "node_modules/fili/dist/fili.min.js"(exports, module) {
    !function(r) {
      if ("object" == typeof exports && "undefined" != typeof module) module.exports = r();
      else if ("function" == typeof define && define.amd) define([], r);
      else {
        var t;
        t = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : this, t.Fili = r();
      }
    }(function() {
      return function r(t, e, n) {
        function a(o2, i) {
          if (!e[o2]) {
            if (!t[o2]) {
              var s = "function" == typeof __require && __require;
              if (!i && s) return s(o2, true);
              if (u) return u(o2, true);
              var c = new Error("Cannot find module '" + o2 + "'");
              throw c.code = "MODULE_NOT_FOUND", c;
            }
            var f = e[o2] = { exports: {} };
            t[o2][0].call(f.exports, function(r2) {
              var e2 = t[o2][1][r2];
              return a(e2 || r2);
            }, f, f.exports, r, t, e, n);
          }
          return e[o2].exports;
        }
        for (var u = "function" == typeof __require && __require, o = 0; o < n.length; o++) a(n[o]);
        return a;
      }({ 1: [function(r, t, e) {
        "use strict";
        t.exports = { CalcCascades: r("./src/calcCascades"), Fft: r("./src/fft"), FirCoeffs: r("./src/firCoeffs"), FirFilter: r("./src/firFilter"), IirCoeffs: r("./src/iirCoeffs"), IirFilter: r("./src/iirFilter"), TestFilter: r("./src/testFilter") };
      }, { "./src/calcCascades": 2, "./src/fft": 3, "./src/firCoeffs": 4, "./src/firFilter": 5, "./src/iirCoeffs": 6, "./src/iirFilter": 7, "./src/testFilter": 8 }], 2: [function(r, t, e) {
        "use strict";
        var n = r("./iirCoeffs"), a = new n(), u = { bessel: { q: [[0.57735026919], [0.805538281842, 0.521934581669], [1.02331395383, 0.611194546878, 0.510317824749], [1.22566942541, 0.710852074442, 0.559609164796, 0.505991069397], [1.41530886916, 0.809790964842, 0.620470155556, 0.537552151325, 0.503912727276], [1.59465693507, 0.905947107025, 0.684008068137, 0.579367238641, 0.525936202016, 0.502755558204], [1.76552743493, 0.998998442993, 0.747625068271, 0.624777082395, 0.556680772868, 0.519027293158, 0.502045428643], [1.9292718407, 1.08906376917, 0.810410302962, 0.671382379377, 0.591144659703, 0.542678365981, 0.514570953471, 0.501578400482], [2.08691792612, 1.17637337045, 0.872034231424, 0.718163551101, 0.627261751983, 0.569890924765, 0.533371782078, 0.511523796759, 0.50125489338], [2.23926560629, 1.26117120993, 0.932397288146, 0.764647810579, 0.664052481472, 0.598921924986, 0.555480327396, 0.526848630061, 0.509345928377, 0.501021580965], [2.38695091667, 1.34368488961, 0.991497755204, 0.81060830488, 0.701011199665, 0.628878390935, 0.57943181849, 0.545207253735, 0.52208637596, 0.507736060535, 0.500847111042], [2.53048919562, 1.42411783481, 1.04937620183, 0.85593899901, 0.737862159044, 0.659265671705, 0.604435823473, 0.565352679646, 0.537608804383, 0.51849505465, 0.506508536474, 0.500715908905]], f3dB: [[1.27201964951], [1.60335751622, 1.43017155999], [1.9047076123, 1.68916826762, 1.60391912877], [2.18872623053, 1.95319575902, 1.8320926012, 1.77846591177], [2.45062684305, 2.20375262593, 2.06220731793, 1.98055310881, 1.94270419166], [2.69298925084, 2.43912611431, 2.28431825401, 2.18496722634, 2.12472538477, 2.09613322542], [2.91905714471, 2.66069088948, 2.49663434571, 2.38497976939, 2.30961462222, 2.26265746534, 2.24005716132], [3.13149167404, 2.87016099416, 2.69935018044, 2.57862945683, 2.49225505119, 2.43227707449, 2.39427710712, 2.37582307687], [3.33237300564, 3.06908580184, 2.89318259511, 2.76551588399, 2.67073340527, 2.60094950474, 2.55161764546, 2.52001358804, 2.50457164552], [3.52333123464, 3.25877569704, 3.07894353744, 2.94580435024, 2.84438325189, 2.76691082498, 2.70881411245, 2.66724655259, 2.64040228249, 2.62723439989], [3.70566068548, 3.44032173223, 3.2574059854, 3.11986367838, 3.01307175388, 2.92939234605, 2.86428726094, 2.81483068055, 2.77915465405, 2.75596888377, 2.74456638588], [3.88040469682, 3.61463243697, 3.4292654707, 3.28812274966, 3.17689762788, 3.08812364257, 3.01720732972, 2.96140104561, 2.91862858495, 2.88729479473, 2.8674198668, 2.8570800015]], f1dB: [[2.16477559371], [2.70320928596, 2.41122332505], [3.25676581436, 2.88822569572, 2.74246238837], [3.76153580353, 3.35675411406, 3.14862673032, 3.05646412475], [4.22174260104, 3.79644757806, 3.55260471864, 3.41193742197, 3.34673435508], [4.64584812552, 4.20789257981, 3.94082363122, 3.76942681446, 3.66549975744, 3.61617359345], [5.04060395196, 4.5944592201, 4.3111677248, 4.11836351827, 3.98822359814, 3.90713836715, 3.86811234525], [5.41107948467, 4.95951159709, 4.66435804468, 4.45575796102, 4.30650679478, 4.20286750045, 4.13720522991, 4.10531748119], [5.76110791853, 5.30592898465, 5.00182215701, 4.7811081045, 4.61724509926, 4.49660100894, 4.41131378918, 4.35667671372, 4.32997951075], [6.09364309488, 5.63609116014, 5.32506930789, 5.09480346139, 4.91939504255, 4.78540258409, 4.68493280536, 4.61302286993, 4.56661931366, 4.54382759952], [6.41100731543, 5.95195558182, 5.63550073656, 5.39754464742, 5.21278891332, 5.06801430334, 4.95539684456, 4.8697869429, 4.80814951843, 4.76793469612, 4.74828032403], [6.71506056052, 6.25514029778, 5.9343616072, 5.69011422355, 5.49763642361, 5.34401973764, 5.22125973611, 5.12485045619, 5.05037962112, 4.99699982231, 4.96155789635, 4.94441828777]] } }, o = { bessel: { as: [[1.3617], [1.3397, 0.7743], [1.2217, 0.9686, 0.5131], [1.1112, 0.9754, 0.7202, 0.3728], [1.0215, 0.9393, 0.7815, 0.5604, 0.2883]], bs: [[0.618], [0.4889, 0.389], [0.3887, 0.3505, 0.2756], [0.3162, 0.2979, 0.2621, 0.2087], [0.265, 0.2549, 0.2351, 0.2059, 0.1665]] }, butterworth: { as: [[1.4142], [1.8478, 0.7654], [1.9319, 1.4142, 0.5176], [1.9616, 1.6629, 1.1111, 0.3902], [1.9754, 1.782, 1.4142, 0.908, 0.3129]], bs: [[1], [1, 1], [1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1, 1]] }, tschebyscheff05: { as: [[1.3614], [2.6282, 0.3648], [3.8645, 0.7528, 0.1589], [5.1117, 1.0639, 0.3439, 0.0885], [6.3648, 1.3582, 0.4822, 0.1994, 0.0563]], bs: [[1.3827], [3.4341, 1.1509], [6.9797, 1.8573, 1.0711], [11.9607, 2.9365, 1.4206, 1.0407], [18.3695, 4.3453, 1.944, 1.252, 1.0263]] }, tschebyscheff1: { as: [[1.3022], [2.5904, 0.3039], [3.8437, 0.6292, 0.1296], [5.1019, 0.8916, 0.2806, 0.0717], [6.3634, 1.1399, 0.3939, 0.1616, 0.0455]], bs: [[1.5515], [4.1301, 1.1697], [8.5529, 1.9124, 1.0766], [14.7608, 3.0426, 1.4334, 1.0432], [22.7468, 4.5167, 1.9665, 1.2569, 1.0277]] }, tschebyscheff2: { as: [[1.1813], [2.4025, 0.2374], [3.588, 0.4925, 0.0995], [4.7743, 0.6991, 0.2153, 0.0547], [5.9618, 0.8947, 0.3023, 0.1233, 0.0347]], bs: [[1.7775], [4.9862, 1.1896], [10.4648, 1.9622, 1.0826], [18.151, 3.1353, 1.4449, 1.0461], [28.0376, 4.6644, 1.9858, 1.2614, 1.0294]] }, tschebyscheff3: { as: [[1.065], [2.1853, 0.1964], [3.2721, 0.4077, 0.0815], [4.3583, 0.5791, 0.1765, 0.0448], [5.4449, 0.7414, 0.2479, 0.1008, 0.0283]], bs: [[1.9305], [5.5339, 1.2009], [11.6773, 1.9873, 1.0861], [20.2948, 3.1808, 1.4507, 1.0478], [31.3788, 4.7363, 1.9952, 1.2638, 1.0304]] }, allpass: { as: [[1.6278], [2.337, 1.3506], [2.6117, 2.0706, 1.0967], [2.7541, 2.4174, 1.785, 0.9239], [2.8406, 2.612, 2.1733, 1.5583, 0.8018]], bs: [[0.8832], [1.4878, 1.1837], [1.7763, 1.6015, 1.2596], [1.942, 1.83, 1.6101, 1.2822], [2.049, 1.9714, 1.8184, 1.5923, 1.2877]] } }, i = function(r2, t2) {
          var e2 = [], n2 = 0;
          if ("fromPZ" !== t2) for (r2.order > 12 && (r2.order = 12), n2 = 0; n2 < r2.order; n2++) {
            var i2, s2, c2;
            "matchedZ" === r2.transform ? e2.push(a.lowpassMZ({ Fs: r2.Fs, Fc: r2.Fc, preGain: r2.preGain, as: o[r2.characteristic].as[r2.order - 1][n2], bs: o[r2.characteristic].bs[r2.order - 1][n2] })) : ("butterworth" === r2.characteristic ? (i2 = 0.5 / Math.sin(Math.PI / (2 * r2.order) * (n2 + 0.5)), s2 = 1) : (i2 = u[r2.characteristic].q[r2.order - 1][n2], s2 = r2.oneDb ? u[r2.characteristic].f1dB[r2.order - 1][n2] : u[r2.characteristic].f3dB[r2.order - 1][n2]), c2 = "highpass" === t2 ? r2.Fc / s2 : r2.Fc * s2, "bandpass" !== t2 && "bandstop" !== t2 || "bessel" === r2.characteristic && (c2 = Math.sqrt(r2.order) * c2 / r2.order), e2.push(a[t2]({ Fs: r2.Fs, Fc: c2, Q: i2, BW: r2.BW || 0, gain: r2.gain || 0, preGain: r2.preGain || false })));
          }
          else for (n2 = 0; n2 < r2.length; n2++) e2.push(a[t2](r2[n2]));
          return e2;
        }, s = function(r2) {
          return function(t2) {
            return i(t2, r2);
          };
        }, c = {}, f = function() {
          var r2 = [];
          for (var t2 in a) c[t2] = s(t2), r2.push(t2);
          return c.available = function() {
            return r2;
          }, c;
        };
        t.exports = f;
      }, { "./iirCoeffs": 6 }], 3: [function(r, t, e) {
        "use strict";
        var n = function(r2) {
          if (!function(r3) {
            return !(r3 & r3 - 1);
          }(r2)) return false;
          var t2 = {};
          t2.length = r2, t2.buffer = new Float64Array(r2), t2.re = new Float64Array(r2), t2.im = new Float64Array(r2), t2.reI = new Float64Array(r2), t2.imI = new Float64Array(r2), t2.twiddle = new Int32Array(r2), t2.sinTable = new Float64Array(r2 - 1), t2.cosTable = new Float64Array(r2 - 1);
          var e2 = 2 * Math.PI, n2 = Math.floor(Math.log(r2) / Math.LN2);
          for (u = t2.sinTable.length; u--; ) t2.sinTable[u] = Math.sin(e2 * (u / r2)), t2.cosTable[u] = Math.cos(e2 * (u / r2));
          for (var a = r2 >> 1, u = 0, o = 0; t2.twiddle[u] = o, !(++u >= r2); ) {
            for (n2 = a; n2 <= o; ) o -= n2, n2 >>= 1;
            o += n2;
          }
          var i = Math.PI, s = 2 * Math.PI, c = Math.abs, f = Math.pow, l = Math.cos, h = Math.sin, p = function(r3) {
            return h(i * r3) / (i * r3);
          }, v = Math.E, b = { rectangular: { calc: function() {
            return 1;
          }, values: [], correction: 1 }, none: { calc: function() {
            return 1;
          }, values: [], correction: 1 }, hanning: { calc: function(r3, t3) {
            return 0.5 * (1 - l(s * r3 / (t3 - 1)));
          }, values: [], correction: 2 }, hamming: { calc: function(r3, t3) {
            return 0.54 - 0.46 * l(s * r3 / (t3 - 1));
          }, values: [], correction: 1.8518999946875638 }, tukery: { calc: function(r3, t3, e3) {
            return r3 < e3 * (t3 - 1) / 2 ? 0.5 * (1 + l(i * (2 * r3 / (e3 * (t3 - 1)) - 1))) : (t3 - 1) * (1 - e3 / 2) < r3 ? 0.5 * (1 + l(i * (2 * r3 / (e3 * (t3 - 1)) - 2 / e3 + 1))) : 1;
          }, values: [], correction: 4 / 3 }, cosine: { calc: function(r3, t3) {
            return h(i * r3 / (t3 - 1));
          }, values: [], correction: 1.570844266360796 }, lanczos: { calc: function(r3, t3) {
            return p(2 * r3 / (t3 - 1) - 1);
          }, values: [], correction: 1.6964337576195783 }, triangular: { calc: function(r3, t3) {
            return 2 / (t3 + 1) * ((t3 + 1) / 2 - c(r3 - (t3 - 1) / 2));
          }, values: [], correction: 2 }, bartlett: { calc: function(r3, t3) {
            return 2 / (t3 - 1) * ((t3 - 1) / 2 - c(r3 - (t3 - 1) / 2));
          }, values: [], correction: 2 }, gaussian: { calc: function(r3, t3, e3) {
            return f(v, -0.5 * f((r3 - (t3 - 1) / 2) / (e3 * (t3 - 1) / 2), 2));
          }, values: [], correction: 5 / 3 }, bartlettHanning: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.62 - 0.48 * c(r3 / (t3 - 1) - 0.5) - 0.38 * l(e3);
          }, values: [], correction: 2 }, blackman: { calc: function(r3, t3, e3) {
            var n3 = (1 - e3) / 2, a2 = e3 / 2, u2 = s * r3 / (t3 - 1);
            return n3 - 0.5 * l(u2) + a2 * l(2 * u2);
          }, values: [], correction: 4 / 3 }, blackmanHarris: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.35875 - 0.48829 * l(e3) + 0.14128 * l(2 * e3) - 0.01168 * l(3 * e3);
          }, values: [], correction: 1.5594508635 }, nuttall3: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.375 - 0.5 * l(e3) + 0.125 * l(2 * e3);
          }, values: [], correction: 1.56 }, nuttall3a: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.40897 - 0.5 * l(e3) + 0.09103 * l(2 * e3);
          }, values: [], correction: 1.692 }, nuttall3b: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.4243801 - 0.4973406 * l(e3) + 0.078793 * l(2 * e3);
          }, values: [], correction: 1.7372527 }, nuttall4: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.3125 - 0.46875 * l(e3) + 0.1875 * l(2 * e3) - 0.03125 * l(3 * e3);
          }, values: [], correction: 1.454543 }, nuttall4a: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.338946 - 0.481973 * l(e3) + 0.161054 * l(2 * e3) - 0.018027 * l(3 * e3);
          }, values: [], correction: 1.512732763 }, nuttall4b: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.355768 - 0.481973 * l(e3) + 0.144232 * l(2 * e3) - 0.012604 * l(3 * e3);
          }, values: [], correction: 1.55223262 }, nuttall4c: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.3635819 - 0.4891775 * l(e3) + 0.1365995 * l(2 * e3) - 0.0106411 * l(3 * e3);
          }, values: [], correction: 1.57129067 }, sft3f: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.26526 - 0.5 * l(e3) + 0.23474 * l(2 * e3);
          }, values: [], correction: 1.3610238 }, sft4f: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.21706 - 0.42103 * l(e3) + 0.28294 * l(2 * e3) - 0.07897 * l(3 * e3);
          }, values: [], correction: 1.2773573 }, sft5f: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.1881 - 0.36923 * l(e3) + 0.28702 * l(2 * e3) - 0.13077 * l(3 * e3) + 0.02488 * l(4 * e3);
          }, values: [], correction: 1.23167769 }, sft3m: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.28235 - 0.52105 * l(e3) + 0.19659 * l(2 * e3);
          }, values: [], correction: 1.39343451 }, sft4m: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.241906 - 0.460841 * l(e3) + 0.2552381 * l(2 * e3) - 0.041872 * l(3 * e3);
          }, values: [], correction: 1.3190596 }, sft5m: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.209671 - 0.407331 * l(e3) + 0.281225 * l(2 * e3) - 0.092669 * l(3 * e3) + 91036e-7 * l(4 * e3);
          }, values: [], correction: 1.26529456464 }, nift: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return 0.2810639 - 0.5208972 * l(e3) + 0.1980399 * l(2 * e3);
          }, values: [], correction: 1.39094182 }, hpft: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return (1 - 1.912510941 * l(e3) + 1.079173272 * l(2 * e3) - 0.1832630879 * l(3 * e3)) / t3;
          }, values: [], correction: 1 }, srft: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return (1 - 1.93 * l(e3) + 1.29 * l(2 * e3) - 0.388 * l(3 * e3) + 0.028 * l(4 * e3)) / t3;
          }, values: [], correction: 1 }, hft70: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return (1 - 1.90796 * l(e3) + 1.07349 * l(2 * e3) - 0.18199 * l(3 * e3)) / t3;
          }, values: [], correction: 1 }, hft95: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return (1 - 1.9383379 * l(e3) + 1.3045202 * l(2 * e3) - 0.402827 * l(3 * e3) + 0.0350665 * l(4 * e3)) / t3;
          }, values: [], correction: 1 }, hft90d: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return (1 - 1.942604 * l(e3) + 1.340318 * l(2 * e3) - 0.440811 * l(3 * e3) + 0.043097 * l(4 * e3)) / t3;
          }, values: [], correction: 1 }, hft116d: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return (1 - 1.9575375 * l(e3) + 1.4780705 * l(2 * e3) - 0.6367431 * l(3 * e3) + 0.1228389 * l(4 * e3) - 66288e-7 * l(5 * e3)) / t3;
          }, values: [], correction: 1 }, hft144d: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return (1 - 1.96760033 * l(e3) + 1.57983607 * l(2 * e3) - 0.81123644 * l(3 * e3) + 0.22583558 * l(4 * e3) - 0.02773848 * l(5 * e3) + 9036e-7 * l(6 * e3)) / t3;
          }, values: [], correction: 1 }, hft196d: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return (1 - 1.97441842 * l(e3) + 1.65409888 * l(2 * e3) - 0.95788186 * l(3 * e3) + 0.3367342 * l(4 * e3) - 0.06364621 * l(5 * e3) + 521942e-8 * l(6 * e3) - 10599e-8 * l(7 * e3)) / t3;
          }, values: [], correction: 1 }, hft223d: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return (1 - 1.98298997309 * l(e3) + 1.75556083063 * l(2 * e3) - 1.19037717712 * l(3 * e3) + 0.56155440797 * l(4 * e3) - 0.17296769663 * l(5 * e3) + 0.03233247087 * l(6 * e3) - 0.00324954578 * l(7 * e3) + 1380104e-10 * l(8 * e3) - 132725e-11 * l(9 * e3)) / t3;
          }, values: [], correction: 1 }, hft248d: { calc: function(r3, t3) {
            var e3 = s * r3 / (t3 - 1);
            return (1 - 1.985844164102 * l(e3) + 1.791176438506 * l(2 * e3) - 1.282075284005 * l(3 * e3) + 0.667777530266 * l(4 * e3) - 0.240160796576 * l(5 * e3) + 0.056656381764 * l(6 * e3) - 0.008134974479 * l(7 * e3) + 62454465e-11 * l(8 * e3) - 19808998e-12 * l(9 * e3) + 132974e-12 * l(10 * e3)) / t3;
          }, values: [], correction: 1 } }, m = function(r3) {
            return b[r3.name].values.length !== r3.N ? (0 === r3.n && (b[r3.name].values.length = 0), b[r3.name].values[r3.n] = b[r3.name].correction * b[r3.name].calc(r3.n, r3.N, r3.a), b[r3.name].values[r3.n]) : b[r3.name].values;
          };
          return { forward: function(r3, e3) {
            var n3, a2, u2, o2, i2, s2, c2, f2, l2, h2, p2, v2;
            u2 = t2.buffer.length;
            var b2 = { name: e3, N: u2, a: 0.5, n: 0 }, d = m(b2);
            if ("number" == typeof d) for (n3 = 0; n3 < u2; ++n3) b2.n = n3, t2.buffer[n3] = r3[n3] * m(b2);
            else for (n3 = 0; n3 < u2; ++n3) t2.buffer[n3] = r3[n3] * d[n3];
            for (n3 = u2; n3--; ) t2.re[n3] = t2.buffer[t2.twiddle[n3]], t2.im[n3] = 0;
            for (o2 = 1; o2 < u2; o2 = i2) for (s2 = 0, i2 = o2 + o2, c2 = u2 / i2, a2 = 0; a2 < o2; a2++) {
              for (f2 = t2.cosTable[s2], l2 = t2.sinTable[s2], n3 = a2; n3 < u2; n3 += i2) h2 = n3 + o2, p2 = l2 * t2.im[h2] + f2 * t2.re[h2], v2 = f2 * t2.im[h2] - l2 * t2.re[h2], t2.re[h2] = t2.re[n3] - p2, t2.re[n3] += p2, t2.im[h2] = t2.im[n3] - v2, t2.im[n3] += v2;
              s2 += c2;
            }
            return { re: t2.re, im: t2.im };
          }, inverse: function(r3, e3) {
            var n3, a2, u2, o2, i2, s2, c2, f2, l2, h2, p2, v2;
            for (u2 = r3.length, n3 = u2; n3--; ) a2 = t2.twiddle[n3], t2.reI[n3] = r3[a2], t2.imI[n3] = -e3[a2];
            for (o2 = 1; o2 < u2; o2 = i2) for (s2 = 0, i2 = o2 + o2, c2 = u2 / i2, a2 = 0; a2 < o2; a2++) {
              for (f2 = t2.cosTable[s2], l2 = t2.sinTable[s2], n3 = a2; n3 < u2; n3 += i2) h2 = n3 + o2, p2 = l2 * t2.imI[h2] + f2 * t2.reI[h2], v2 = f2 * t2.imI[h2] - l2 * t2.reI[h2], t2.reI[h2] = t2.reI[n3] - p2, t2.reI[n3] += p2, t2.imI[h2] = t2.imI[n3] - v2, t2.imI[n3] += v2;
              s2 += c2;
            }
            for (n3 = u2; n3--; ) t2.buffer[n3] = t2.reI[n3] / u2;
            return t2.buffer;
          }, magnitude: function(r3) {
            for (var t3 = [], e3 = 0; e3 < r3.re.length; e3++) t3.push(Math.sqrt(r3.re[e3] * r3.re[e3] + r3.im[e3] * r3.im[e3]));
            return t3;
          }, magToDb: function(r3) {
            for (var t3 = [], e3 = 0; e3 < r3.length; e3++) t3.push(20 * Math.log(r3[e3]) * Math.LOG10E);
            return t3;
          }, phase: function(r3) {
            for (var t3 = [], e3 = 0; e3 < r3.re.length; e3++) t3.push(Math.atan2(r3.im[e3], r3.re[e3]));
            return t3;
          }, windows: function() {
            var r3 = [];
            for (var t3 in b) r3.push(t3);
            return r3;
          } };
        };
        t.exports = n;
      }, {}], 4: [function(r, t, e) {
        "use strict";
        var n = function() {
          var r2 = function(r3) {
            var t3 = r3.Fs, e3 = r3.Fa, n3 = r3.Fb, a = r3.order || 51, u = r3.Att || 100, o = function(r4) {
              for (var t4 = 0, e4 = 1, n4 = 1; e4 > 1e-6 * n4; ) t4 += 2, e4 *= r4 * r4 / (t4 * t4), n4 += e4;
              return n4;
            };
            a / 2 - Math.floor(a / 2) == 0 && a++;
            var i, s = (a - 1) / 2, c = [], f = 0, l = 0, h = [];
            for (c[0] = 2 * (n3 - e3) / t3, l = 1; l <= s; l++) c[l] = (Math.sin(2 * l * Math.PI * n3 / t3) - Math.sin(2 * l * Math.PI * e3 / t3)) / (l * Math.PI);
            for (f = u < 21 ? 0 : u > 50 ? 0.1102 * (u - 8.7) : 0.5842 * Math.pow(u - 21, 0.4) + 0.07886 * (u - 21), i = o(f), l = 0; l <= s; l++) h[s + l] = c[l] * o(f * Math.sqrt(1 - l * l / (s * s))) / i;
            for (l = 0; l < s; l++) h[l] = h[a - 1 - l];
            return h;
          }, t2 = function(r3) {
            var t3 = r3.Fs, e3 = r3.Fc, n3 = r3.order, a = 2 * Math.PI * e3 / t3, u = 0, o = 0, i = [];
            for (u = 0; u <= n3; u++) u - n3 / 2 == 0 ? i[u] = a : (i[u] = Math.sin(a * (u - n3 / 2)) / (u - n3 / 2), i[u] *= 0.54 - 0.46 * Math.cos(2 * Math.PI * u / n3)), o += i[u];
            for (u = 0; u <= n3; u++) i[u] /= o;
            return i;
          }, e2 = function(r3) {
            var t3;
            for (t3 = 0; t3 < r3.length; t3++) r3[t3] = -r3[t3];
            return r3[(r3.length - 1) / 2]++, r3;
          }, n2 = function(r3) {
            for (var n3 = t2({ order: r3.order, Fs: r3.Fs, Fc: r3.F2 }), a = e2(t2({ order: r3.order, Fs: r3.Fs, Fc: r3.F1 })), u = [], o = 0; o < n3.length; o++) u.push(n3[o] + a[o]);
            return u;
          };
          return { lowpass: function(r3) {
            return t2(r3);
          }, highpass: function(r3) {
            return e2(t2(r3));
          }, bandstop: function(r3) {
            return n2(r3);
          }, bandpass: function(r3) {
            return e2(n2(r3));
          }, kbFilter: function(t3) {
            return r2(t3);
          }, available: function() {
            return ["lowpass", "highpass", "bandstop", "bandpass", "kbFilter"];
          } };
        };
        t.exports = n;
      }, {}], 5: [function(r, t, e) {
        "use strict";
        var n = r("./utils"), a = n.runMultiFilter, u = n.runMultiFilterReverse, o = n.complex, i = n.evaluatePhase, s = function(r2) {
          var t2 = r2, e2 = [], n2 = 0;
          for (n2 = 0; n2 < t2.length; n2++) e2[n2] = { re: t2[n2], im: 0 };
          var s2 = function(r3) {
            var t3, e3 = [];
            for (t3 = 0; t3 < r3; t3++) e3.push(0);
            return { buf: e3, pointer: 0 };
          }, c = s2(t2.length - 1), f = function(r3, e3) {
            e3.buf[e3.pointer] = r3;
            var a2 = 0;
            for (n2 = 0; n2 < e3.buf.length; n2++) a2 += t2[n2] * e3.buf[(e3.pointer + n2) % e3.buf.length];
            return e3.pointer = (e3.pointer + 1) % e3.buf.length, a2;
          }, l = function(r3) {
            var e3 = s2(t2.length - 1);
            return a(r3, e3, f);
          }, h = function(r3) {
            for (var n3 = r3.Fs, a2 = r3.Fr, u2 = -Math.PI * (a2 / n3) * 2, i2 = { re: 0, im: 0 }, s3 = 0; s3 < t2.length - 1; s3++) i2 = o.add(i2, o.mul(e2[s3], { re: Math.cos(u2 * s3), im: Math.sin(u2 * s3) }));
            var c2 = o.magnitude(i2);
            return { magnitude: c2, phase: o.phase(i2), dBmagnitude: 20 * Math.log(c2) * Math.LOG10E };
          };
          return { responsePoint: function(r3) {
            return h(r3);
          }, response: function(r3) {
            r3 = r3 || 100;
            var t3 = [], e3 = 0, n3 = 2 * r3;
            for (e3 = 0; e3 < r3; e3++) t3[e3] = h({ Fs: n3, Fr: e3 });
            return i(t3), t3;
          }, simulate: function(r3) {
            return l(r3);
          }, singleStep: function(r3) {
            return f(r3, c);
          }, multiStep: function(r3, t3) {
            return a(r3, c, f, t3);
          }, filtfilt: function(r3, t3) {
            return u(a(r3, c, f, t3), c, f, true);
          }, reinit: function() {
            c = s2(t2.length - 1);
          } };
        };
        t.exports = s;
      }, { "./utils": 9 }], 6: [function(r, t, e) {
        "use strict";
        var n = function() {
          var r2 = function(r3, t3) {
            var e3 = r3.Q, n2 = r3.Fc, a = r3.Fs, u = {}, o = 2 * Math.PI * n2 / a;
            return r3.BW ? u.alpha = Math.sin(o) * Math.sinh(Math.log(2) / 2 * r3.BW * o / Math.sin(o)) : u.alpha = Math.sin(o) / (2 * e3), u.cw = Math.cos(o), u.a0 = 1 + u.alpha, t3.a0 = u.a0, t3.a.push(-2 * u.cw / u.a0), t3.k = 1, t3.a.push((1 - u.alpha) / u.a0), u;
          }, t2 = function(r3) {
            var t3 = r3.Q, e3 = r3.Fc, n2 = r3.Fs, a = {}, u = 2 * Math.PI * e3 / n2;
            return a.alpha = Math.sin(u) / (2 * t3), a.cw = Math.cos(u), a.A = Math.pow(10, r3.gain / 40), a;
          }, e2 = function() {
            var r3 = {};
            return r3.z = [0, 0], r3.a = [], r3.b = [], r3;
          };
          return { fromPZ: function(r3) {
            var t3 = e2();
            return t3.a0 = 1, t3.b.push(1), t3.b.push(-r3.z0.re - r3.z1.re), t3.b.push(r3.z0.re * r3.z1.re - r3.z0.im * r3.z1.im), t3.a.push(-r3.p0.re - r3.p1.re), t3.a.push(r3.p0.re * r3.p1.re - r3.p0.im * r3.p1.im), "lowpass" === r3.type ? t3.k = (1 + t3.a[0] + t3.a[1]) / (1 + t3.b[1] + t3.b[2]) : t3.k = (1 - t3.a[0] + t3.a[1]) / (1 - t3.b[1] + t3.b[2]), t3;
          }, lowpassMZ: function(r3) {
            var t3 = e2();
            t3.a0 = 1;
            var n2 = r3.as, a = r3.bs, u = 2 * Math.PI * r3.Fc / r3.Fs, o = -n2 / (2 * a);
            return t3.a.push(2 * -Math.pow(Math.E, o * u) * Math.cos(-u * Math.sqrt(Math.abs(Math.pow(n2, 2) / (4 * Math.pow(a, 2)) - 1 / a)))), t3.a.push(Math.pow(Math.E, 2 * o * u)), r3.preGain ? (t3.b.push(1), t3.k = t3.a0 + t3.a[0] + t3.a[1]) : (t3.b.push(t3.a0 + t3.a[0] + t3.a[1]), t3.k = 1), t3.b.push(0), t3.b.push(0), t3;
          }, lowpassBT: function(r3) {
            var t3 = e2();
            return r3.Q = 1, t3.wp = Math.tan(2 * Math.PI * r3.Fc / (2 * r3.Fs)), t3.wp2 = t3.wp * t3.wp, r3.BW && delete r3.BW, t3.k = 1, t3.a0 = 3 * t3.wp + 3 * t3.wp2 + 1, t3.b.push(3 * t3.wp2 * r3.Q / t3.a0), t3.b.push(2 * t3.b[0]), t3.b.push(t3.b[0]), t3.a.push((6 * t3.wp2 - 2) / t3.a0), t3.a.push((3 * t3.wp2 - 3 * t3.wp + 1) / t3.a0), t3;
          }, highpassBT: function(r3) {
            var t3 = e2();
            return r3.Q = 1, t3.wp = Math.tan(2 * Math.PI * r3.Fc / (2 * r3.Fs)), t3.wp2 = t3.wp * t3.wp, r3.BW && delete r3.BW, t3.k = 1, t3.a0 = t3.wp + t3.wp2 + 3, t3.b.push(3 * r3.Q / t3.a0), t3.b.push(2 * t3.b[0]), t3.b.push(t3.b[0]), t3.a.push((2 * t3.wp2 - 6) / t3.a0), t3.a.push((t3.wp2 - t3.wp + 3) / t3.a0), t3;
          }, lowpass: function(t3) {
            var n2 = e2();
            t3.BW && delete t3.BW;
            var a = r2(t3, n2);
            return t3.preGain ? (n2.k = 0.5 * (1 - a.cw), n2.b.push(1 / a.a0)) : (n2.k = 1, n2.b.push((1 - a.cw) / (2 * a.a0))), n2.b.push(2 * n2.b[0]), n2.b.push(n2.b[0]), n2;
          }, highpass: function(t3) {
            var n2 = e2();
            t3.BW && delete t3.BW;
            var a = r2(t3, n2);
            return t3.preGain ? (n2.k = 0.5 * (1 + a.cw), n2.b.push(1 / a.a0)) : (n2.k = 1, n2.b.push((1 + a.cw) / (2 * a.a0))), n2.b.push(-2 * n2.b[0]), n2.b.push(n2.b[0]), n2;
          }, allpass: function(t3) {
            var n2 = e2();
            t3.BW && delete t3.BW;
            var a = r2(t3, n2);
            return n2.k = 1, n2.b.push((1 - a.alpha) / a.a0), n2.b.push(-2 * a.cw / a.a0), n2.b.push((1 + a.alpha) / a.a0), n2;
          }, bandpassQ: function(t3) {
            var n2 = e2(), a = r2(t3, n2);
            return n2.k = 1, n2.b.push(a.alpha * t3.Q / a.a0), n2.b.push(0), n2.b.push(-n2.b[0]), n2;
          }, bandpass: function(t3) {
            var n2 = e2(), a = r2(t3, n2);
            return n2.k = 1, n2.b.push(a.alpha / a.a0), n2.b.push(0), n2.b.push(-n2.b[0]), n2;
          }, bandstop: function(t3) {
            var n2 = e2(), a = r2(t3, n2);
            return n2.k = 1, n2.b.push(1 / a.a0), n2.b.push(-2 * a.cw / a.a0), n2.b.push(n2.b[0]), n2;
          }, peak: function(r3) {
            var n2 = e2(), a = t2(r3);
            return n2.k = 1, n2.a0 = 1 + a.alpha / a.A, n2.a.push(-2 * a.cw / n2.a0), n2.a.push((1 - a.alpha / a.A) / n2.a0), n2.b.push((1 + a.alpha * a.A) / n2.a0), n2.b.push(-2 * a.cw / n2.a0), n2.b.push((1 - a.alpha * a.A) / n2.a0), n2;
          }, lowshelf: function(r3) {
            var n2 = e2();
            r3.BW && delete r3.BW;
            var a = t2(r3);
            n2.k = 1;
            var u = 2 * Math.sqrt(a.A) * a.alpha;
            return n2.a0 = a.A + 1 + (a.A - 1) * a.cw + u, n2.a.push(-2 * (a.A - 1 + (a.A + 1) * a.cw) / n2.a0), n2.a.push((a.A + 1 + (a.A - 1) * a.cw - u) / n2.a0), n2.b.push(a.A * (a.A + 1 - (a.A - 1) * a.cw + u) / n2.a0), n2.b.push(2 * a.A * (a.A - 1 - (a.A + 1) * a.cw) / n2.a0), n2.b.push(a.A * (a.A + 1 - (a.A - 1) * a.cw - u) / n2.a0), n2;
          }, highshelf: function(r3) {
            var n2 = e2();
            r3.BW && delete r3.BW;
            var a = t2(r3);
            n2.k = 1;
            var u = 2 * Math.sqrt(a.A) * a.alpha;
            return n2.a0 = a.A + 1 - (a.A - 1) * a.cw + u, n2.a.push(2 * (a.A - 1 - (a.A + 1) * a.cw) / n2.a0), n2.a.push((a.A + 1 - (a.A - 1) * a.cw - u) / n2.a0), n2.b.push(a.A * (a.A + 1 + (a.A - 1) * a.cw + u) / n2.a0), n2.b.push(-2 * a.A * (a.A - 1 + (a.A + 1) * a.cw) / n2.a0), n2.b.push(a.A * (a.A + 1 + (a.A - 1) * a.cw - u) / n2.a0), n2;
          }, aweighting: function(r3) {
            var t3 = e2();
            t3.k = 1;
            var n2 = 2 * Math.PI * r3.Fc / r3.Fs, a = 2 * Math.tan(n2 / 2), u = r3.Q, o = Math.pow(a, 2);
            return t3.a0 = 4 * u + o * u + 2 * a, t3.a.push(2 * o * u - 8 * u), t3.a.push(4 * u + o * u - 2 * a), t3.b.push(o * u), t3.b.push(2 * o * u), t3.b.push(o * u), t3;
          } };
        };
        t.exports = n;
      }, {}], 7: [function(r, t, e) {
        "use strict";
        var n = r("./utils"), a = n.complex, u = n.runMultiFilter, o = n.runMultiFilterReverse, i = n.evaluatePhase, s = function(r2) {
          for (var t2 = r2, e2 = { re: 1, im: 0 }, n2 = [], s2 = [], c = 0; c < t2.length; c++) {
            n2[c] = {};
            var f = t2[c];
            n2[c].b0 = { re: f.b[0], im: 0 }, n2[c].b1 = { re: f.b[1], im: 0 }, n2[c].b2 = { re: f.b[2], im: 0 }, n2[c].a1 = { re: f.a[0], im: 0 }, n2[c].a2 = { re: f.a[1], im: 0 }, n2[c].k = { re: f.k, im: 0 }, n2[c].z = [0, 0], s2[c] = {}, s2[c].b1 = f.b[1] / f.b[0], s2[c].b2 = f.b[2] / f.b[0], s2[c].a1 = f.a[0], s2[c].a2 = f.a[1];
          }
          var l = function(r3, t3) {
            var e3 = t3 * r3.k.re - r3.a1.re * r3.z[0] - r3.a2.re * r3.z[1], n3 = r3.b0.re * e3 + r3.b1.re * r3.z[0] + r3.b2.re * r3.z[1];
            return r3.z[1] = r3.z[0], r3.z[0] = e3, n3;
          }, h = function(r3, t3) {
            var e3 = r3, n3 = 0;
            for (n3 = 0; n3 < t3.length; n3++) e3 = l(t3[n3], e3);
            return e3;
          }, p = function(r3, t3) {
            var n3 = r3.Fs, u2 = r3.Fr, o2 = -Math.PI * (u2 / n3) * 2, i2 = { re: Math.cos(o2), im: Math.sin(o2) }, s3 = a.mul(t3.k, a.add(t3.b0, a.mul(i2, a.add(t3.b1, a.mul(t3.b2, i2))))), c2 = a.add(e2, a.mul(i2, a.add(t3.a1, a.mul(t3.a2, i2)))), f2 = a.div(s3, c2);
            return { magnitude: a.magnitude(f2), phase: a.phase(f2) };
          }, v = function(r3) {
            var t3 = 0, e3 = { magnitude: 1, phase: 0 };
            for (t3 = 0; t3 < n2.length; t3++) {
              var a2 = p(r3, n2[t3]);
              e3.magnitude *= a2.magnitude, e3.phase += a2.phase;
            }
            return e3.dBmagnitude = 20 * Math.log(e3.magnitude) * Math.LOG10E, e3;
          }, b = function() {
            for (var r3 = [], e3 = 0; e3 < t2.length; e3++) r3[e3] = { b0: { re: f.b[0], im: 0 }, b1: { re: f.b[1], im: 0 }, b2: { re: f.b[2], im: 0 }, a1: { re: f.a[0], im: 0 }, a2: { re: f.a[1], im: 0 }, k: { re: f.k, im: 0 }, z: [0, 0] };
            return r3;
          }, m = function(r3) {
            var t3 = b();
            return u(r3, t3, h);
          }, d = function(r3, t3) {
            var e3 = {}, n3 = [], a2 = 0;
            for (a2 = 0; a2 < t3; a2++) n3.push(r3(a2));
            e3.out = m(n3);
            var u2 = false, o2 = false;
            for (a2 = 0; a2 < t3 - 1; a2++) if (e3.out[a2] > e3.out[a2 + 1] && !u2 && (u2 = true, e3.max = { sample: a2, value: e3.out[a2] }), u2 && !o2 && e3.out[a2] < e3.out[a2 + 1]) {
              o2 = true, e3.min = { sample: a2, value: e3.out[a2] };
              break;
            }
            return e3;
          }, M = function(r3, t3) {
            var e3 = Math.pow(r3 / 2, 2) - t3;
            return e3 < 0 ? [{ re: -r3 / 2, im: Math.sqrt(Math.abs(e3)) }, { re: -r3 / 2, im: -Math.sqrt(Math.abs(e3)) }] : [{ re: -r3 / 2 + Math.sqrt(e3), im: 0 }, { re: -r3 / 2 - Math.sqrt(e3), im: 0 }];
          }, g = function() {
            for (var r3 = [], t3 = 0; t3 < s2.length; t3++) r3[t3] = {}, r3[t3].z = M(s2[t3].b1, s2[t3].b2), r3[t3].p = M(s2[t3].a1, s2[t3].a2);
            return r3;
          };
          return { singleStep: function(r3) {
            return h(r3, n2);
          }, multiStep: function(r3, t3) {
            return u(r3, n2, h, t3);
          }, filtfilt: function(r3, t3) {
            return o(u(r3, n2, h, t3), n2, h, true);
          }, simulate: function(r3) {
            return m(r3);
          }, stepResponse: function(r3) {
            return d(function() {
              return 1;
            }, r3);
          }, impulseResponse: function(r3) {
            return d(function(r4) {
              return 0 === r4 ? 1 : 0;
            }, r3);
          }, responsePoint: function(r3) {
            return v(r3);
          }, response: function(r3) {
            r3 = r3 || 100;
            var t3 = [], e3 = 0, n3 = 2 * r3;
            for (e3 = 0; e3 < r3; e3++) t3[e3] = v({ Fs: n3, Fr: e3 });
            return i(t3), t3;
          }, polesZeros: function() {
            return g();
          }, reinit: function() {
            for (c = 0; c < n2.length; c++) n2[c].z = [0, 0];
          } };
        };
        t.exports = s;
      }, { "./utils": 9 }], 8: [function(r, t, e) {
        "use strict";
        var n = function(r2) {
          var t2, e2 = r2, n2 = [], a = function(r3) {
            for (t2 = 0; t2 < r3.steps; t2++) n2.push(e2.singleStep((Math.random() - 0.5) * r3.pp + r3.offset));
          }, u = function(r3) {
            var a2 = r3.offset + r3.pp, u2 = r3.offset - r3.pp;
            for (t2 = 0; t2 < r3.steps; t2++) t2 % 200 < 100 ? n2.push(e2.singleStep(a2)) : n2.push(e2.singleStep(u2));
          }, o = function(r3) {
            var a2 = r3.offset + r3.pp, u2 = r3.offset - r3.pp;
            for (t2 = 0; t2 < r3.steps; t2++) t2 % 100 == 0 ? n2.push(e2.singleStep(a2)) : n2.push(e2.singleStep(u2));
          }, i = function(r3) {
            var a2 = r3.offset + r3.pp, u2 = r3.offset - r3.pp, o2 = u2, i2 = (a2 - u2) / 100;
            for (t2 = 0; t2 < r3.steps; t2++) t2 % 200 < 100 ? o2 += i2 : o2 -= i2, n2.push(e2.singleStep(o2));
          };
          return { randomStability: function(r3) {
            for (e2.reinit(), n2.length = 0, a(r3), t2 = r3.setup; t2 < n2.length; t2++) if (n2[t2] > r3.maxStable || n2[t2] < r3.minStable) return n2[t2];
            return true;
          }, directedRandomStability: function(r3) {
            e2.reinit(), n2.length = 0;
            var s;
            for (s = 0; s < r3.tests; s++) {
              var c = Math.random();
              c < 0.25 ? a(r3) : c < 0.5 ? u(r3) : c < 0.75 ? o(r3) : i(r3);
            }
            for (a(r3), t2 = r3.setup; t2 < n2.length; t2++) if (n2[t2] > r3.maxStable || n2[t2] < r3.minStable) return n2[t2];
            return true;
          }, evaluateBehavior: function() {
          } };
        };
        t.exports = n;
      }, {}], 9: [function(r, t, e) {
        "use strict";
        e.evaluatePhase = function(r2) {
          var t2 = 0, e2 = 0, n2 = Math.PI, a2 = 2 * n2, u2 = [];
          for (e2 = 0; e2 < r2.length; e2++) u2.push(r2[e2].phase);
          for (r2[0].unwrappedPhase = r2[0].phase, r2[0].groupDelay = 0, e2 = 1; e2 < u2.length; e2++) {
            var o2 = u2[e2] - u2[e2 - 1];
            if (o2 > n2) for (t2 = e2; t2 < u2.length; t2++) u2[t2] -= a2;
            else if (o2 < -n2) for (t2 = e2; t2 < u2.length; t2++) u2[t2] += a2;
            u2[e2] < 0 ? r2[e2].unwrappedPhase = -u2[e2] : r2[e2].unwrappedPhase = u2[e2], r2[e2].phaseDelay = r2[e2].unwrappedPhase / (e2 / r2.length), r2[e2].groupDelay = (r2[e2].unwrappedPhase - r2[e2 - 1].unwrappedPhase) / (n2 / r2.length), r2[e2].groupDelay < 0 && (r2[e2].groupDelay = -r2[e2].groupDelay);
          }
          0 !== r2[0].magnitude ? (r2[0].phaseDelay = r2[1].phaseDelay, r2[0].groupDelay = r2[1].groupDelay) : (r2[0].phaseDelay = r2[2].phaseDelay, r2[0].groupDelay = r2[2].groupDelay, r2[1].phaseDelay = r2[2].phaseDelay, r2[1].groupDelay = r2[2].groupDelay);
        }, e.runMultiFilter = function(r2, t2, e2, n2) {
          var a2 = [];
          n2 && (a2 = r2);
          var u2;
          for (u2 = 0; u2 < r2.length; u2++) a2[u2] = e2(r2[u2], t2);
          return a2;
        }, e.runMultiFilterReverse = function(r2, t2, e2, n2) {
          var a2 = [];
          n2 && (a2 = r2);
          var u2;
          for (u2 = r2.length - 1; u2 >= 0; u2--) a2[u2] = e2(r2[u2], t2);
          return a2;
        };
        var n = function(r2, t2) {
          for (var e2 = true; e2; ) {
            var n2 = r2, a2 = t2;
            if (e2 = false, a2 || (a2 = 1), n2 !== Math.floor(n2) || a2 !== Math.floor(a2)) return 1;
            if (0 === n2 || 1 === n2) return a2;
            r2 = n2 - 1, t2 = a2 * n2, e2 = true;
          }
        };
        e.besselFactors = function(r2) {
          for (var t2 = [], e2 = 0; e2 < r2 + 1; e2++) {
            var a2 = n(2 * r2 - e2), u2 = Math.pow(2, r2 - e2) * n(e2) * n(r2 - e2);
            t2.unshift(Math.floor(a2 / u2));
          }
          return t2;
        };
        var a = function(r2, t2) {
          for (var e2 = 0, n2 = 0; n2 < t2; n2++) {
            var a2 = 1 / Math.pow(2, n2 + 1);
            r2 > a2 && (r2 -= a2, e2 += a2);
          }
          return e2;
        }, u = function(r2, t2) {
          return r2 & Math.pow(2, t2);
        }, o = function(r2, t2, e2) {
          var n2 = Math.abs(r2), o2 = r2 - n2;
          return { number: u(n2, t2).toString(), fraction: a(o2, e2).toString(), numberBits: t2, fractionBits: e2 };
        };
        e.fixedPoint = { convert: function(r2, t2, e2) {
          return o(r2, t2, e2);
        }, add: function(r2, t2) {
        }, sub: function(r2, t2) {
        }, mul: function(r2, t2) {
        }, div: function(r2, t2) {
        } }, e.complex = { div: function(r2, t2) {
          var e2 = r2.re, n2 = r2.im, a2 = t2.re, u2 = t2.im, o2 = a2 * a2 + u2 * u2;
          return { re: (e2 * a2 + n2 * u2) / o2, im: (n2 * a2 - e2 * u2) / o2 };
        }, mul: function(r2, t2) {
          var e2 = r2.re, n2 = r2.im, a2 = t2.re, u2 = t2.im;
          return { re: e2 * a2 - n2 * u2, im: (e2 + n2) * (a2 + u2) - e2 * a2 - n2 * u2 };
        }, add: function(r2, t2) {
          return { re: r2.re + t2.re, im: r2.im + t2.im };
        }, sub: function(r2, t2) {
          return { re: r2.re - t2.re, im: r2.im - t2.im };
        }, phase: function(r2) {
          return Math.atan2(r2.im, r2.re);
        }, magnitude: function(r2) {
          return Math.sqrt(r2.re * r2.re + r2.im * r2.im);
        } };
      }, {}] }, {}, [1])(1);
    });
  }
});

// src/PolarH10VisualizerRow.ts
var import_smoothie2 = __toESM(require_smoothie(), 1);

// src/CustomSmoothie.ts
var import_smoothie = __toESM(require_smoothie(), 1);
var CustomSmoothie = class extends import_smoothie.SmoothieChart {
  postRender;
  constructor(option) {
    super(option);
    this.postRender = [];
  }
  render(canvas, time) {
    super.render(canvas, time);
    for (let callback of this.postRender) {
      callback(canvas, time);
    }
  }
  addPostRenderCallback = function(callback) {
    const i = this.postRender.indexOf(callback);
    if (i < 0) {
      this.postRender.push(callback);
    }
  };
  removePostRenderCallback = function(callback) {
    const i = this.postRender.indexOf(callback);
    if (i > -1) {
      return this.postRender.splice(i, 1);
    } else {
      return [];
    }
  };
};

// src/PolarH10VisualizerRow.ts
var import_fili = __toESM(require_fili_min(), 1);

// src/consts.ts
var PMD_SERVICE_ID = "fb005c80-02e7-f387-1cad-8acd2d8df0c8";
var PMD_CTRL_CHAR = "fb005c81-02e7-f387-1cad-8acd2d8df0c8";
var PMD_DATA_CHAR = "fb005c82-02e7-f387-1cad-8acd2d8df0c8";
var PolarSensorType = /* @__PURE__ */ ((PolarSensorType2) => {
  PolarSensorType2[PolarSensorType2["ECG"] = 0] = "ECG";
  PolarSensorType2[PolarSensorType2["PPG"] = 1] = "PPG";
  PolarSensorType2[PolarSensorType2["ACC"] = 2] = "ACC";
  PolarSensorType2[PolarSensorType2["PPI"] = 3] = "PPI";
  PolarSensorType2[PolarSensorType2["GYRO"] = 5] = "GYRO";
  PolarSensorType2[PolarSensorType2["MAGNETOMETER"] = 6] = "MAGNETOMETER";
  PolarSensorType2[PolarSensorType2["SDK_MODE"] = 9] = "SDK_MODE";
  PolarSensorType2[PolarSensorType2["LOCATION"] = 10] = "LOCATION";
  PolarSensorType2[PolarSensorType2["PRESSURE"] = 11] = "PRESSURE";
  PolarSensorType2[PolarSensorType2["TEMPERATURE"] = 12] = "TEMPERATURE";
  return PolarSensorType2;
})(PolarSensorType || {});
var BODY_PARTS = [
  "",
  "LShoulder",
  "RShoulder",
  "Chest",
  "MiddleSpine",
  "LowerSpine",
  "Hip",
  "LThigh",
  "RThigh"
];
var PolarSettingType = /* @__PURE__ */ ((PolarSettingType2) => {
  PolarSettingType2[PolarSettingType2["SAMPLE_RATE"] = 0] = "SAMPLE_RATE";
  PolarSettingType2[PolarSettingType2["RESOLUTION"] = 1] = "RESOLUTION";
  PolarSettingType2[PolarSettingType2["RANGE_PN_UNIT"] = 2] = "RANGE_PN_UNIT";
  PolarSettingType2[PolarSettingType2["RANGE_MILI_UNIT"] = 3] = "RANGE_MILI_UNIT";
  PolarSettingType2[PolarSettingType2["NUM_CHANNELS"] = 4] = "NUM_CHANNELS";
  PolarSettingType2[PolarSettingType2["CONVERSION_FACTOR"] = 5] = "CONVERSION_FACTOR";
  return PolarSettingType2;
})(PolarSettingType || {});
function parseUint16(d, offset, little_endian = true) {
  return d.getUint16(offset, little_endian);
}
function parseFloat32(d, offset, little_endian = true) {
  return d.getFloat32(offset, little_endian);
}
function parse4xUint16(d, offset, little_endian = true) {
  return [
    d.getUint16(offset, little_endian),
    d.getUint16(offset + 2, little_endian),
    d.getUint16(offset + 4, little_endian),
    d.getUint16(offset + 6, little_endian)
  ];
}
var setting_parsers = {
  SAMPLE_RATE: parseUint16,
  RESOLUTION: parseUint16,
  RANGE_PN_UNIT: parseUint16,
  RANGE_MILI_UNIT: parse4xUint16,
  CONVERSION_FACTOR: parseFloat32
};
var setting_parser_offsets = {
  SAMPLE_RATE: 2,
  RESOLUTION: 2,
  RANGE_PN_UNIT: 2,
  RANGE_MILI_UNIT: 8,
  NUM_CHANNELS: 1,
  CONVERSION_FACTOR: 4
};
var PolarPMDCommand = /* @__PURE__ */ ((PolarPMDCommand2) => {
  PolarPMDCommand2[PolarPMDCommand2["GET_MEASUREMENT_SETTINGS"] = 1] = "GET_MEASUREMENT_SETTINGS";
  PolarPMDCommand2[PolarPMDCommand2["REQUEST_MEASUREMENT_START"] = 2] = "REQUEST_MEASUREMENT_START";
  PolarPMDCommand2[PolarPMDCommand2["REQUEST_MEASUREMENT_STOP"] = 3] = "REQUEST_MEASUREMENT_STOP";
  return PolarPMDCommand2;
})(PolarPMDCommand || {});
var PolarSettingNames = Object.keys(PolarSettingType).filter(
  (t) => isNaN(Number(t))
);
var PolarSensorNames = Object.keys(PolarSensorType).filter(
  (t) => isNaN(Number(t))
);
var PolarPMDCommandNames = Object.keys(PolarPMDCommand).filter(
  (t) => isNaN(Number(t))
);
var date2000 = /* @__PURE__ */ new Date("2000-01-01T00:00:00Z");
var date2018 = /* @__PURE__ */ new Date("2018-01-01T00:00:00Z");
var EPOCH2000_OFFSET_MS = date2000.valueOf();
var EPOCH2000_OFFSET_NS = BigInt(EPOCH2000_OFFSET_MS) * BigInt(1e6);
var EPOCH2018_OFFSET_MS = date2018.valueOf();
var EPOCH2018_OFFSET_NS = BigInt(EPOCH2018_OFFSET_MS) * BigInt(1e6);
var EXTRA_OFFSET_NS = EPOCH2018_OFFSET_NS - EPOCH2000_OFFSET_NS;
var EXTRA_OFFSET_MS_WHOLE = EXTRA_OFFSET_NS / BigInt(1e6);
var EXTRA_OFFSET_MS_DECIMAL = Number(EXTRA_OFFSET_NS - EXTRA_OFFSET_MS_WHOLE * BigInt(1e6)) / 1e6;
var EXTRA_OFFSET_MS = EXTRA_OFFSET_MS_DECIMAL + Number(EXTRA_OFFSET_MS_DECIMAL);
var ERROR_MSGS = [
  "SUCCESS",
  "INVALID OP CODE",
  "INVALID MEASUREMENT TYPE",
  "NOT SUPPORTED",
  "INVALID LENGTH",
  "INVALID PARAMETER",
  "ALREADY IN STATE",
  "INVALID RESOLUTION",
  "INVALID SAMPLE RATE",
  "INVALID RANGE",
  "INVALID MTU",
  "INVALID NUMBER OF CHANNELS",
  "INVALID STATE",
  "DEVICE IN CHARGER"
];
var EXG_STREAM_DELAY_MS = 600;
var EXG_RMS_WINDOW_MS = 200;
var EXG_RMS_WINDOW_SIZE = Math.round(130 / (1e3 / EXG_RMS_WINDOW_MS));
var EXG_HP_MIN = -120;
var EXG_HP_MAX = 120;
var EXG_RMS_MIN = 0;
var EXG_RMS_MAX = 120;
var EXG_RMS_HIGHPASS_CUTOFF_HZ = 25;
var EXG_RMS_HIGHPASS_ORDER = 4;
var EXG_SAMPLE_RATE_HZ = 130;
var ACC_STREAM_DELAY_MS = 600;
var ACC_SAMPLE_RATE_HZ = 100;
var ACC_RANGE_G = 4;
var ACC_MIN = -2e3;
var ACC_MAX = 2e3;
var AAC_LOWPASS_CUTOFF_HZ = 10;
var AAC_LOWPASS_ORDER = 4;
var SCROLL_LEGENT_DISP_TIME_MS = 1500;
var DEFAULT_EXG_LINE_CHART_OPTION = {
  // limitFPS: 60,
  grid: {
    strokeStyle: "#484f58",
    fillStyle: "#000000",
    lineWidth: 1,
    millisPerLine: 1e3,
    borderVisible: false
  },
  title: {
    text: "ECG/EMG raw (0.7\u201340 Hz)",
    fontFamily: "Arial",
    verticalAlign: "bottom",
    fillStyle: "#ffffff80",
    fontSize: 14
  },
  responsive: false,
  nonRealtimeData: true,
  millisPerPixel: 8,
  scaleSmoothing: 0.1,
  tooltip: true
};
var DEFAULT_ACC_LINE_CHART_OPTION = {
  // limitFPS: 60,
  minValue: ACC_MIN,
  maxValue: ACC_MAX,
  grid: {
    strokeStyle: "#484f58",
    fillStyle: "#000000",
    lineWidth: 1,
    millisPerLine: 1e3,
    borderVisible: false
  },
  title: {
    text: "Accelerometer raw",
    fontFamily: "Arial",
    verticalAlign: "bottom",
    fillStyle: "#ffffff80",
    fontSize: 14
  },
  labels: {
    disabled: false
  },
  responsive: false,
  nonRealtimeData: true,
  millisPerPixel: 8,
  scaleSmoothing: 0.1,
  tooltip: true
};
var EXG_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ebebebcc"
};
var EXG_HP_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ffdcaacc"
};
var EXG_RMS_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#dcaaffcc",
  fillStyle: "#f0beff99"
};
var X_AXIS_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ff453acc"
};
var Y_AXIS_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#32ff4bcc"
};
var Z_AXIS_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#0a84ffcc"
};
var X_LP_AXIS_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ff776ccc"
};
var Y_LP_AXIS_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#64ff7dcc"
};
var Z_LP_AXIS_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#3cb6ffcc"
};
var RHO_AXIS_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#6effffcc"
};
var PHI_AXIS_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ff70ffcc"
};
var THETA_AXIS_PRESENTATION_OPTIONS = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ffff78cc"
};

// src/PolarH10.ts
var PolarH10 = class {
  device;
  server = void 0;
  PMDService = void 0;
  PMDCtrlChar = void 0;
  PMDDataChar = void 0;
  BattService = void 0;
  BattLvlChar = void 0;
  streaming = false;
  verbose = true;
  dataHandle = {};
  // dataHandle: ((data: PolarH10Data) => void)[];
  timeOffset = BigInt(0);
  eventTimeOffset;
  lastECGTimestamp;
  lastACCTimestamp;
  ACCStarted = false;
  ECGStarted = false;
  constructor(device, verbose = true) {
    this.device = device;
    this.verbose = verbose;
    this.lastECGTimestamp = 0;
    this.lastACCTimestamp = 0;
    this.ACCStarted = false;
    this.ECGStarted = false;
    for (let i = 0; i < PolarSensorNames.length; i++) {
      this.dataHandle[PolarSensorNames[i]] = [];
    }
  }
  addEventListener = (type, handler) => {
    if (!this.dataHandle[type].includes(handler)) {
      this.dataHandle[type].push(handler);
    }
  };
  removeEventListener = (type, handler) => {
    if (this.dataHandle[type].includes(handler)) {
      this.dataHandle[type].splice(this.dataHandle[type].indexOf(handler), 1);
    }
  };
  clearEventListner = (type) => {
    delete this.dataHandle[type];
    this.dataHandle[type] = [];
  };
  log = (...o) => {
    if (this.verbose) {
      console.log(...o);
    }
  };
  init = async () => {
    this.server = await this.device.gatt?.connect();
    this.log(`Connecting to ${this.device.name} GATT server...`);
    this.PMDService = await this.server?.getPrimaryService(PMD_SERVICE_ID);
    this.log(`  Got PMD Service`);
    this.PMDCtrlChar = await this.PMDService?.getCharacteristic(PMD_CTRL_CHAR);
    this.log(`    Got PMD control characteristic`);
    await this.PMDCtrlChar?.startNotifications();
    this.log(`    Start notification`);
    this.PMDDataChar = await this.PMDService?.getCharacteristic(PMD_DATA_CHAR);
    this.log(`    Got PMD data characteristic`);
    await this.PMDDataChar?.startNotifications();
    this.log(`    Start notification`);
    this.streaming = false;
    this.BattService = await this.server?.getPrimaryService("battery_service");
    this.log(`  Got battery Service`);
    this.BattLvlChar = await this.BattService?.getCharacteristic("battery_level");
    this.log(`    Got battery level characteristic`);
    this.PMDDataChar?.addEventListener(
      "characteristicvaluechanged",
      this.PMDDataHandle
    );
  };
  PMDCtrlCharHandle = (event) => {
    this.log("PMDCtrlCharHandle");
    this.log(event);
  };
  PMDCtrlDataHandle = (event) => {
    this.log("PMDCtrlDataHandle");
    this.log(event);
  };
  getBatteryLevel = async () => {
    let battRead = await this.BattLvlChar?.readValue();
    if (battRead) {
      return battRead.getUint8(0);
    } else {
      return 0;
    }
  };
  getPMDFeatures = async () => {
    const PMEFeatures = await this.PMDCtrlChar?.readValue();
    const featureList = [];
    if (PMEFeatures !== void 0) {
      if (PMEFeatures.byteLength === 17) {
        if (PMEFeatures.getUint8(0) === 15) {
          const feature_num = PMEFeatures.getUint8(1);
          for (let i = 0; i < PolarSensorNames.length; i++) {
            const sensor_name = PolarSensorNames[i];
            if (feature_num >> PolarSensorType[sensor_name] & 1) {
              featureList.push(sensor_name);
            }
          }
        }
      }
    }
    return featureList;
  };
  getSensorSettingsFromName = async (sensorName) => {
    return this.getSensorSettingsFromId(PolarSensorType[sensorName]);
  };
  parseSensorSettings = (val) => {
    if (val.getUint8(0) == 240 && val.getUint8(1) == 1 /* GET_MEASUREMENT_SETTINGS */) {
      const info = {
        type: PolarSensorType[val.getUint8(2)],
        error: ERROR_MSGS[val.getUint8(3)],
        more_frames: val.getUint8(4),
        settings: {}
      };
      let i = 5;
      while (i < val.byteLength) {
        const setting_type = val.getUint8(i);
        i += 1;
        const arr_len = val.getUint8(i);
        i += 1;
        const setting_name = PolarSettingType[setting_type];
        info.settings[setting_name] = [];
        for (let arr_i = 0; arr_i < arr_len; arr_i++) {
          info.settings[setting_name].push(
            setting_parsers[setting_name](val, i)
          );
          i += setting_parser_offsets[setting_name];
        }
      }
      return info;
    }
  };
  getSensorSettingsFromId = async (sensorId) => {
    if (!this.streaming) {
      let sensorSettingPromiseRSLV;
      const sensorSettingPromise = new Promise((rslv, rjct) => {
        sensorSettingPromiseRSLV = rslv;
      });
      const PMDSensorSettingHandle = (event) => {
        const val = event?.target?.value;
        sensorSettingPromiseRSLV(this.parseSensorSettings(val));
      };
      this.PMDCtrlChar?.addEventListener(
        "characteristicvaluechanged",
        PMDSensorSettingHandle,
        { once: true }
      );
      const cmd_buf = new Uint8Array([
        1 /* GET_MEASUREMENT_SETTINGS */,
        sensorId
      ]);
      await this.PMDCtrlChar?.writeValue(cmd_buf);
      return await sensorSettingPromise;
    }
  };
  PMDDataHandle = (event) => {
    const val = event.target.value;
    const dataTimeStamp = val.getBigUint64(1, true);
    if (this.timeOffset === BigInt(0)) {
      this.timeOffset = dataTimeStamp;
      this.eventTimeOffset = event.timeStamp + performance.timeOrigin;
    }
    const offset_timestamp = Number(dataTimeStamp - this.timeOffset) / 1e6;
    const type = val.getUint8(0);
    const frame_type = val.getUint8(9);
    const dataFrame = {
      type: PolarSensorType[type],
      sample_timestamp_ms: offset_timestamp,
      prev_sample_timestamp_ms: 0,
      recv_epoch_time_ms: event.timeStamp + performance.timeOrigin,
      event_time_offset_ms: this.eventTimeOffset
    };
    switch (type) {
      case 2 /* ACC */:
        if (frame_type == 1) {
          dataFrame.samples = new Int16Array(val.buffer.slice(10));
          dataFrame.prev_sample_timestamp_ms = this.lastACCTimestamp;
          this.lastACCTimestamp = offset_timestamp;
        }
        break;
      case 0 /* ECG */:
        if (frame_type === 0) {
          const numFrames = Math.floor((val.byteLength - 10) / 3);
          dataFrame.samples = new Int32Array(numFrames);
          for (let i = 10; i < val.byteLength; i += 3) {
            let d = val.getUint8(i + 2) << 16 | val.getUint8(i + 1) << 8 | val.getUint8(i);
            if (d & 8388608) {
              d |= 4278190080;
            }
            dataFrame.samples[Math.floor((i - 10) / 3)] = d;
          }
          dataFrame.prev_sample_timestamp_ms = this.lastECGTimestamp;
          this.lastECGTimestamp = offset_timestamp;
        }
        break;
    }
    for (const handler of this.dataHandle[PolarSensorType[type]]) {
      handler(dataFrame);
    }
  };
  parseCtrlReply = (val) => {
    if (val.getUint8(0) === 240) {
      const polar_cmd = val.getUint8(1);
      if (polar_cmd === 2 /* REQUEST_MEASUREMENT_START */ || polar_cmd === 3 /* REQUEST_MEASUREMENT_STOP */) {
        const startReply = {
          type: PolarPMDCommand[polar_cmd],
          sensor: PolarSensorType[val.getUint8(2)],
          error: ERROR_MSGS[val.getUint8(3)],
          more_frames: val.getUint8(4)
        };
        if (val.byteLength > 5) {
          startReply.reserved = val.getUint8(5);
        }
        return startReply;
      }
    }
  };
  startACC = async (rangeG = 4, sample_rate = 100, resolution = 16) => {
    if (this.ACCStarted) {
      return;
    }
    let startACCRSLV;
    const startACCPromise = new Promise(
      (rslv, rjct) => {
        startACCRSLV = rslv;
      }
    );
    const PMDSensorSettingHandle = (event) => {
      this.log("PMDSensorSettingHandle");
      const val = event?.target?.value;
      startACCRSLV(this.parseCtrlReply(val));
    };
    this.PMDCtrlChar?.addEventListener(
      "characteristicvaluechanged",
      PMDSensorSettingHandle,
      { once: true }
    );
    const cmd_buf = new Uint8Array(14);
    const cmd_buf_dataview = new DataView(cmd_buf.buffer);
    cmd_buf[0] = 2 /* REQUEST_MEASUREMENT_START */;
    cmd_buf[1] = 2 /* ACC */;
    cmd_buf[2] = 2 /* RANGE_PN_UNIT */;
    cmd_buf[3] = 1;
    cmd_buf_dataview.setUint16(4, rangeG, true);
    cmd_buf[6] = 0 /* SAMPLE_RATE */;
    cmd_buf[7] = 1;
    cmd_buf_dataview.setUint16(8, sample_rate, true);
    cmd_buf[10] = 1 /* RESOLUTION */;
    cmd_buf[11] = 1;
    cmd_buf_dataview.setUint16(12, resolution, true);
    await this.PMDCtrlChar?.writeValue(cmd_buf);
    const startReply = await startACCPromise;
    if (startReply?.error === ERROR_MSGS[0]) {
      this.ACCStarted = true;
    }
    return startReply;
  };
  startECG = async (sample_rate = 130, resolution = 14) => {
    if (this.ECGStarted) {
      return;
    }
    let startECGRSLV;
    const startECGPromise = new Promise(
      (rslv, rjct) => {
        startECGRSLV = rslv;
      }
    );
    const PMDSensorSettingHandle = (event) => {
      this.log("PMDSensorSettingHandle");
      const val = event?.target?.value;
      startECGRSLV(this.parseCtrlReply(val));
    };
    this.PMDCtrlChar?.addEventListener(
      "characteristicvaluechanged",
      PMDSensorSettingHandle,
      { once: true }
    );
    const cmd_buf = new Uint8Array(10);
    const cmd_buf_dataview = new DataView(cmd_buf.buffer);
    cmd_buf[0] = 2 /* REQUEST_MEASUREMENT_START */;
    cmd_buf[1] = 0 /* ECG */;
    cmd_buf[2] = 1 /* RESOLUTION */;
    cmd_buf[3] = 1;
    cmd_buf_dataview.setUint16(4, resolution, true);
    cmd_buf[6] = 0 /* SAMPLE_RATE */;
    cmd_buf[7] = 1;
    cmd_buf_dataview.setUint16(8, sample_rate, true);
    await this.PMDCtrlChar?.writeValue(cmd_buf);
    const startReply = await startECGPromise;
    if (startReply?.error === ERROR_MSGS[0]) {
      this.ECGStarted = true;
    }
    return startReply;
  };
  stopECG = async () => {
    if (!this.ECGStarted) {
      return;
    }
    const endReply = await this.stopSensor(
      0 /* ECG */
    );
    if (endReply?.error === ERROR_MSGS[0]) {
      this.ECGStarted = false;
    }
    return endReply;
  };
  stopACC = async () => {
    if (!this.ACCStarted) {
      return;
    }
    const endReply = await this.stopSensor(
      2 /* ACC */
    );
    if (endReply?.error === ERROR_MSGS[0]) {
      this.ACCStarted = false;
    }
    return endReply;
  };
  stopSensor = async (sensorType) => {
    let endSensorRSLV;
    const endACCPromise = new Promise(
      (rslv, rjct) => {
        endSensorRSLV = rslv;
      }
    );
    const PMDSensorSettingHandle = (event) => {
      const val = event?.target?.value;
      endSensorRSLV(this.parseCtrlReply(val));
    };
    this.PMDCtrlChar?.addEventListener(
      "characteristicvaluechanged",
      PMDSensorSettingHandle,
      { once: true }
    );
    const cmd_buf = new Uint8Array(2);
    cmd_buf[0] = 3 /* REQUEST_MEASUREMENT_STOP */;
    cmd_buf[1] = sensorType;
    await this.PMDCtrlChar?.writeValue(cmd_buf);
    return await endACCPromise;
  };
};

// src/PolarH10VisualizerRow.ts
var polarRowID = 0;
var IIRCalc = new import_fili.CalcCascades();
var DPR = window.devicePixelRatio;
async function createPolarVisRow(content2, device) {
  const polarSensorDiv = document.createElement("div");
  polarSensorDiv.id = `polarSensorDiv-${polarRowID}`;
  polarSensorDiv.classList.add("polar-sensor-row", "flexbox");
  content2.appendChild(polarSensorDiv);
  const optionDiv = document.createElement("div");
  optionDiv.id = `optionDiv-${polarRowID}`;
  optionDiv.classList.add("polar-sensor-left-panel", "center");
  polarSensorDiv.appendChild(optionDiv);
  const nameDiv = document.createElement("div");
  nameDiv.id = `device-name-batt-${polarRowID}`;
  nameDiv.classList.add("center", "flexbox");
  let DeviceName;
  if (device.name) {
    DeviceName = device.name.substring(10);
    nameDiv.textContent = `Conneting ${DeviceName}`;
  }
  optionDiv.appendChild(nameDiv);
  const loadingDiv = document.createElement("div");
  loadingDiv.classList.add("loading", "loading-lg", "full-width", "flexbox");
  optionDiv.appendChild(loadingDiv);
  let polarH10;
  try {
    polarH10 = new PolarH10(device);
    await polarH10.init();
  } catch (err) {
    console.log(err);
    alert(err);
    if (content2.contains(polarSensorDiv)) {
      content2.removeChild(polarSensorDiv);
    }
    return;
  }
  const battLvl = await polarH10.getBatteryLevel();
  optionDiv.removeChild(loadingDiv);
  optionDiv.removeChild(nameDiv);
  optionDiv.classList.remove("center");
  if (device.name) {
    nameDiv.textContent = "";
    nameDiv.classList.add("flex");
    const deviceNameDiv = document.createElement("div");
    deviceNameDiv.textContent = DeviceName;
    deviceNameDiv.classList.add("padright-5px", "flexbox");
    nameDiv.appendChild(deviceNameDiv);
    let battStr;
    if (battLvl > 30) {
      battStr = `\u{1F50B}${battLvl}%`;
    } else {
      battStr = `\u{1FAAB}${battLvl}%`;
    }
    const battLvlDiv = document.createElement("div");
    battLvlDiv.textContent = battStr;
    battLvlDiv.classList.add("flexbox");
    nameDiv.appendChild(battLvlDiv);
  }
  console.log(await polarH10.getSensorSettingsFromName("ACC"));
  const disconnectDiv = document.createElement("div");
  disconnectDiv.id = `disconnectDiv-${polarRowID}`;
  optionDiv.appendChild(disconnectDiv);
  disconnectDiv.classList.add("flexbox", "disconnect");
  const disBtn = document.createElement("button");
  const delIcon = document.createElement("i");
  delIcon.classList.add("icon", "icon-delete");
  disBtn.appendChild(delIcon);
  disBtn.setAttribute("data-tooltip", "disconnect");
  disBtn.classList.add(
    "btn",
    "btn-primary",
    "btn-sm",
    "s-circle",
    "tooltip",
    "tooltip-top"
  );
  disconnectDiv.appendChild(disBtn);
  nameDiv.classList.add("flexbox");
  optionDiv.appendChild(nameDiv);
  const dataInfo = document.createElement("div");
  dataInfo.classList.add("left", "full-width", "flexbox");
  optionDiv.appendChild(dataInfo);
  const bodypartLabel = document.createElement("div");
  bodypartLabel.id = `bodypartLabel-${polarRowID}`;
  bodypartLabel.textContent = "Bodypart:";
  bodypartLabel.classList.add("half-width", "center");
  dataInfo.appendChild(bodypartLabel);
  const bodypartSelectDiv = document.createElement("div");
  bodypartSelectDiv.id = `bodypartSelectDiv-${polarRowID}`;
  bodypartSelectDiv.classList.add("half-width");
  dataInfo.appendChild(bodypartSelectDiv);
  const bodypartSelect = document.createElement("select");
  bodypartSelect.id = `bodypartSelect-${polarRowID}`;
  bodypartSelect.classList.add(
    "form-select",
    "dark-select",
    "select-sm",
    "almost-full-width"
  );
  bodypartSelectDiv.appendChild(bodypartSelect);
  addOptionsToSelect(bodypartSelect, BODY_PARTS);
  const dataCtrl = document.createElement("div");
  dataCtrl.id = `dataCtrl-${polarRowID}`;
  dataCtrl.classList.add("left", "full-width", "flexbox");
  optionDiv.appendChild(dataCtrl);
  let visContainerDiv = document.createElement("div");
  visContainerDiv.id = `visContainer-${polarRowID}`;
  polarSensorDiv.appendChild(visContainerDiv);
  visContainerDiv.classList.add("full-width", "full-height");
  let LOCAL_EXG_HP_MIN = EXG_HP_MIN;
  let LOCAL_EXG_HP_MAX = EXG_HP_MAX;
  let LOCAL_EXG_RMS_MIN = EXG_RMS_MIN;
  let LOCAL_EXG_RMS_MAX = EXG_RMS_MAX;
  let LOCAL_ACC_MIN = ACC_MIN;
  let LOCAL_ACC_MAX = ACC_MAX;
  let EXGFormSelect = void 0;
  let ACCFormSelect = void 0;
  let ECGDiv = void 0;
  let ACCDiv = void 0;
  let ecg_resize = void 0;
  let ecg_chart = void 0;
  let ecg_ts = void 0;
  let ecg_hp_ts = void 0;
  let ecg_rms_win = void 0;
  let ecg_rms_win_i = 0;
  let ecg_rms_ts = void 0;
  let ecg_resize_observer = void 0;
  let ecg_rms_iir_coef = void 0;
  let ecg_rms_iir = void 0;
  let ecg_canvas = void 0;
  let acc_resize = void 0;
  let acc_chart = void 0;
  let acc_x_ts = void 0;
  let acc_y_ts = void 0;
  let acc_z_ts = void 0;
  let acc_x_lp_ts = void 0;
  let acc_y_lp_ts = void 0;
  let acc_z_lp_ts = void 0;
  let acc_rho_ts = void 0;
  let acc_phi_ts = void 0;
  let acc_theta_ts = void 0;
  let acc_resize_observer = void 0;
  let acc_canvas = void 0;
  let acc_iir_coef = void 0;
  let acc_x_iir = void 0;
  let acc_y_iir = void 0;
  let acc_z_iir = void 0;
  const disconnectPolarH10 = () => {
    device.gatt?.disconnect();
    if (content2.contains(polarSensorDiv)) {
      content2.removeChild(polarSensorDiv);
    }
    if (ecg_chart !== void 0) {
      ecg_chart.stop();
    }
    if (ecg_resize_observer !== void 0) {
      ecg_resize_observer.disconnect();
    }
    if (ECGDiv !== void 0) {
      visContainerDiv.removeChild(ECGDiv);
    }
    resetECG();
    if (acc_chart !== void 0) {
      acc_chart.stop();
    }
    if (acc_resize_observer !== void 0) {
      acc_resize_observer.disconnect();
    }
    if (ACCDiv !== void 0) {
      visContainerDiv.removeChild(ACCDiv);
    }
    resetACC();
  };
  disBtn.addEventListener("click", disconnectPolarH10);
  const newECGCallback = (data) => {
    if (ecg_ts !== void 0 && ecg_rms_ts !== void 0 && ecg_hp_ts !== void 0 && data.prev_sample_timestamp_ms > 0 && data.samples !== void 0 && ecg_rms_iir !== void 0) {
      const estimated_sample_interval = (data.sample_timestamp_ms - data.prev_sample_timestamp_ms) / data.samples.length;
      for (let s_i = 0; s_i < data.samples.length; s_i++) {
        const timestamp = data.event_time_offset_ms + data.prev_sample_timestamp_ms + estimated_sample_interval * (s_i + 1);
        const data_i = data.samples[s_i];
        const data_i_timeout_ms = s_i * estimated_sample_interval;
        tsUpdate(ecg_ts, data_i, timestamp, data_i_timeout_ms);
        const filtered_data_i = ecg_rms_iir.singleStep(data_i);
        tsUpdate(ecg_hp_ts, filtered_data_i, timestamp, data_i_timeout_ms);
        if (ecg_rms_win !== void 0) {
          if (ecg_rms_win_i < EXG_RMS_WINDOW_SIZE) {
            ecg_rms_win[ecg_rms_win_i] = filtered_data_i;
            ecg_rms_win_i++;
          } else {
            ecg_rms_win.set(ecg_rms_win.subarray(1));
            ecg_rms_win[EXG_RMS_WINDOW_SIZE - 1] = filtered_data_i;
            const data_rms_i = rms(ecg_rms_win);
            tsUpdate(ecg_rms_ts, data_rms_i, timestamp, data_i_timeout_ms);
          }
        }
      }
    }
  };
  const newACCCallback = (data) => {
    if (acc_x_ts !== void 0 && acc_y_ts !== void 0 && acc_z_ts !== void 0 && acc_x_lp_ts !== void 0 && acc_y_lp_ts !== void 0 && acc_z_lp_ts !== void 0 && data.prev_sample_timestamp_ms > 0 && data.samples !== void 0 && acc_x_iir !== void 0 && acc_y_iir !== void 0 && acc_z_iir !== void 0 && acc_rho_ts !== void 0 && acc_phi_ts !== void 0 && acc_theta_ts !== void 0) {
      const estimated_sample_interval = (data.sample_timestamp_ms - data.prev_sample_timestamp_ms) / (data.samples.length / 3);
      for (let s_i = 0; s_i < data.samples.length; s_i += 3) {
        const frameNum = Math.floor(s_i / 3);
        const timestamp = data.event_time_offset_ms + data.prev_sample_timestamp_ms + estimated_sample_interval * (frameNum + 1);
        const data_i_timeout_ms = frameNum * estimated_sample_interval;
        const y_d = -data.samples[s_i];
        const x_d = -data.samples[s_i + 1];
        const z_d = data.samples[s_i + 2];
        tsUpdate(acc_x_ts, x_d, timestamp, data_i_timeout_ms);
        tsUpdate(acc_y_ts, y_d, timestamp, data_i_timeout_ms);
        tsUpdate(acc_z_ts, z_d, timestamp, data_i_timeout_ms);
        const x_lp_d = acc_x_iir.singleStep(x_d);
        const y_lp_d = acc_y_iir.singleStep(y_d);
        const z_lp_d = acc_z_iir.singleStep(z_d);
        tsUpdate(acc_x_lp_ts, x_lp_d, timestamp, data_i_timeout_ms);
        tsUpdate(acc_y_lp_ts, y_lp_d, timestamp, data_i_timeout_ms);
        tsUpdate(acc_z_lp_ts, z_lp_d, timestamp, data_i_timeout_ms);
        const rho = Math.atan(x_lp_d / Math.sqrt(y_lp_d * y_lp_d + z_lp_d * z_lp_d)) / Math.PI * 180;
        const phi = Math.atan(y_lp_d / Math.sqrt(x_lp_d * x_lp_d + z_lp_d * z_lp_d)) / Math.PI * 180;
        const theta = Math.atan(Math.sqrt(x_lp_d * x_lp_d + y_lp_d * y_lp_d) / z_lp_d) / Math.PI * 180;
        tsUpdate(acc_rho_ts, rho, timestamp, data_i_timeout_ms);
        tsUpdate(acc_phi_ts, phi, timestamp, data_i_timeout_ms);
        tsUpdate(acc_theta_ts, theta, timestamp, data_i_timeout_ms);
      }
    }
  };
  const onToggleECG = async (ev) => {
    if (ACC_switch_input) {
      ACC_switch_input.disabled = true;
    }
    if (ev.target?.checked) {
      ECGDiv = document.createElement("div");
      ECGDiv.id = `ECGDiv-${polarRowID}`;
      ECGDiv.addEventListener("wheel", onWheelECG);
      let width_class;
      if (ACCDiv === void 0) {
        width_class = "full-width";
      } else {
        width_class = "half-width";
        ACCDiv.classList.remove("full-width");
        ACCDiv.classList.add("half-width");
        visContainerDiv.removeChild(ACCDiv);
      }
      ECGDiv.classList.add("float-left", "almost-full-height", width_class);
      visContainerDiv.appendChild(ECGDiv);
      if (ACCDiv !== void 0) {
        visContainerDiv.appendChild(ACCDiv);
      }
      ecg_canvas = document.createElement("canvas");
      ecg_canvas.id = `ecg_canvas-${polarRowID}`;
      ECGDiv.appendChild(ecg_canvas);
      ecg_chart = new CustomSmoothie(DEFAULT_EXG_LINE_CHART_OPTION);
      ecg_ts = new import_smoothie2.TimeSeries();
      ecg_chart.addTimeSeries(ecg_ts, EXG_PRESENTATION_OPTIONS);
      ecg_chart.streamTo(ecg_canvas, EXG_STREAM_DELAY_MS);
      ecg_rms_ts = new import_smoothie2.TimeSeries();
      ecg_hp_ts = new import_smoothie2.TimeSeries();
      ecg_chart.addPostRenderCallback(exg_legend);
      ecg_rms_win = new Float64Array(EXG_RMS_WINDOW_SIZE);
      ecg_rms_win_i = 0;
      ecg_resize = resizeSmoothieGen(ecg_chart, 1, 1);
      ecg_resize_observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === ECGDiv && ecg_resize !== void 0) {
            ecg_resize();
          }
        }
      });
      ecg_resize_observer.observe(ECGDiv);
      ecg_rms_iir_coef = IIRCalc.highpass({
        order: EXG_RMS_HIGHPASS_ORDER,
        characteristic: "butterworth",
        Fs: EXG_SAMPLE_RATE_HZ,
        Fc: EXG_RMS_HIGHPASS_CUTOFF_HZ,
        preGain: false
      });
      ecg_rms_iir = (0, import_fili.IirFilter)(ecg_rms_iir_coef);
      ecg_resize();
      if (EXGFormSelect !== void 0) {
        EXGFormSelect.disabled = false;
        EXGFormSelect.selectedIndex = 0;
      }
      polarH10.addEventListener("ECG", newECGCallback);
      try {
        const startECGReply = await polarH10.startECG(EXG_SAMPLE_RATE_HZ);
        if (startECGReply) {
          console.log(startECGReply);
        }
      } catch (e) {
        console.log(e);
        disconnectPolarH10();
      }
    } else {
      if (ECGDiv !== void 0 && ecg_canvas !== void 0 && ecg_chart !== void 0) {
        ecg_chart.stop();
        if (EXGFormSelect !== void 0) {
          EXGFormSelect.disabled = true;
          EXGFormSelect.selectedIndex = 0;
        }
        if (ECGDiv.contains(ecg_canvas)) {
          ACCDiv?.classList.remove("half-width");
          ACCDiv?.classList.add("full-width");
          const stopECGReply = await polarH10.stopECG();
          if (stopECGReply) {
            console.log(stopECGReply);
          }
          visContainerDiv.removeChild(ECGDiv);
          ecg_resize_observer?.disconnect();
          polarH10.removeEventListener("ECG", newECGCallback);
          resetECG();
        }
      }
    }
    if (ACC_switch_input) {
      ACC_switch_input.disabled = false;
    }
  };
  function resetECG() {
    ecg_canvas = void 0;
    ECGDiv = void 0;
    ecg_resize = void 0;
    ecg_rms_win = void 0;
    ecg_chart = void 0;
    ecg_ts = void 0;
    ecg_hp_ts = void 0;
    ecg_rms_ts = void 0;
    ecg_resize_observer = void 0;
    ecg_rms_iir_coef = void 0;
    ecg_rms_iir = void 0;
    ecg_rms_win_i = 0;
  }
  const onToggleACC = async (ev) => {
    if (EXG_switch_input) {
      EXG_switch_input.disabled = true;
    }
    if (ev.target?.checked) {
      ACCDiv = document.createElement("div");
      ACCDiv.id = `ACCDiv-${polarRowID}`;
      ACCDiv.addEventListener("wheel", onWheelACC);
      let width_class;
      if (ECGDiv === void 0) {
        width_class = "full-width";
      } else {
        width_class = "half-width";
        ECGDiv.classList.remove("full-width");
        ECGDiv.classList.add("half-width");
      }
      ACCDiv.classList.add("float-left", "almost-full-height", width_class);
      visContainerDiv.appendChild(ACCDiv);
      acc_canvas = document.createElement("canvas");
      acc_canvas.id = `acc_canvas-${polarRowID}`;
      ACCDiv.appendChild(acc_canvas);
      acc_chart = new CustomSmoothie(DEFAULT_ACC_LINE_CHART_OPTION);
      acc_x_ts = new import_smoothie2.TimeSeries();
      acc_y_ts = new import_smoothie2.TimeSeries();
      acc_z_ts = new import_smoothie2.TimeSeries();
      acc_chart.addTimeSeries(acc_x_ts, X_AXIS_PRESENTATION_OPTIONS);
      acc_chart.addTimeSeries(acc_y_ts, Y_AXIS_PRESENTATION_OPTIONS);
      acc_chart.addTimeSeries(acc_z_ts, Z_AXIS_PRESENTATION_OPTIONS);
      acc_chart.streamTo(acc_canvas, ACC_STREAM_DELAY_MS);
      acc_chart.addPostRenderCallback(acc_legend);
      acc_chart.addPostRenderCallback(scroll_legend);
      setTimeout(() => {
        if (acc_chart) {
          acc_chart.removePostRenderCallback(scroll_legend);
        }
      }, SCROLL_LEGENT_DISP_TIME_MS);
      acc_x_lp_ts = new import_smoothie2.TimeSeries();
      acc_y_lp_ts = new import_smoothie2.TimeSeries();
      acc_z_lp_ts = new import_smoothie2.TimeSeries();
      acc_rho_ts = new import_smoothie2.TimeSeries();
      acc_phi_ts = new import_smoothie2.TimeSeries();
      acc_theta_ts = new import_smoothie2.TimeSeries();
      acc_resize = resizeSmoothieGen(acc_chart, 1, 1);
      acc_resize_observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === ACCDiv && acc_resize !== void 0) {
            acc_resize();
          }
        }
      });
      acc_resize_observer.observe(ACCDiv);
      acc_iir_coef = IIRCalc.lowpass({
        order: AAC_LOWPASS_ORDER,
        characteristic: "butterworth",
        Fs: ACC_SAMPLE_RATE_HZ,
        Fc: AAC_LOWPASS_CUTOFF_HZ,
        preGain: false
      });
      acc_x_iir = (0, import_fili.IirFilter)(acc_iir_coef);
      acc_y_iir = (0, import_fili.IirFilter)(acc_iir_coef);
      acc_z_iir = (0, import_fili.IirFilter)(acc_iir_coef);
      acc_resize();
      if (ACCFormSelect !== void 0) {
        ACCFormSelect.disabled = false;
        ACCFormSelect.selectedIndex = 0;
      }
      polarH10.addEventListener("ACC", newACCCallback);
      try {
        const startACCReply = await polarH10.startACC(
          ACC_RANGE_G,
          ACC_SAMPLE_RATE_HZ
        );
        if (startACCReply) {
          console.log(startACCReply);
        }
      } catch (e) {
        console.log(e);
        disconnectPolarH10();
      }
    } else {
      if (ACCDiv !== void 0 && acc_canvas !== void 0 && acc_chart !== void 0) {
        acc_chart.stop();
        if (ACCFormSelect !== void 0) {
          ACCFormSelect.disabled = true;
          ACCFormSelect.selectedIndex = 0;
        }
        if (ACCDiv.contains(acc_canvas)) {
          ACCDiv.removeChild(acc_canvas);
        }
        ECGDiv?.classList.remove("half-width");
        ECGDiv?.classList.add("full-width");
        polarH10.removeEventListener("ACC", newACCCallback);
        visContainerDiv.removeChild(ACCDiv);
        acc_resize_observer?.disconnect();
        const stopACCReply = await polarH10.stopACC();
        if (stopACCReply) {
          console.log(stopACCReply);
        }
        resetACC();
      }
    }
    if (EXG_switch_input) {
      EXG_switch_input.disabled = false;
    }
  };
  function resetACC() {
    ACCDiv = void 0;
    acc_resize = void 0;
    acc_canvas = void 0;
    acc_chart = void 0;
    acc_x_ts = void 0;
    acc_y_ts = void 0;
    acc_z_ts = void 0;
    acc_resize_observer = void 0;
    acc_iir_coef = void 0;
    acc_x_iir = void 0;
    acc_y_iir = void 0;
    acc_z_iir = void 0;
    acc_x_lp_ts = void 0;
    acc_y_lp_ts = void 0;
    acc_z_lp_ts = void 0;
    acc_rho_ts = void 0;
    acc_phi_ts = void 0;
    acc_theta_ts = void 0;
  }
  const onWheelECG = (ev) => {
    if (ecg_chart !== void 0) {
      let delta = 0;
      if (ev.deltaY < 0) {
        delta = 1;
      } else if (ev.deltaY > 0) {
        delta = -1;
      }
      switch (EXGFormSelect?.selectedIndex) {
        case 0:
          break;
        case 1:
          ev.preventDefault();
          LOCAL_EXG_HP_MAX += delta;
          LOCAL_EXG_HP_MIN -= delta;
          if (LOCAL_EXG_HP_MAX < 5 || LOCAL_EXG_HP_MAX <= LOCAL_EXG_HP_MIN || LOCAL_EXG_HP_MAX / 2 > EXG_HP_MAX) {
            LOCAL_EXG_HP_MAX -= delta;
            LOCAL_EXG_HP_MIN += delta;
          }
          ecg_chart.options.minValue = LOCAL_EXG_HP_MIN;
          ecg_chart.options.maxValue = LOCAL_EXG_HP_MAX;
          break;
        case 2:
          ev.preventDefault();
          LOCAL_EXG_RMS_MAX += delta;
          if (LOCAL_EXG_RMS_MAX < 5 || LOCAL_EXG_RMS_MAX <= LOCAL_EXG_RMS_MIN || LOCAL_EXG_RMS_MAX / 2 > EXG_RMS_MAX) {
            LOCAL_EXG_RMS_MAX -= delta;
          }
          ecg_chart.options.maxValue = LOCAL_EXG_RMS_MAX;
          break;
      }
    }
  };
  const onWheelACC = (ev) => {
    if (acc_chart !== void 0) {
      let delta = 0;
      switch (ACCFormSelect?.selectedIndex) {
        case 0:
        case 1:
          ev.preventDefault();
          if (ev.deltaY < 0) {
            delta = 10;
          } else if (ev.deltaY > 0) {
            delta = -10;
          }
          LOCAL_ACC_MAX += delta;
          LOCAL_ACC_MIN -= delta;
          if (LOCAL_ACC_MAX < 100 || LOCAL_ACC_MAX <= LOCAL_ACC_MIN || LOCAL_ACC_MAX / 2 > ACC_MAX) {
            LOCAL_ACC_MAX -= delta;
            LOCAL_ACC_MIN += delta;
          }
          acc_chart.options.minValue = LOCAL_ACC_MIN;
          acc_chart.options.maxValue = LOCAL_ACC_MAX;
          break;
        case 2:
          break;
      }
    }
  };
  const EXGCtrlDiv = document.createElement("div");
  EXGCtrlDiv.id = `EXGCtrlDiv-${polarRowID}`;
  dataCtrl.append(EXGCtrlDiv);
  const EXG_switch = createSwitch("EXG", onToggleECG);
  EXGCtrlDiv.classList.add("half-width");
  EXGCtrlDiv.appendChild(EXG_switch);
  const EXG_switch_input = EXG_switch.children.item(0);
  const EXGDropDown = document.createElement("div");
  EXGDropDown.classList.add("form-group");
  EXGCtrlDiv.appendChild(EXGDropDown);
  EXGFormSelect = document.createElement("select");
  EXGFormSelect.disabled = true;
  EXGFormSelect.id = `EXGDispOptions-${polarRowID}`;
  EXGFormSelect.classList.add(
    "form-select",
    "dark-select",
    "select-sm",
    "almost-full-width"
  );
  EXGDropDown.appendChild(EXGFormSelect);
  addOptionsToSelect(EXGFormSelect, ["Raw", "Highpass", "RMS"]);
  EXGFormSelect.selectedIndex = 0;
  EXGFormSelect.onchange = (evt) => {
    if (ecg_canvas !== void 0 && ecg_chart !== void 0 && ecg_ts !== void 0 && ecg_rms_ts !== void 0 && ecg_hp_ts !== void 0) {
      const selected = evt.target.selectedIndex;
      ecg_chart.stop();
      switch (selected) {
        case 0:
          ecg_chart.removeTimeSeries(ecg_rms_ts);
          ecg_chart.removeTimeSeries(ecg_hp_ts);
          ecg_chart.addTimeSeries(ecg_ts, EXG_PRESENTATION_OPTIONS);
          ecg_chart.options.minValue = void 0;
          ecg_chart.options.maxValue = void 0;
          ecg_chart.updateValueRange();
          if (ecg_chart.options.title) {
            ecg_chart.options.title.text = DEFAULT_EXG_LINE_CHART_OPTION.title?.text;
          }
          if (ecg_chart.removePostRenderCallback(exg_rms_legend).length || ecg_chart.removePostRenderCallback(exg_hp_legend).length) {
            ecg_chart.addPostRenderCallback(exg_legend);
          }
          break;
        case 1:
          ecg_chart.removeTimeSeries(ecg_ts);
          ecg_chart.removeTimeSeries(ecg_rms_ts);
          ecg_chart.addTimeSeries(ecg_hp_ts, EXG_HP_PRESENTATION_OPTIONS);
          ecg_chart.options.minValue = LOCAL_EXG_HP_MIN;
          ecg_chart.options.maxValue = LOCAL_EXG_HP_MAX;
          ecg_chart.updateValueRange();
          if (ecg_chart.options.title) {
            ecg_chart.options.title.text = `Highpass (${EXG_RMS_HIGHPASS_CUTOFF_HZ}Hz ${EXG_RMS_HIGHPASS_ORDER}th order Butterworth) on ECG/EMG raw`;
          }
          if (ecg_chart.removePostRenderCallback(exg_legend).length || ecg_chart.removePostRenderCallback(exg_rms_legend).length) {
            ecg_chart.addPostRenderCallback(exg_hp_legend);
            ecg_chart.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (ecg_chart) {
                ecg_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }
          break;
        case 2:
          ecg_chart.removeTimeSeries(ecg_ts);
          ecg_chart.removeTimeSeries(ecg_hp_ts);
          ecg_chart.addTimeSeries(ecg_rms_ts, EXG_RMS_PRESENTATION_OPTIONS);
          ecg_chart.options.minValue = LOCAL_EXG_RMS_MIN;
          ecg_chart.options.maxValue = LOCAL_EXG_RMS_MAX;
          ecg_chart.updateValueRange();
          if (ecg_chart.options.title) {
            ecg_chart.options.title.text = `RMS (Highpass on ECG/EMG raw)`;
          }
          if (ecg_chart.removePostRenderCallback(exg_legend).length || ecg_chart.removePostRenderCallback(exg_hp_legend).length) {
            ecg_chart.addPostRenderCallback(exg_rms_legend);
            ecg_chart.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (ecg_chart) {
                ecg_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }
          break;
      }
      ecg_chart.start();
    }
  };
  const ACCCtrlDiv = document.createElement("div");
  ACCCtrlDiv.id = `ACCCtrlDiv-${polarRowID}`;
  dataCtrl.append(ACCCtrlDiv);
  const ACC_switch = createSwitch("ACC", onToggleACC);
  ACCCtrlDiv.classList.add("half-width");
  ACCCtrlDiv.appendChild(ACC_switch);
  const ACC_switch_input = ACC_switch.children.item(0);
  const ACCDropDown = document.createElement("div");
  ACCDropDown.classList.add("form-group");
  ACCCtrlDiv.appendChild(ACCDropDown);
  ACCFormSelect = document.createElement("select");
  ACCFormSelect.disabled = true;
  ACCFormSelect.id = `ACCDispOptions-${polarRowID}`;
  ACCFormSelect.classList.add(
    "form-select",
    "dark-select",
    "select-sm",
    "almost-full-width"
  );
  ACCDropDown.appendChild(ACCFormSelect);
  addOptionsToSelect(ACCFormSelect, ["Raw", "Lowpass", "Tilt"]);
  ACCFormSelect.selectedIndex = 0;
  ACCFormSelect.onchange = (evt) => {
    if (acc_canvas !== void 0 && acc_chart !== void 0 && acc_x_ts !== void 0 && acc_y_ts !== void 0 && acc_z_ts !== void 0 && acc_x_lp_ts !== void 0 && acc_y_lp_ts !== void 0 && acc_z_lp_ts !== void 0) {
      const selected = evt.target.selectedIndex;
      acc_chart.stop();
      switch (selected) {
        case 0:
          acc_chart.removeTimeSeries(acc_x_lp_ts);
          acc_chart.removeTimeSeries(acc_y_lp_ts);
          acc_chart.removeTimeSeries(acc_z_lp_ts);
          acc_chart.removeTimeSeries(acc_rho_ts);
          acc_chart.removeTimeSeries(acc_phi_ts);
          acc_chart.removeTimeSeries(acc_theta_ts);
          acc_chart.addTimeSeries(acc_x_ts, X_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(acc_y_ts, Y_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(acc_z_ts, Z_AXIS_PRESENTATION_OPTIONS);
          acc_chart.options.minValue = LOCAL_ACC_MIN;
          acc_chart.options.maxValue = LOCAL_ACC_MAX;
          acc_chart.updateValueRange();
          if (acc_chart.options.title) {
            acc_chart.options.title.text = DEFAULT_ACC_LINE_CHART_OPTION.title?.text;
          }
          if (acc_chart.options.labels) {
            acc_chart.options.labels.disabled = false;
          }
          acc_chart.options.horizontalLines = [];
          if (acc_chart.removePostRenderCallback(acc_lp_legend).length || acc_chart.removePostRenderCallback(tilt_legend).length) {
            acc_chart.addPostRenderCallback(acc_legend);
            acc_chart.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (acc_chart) {
                acc_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }
          break;
        case 1:
          acc_chart.removeTimeSeries(acc_x_ts);
          acc_chart.removeTimeSeries(acc_y_ts);
          acc_chart.removeTimeSeries(acc_z_ts);
          acc_chart.removeTimeSeries(acc_rho_ts);
          acc_chart.removeTimeSeries(acc_phi_ts);
          acc_chart.removeTimeSeries(acc_theta_ts);
          acc_chart.addTimeSeries(acc_x_lp_ts, X_LP_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(acc_y_lp_ts, Y_LP_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(acc_z_lp_ts, Z_LP_AXIS_PRESENTATION_OPTIONS);
          acc_chart.options.minValue = LOCAL_ACC_MIN;
          acc_chart.options.maxValue = LOCAL_ACC_MAX;
          acc_chart.updateValueRange();
          if (acc_chart.options.title) {
            acc_chart.options.title.text = `Lowpass (${AAC_LOWPASS_CUTOFF_HZ}Hz ${AAC_LOWPASS_ORDER}th order Butterworth) on Accelerometer raw`;
          }
          if (acc_chart.options.labels) {
            acc_chart.options.labels.disabled = false;
          }
          acc_chart.options.horizontalLines = [];
          if (acc_chart.removePostRenderCallback(acc_legend).length || acc_chart.removePostRenderCallback(tilt_legend).length) {
            acc_chart.addPostRenderCallback(acc_lp_legend);
            acc_chart?.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (acc_chart) {
                acc_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }
          break;
        case 2:
          acc_chart.removeTimeSeries(acc_x_ts);
          acc_chart.removeTimeSeries(acc_y_ts);
          acc_chart.removeTimeSeries(acc_z_ts);
          acc_chart.removeTimeSeries(acc_x_lp_ts);
          acc_chart.removeTimeSeries(acc_y_lp_ts);
          acc_chart.removeTimeSeries(acc_z_lp_ts);
          acc_chart.addTimeSeries(acc_rho_ts, RHO_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(acc_phi_ts, PHI_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(
            acc_theta_ts,
            THETA_AXIS_PRESENTATION_OPTIONS
          );
          acc_chart.options.minValue = -140;
          acc_chart.options.maxValue = 140;
          if (acc_chart.options.title) {
            acc_chart.options.title.text = `Tilt angle [-90\xB0, 90\xB0] from lowpass on accelerometer raw`;
          }
          if (acc_chart.options.labels) {
            acc_chart.options.labels.disabled = true;
          }
          acc_chart.options.horizontalLines = [
            { value: 90, color: "#ffffff7f", lineWidth: 1 },
            { value: -90, color: "#ffffff7f", lineWidth: 1 }
          ];
          if (acc_chart.removePostRenderCallback(acc_legend).length || acc_chart.removePostRenderCallback(acc_lp_legend).length) {
            acc_chart.addPostRenderCallback(tilt_legend);
          }
          break;
      }
      acc_chart.start();
    }
  };
  polarRowID++;
}
function resizeSmoothieGen(chart, widthRatio, heightRatio) {
  const resize = () => {
    const canvas = chart.canvas;
    const parent = canvas.parentNode;
    let width = parent.offsetWidth;
    let height = parent.offsetHeight;
    const new_width = width * widthRatio;
    const new_height = height * heightRatio;
    canvas.width = new_width - 5;
    canvas.height = new_height;
    console.log(
      `Resize at ${(/* @__PURE__ */ new Date()).valueOf()} parent: ${parent.id} ${parent.offsetWidth} ${canvas.width} ${parent.offsetHeight} ${canvas.height}`
    );
  };
  return resize;
}
function createSwitch(labeltext, eventHandler) {
  const label = document.createElement("label");
  label.setAttribute("class", "form-switch");
  label.classList.add("label-sm");
  const input = document.createElement("input");
  input.id = `${labeltext}-onoff-${polarRowID}`;
  input.type = "checkbox";
  input.addEventListener("change", eventHandler);
  input.classList.add("input-sm");
  const icon = document.createElement("i");
  icon.classList.add("form-icon");
  label.textContent = labeltext;
  label.appendChild(input);
  label.appendChild(icon);
  return label;
}
function scroll_legend(canvas, time) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.font = "16px Arial";
    if (EXG_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = "#fbfbfb";
    }
    ctx.fillText("Scroll to change y-range", canvas.width / DPR / 2, 20);
    ctx.restore();
  }
}
function exg_legend(canvas, time) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (EXG_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = EXG_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("\u2015 Raw EXG (\u03BCV)", 10, 5);
    ctx.restore();
  }
}
function exg_rms_legend(canvas, time) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (EXG_RMS_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = EXG_RMS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText(
      `\u2015 Highpass raw EXG ${EXG_RMS_WINDOW_MS} ms window RMS (\u03BCV)`,
      10,
      5
    );
    ctx.restore();
  }
}
function exg_hp_legend(canvas, time) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (EXG_HP_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = EXG_HP_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText(`\u2015 Highpass raw EXG (\u03BCV)`, 10, 5);
    ctx.restore();
  }
}
function acc_legend(canvas, time) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (X_AXIS_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = X_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("\u2015 X-axis (mG)", 10, 5);
    if (Y_AXIS_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = Y_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("\u2015 Y-axis (mG)", 110, 5);
    if (Z_AXIS_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = Z_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("\u2015 Z-axis (mG)", 210, 5);
    ctx.restore();
  }
}
function tilt_legend(canvas, time) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (X_AXIS_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = RHO_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("\u2015 \u03C1\xB0 \u2220(X-axis, Horizon)", 10, 5);
    if (Y_AXIS_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = PHI_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("\u2015 \u03D5\xB0 \u2220(Y-axis, Horizon)", 170, 5);
    if (Z_AXIS_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = THETA_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("\u2015 \u03B8\xB0 \u2220(Z-axis, -Gravity)", 330, 5);
    ctx.restore();
  }
}
function acc_lp_legend(canvas, time) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (X_AXIS_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = X_LP_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("\u2015 Lowpass X axis (mG)", 10, 5);
    if (Y_AXIS_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = Y_LP_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("\u2015 Lowpass Y axis (mG)", 170, 5);
    if (Z_AXIS_PRESENTATION_OPTIONS.strokeStyle !== void 0) {
      ctx.fillStyle = Z_LP_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("\u2015 Lowpass Z axis (mG)", 330, 5);
    ctx.restore();
  }
}
function rms(arr) {
  const squares = arr.map((e) => e * e);
  let sum = 0;
  for (let i = 0; i < squares.length; i++) {
    sum += squares[i];
  }
  return Math.sqrt(sum / arr.length);
}
function tsUpdate(ts, val, timestamp_ms, delay_ms) {
  setTimeout(() => {
    ts.append(timestamp_ms, val);
  }, delay_ms);
}
function addOptionsToSelect(select, options) {
  for (let i = 0; i < options.length; i++) {
    const option_str = options[i];
    const option = document.createElement("option");
    option.id = `${select.id}-${polarRowID}-${i}`;
    option.textContent = option_str;
    select.appendChild(option);
  }
}

// src/index.ts
var webapp_container = document.createElement("div");
webapp_container.id = "webapp_container";
webapp_container.classList.add("container");
document.body.appendChild(webapp_container);
var top_bar_div = document.createElement("div");
top_bar_div.id = "top_bar_div";
webapp_container.appendChild(top_bar_div);
var title = document.createElement("h3");
title.textContent = "Polar H10 raw data visualizer";
title.classList.add("title");
top_bar_div.appendChild(title);
top_bar_div.classList.add("center");
var ble_conn_id = "ble_connect_btn";
var ble_conn_btn = document.createElement("button");
ble_conn_btn.setAttribute("data-tooltip", "Connect new Polar H10");
ble_conn_btn.id = ble_conn_id;
ble_conn_btn.classList.add(
  "btn",
  "btn-primary",
  "btn-action",
  "s-circle",
  "ble-conn"
);
var content = document.createElement("div");
content.id = "content_div";
content.classList.add("flexbox", "content");
webapp_container.appendChild(content);
if (navigator.bluetooth === void 0) {
  const debug_message = document.createElement("p");
  debug_message.innerHTML = 'Web Bluetooth API is not present!<br>\nPlease make sure you are using the latest chrome/chromium based browser.<br>\nAlso make sure to enable experimental-web-platform-features in your browser <a href="chrome://flags/#enable-experimental-web-platform-features">chrome://flags/#enable-experimental-web-platform-features</a> ';
  debug_message.setAttribute("style", "margin:5% 20%;font-size:1.4em;");
  content.appendChild(debug_message);
  window.stop();
}
var plus_icon = document.createElement("i");
plus_icon.setAttribute("class", "icon icon-plus");
ble_conn_btn.appendChild(plus_icon);
ble_conn_btn.addEventListener(
  "click",
  polarConnectHandleGen(content, createPolarVisRow)
);
top_bar_div.appendChild(ble_conn_btn);
function polarConnectHandleGen(parentCoponent, btDeviceHandler) {
  return async (ev) => {
    let device;
    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "Polar" }],
        optionalServices: [
          "battery_service",
          "fb005c80-02e7-f387-1cad-8acd2d8df0c8"
        ]
      });
    } catch (err) {
      console.log(err);
      return;
    }
    if (device.gatt?.connected) {
      return;
    }
    btDeviceHandler(parentCoponent, device);
  };
}
/*! Bundled license information:

smoothie/smoothie.js:
  (**
   * @license
   * MIT License:
   *
   * Copyright (c) 2010-2013, Joe Walnes
   *               2013-2018, Drew Noakes
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   *)

fili/dist/fili.min.js:
  (**
   * @name    fili
   * @version 2.0.3 | December 13th 2018
   * @author  Florian Markert
   * @license MIT
   *)
*/
//# sourceMappingURL=index.js.map
