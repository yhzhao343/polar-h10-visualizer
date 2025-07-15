import { SmoothieChart, IChartOptions } from "smoothie";
type PostRenderCallback = (
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
    for (let callback of this.postRender) {
      callback(canvas, time);
    }
  }

  addPostRenderCallback = function (callback: PostRenderCallback) {
    const i = this.postRender.indexOf(callback);
    if (i < 0) {
      this.postRender.push(callback);
    }
  };
  removePostRenderCallback = function (callback: PostRenderCallback) {
    const i = this.postRender.indexOf(callback);
    if (i > -1) {
      return this.postRender.splice(i, 1);
    } else {
      return [];
    }
  };
}

// declare class CustomSmoothie extends SmoothieChart {
//   addPostRenderCallback(callback: PostRenderCallback);
//   removePostRenderCallback(callback: PostRenderCallback);
// }

// function CustomSmoothie(option?) {
//   SmoothieChart.call(this, option);
//   this.postRender = [];
// }
// CustomSmoothie.prototype = Object.create(SmoothieChart.prototype);
// CustomSmoothie.prototype.constructor = CustomSmoothie;
// CustomSmoothie.prototype.render = function (canvas, time) {
//   SmoothieChart.prototype.render.call(this, canvas, time);
//   for (let callback of this.postRender) {
//     callback(canvas, time);
//   }
// };

// CustomSmoothie.prototype.addPostRenderCallback = function (
//   callback: PostRenderCallback,
// ) {
//   const i = this.postRender.indexOf(callback);
//   if (i < 0) {
//     this.postRender.push(callback);
//   }
// };

// CustomSmoothie.prototype.removePostRenderCallback = function (
//   callback: PostRenderCallback,
// ) {
//   const i = this.postRender.indexOf(callback);
//   if (i > -1) {
//     return this.postRender.splice(i, 1);
//   } else {
//     return [];
//   }
// };

// export CustomSmoothie
