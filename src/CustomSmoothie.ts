import { SmoothieChart, IChartOptions } from "smoothie";
export type PostRenderCallback = (
  canvas: HTMLCanvasElement,
  timestamp: number,
) => void;

export class CustomSmoothie extends SmoothieChart {
  postRender: PostRenderCallback[];
  constructor(option?: IChartOptions) {
    super(option);
    this.postRender = [];
  }

  override render(canvas, time) {
    super.render(canvas, time);
    const ts = Date.now()
    const last_render_time = (this as any).lastRenderTimeMillis
    if ((ts - last_render_time) < 2) {
      for (let i = 0; i < this.postRender.length; i++) {
        this.postRender[i](canvas, time);
      }
    }

  }

  addPostRenderCallback(callback: PostRenderCallback) {
    const i = this.postRender.indexOf(callback);
    if (i < 0) {
      this.postRender.push(callback);
    }
  }
  removePostRenderCallback(callback: PostRenderCallback) {
    const i = this.postRender.indexOf(callback);
    if (i > -1) {
      return this.postRender.splice(i, 1);
    } else {
      return [];
    }
  }
  clearPostRenderCallback() {
    this.postRender = [];
  }
}
