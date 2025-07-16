import { SmoothieChart, TimeSeries } from "smoothie";
import { CustomSmoothie } from "./CustomSmoothie";
import { CalcCascades, IirFilter } from "fili";
import { PolarH10 } from "./PolarH10";
import {
  DEFAULT_EXG_LINE_CHART_OPTION,
  DEFAULT_ACC_LINE_CHART_OPTION,
  AAC_LOWPASS_CUTOFF_HZ,
  AAC_LOWPASS_ORDER,
  EXG_PRESENTATION_OPTIONS,
  X_AXIS_PRESENTATION_OPTIONS,
  Y_AXIS_PRESENTATION_OPTIONS,
  Z_AXIS_PRESENTATION_OPTIONS,
  X_LP_AXIS_PRESENTATION_OPTIONS,
  Y_LP_AXIS_PRESENTATION_OPTIONS,
  Z_LP_AXIS_PRESENTATION_OPTIONS,
  RHO_AXIS_PRESENTATION_OPTIONS,
  PHI_AXIS_PRESENTATION_OPTIONS,
  THETA_AXIS_PRESENTATION_OPTIONS,
  EXG_HP_PRESENTATION_OPTIONS,
  PolarH10Data,
  EXG_RMS_PRESENTATION_OPTIONS,
  EXG_RMS_WINDOW_MS,
  EXG_RMS_WINDOW_SIZE,
  EXG_STREAM_DELAY_MS,
  EXG_RMS_MIN,
  EXG_RMS_MAX,
  EXG_RMS_HIGHPASS_CUTOFF_HZ,
  EXG_RMS_HIGHPASS_ORDER,
  EXG_SAMPLE_RATE_HZ,
  ACC_STREAM_DELAY_MS,
  ACC_RANGE_G,
  ACC_SAMPLE_RATE_HZ,
  EXG_HP_MIN,
  EXG_HP_MAX,
  ACC_MIN,
  ACC_MAX,
  SCROLL_LEGENT_DISP_TIME_MS,
  BODY_PARTS,
  LOW_BATT_LVL,
} from "./consts";

// let polarRowID = 0;
const IIRCalc = new CalcCascades();
const DPR = window.devicePixelRatio;

export const PolarVisRows: PolarVisRow[] = [];

export async function createPolarVisRow(
  content: HTMLElement,
  device: BluetoothDevice,
) {
  const row = new PolarVisRow(content, device);
  await row.init();
  PolarVisRows.push(row);
}

class PolarVisRow {
  static polarRowID: number = 0;
  device: BluetoothDevice;
  polarH10: PolarH10;
  deviceName: string;
  battLvl: number;
  parent: HTMLElement;
  polarSensorDiv: HTMLDivElement;
  optionDiv: HTMLDivElement;
  nameDiv: HTMLDivElement;
  loadingDiv: HTMLDivElement;
  disconnectDiv: HTMLDivElement;
  dataInfo: HTMLDivElement;
  bodypartLabel: HTMLDivElement;
  bodypartSelectDiv: HTMLDivElement;
  bodypartSelect: HTMLSelectElement;
  dataCtrl: HTMLDivElement;
  visContainerDiv: HTMLDivElement;
  EXGCtrlDiv: HTMLDivElement;
  ACCCtrlDiv: HTMLDivElement;

  EXG_HP_MIN: number = EXG_HP_MIN;
  EXG_HP_MAX: number = EXG_HP_MAX;
  EXG_RMS_MIN: number = EXG_RMS_MIN;
  EXG_RMS_MAX: number = EXG_RMS_MAX;
  ACC_MIN: number = ACC_MIN;
  ACC_MAX: number = ACC_MAX;

  EXGFormSelect: HTMLSelectElement;
  EXGSwitchInput: HTMLInputElement;
  EXGDropDown: HTMLDivElement;
  ACCFormSelect: HTMLSelectElement;
  ACCSwitchInput: HTMLInputElement;
  ACCDropDown: HTMLDivElement;

  ECGDiv: HTMLElement | undefined = undefined;
  ACCDiv: HTMLElement | undefined = undefined;

  ecg_resize: (() => void) | undefined = undefined;
  ecg_chart: CustomSmoothie | undefined = undefined;
  ecg_ts: TimeSeries | undefined = undefined;
  ecg_hp_ts: TimeSeries | undefined = undefined;
  ecg_rms_win: Float64Array | undefined = undefined;
  ecg_rms_win_i = 0;
  ecg_rms_ts: TimeSeries | undefined = undefined;
  ecg_resize_observer: ResizeObserver | undefined = undefined;
  ecg_rms_iir_coef = undefined;
  ecg_rms_iir: IirFilter | undefined = undefined;
  ecg_canvas: HTMLCanvasElement | undefined = undefined;

  acc_resize: (() => void) | undefined = undefined;
  acc_chart: CustomSmoothie | undefined = undefined;
  acc_x_ts: TimeSeries | undefined = undefined;
  acc_y_ts: TimeSeries | undefined = undefined;
  acc_z_ts: TimeSeries | undefined = undefined;
  acc_x_lp_ts: TimeSeries | undefined = undefined;
  acc_y_lp_ts: TimeSeries | undefined = undefined;
  acc_z_lp_ts: TimeSeries | undefined = undefined;
  acc_rho_ts: TimeSeries | undefined = undefined;
  acc_phi_ts: TimeSeries | undefined = undefined;
  acc_theta_ts: TimeSeries | undefined = undefined;
  acc_resize_observer: ResizeObserver | undefined = undefined;
  acc_canvas: HTMLCanvasElement | undefined = undefined;
  acc_iir_coef = undefined;
  acc_x_iir: IirFilter | undefined = undefined;
  acc_y_iir: IirFilter | undefined = undefined;
  acc_z_iir: IirFilter | undefined = undefined;

