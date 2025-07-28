import { PolarH10 } from "polar-h10";
import {
  SmoothieChart,
  IChartOptions,
  TimeSeries,
  ITimeSeriesPresentationOptions,
} from "smoothie";

const DEFAULT_ENABLE_COLOR = "#ebebebcc";
const DEFAULT_DISABLE_COLOR = "#5f5f5fcc";
const DEFAULT_LEGEND_FONT = "14px Arial";

function extractHeightFromFont(fontStr) {
  return parseFloat(fontStr.split("px")[0]);
}
export class SmoothieTSInfo {
  timeseries: TimeSeries | undefined;
  tsPresOpts: ITimeSeriesPresentationOptions | undefined;
  text: string;
  x: number = 0;
  y: number = 0;
  fillStyle: string;
  textBaseline: CanvasTextBaseline = "top";
  textAlign: CanvasTextAlign = "start";
  font: string = DEFAULT_LEGEND_FONT;
  on: boolean = true;
  on_fillStyle: string;
  off_fillStyle: string = DEFAULT_DISABLE_COLOR;
  width: number | undefined = undefined;
  height: number | undefined = undefined;

  constructor(
    timeseries: TimeSeries | undefined,
    tsPresOpts: ITimeSeriesPresentationOptions | undefined,
    text: string,
    textAlign: CanvasTextAlign = "start",
    x: number = 0,
    y: number = 0,
    on: boolean = true,
    textBaseline: CanvasTextBaseline = "top",
    font: string = DEFAULT_LEGEND_FONT,
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
    this.fillStyle =
      tsPresOpts?.strokeStyle ||
      (on ? DEFAULT_ENABLE_COLOR : DEFAULT_DISABLE_COLOR);
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

  getHeight() {
    this.height = extractHeightFromFont(this.font);
    return this.height;
  }

  getWidth(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.textBaseline = this.textBaseline;
      ctx.textAlign = this.textAlign;
      ctx.font = this.font;
      ctx.fillStyle = this.fillStyle;
      this.width = ctx.measureText(this.text).width;
      ctx.restore();
    }
    return this.width;
  }

  enable(on: boolean = true) {
    this.on = on;
    this.fillStyle = this.on ? this.on_fillStyle : this.off_fillStyle;
  }

  onclick() {
    this.on = !this.on;
    this.enable(this.on);
  }
}

function inRect(
  x: number,
  y: number,
  rx: number,
  rw: number,
  ry: number,
  rh: number,
) {
  return x > rx && x < rx + rw && y > ry && y < ry + rh;
}

export class CustomSmoothie extends SmoothieChart {
  smoothieTSInfos: SmoothieTSInfo[];
  isRow: boolean = true;
  enableRenderLegend: boolean = true;
  allowToggleTooltip: boolean = true;
  allowToggleLegend: boolean = true;
  allowToggleLabelAuto: boolean = true;
  ctrlFont: string = DEFAULT_LEGEND_FONT;
  ctrlFontHeight: number = 0;
  enableTooltipText: string = "[Tooltip]";
  enableTooltipTextX: number = 0;
  enableTooltipTextY: number = 0;
  enableTooltipTextWidth: number = 0;
  yAutoScaleText: string = "[Auto Y scale]";
  yAutoScaleTextX: number = 0;
  yAutoScaleTextY: number = 0;
  yAutoScaleTextWidth: number = 0;
  defaultXSpacing: number = 10;
  defaultYSpacing: number = 0;
  renderOffset: number = 0;
  prevMinValue: number | undefined = undefined;
  prevMaxValue: number | undefined = undefined;
  scrollable: boolean = false;

