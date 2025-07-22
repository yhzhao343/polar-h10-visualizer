import {
  SmoothieChart,
  IChartOptions,
  TimeSeries,
  ITimeSeriesPresentationOptions,
} from "smoothie";

export class SmoothieTSInfo {
  timeseries: TimeSeries | undefined;
  tsPresOpts: ITimeSeriesPresentationOptions | undefined;
  text: string;
  x: number = 0;
  y: number = 0;
  fillStyle: string;
  textBaseline: CanvasTextBaseline = "top";
  textAlign: CanvasTextAlign = "start";
  font: string = "14px Arial";
  on: boolean = true;
  on_fillStyle: string;
  off_fillStyle: string = "#7f7f7f";

  constructor(
    timeseries: TimeSeries | undefined,
    tsPresOpts: ITimeSeriesPresentationOptions | undefined,
    text: string,
    textAlign: CanvasTextAlign = "start",
    x: number = 0,
    y: number = 0,
    on: boolean = true,
    textBaseline: CanvasTextBaseline = "top",
    font: string = "14px Arial",
    on_fillStyle: string | undefined = undefined,
    off_fillStyle: string | undefined = undefined,
  ) {
    this.timeseries = timeseries;
    this.tsPresOpts = tsPresOpts;
    this.text = text;
    this.textAlign = textAlign;
    this.x = x;
    this.y = y;
    this.on = on;
    this.fillStyle = tsPresOpts?.strokeStyle || (on ? "#fbfbfb" : "#7f7f7f");
    this.textBaseline = textBaseline;
    this.font = font;
    if (on_fillStyle !== undefined) {
      this.on_fillStyle = on_fillStyle;
    } else if (this.on) {
      this.on_fillStyle = this.fillStyle;
    }
    if (off_fillStyle !== undefined) {
      this.off_fillStyle = off_fillStyle;
    } else if (!this.on) {
      this.off_fillStyle = this.fillStyle;
    }
    this.enable(on);
  }

  fontSize() {
    return parseFloat(this.font.split("px")[0]);
  }

  width(canvas: HTMLCanvasElement) {
    let width = 0;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.textBaseline = this.textBaseline;
      ctx.textAlign = this.textAlign;
      ctx.font = this.font;
      ctx.fillStyle = this.fillStyle;
      width = ctx.measureText(this.text).width;
      ctx.restore();
    }
    return width;
  }

  enable(on: boolean = true) {
    this.on = on;
    this.fillStyle = this.on ? this.on_fillStyle : this.off_fillStyle;
  }

  // clickHandle()

  onclick() {
    this.on = !this.on;
    this.enable(this.on);
  }
}

export class CustomSmoothie extends SmoothieChart {
  smoothieTSInfos: SmoothieTSInfo[];
  isRow: boolean = true;

  constructor(option?: IChartOptions, isRow: boolean = true) {
    super(option);
    this.smoothieTSInfos = [];
    this.isRow = isRow;
  }

  override render(canvas: HTMLCanvasElement, time: number) {
    super.render(canvas, time);
    if (this.smoothieTSInfos.length) {
      const ts = Date.now();
      const last_render_time = (this as any).lastRenderTimeMillis;
      const timeDelta = ts - last_render_time;
      if (timeDelta < 2) {
        this.renderLegend(canvas);
      }
    }
  }