  newECGCallback: (data: PolarH10Data) => void;
  newACCCallback: (data: PolarH10Data) => void;

  constructor(content: HTMLElement, device: BluetoothDevice) {
    if (device.name === undefined) {
      throw new Error("Invalid Bluetooth device! Missing name");
    }
    this.parent = content;
    this.device = device;
    this.deviceName = this.device?.name?.substring(10) || "";
    this.newECGCallback = this._newECGCallback.bind(this);
    this.newACCCallback = this._newACCCallback.bind(this);
  }

  async init() {
    try {
      await this.initPolarH10();
      await this.initDeviceInfo();
      await this.initDeviceGraphCtrl();
    } catch (err) {
      this.disconnectPolarH10();
      alert(err);
    }

    PolarVisRow.polarRowID += 1;
  }

  private async initPolarH10() {
    this.polarSensorDiv = createDiv(`polarSensorDiv`, this.parent, [
      "polar-sensor-row",
      "flexbox",
    ]);
    this.optionDiv = createDiv(`optionDiv`, this.polarSensorDiv, [
      "polar-sensor-left-panel",
      "center",
    ]);

    this.nameDiv = createDiv(
      `device-name-batt`,
      this.optionDiv,
      ["center", "flexbox"],
      `Conneting ${this.deviceName}...`,
    );
    this.loadingDiv = createDiv("ConnectLoading", this.optionDiv, [
      "loading",
      "loading-lg",
      "full-width",
      "flexbox",
    ]);

    try {
      this.polarH10 = new PolarH10(this.device);
      await this.polarH10.init();
    } catch (err) {
      console.log(err);
      alert(err);
      if (this.parent.contains(this.polarSensorDiv)) {
        this.parent.removeChild(this.polarSensorDiv);
      }
      throw new Error("polarH10 device initialization failed!");
    }
  }

  async disconnectPolarH10(ev: any = undefined) {
    this.device.gatt?.disconnect();
    if (this.parent.contains(this.polarSensorDiv)) {
      this.parent.removeChild(this.polarSensorDiv);
    }
    if (this.ecg_chart !== undefined) {
      this.ecg_chart.stop();
    }
    if (this.ecg_resize_observer !== undefined) {
      this.ecg_resize_observer.disconnect();
    }
    if (this.ECGDiv !== undefined) {
      this.visContainerDiv?.removeChild(this.ECGDiv);
    }
    this.resetECG();

    if (this.acc_chart !== undefined) {
      this.acc_chart.stop();
    }
    if (this.acc_resize_observer !== undefined) {
      this.acc_resize_observer.disconnect();
    }
    if (this.ACCDiv !== undefined) {
      this.visContainerDiv?.removeChild(this.ACCDiv);
    }
    this.resetACC();
  }

  resetECG() {
    this.ecg_canvas = undefined;
    this.ECGDiv = undefined;
    this.ecg_resize = undefined;
    this.ecg_rms_win = undefined;
    this.ecg_chart = undefined;
    this.ecg_ts = undefined;
    this.ecg_hp_ts = undefined;
    this.ecg_rms_ts = undefined;
    this.ecg_resize_observer = undefined;
    this.ecg_rms_iir_coef = undefined;
    this.ecg_rms_iir = undefined;
    this.ecg_rms_win_i = 0;
  }

  resetACC() {
    this.ACCDiv = undefined;
    this.acc_resize = undefined;
    this.acc_canvas = undefined;
    this.acc_chart = undefined;
    this.acc_x_ts = undefined;
    this.acc_y_ts = undefined;
    this.acc_z_ts = undefined;
    this.acc_resize_observer = undefined;
    this.acc_iir_coef = undefined;
    this.acc_x_iir = undefined;
    this.acc_y_iir = undefined;
    this.acc_z_iir = undefined;
    this.acc_x_lp_ts = undefined;
    this.acc_y_lp_ts = undefined;
    this.acc_z_lp_ts = undefined;
    this.acc_rho_ts = undefined;
    this.acc_phi_ts = undefined;
    this.acc_theta_ts = undefined;
  }

  private async initDeviceInfo() {
    this.disconnectDiv = createDiv("disconnectDiv", undefined, [
      "flexbox",
      "disconnect",
    ]);

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
      "tooltip-top",
    );
    this.disconnectDiv.appendChild(disBtn);
    disBtn.addEventListener("click", this.disconnectPolarH10.bind(this));

    this.battLvl = await this.polarH10.getBatteryLevel();
    this.optionDiv.removeChild(this.loadingDiv);
    this.optionDiv.removeChild(this.nameDiv);
    this.optionDiv.classList.remove("center");

    this.nameDiv.textContent = "";
    this.nameDiv.classList.add("flex");
    const deviceNameDiv = document.createElement("div");
    deviceNameDiv.textContent = this.deviceName;
    deviceNameDiv.classList.add("padright-5px", "flexbox");
    this.nameDiv.appendChild(deviceNameDiv);
    let battStr: string;
    if (this.battLvl > LOW_BATT_LVL) {
      battStr = `🔋${this.battLvl}%`;
    } else {
      battStr = `🪫${this.battLvl}%`;
    }
    const battLvlDiv = document.createElement("div");
    battLvlDiv.textContent = battStr;
    battLvlDiv.classList.add("flexbox");
    this.nameDiv.appendChild(battLvlDiv);
    this.nameDiv.classList.add("flexbox");
    this.optionDiv.appendChild(this.disconnectDiv);
    this.optionDiv.appendChild(this.nameDiv);