  constructor(
    option?: IChartOptions,
    isRow: boolean = true,
    enableRenderLegend: boolean = true,
    allowToggleTooltip: boolean = true,
    allowToggleLegend: boolean = true,
    allowToggleLabelAuto: boolean = true,
    ctrlFont: string = DEFAULT_LEGEND_FONT,
    defaultXSpacing: number = 10,
    defaultYSpacing: number = 0,
    scrollable: boolean = false,
  ) {
    super(option);
    this.smoothieTSInfos = [];
    this.isRow = isRow;
    this.enableRenderLegend = enableRenderLegend;
    this.allowToggleTooltip = allowToggleTooltip;
    this.allowToggleLegend = allowToggleLegend;
    this.allowToggleLabelAuto = allowToggleLabelAuto;
    this.ctrlFont = ctrlFont;
    this.defaultXSpacing = defaultXSpacing;
    this.defaultYSpacing = defaultYSpacing;
    this.ctrlFontHeight = extractHeightFromFont(this.ctrlFont);
    this.scrollable = scrollable;
  }

  canvasOnClick = (ev: any) => {
    // console.log(`Click coordinate: ${ev.offsetX} ${ev.offsetY}`);
    if (this.allowToggleLegend && "canvas" in this) {
      const canvas: HTMLCanvasElement = this.canvas as HTMLCanvasElement;

      if (this.allowToggleTooltip && this.options.tooltip !== undefined) {
        if (
          inRect(
            ev.offsetX,
            ev.offsetY,
            this.enableTooltipTextX,
            this.enableTooltipTextWidth,
            this.enableTooltipTextY,
            this.ctrlFontHeight,
          )
        ) {
          if (this.options.tooltip) {
            this.options.tooltip = false;
            if ("tooltipEl" in this) {
              (this.tooltipEl as HTMLElement).style.display = "none";
            }
          } else {
            this.options.tooltip = true;
          }
        }
      }
      if (this.allowToggleLabelAuto) {
        if (
          inRect(
            ev.offsetX,
            ev.offsetY,
            this.yAutoScaleTextX,
            this.yAutoScaleTextWidth,
            this.yAutoScaleTextY,
            this.ctrlFontHeight,
          )
        ) {
          if (this.yScaleIsAuto()) {
            this.options.minValue =
              this.prevMinValue || (this as any)?.valueRange?.min || 20;
            this.options.maxValue =
              this.prevMaxValue || (this as any)?.valueRange?.max || -20;
            this.updateValueRange();
            this.showScrollMessage();
          } else {
            this.prevMinValue = this.options.minValue;
            this.prevMaxValue = this.options.maxValue;
            this.options.minValue = undefined;
            this.options.maxValue = undefined;
            this.updateValueRange();
          }
        }
      }

      for (let i = 0; i < this.smoothieTSInfos.length; i++) {
        const info = this.smoothieTSInfos[i];
        const width = info.width || info.getWidth(canvas) || 0;
        const height = info.height || info.getHeight() || 0;
        if (width > 0 && height > 0) {
          if (
            ev.offsetX - this.renderOffset > info.x &&
            ev.offsetX - this.renderOffset < info.x + width &&
            ev.offsetY > info.y &&
            ev.offsetY < info.y + height
          ) {
            info.onclick();
            if (info.on) {
              if (info.timeseries !== undefined) {
                this.addTimeSeries(info.timeseries, info.tsPresOpts);
              }
            } else {
              if (info.timeseries !== undefined) {
                this.removeTimeSeries(info.timeseries);
              }
            }
          }
        }
      }
    }
  };

  yScaleIsAuto() {
    return (
      this.options.minValue === undefined || this.options.maxValue === undefined
    );
  }

  override streamTo(canvas: HTMLCanvasElement, delayMillis?: number): void {
    super.streamTo(canvas, delayMillis);
    if ("canvas" in this) {
      const canvas = this.canvas as HTMLCanvasElement;
      canvas.removeEventListener("click", this.canvasOnClick);
      canvas.addEventListener("click", this.canvasOnClick);
    }
  }

  override render(canvas: HTMLCanvasElement, time: number) {
    super.render(canvas, time);
    if (this.enableRenderLegend && this.smoothieTSInfos.length) {
      const last_render_time = (this as any).lastRenderTimeMillis;
      const timeDelta = Date.now() - last_render_time;
      if (timeDelta < 3) {
        this.renderLegend(canvas);
      }
    }
  }