  renderLegend(canvas: HTMLCanvasElement) {
    const infos = this.smoothieTSInfos;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.save();
      let prev_text_width: number = 0;
      for (let i = 0; i < infos.length; i++) {
        if (i > 0) {
          if (this.isRow && infos[i].x === infos[0].x) {
            infos[i].x = infos[i - 1].x + prev_text_width + 5;
          } else if (!this.isRow && infos[i].y === infos[0].y) {
            const textHeight = parseFloat(infos[i].font.split("px")[0]);
            infos[i].y = infos[i - 1].y + textHeight + 2;
          }
        }
        const info = infos[i];
        ctx.textBaseline = info.textBaseline;
        ctx.textAlign = info.textAlign;
        ctx.font = info.font;
        ctx.fillStyle = info.fillStyle;
        ctx.fillText(info.text, info.x, info.y);
        prev_text_width = ctx.measureText(info.text).width;
      }
      ctx.restore();
    }
  }

  addSmoothieTSInfo(info: SmoothieTSInfo) {
    const i = this.smoothieTSInfos.indexOf(info);
    if (i < 0) {
      this.smoothieTSInfos.push(info);
      if (info.timeseries !== undefined && info.tsPresOpts !== undefined) {
        this.addTimeSeries(info.timeseries, info.tsPresOpts);
      }
    }
  }

  removeLegendTSInfo(info: SmoothieTSInfo) {
    const i = this.smoothieTSInfos.indexOf(info);
    if (i > -1) {
      if (info.timeseries !== undefined) {
        this.removeTimeSeries(info.timeseries);
      }
      return this.smoothieTSInfos.splice(i, 1);
    } else {
      return [];
    }
  }

  clearLegendTSInfos() {
    for (let i = 0; i < this.smoothieTSInfos.length; i++) {
      const info = this.smoothieTSInfos[i];
      if (info.timeseries !== undefined) {
        this.removeTimeSeries(info.timeseries);
      }
    }
    this.smoothieTSInfos = [];
  }

  // clearTimeSeriesSet() {
  //   for (let i = 0; i < (this as any).seriesSet.length; i++) {
  //     const ts: TimeSeries = (this as any).seriesSet[0] as TimeSeries;
  //     this.removeTimeSeries(ts);
  //   }
  // }

  configureTimeSeries(
    timeserieses: TimeSeries[],
    timeserieOptions: ITimeSeriesPresentationOptions[],
    legendInfos: SmoothieLegendInfo[],
    scrollable: boolean = false,
    minValue: number | undefined = undefined,
    maxValue: number | undefined = undefined,
    titleText: string = "",
    disableLabel: boolean = false,
    horizontalLines: any[] = [],
  ) {
    this.clearLegendTSInfos();
    for (let i = 0; i < timeserieses.length; i++) {
      const info = new SmoothieTSInfo(
        timeserieses[i],
        timeserieOptions[i],
        legendInfos[i].legend,
        legendInfos[i].textAlign,
        legendInfos[i].x,
        legendInfos[i].y,
        true,
        legendInfos[i].textBaseline,
        legendInfos[i].font,
      );
      this.addSmoothieTSInfo(info);
    }
    if (scrollable && "canvas" in this) {
      const canvas = this.canvas as HTMLCanvasElement;
      const scrollTSInfo = new SmoothieTSInfo(
        undefined,
        undefined,
        "Scroll to change y-range",
        "center",
        canvas.width / window.devicePixelRatio / 2,
        30,
        true,
        "top",
        "16px Arial",
        "#fbfbfb",
      );
      this.addSmoothieTSInfo(scrollTSInfo);
      setTimeout(() => {
        this.removeLegendTSInfo(scrollTSInfo);
      }, 1500);
    }

    this.options.minValue = minValue;
    this.options.maxValue = maxValue;
    this.updateValueRange();
    if (titleText.length > 0 && this.options.title !== undefined) {
      this.options.title.text = titleText;
    }
    if (this.options.labels !== undefined) {
      this.options.labels.disabled = disableLabel;
    }
    this.options.horizontalLines = horizontalLines;
  }
}

export interface SmoothieLegendInfo {
  legend: string;
  x: number;
  y: number;
  textBaseline: CanvasTextBaseline;
  textAlign: CanvasTextAlign;
  font: string;
}

export function genSmoothieLegendInfo(
  legend: string,
  x: number = 10,
  y: number = 5,
  textBaseline: CanvasTextBaseline = "top",
  textAlign: CanvasTextAlign = "start",
  font: string = "14px Arial",
): SmoothieLegendInfo {
  const info = {
    legend: legend,
    x: x,
    y: y,
    textBaseline: textBaseline,
    textAlign: textAlign,
    font: font,
  };
  return info;
}