    this.dataInfo = createDiv("dataInfo", this.optionDiv, [
      "left",
      "full-width",
      "flexbox",
    ]);

    this.bodypartLabel = createDiv(
      "bodypartLabel",
      this.dataInfo,
      ["half-width", "center"],
      "Bodypart:",
    );

    this.bodypartSelectDiv = createDiv("bodypartSelectDiv", this.dataInfo, [
      "half-width",
    ]);

    this.bodypartSelect = createSelect(
      "bodypartSelect",
      this.bodypartSelectDiv,
      ["form-select", "dark-select", "select-sm", "almost-full-width"],
      "",
      BODY_PARTS,
      getPolarRowId,
    );

    this.dataCtrl = createDiv("dataCtrl", this.optionDiv, [
      "left",
      "full-width",
      "flexbox",
    ]);
    this.visContainerDiv = createDiv("visContainer", this.polarSensorDiv, [
      "full-width",
      "full-height",
    ]);
  }

  private async initDeviceGraphCtrl() {
    this.EXGCtrlDiv = createDiv("EXGCtrlDiv", this.dataCtrl, ["half-width"]);
    const EXG_switch = createSwitch("EXG", this.onToggleECG.bind(this));
    this.EXGCtrlDiv.appendChild(EXG_switch);
    this.EXGSwitchInput = EXG_switch.children.item(0) as HTMLInputElement;
    this.EXGDropDown = createDiv("EXGDropDownDiv", this.EXGCtrlDiv, [
      "form-group",
    ]);
    this.EXGFormSelect = createSelect(
      "EXGFormSelect",
      this.EXGDropDown,
      ["form-select", "dark-select", "select-sm", "almost-full-width"],
      "",
      ["Raw", "Highpass", "RMS"],
    );
    this.EXGFormSelect.selectedIndex = 0;
    this.EXGFormSelect.onchange = this.changeEXGGraph.bind(this);

    this.ACCCtrlDiv = createDiv("ACCCtrlDiv", this.dataCtrl, ["half-width"]);
    const ACC_switch = createSwitch("ACC", this.onToggleACC.bind(this));
    this.ACCCtrlDiv.appendChild(ACC_switch);
    this.ACCSwitchInput = ACC_switch.children.item(0) as HTMLInputElement;
    this.ACCDropDown = createDiv("ACCDropDownDiv", this.ACCCtrlDiv, [
      "form-group",
    ]);
    this.ACCFormSelect = createSelect(
      "ACCFormSelect",
      this.ACCDropDown,
      ["form-select", "dark-select", "select-sm", "almost-full-width"],
      "",
      ["Raw", "Lowpass", "Tilt"],
    );
    this.ACCFormSelect.selectedIndex = 0;
    this.ACCFormSelect.onchange = this.changeACCGraph.bind(this);
  }

  async onToggleECG(ev: any) {
    this.ACCSwitchInput.disabled = true;

    if (ev.target?.checked) {
      let width_class: string;
      if (this.ACCDiv === undefined) {
        width_class = "full-width";
      } else {
        width_class = "half-width";
        this.ACCDiv.classList.remove("full-width");
        this.ACCDiv.classList.add("half-width");
        this.visContainerDiv.removeChild(this.ACCDiv);
      }
      this.ECGDiv = createDiv("ECGDiv", this.visContainerDiv, [
        "float-left",
        "almost-full-height",
        width_class,
      ]);
      this.ECGDiv.addEventListener("wheel", this.onWheelECG.bind(this));
      if (this.ACCDiv !== undefined) {
        this.visContainerDiv.appendChild(this.ACCDiv);
      }
      this.ecg_canvas = createCanvas("ecg_canvas", this.ECGDiv);

      this.ecg_chart = new CustomSmoothie(DEFAULT_EXG_LINE_CHART_OPTION);
      this.ecg_ts = new TimeSeries();
      this.ecg_chart.addTimeSeries(this.ecg_ts, EXG_PRESENTATION_OPTIONS);
      this.ecg_chart.streamTo(this.ecg_canvas, EXG_STREAM_DELAY_MS);
      this.ecg_rms_ts = new TimeSeries();
      this.ecg_hp_ts = new TimeSeries();
      this.ecg_chart.addPostRenderCallback(exg_legend);
      this.ecg_rms_win = new Float64Array(EXG_RMS_WINDOW_SIZE);
      this.ecg_rms_win_i = 0;

      this.ecg_resize = resizeSmoothieGen(this.ecg_chart, 1, 1);
      this.ecg_resize_observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === this.ECGDiv && this.ecg_resize !== undefined) {
            this.ecg_resize();
          }
        }
      });
      this.ecg_resize_observer.observe(this.ECGDiv);
      this.ecg_rms_iir_coef = IIRCalc.highpass({
        order: EXG_RMS_HIGHPASS_ORDER,
        characteristic: "butterworth",
        Fs: EXG_SAMPLE_RATE_HZ,
        Fc: EXG_RMS_HIGHPASS_CUTOFF_HZ,
        preGain: false,
      });
      this.ecg_rms_iir = IirFilter(this.ecg_rms_iir_coef);
      this.ecg_resize();

      if (this.EXGFormSelect !== undefined) {
        this.EXGFormSelect.disabled = false;
        this.EXGFormSelect.selectedIndex = 0;
      }

      this.polarH10.addEventListener("ECG", this.newECGCallback);

      try {
        const startECGReply = await this.polarH10.startECG(EXG_SAMPLE_RATE_HZ);
        if (startECGReply) {
          console.log(startECGReply);
        }
      } catch (e) {
        console.log(e);
        this.disconnectPolarH10();
      }
    } else {
      if (
        this.ECGDiv !== undefined &&
        this.ecg_canvas !== undefined &&
        this.ecg_chart !== undefined
      ) {
        this.ecg_chart.stop();
        if (this.EXGFormSelect !== undefined) {
          this.EXGFormSelect.disabled = true;
          this.EXGFormSelect.selectedIndex = 0;
        }
        if (this.ECGDiv.contains(this.ecg_canvas)) {
          this.ACCDiv?.classList.remove("half-width");
          this.ACCDiv?.classList.add("full-width");
          const stopECGReply = await this.polarH10.stopECG();
          if (stopECGReply) {
            console.log(stopECGReply);
          }
          this.visContainerDiv.removeChild(this.ECGDiv);
          this.ecg_resize_observer?.disconnect();
          this.polarH10.removeEventListener("ECG", this.newECGCallback);
          this.resetECG();
        }
      }
    }
    if (this.ACCSwitchInput) {
      this.ACCSwitchInput.disabled = false;
    }
  }

  async onToggleACC(ev: any) {
    if (this.EXGSwitchInput) {
      this.EXGSwitchInput.disabled = true;
    }
    if (ev.target?.checked) {
      let width_class: string;
      if (this.ECGDiv === undefined) {
        width_class = "full-width";
      } else {
        width_class = "half-width";
        this.ECGDiv.classList.remove("full-width");
        this.ECGDiv.classList.add("half-width");
      }
      this.ACCDiv = createDiv("ACCDiv", this.visContainerDiv, [
        "float-left",
        "almost-full-height",
        width_class,
      ]);

      this.acc_canvas = createCanvas("acc_canvas", this.ACCDiv);

      this.acc_chart = new CustomSmoothie(DEFAULT_ACC_LINE_CHART_OPTION);
      this.acc_x_ts = new TimeSeries();
      this.acc_y_ts = new TimeSeries();
      this.acc_z_ts = new TimeSeries();
      this.acc_chart.addTimeSeries(this.acc_x_ts, X_AXIS_PRESENTATION_OPTIONS);
      this.acc_chart.addTimeSeries(this.acc_y_ts, Y_AXIS_PRESENTATION_OPTIONS);
      this.acc_chart.addTimeSeries(this.acc_z_ts, Z_AXIS_PRESENTATION_OPTIONS);
      this.acc_chart.streamTo(this.acc_canvas, ACC_STREAM_DELAY_MS);
      this.acc_chart.addPostRenderCallback(acc_legend);
      this.acc_chart.addPostRenderCallback(scroll_legend);
      setTimeout(() => {
        if (this.acc_chart) {
          this.acc_chart.removePostRenderCallback(scroll_legend);
        }
      }, SCROLL_LEGENT_DISP_TIME_MS);
      this.acc_x_lp_ts = new TimeSeries();
      this.acc_y_lp_ts = new TimeSeries();
      this.acc_z_lp_ts = new TimeSeries();
      this.acc_rho_ts = new TimeSeries();
      this.acc_phi_ts = new TimeSeries();
      this.acc_theta_ts = new TimeSeries();

      this.acc_resize = resizeSmoothieGen(this.acc_chart, 1, 1);
      this.acc_resize_observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === this.ACCDiv && this.acc_resize !== undefined) {
            this.acc_resize();
          }
        }
      });
      this.acc_resize_observer.observe(this.ACCDiv);
      this.acc_iir_coef = IIRCalc.lowpass({
        order: AAC_LOWPASS_ORDER,
        characteristic: "butterworth",
        Fs: ACC_SAMPLE_RATE_HZ,
        Fc: AAC_LOWPASS_CUTOFF_HZ,
        preGain: false,
      });
      this.acc_x_iir = IirFilter(this.acc_iir_coef);
      this.acc_y_iir = IirFilter(this.acc_iir_coef);
      this.acc_z_iir = IirFilter(this.acc_iir_coef);
      this.acc_resize();

      if (this.ACCFormSelect !== undefined) {
        this.ACCFormSelect.disabled = false;
        this.ACCFormSelect.selectedIndex = 0;
      }

      this.polarH10.addEventListener("ACC", this.newACCCallback);

      try {
        const startACCReply = await this.polarH10.startACC(
          ACC_RANGE_G,
          ACC_SAMPLE_RATE_HZ,
        );
        if (startACCReply) {
          console.log(startACCReply);
        }
      } catch (e) {
        console.log(e);
        this.disconnectPolarH10();
      }
    } else {
      if (
        this.ACCDiv !== undefined &&
        this.acc_canvas !== undefined &&
        this.acc_chart !== undefined
      ) {
        this.acc_chart.stop();
        if (this.ACCFormSelect !== undefined) {
          this.ACCFormSelect.disabled = true;
          this.ACCFormSelect.selectedIndex = 0;
        }
        if (this.ACCDiv.contains(this.acc_canvas)) {
          this.ACCDiv.removeChild(this.acc_canvas);
        }
        this.ECGDiv?.classList.remove("half-width");
        this.ECGDiv?.classList.add("full-width");
        this.polarH10.removeEventListener("ACC", this.newACCCallback);
        this.visContainerDiv.removeChild(this.ACCDiv);
        this.acc_resize_observer?.disconnect();

        const stopACCReply = await this.polarH10.stopACC();
        if (stopACCReply) {
          console.log(stopACCReply);
        }
        this.resetACC();
      }
    }
    if (this.EXGSwitchInput) {
      this.EXGSwitchInput.disabled = false;
    }
  }

  changeEXGGraph(evt: any) {
    if (
      this.ecg_canvas !== undefined &&
      this.ecg_chart !== undefined &&
      this.ecg_ts !== undefined &&
      this.ecg_rms_ts !== undefined &&
      this.ecg_hp_ts !== undefined
    ) {
      // console.log(evt.target);
      const selected = evt.target.selectedIndex;
      this.ecg_chart.stop();
      switch (selected) {
        case 0: // "Raw":
          this.ecg_chart.removeTimeSeries(this.ecg_rms_ts);
          this.ecg_chart.removeTimeSeries(this.ecg_hp_ts);
          this.ecg_chart.addTimeSeries(this.ecg_ts, EXG_PRESENTATION_OPTIONS);
          this.ecg_chart.options.minValue = undefined;
          this.ecg_chart.options.maxValue = undefined;
          this.ecg_chart.updateValueRange();
          if (this.ecg_chart.options.title) {
            this.ecg_chart.options.title.text =
              DEFAULT_EXG_LINE_CHART_OPTION.title?.text;
          }

          if (
            this.ecg_chart.removePostRenderCallback(exg_rms_legend).length ||
            this.ecg_chart.removePostRenderCallback(exg_hp_legend).length
          ) {
            this.ecg_chart.addPostRenderCallback(exg_legend);
          }

          break;
        case 1: // "Highpass":
          this.ecg_chart.removeTimeSeries(this.ecg_ts);
          this.ecg_chart.removeTimeSeries(this.ecg_rms_ts);
          this.ecg_chart.addTimeSeries(
            this.ecg_hp_ts,
            EXG_HP_PRESENTATION_OPTIONS,
          );
          this.ecg_chart.options.minValue = this.EXG_HP_MIN;
          this.ecg_chart.options.maxValue = this.EXG_HP_MAX;
          this.ecg_chart.updateValueRange();
          if (this.ecg_chart.options.title) {
            this.ecg_chart.options.title.text = `Highpass (${EXG_RMS_HIGHPASS_CUTOFF_HZ}Hz ${EXG_RMS_HIGHPASS_ORDER}th order Butterworth) on ECG/EMG raw`;
          }
          if (
            this.ecg_chart.removePostRenderCallback(exg_legend).length ||
            this.ecg_chart.removePostRenderCallback(exg_rms_legend).length
          ) {
            this.ecg_chart.addPostRenderCallback(exg_hp_legend);
            this.ecg_chart.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (this.ecg_chart) {
                this.ecg_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }
          break;
        case 2: //"RMS":
          this.ecg_chart.removeTimeSeries(this.ecg_ts);
          this.ecg_chart.removeTimeSeries(this.ecg_hp_ts);
          this.ecg_chart.addTimeSeries(
            this.ecg_rms_ts,
            EXG_RMS_PRESENTATION_OPTIONS,
          );
          this.ecg_chart.options.minValue = this.EXG_RMS_MIN;
          this.ecg_chart.options.maxValue = this.EXG_RMS_MAX;
          this.ecg_chart.updateValueRange();
          if (this.ecg_chart.options.title) {
            this.ecg_chart.options.title.text = `RMS (Highpass on ECG/EMG raw)`;
          }
          if (
            this.ecg_chart.removePostRenderCallback(exg_legend).length ||
            this.ecg_chart.removePostRenderCallback(exg_hp_legend).length
          ) {
            this.ecg_chart.addPostRenderCallback(exg_rms_legend);
            this.ecg_chart.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (this.ecg_chart) {
                this.ecg_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }
          break;
      }
      this.ecg_chart.start();
    }
  }

  changeACCGraph(evt: any) {
    if (
      this.acc_canvas !== undefined &&
      this.acc_chart !== undefined &&
      this.acc_x_ts !== undefined &&
      this.acc_y_ts !== undefined &&
      this.acc_z_ts !== undefined &&
      this.acc_x_lp_ts !== undefined &&
      this.acc_y_lp_ts !== undefined &&
      this.acc_z_lp_ts !== undefined &&
      this.acc_rho_ts !== undefined &&
      this.acc_phi_ts !== undefined &&
      this.acc_theta_ts !== undefined
    ) {
      const selected = evt.target.selectedIndex;
      this.acc_chart.stop();
      switch (selected) {
        case 0: //"Raw":
          this.acc_chart.removeTimeSeries(this.acc_x_lp_ts);
          this.acc_chart.removeTimeSeries(this.acc_y_lp_ts);
          this.acc_chart.removeTimeSeries(this.acc_z_lp_ts);
          this.acc_chart.removeTimeSeries(this.acc_rho_ts);
          this.acc_chart.removeTimeSeries(this.acc_phi_ts);
          this.acc_chart.removeTimeSeries(this.acc_theta_ts);
          this.acc_chart.addTimeSeries(
            this.acc_x_ts,
            X_AXIS_PRESENTATION_OPTIONS,
          );
          this.acc_chart.addTimeSeries(
            this.acc_y_ts,
            Y_AXIS_PRESENTATION_OPTIONS,
          );
          this.acc_chart.addTimeSeries(
            this.acc_z_ts,
            Z_AXIS_PRESENTATION_OPTIONS,
          );
          this.acc_chart.options.minValue = this.ACC_MIN;
          this.acc_chart.options.maxValue = this.ACC_MAX;
          this.acc_chart.updateValueRange();
          if (this.acc_chart.options.title) {
            this.acc_chart.options.title.text =
              DEFAULT_ACC_LINE_CHART_OPTION.title?.text;
          }
          if (this.acc_chart.options.labels) {
            this.acc_chart.options.labels.disabled = false;
          }
          this.acc_chart.options.horizontalLines = [];
          if (
            this.acc_chart.removePostRenderCallback(acc_lp_legend).length ||
            this.acc_chart.removePostRenderCallback(tilt_legend).length
          ) {
            this.acc_chart.addPostRenderCallback(acc_legend);
            this.acc_chart.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (this.acc_chart) {
                this.acc_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }

          break;
        case 1: //"Lowpass":
          this.acc_chart.removeTimeSeries(this.acc_x_ts);
          this.acc_chart.removeTimeSeries(this.acc_y_ts);
          this.acc_chart.removeTimeSeries(this.acc_z_ts);
          this.acc_chart.removeTimeSeries(this.acc_rho_ts);
          this.acc_chart.removeTimeSeries(this.acc_phi_ts);
          this.acc_chart.removeTimeSeries(this.acc_theta_ts);
          this.acc_chart.addTimeSeries(
            this.acc_x_lp_ts,
            X_LP_AXIS_PRESENTATION_OPTIONS,
          );
          this.acc_chart.addTimeSeries(
            this.acc_y_lp_ts,
            Y_LP_AXIS_PRESENTATION_OPTIONS,
          );
          this.acc_chart.addTimeSeries(
            this.acc_z_lp_ts,
            Z_LP_AXIS_PRESENTATION_OPTIONS,
          );
          this.acc_chart.options.minValue = this.ACC_MIN;
          this.acc_chart.options.maxValue = this.ACC_MAX;
          this.acc_chart.updateValueRange();
          if (this.acc_chart.options.title) {
            this.acc_chart.options.title.text = `Lowpass (${AAC_LOWPASS_CUTOFF_HZ}Hz ${AAC_LOWPASS_ORDER}th order Butterworth) on Accelerometer raw`;
          }
          if (this.acc_chart.options.labels) {
            this.acc_chart.options.labels.disabled = false;
          }

          this.acc_chart.options.horizontalLines = [];

          if (
            this.acc_chart.removePostRenderCallback(acc_legend).length ||
            this.acc_chart.removePostRenderCallback(tilt_legend).length
          ) {
            this.acc_chart.addPostRenderCallback(acc_lp_legend);
            this.acc_chart?.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (this.acc_chart) {
                this.acc_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }

          break;
        case 2: //"Tilt":
          this.acc_chart.removeTimeSeries(this.acc_x_ts);
          this.acc_chart.removeTimeSeries(this.acc_y_ts);
          this.acc_chart.removeTimeSeries(this.acc_z_ts);
          this.acc_chart.removeTimeSeries(this.acc_x_lp_ts);
          this.acc_chart.removeTimeSeries(this.acc_y_lp_ts);
          this.acc_chart.removeTimeSeries(this.acc_z_lp_ts);
          this.acc_chart.addTimeSeries(
            this.acc_rho_ts,
            RHO_AXIS_PRESENTATION_OPTIONS,
          );
          this.acc_chart.addTimeSeries(
            this.acc_phi_ts,
            PHI_AXIS_PRESENTATION_OPTIONS,
          );
          this.acc_chart.addTimeSeries(
            this.acc_theta_ts,
            THETA_AXIS_PRESENTATION_OPTIONS,
          );
          this.acc_chart.options.minValue = -140;
          this.acc_chart.options.maxValue = 140;
          if (this.acc_chart.options.title) {
            this.acc_chart.options.title.text = `Tilt angle [-90°, 90°] from lowpass on accelerometer raw`;
          }
          if (this.acc_chart.options.labels) {
            this.acc_chart.options.labels.disabled = true;
          }
          this.acc_chart.options.horizontalLines = [
            { value: 90, color: "#ffffff7f", lineWidth: 1 },
            { value: -90, color: "#ffffff7f", lineWidth: 1 },
          ];

          if (
            this.acc_chart.removePostRenderCallback(acc_legend).length ||
            this.acc_chart.removePostRenderCallback(acc_lp_legend).length
          ) {
            this.acc_chart.addPostRenderCallback(tilt_legend);
          }
          break;
      }
      this.acc_chart.start();
    }
  }

  private _newECGCallback(data: PolarH10Data) {
    if (
      this.ecg_ts !== undefined &&
      this.ecg_rms_ts !== undefined &&
      this.ecg_hp_ts !== undefined &&
      data.prev_sample_timestamp_ms > 0 &&
      data.samples !== undefined &&
      this.ecg_rms_iir !== undefined
    ) {
      const estimated_sample_interval =
        (data.sample_timestamp_ms - data.prev_sample_timestamp_ms) /
        data.samples.length;
      for (let s_i = 0; s_i < data.samples.length; s_i++) {
        const timestamp =
          data.event_time_offset_ms +
          data.prev_sample_timestamp_ms +
          estimated_sample_interval * (s_i + 1);

        const data_i = (data.samples as Int32Array)[s_i];
        const data_i_timeout_ms = s_i * estimated_sample_interval;

        tsUpdate(this.ecg_ts, data_i, timestamp, data_i_timeout_ms);

        const filtered_data_i = this.ecg_rms_iir.singleStep(data_i);
        tsUpdate(this.ecg_hp_ts, filtered_data_i, timestamp, data_i_timeout_ms);

        if (this.ecg_rms_win !== undefined) {
          if (this.ecg_rms_win_i < EXG_RMS_WINDOW_SIZE) {
            this.ecg_rms_win[this.ecg_rms_win_i] = filtered_data_i;
            this.ecg_rms_win_i++;
          } else {
            this.ecg_rms_win.set(this.ecg_rms_win.subarray(1));
            this.ecg_rms_win[EXG_RMS_WINDOW_SIZE - 1] = filtered_data_i;
            const data_rms_i = rms(this.ecg_rms_win);
            tsUpdate(this.ecg_rms_ts, data_rms_i, timestamp, data_i_timeout_ms);
          }
        }
      }
    }
  }

  private _newACCCallback(data: PolarH10Data) {
    if (
      this.acc_x_ts !== undefined &&
      this.acc_y_ts !== undefined &&
      this.acc_z_ts !== undefined &&
      this.acc_x_lp_ts !== undefined &&
      this.acc_y_lp_ts !== undefined &&
      this.acc_z_lp_ts !== undefined &&
      data.prev_sample_timestamp_ms > 0 &&
      data.samples !== undefined &&
      this.acc_x_iir !== undefined &&
      this.acc_y_iir !== undefined &&
      this.acc_z_iir !== undefined &&
      this.acc_rho_ts !== undefined &&
      this.acc_phi_ts !== undefined &&
      this.acc_theta_ts !== undefined
    ) {
      const estimated_sample_interval =
        (data.sample_timestamp_ms - data.prev_sample_timestamp_ms) /
        (data.samples.length / 3);
      for (let s_i = 0; s_i < data.samples.length; s_i += 3) {
        const frameNum = Math.floor(s_i / 3);
        const timestamp =
          data.event_time_offset_ms +
          data.prev_sample_timestamp_ms +
          estimated_sample_interval * (frameNum + 1);
        const data_i_timeout_ms = frameNum * estimated_sample_interval;
        const y_d = -(data.samples as Int16Array)[s_i];
        const x_d = -(data.samples as Int16Array)[s_i + 1];
        const z_d = (data.samples as Int16Array)[s_i + 2];
        tsUpdate(this.acc_x_ts, x_d, timestamp, data_i_timeout_ms);
        tsUpdate(this.acc_y_ts, y_d, timestamp, data_i_timeout_ms);
        tsUpdate(this.acc_z_ts, z_d, timestamp, data_i_timeout_ms);
        const x_lp_d = this.acc_x_iir.singleStep(x_d);
        const y_lp_d = this.acc_y_iir.singleStep(y_d);
        const z_lp_d = this.acc_z_iir.singleStep(z_d);
        tsUpdate(this.acc_x_lp_ts, x_lp_d, timestamp, data_i_timeout_ms);
        tsUpdate(this.acc_y_lp_ts, y_lp_d, timestamp, data_i_timeout_ms);
        tsUpdate(this.acc_z_lp_ts, z_lp_d, timestamp, data_i_timeout_ms);
        const rho =
          (Math.atan(x_lp_d / Math.sqrt(y_lp_d * y_lp_d + z_lp_d * z_lp_d)) /
            Math.PI) *
          180;
        const phi =
          (Math.atan(y_lp_d / Math.sqrt(x_lp_d * x_lp_d + z_lp_d * z_lp_d)) /
            Math.PI) *
          180;
        const theta =
          (Math.atan(Math.sqrt(x_lp_d * x_lp_d + y_lp_d * y_lp_d) / z_lp_d) /
            Math.PI) *
          180;
        tsUpdate(this.acc_rho_ts, rho, timestamp, data_i_timeout_ms);
        tsUpdate(this.acc_phi_ts, phi, timestamp, data_i_timeout_ms);
        tsUpdate(this.acc_theta_ts, theta, timestamp, data_i_timeout_ms);
      }
    }
  }

  onWheelECG(ev: any) {
    if (this.ecg_chart !== undefined) {
      let delta = 0;
      if (ev.deltaY < 0) {
        delta = 1;
      } else if (ev.deltaY > 0) {
        delta = -1;
      }
      switch (this.EXGFormSelect?.selectedIndex) {
        case 0:
          break;
        case 1:
          ev.preventDefault();
          this.EXG_HP_MAX += delta;
          this.EXG_HP_MIN -= delta;
          if (
            this.EXG_HP_MAX < 5 ||
            this.EXG_HP_MAX <= this.EXG_HP_MIN ||
            this.EXG_HP_MAX / 2 > EXG_HP_MAX
          ) {
            this.EXG_HP_MAX -= delta;
            this.EXG_HP_MIN += delta;
          }
          this.ecg_chart.options.minValue = this.EXG_HP_MIN;
          this.ecg_chart.options.maxValue = this.EXG_HP_MAX;
          break;
        case 2:
          ev.preventDefault();
          this.EXG_RMS_MAX += delta;
          if (
            this.EXG_RMS_MAX < 5 ||
            this.EXG_RMS_MAX <= this.EXG_RMS_MIN ||
            this.EXG_RMS_MAX / 2 > EXG_RMS_MAX
          ) {
            this.EXG_RMS_MAX -= delta;
          }
          this.ecg_chart.options.maxValue = this.EXG_RMS_MAX;

          break;
      }
    }
  }

  onWheelACC(ev: any) {
    if (this.acc_chart !== undefined) {
      let delta = 0;
      switch (this.ACCFormSelect?.selectedIndex) {
        case 0:
        case 1:
          ev.preventDefault();
          if (ev.deltaY < 0) {
            delta = 10;
          } else if (ev.deltaY > 0) {
            delta = -10;
          }
          this.ACC_MAX += delta;
          this.ACC_MIN -= delta;
          if (
            this.ACC_MAX < 100 ||
            this.ACC_MAX <= this.ACC_MIN ||
            this.ACC_MAX / 2 > ACC_MAX
          ) {
            this.ACC_MAX -= delta;
            this.ACC_MIN += delta;
          }
          this.acc_chart.options.minValue = this.ACC_MIN;
          this.acc_chart.options.maxValue = this.ACC_MAX;
          break;
        case 2:
          break;
      }
    }
  }
}

function resizeSmoothieGen(
  chart: SmoothieChart,
  widthRatio: number,
  heightRatio: number,
  verbose: boolean = false,
) {
  const resize = () => {
    const canvas: any = (chart as any).canvas;
    const parent: HTMLElement = canvas.parentNode;
    let width = parent.offsetWidth;
    let height = parent.offsetHeight;
    const new_width = width * widthRatio;
    const new_height = height * heightRatio;
    canvas.width = new_width - 5;
    canvas.height = new_height;
    if (verbose) {
      console.log(
        `Resize at ${new Date().valueOf()} parent: ${parent.id} ${parent.offsetWidth} ${canvas.width} ${parent.offsetHeight} ${canvas.height}`,
      );
    }
  };
  return resize;
}

function createSwitch(
  labeltext: string,
  eventHandler: (ev: Event) => void,
  idGenerator: () => number = getPolarRowId,
) {
  const label = document.createElement("label");
  label.setAttribute("class", "form-switch");
  label.classList.add("label-sm");
  const input = document.createElement("input");
  input.id = `${labeltext}-onoff-${idGenerator()}`;
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

function scroll_legend(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.font = "16px Arial";
    if (EXG_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = "#fbfbfb";
    }

    ctx.fillText("Scroll to change y-range", canvas.width / DPR / 2, 20);
    ctx.restore();
  }
}

function exg_legend(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (EXG_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = EXG_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― Raw EXG (μV)", 10, 5);
    ctx.restore();
  }
}

function exg_rms_legend(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (EXG_RMS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = EXG_RMS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText(
      `― Highpass raw EXG ${EXG_RMS_WINDOW_MS} ms window RMS (μV)`,
      10,
      5,
    );
    ctx.restore();
  }
}

function exg_hp_legend(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (EXG_HP_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = EXG_HP_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText(`― Highpass raw EXG (μV)`, 10, 5);
    ctx.restore();
  }
}

function acc_legend(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (X_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = X_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― X-axis (mG)", 10, 5);

    if (Y_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = Y_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― Y-axis (mG)", 110, 5);

    if (Z_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = Z_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― Z-axis (mG)", 210, 5);

    ctx.restore();
  }
}

function tilt_legend(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (RHO_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = RHO_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― ρ° ∠(X-axis, Horizon)", 10, 5);

    if (PHI_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = PHI_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― ϕ° ∠(Y-axis, Horizon)", 170, 5);

    if (THETA_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = THETA_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― θ° ∠(Z-axis, -Gravity)", 330, 5);

    ctx.restore();
  }
}

function acc_lp_legend(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (X_LP_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = X_LP_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― Lowpass X axis (mG)", 10, 5);

    if (Y_LP_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = Y_LP_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― Lowpass Y axis (mG)", 170, 5);

    if (Z_LP_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = Z_LP_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― Lowpass Z axis (mG)", 330, 5);

    ctx.restore();
  }
}

function rms(arr: Array<number> | Float64Array | Float32Array) {
  const squares = arr.map((e: number) => e * e);
  let sum = 0;
  for (let i = 0; i < squares.length; i++) {
    sum += squares[i];
  }
  return Math.sqrt(sum / arr.length);
}

function tsUpdate(
  ts: TimeSeries,
  val: number,
  timestamp_ms: number,
  delay_ms: number,
) {
  setTimeout(() => {
    ts.append(timestamp_ms, val);
  }, delay_ms);
}

function createSelect(
  id: string,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
  options: string[] = [],
  idGenerator: () => number = getPolarRowId,
) {
  const select = document.createElement("select");
  configureHTMLElement(select, id, parent, classList, textContent, idGenerator);
  addOptionsToSelect(select, options, idGenerator);
  return select;
}

function addOptionsToSelect(
  select: HTMLSelectElement,
  options: string[],
  idGenerator: () => number = getPolarRowId,
) {
  for (let i = 0; i < options.length; i++) {
    const option_str = options[i];
    const option: HTMLOptionElement = document.createElement("option");
    option.id = `${select.id}-${i}-${idGenerator()}`;
    option.textContent = option_str;
    select.appendChild(option);
  }
}

function createDiv(
  id: string,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
  idGenerator: () => number = getPolarRowId,
) {
  const myDiv = document.createElement("div");
  configureHTMLElement(myDiv, id, parent, classList, textContent, idGenerator);
  return myDiv;
}

function createCanvas(
  id: string,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
  idGenerator: () => number = getPolarRowId,
) {
  const myCanvas = document.createElement("canvas");
  configureHTMLElement(
    myCanvas,
    id,
    parent,
    classList,
    textContent,
    idGenerator,
  );
  return myCanvas;
}

function configureHTMLElement(
  e: HTMLElement,
  id: string,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
  idGenerator: () => number = getPolarRowId,
) {
  e.id = `${id}-${idGenerator()}`;
  if (parent) {
    parent.appendChild(e);
  }
  if (classList.length > 0) {
    e.classList.add(...classList);
  }
  if (textContent.length > 0) {
    e.textContent = textContent;
  }
  return e;
}

function getPolarRowId() {
  return PolarVisRow.polarRowID;
}