  // modifyStreamDelayMs(delayMs: number) {
  //   this.stop();
  //   if ("delay" in this) {
  //     this.delay = delayMs;
  //   }
  //   this.start();
  // }

  renderLegend(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.save();
      let infos = this.smoothieTSInfos;
      let renderOffset = this.defaultXSpacing;
      if (this.allowToggleTooltip) {
        ctx.textBaseline = "top";
        ctx.textAlign = "start";
        ctx.font = this.ctrlFont;
        ctx.fillStyle = this.options.tooltip
          ? DEFAULT_ENABLE_COLOR
          : DEFAULT_DISABLE_COLOR;
        ctx.fillText(
          this.enableTooltipText,
          renderOffset,
          this.defaultYSpacing,
        );
        this.enableTooltipTextX = renderOffset;
        this.enableTooltipTextY = this.defaultYSpacing;
        this.enableTooltipTextWidth = ctx.measureText(
          this.enableTooltipText,
        ).width;
        renderOffset += this.enableTooltipTextWidth + this.defaultXSpacing;
      }

      if (this.allowToggleLabelAuto) {
        ctx.textBaseline = "top";
        ctx.textAlign = "start";
        ctx.font = this.ctrlFont;
        ctx.fillStyle = DEFAULT_ENABLE_COLOR;
        ctx.fillStyle = this.yScaleIsAuto()
          ? DEFAULT_ENABLE_COLOR
          : DEFAULT_DISABLE_COLOR;
        ctx.fillText(this.yAutoScaleText, renderOffset, this.defaultYSpacing);
        this.yAutoScaleTextX = renderOffset;
        this.yAutoScaleTextY = this.defaultYSpacing;
        this.yAutoScaleTextWidth = ctx.measureText(this.yAutoScaleText).width;
        renderOffset += this.yAutoScaleTextWidth + this.defaultXSpacing;
      }
      this.renderOffset = renderOffset;

      let prev_text_width: number = 0;
      for (let i = 0; i < infos.length; i++) {
        if (i > 0) {
          if (this.isRow && infos[i].x === infos[0].x) {
            infos[i].x =
              infos[i - 1].x + prev_text_width + this.defaultXSpacing;
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
        if (info.timeseries === undefined && info.tsPresOpts === undefined) {
          ctx.fillText(info.text, info.x, info.y);
        } else {
          ctx.fillText(info.text, renderOffset + info.x, info.y);
        }

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

  configureTimeSeries(
    timeserieses: TimeSeries[],
    timeserieOptions: ITimeSeriesPresentationOptions[],
    legendInfos: SmoothieLegendInfo[],
    scrollable: boolean = false,
    minValue: number | undefined = undefined,
    maxValue: number | undefined = undefined,
    minValueScale: number = 1,
    maxValueScale: number = 1,
    titleText: string = "",
    disableLabel: boolean = false,
    horizontalLines: any[] = [],
    allowToggleLegend: boolean = true,
    allowToggleLabelAuto: boolean = false,
    allowToggleTooltip: boolean = true,
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
    this.scrollable = scrollable;
    this.showScrollMessage();

    this.options.minValue = minValue;
    this.options.maxValue = maxValue;
    this.options.minValueScale = minValueScale;
    this.options.maxValueScale = maxValueScale;
    this.updateValueRange();
    if (titleText.length > 0 && this.options.title !== undefined) {
      this.options.title.text = titleText;
    }
    if (this.options.labels !== undefined) {
      this.options.labels.disabled = disableLabel;
    }
    this.options.horizontalLines = horizontalLines;
    this.allowToggleLegend = allowToggleLegend;
    this.allowToggleLabelAuto = allowToggleLabelAuto;
    this.allowToggleTooltip = allowToggleTooltip;
  }

  showScrollMessage() {
    if (this.scrollable && "canvas" in this) {
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
  font: string = DEFAULT_LEGEND_FONT,
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
