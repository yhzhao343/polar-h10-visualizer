import {
  SmoothieChart,
  TimeSeries,
  ITimeSeriesPresentationOptions,
} from "smoothie";
import { CustomSmoothie, PostRenderCallback } from "./CustomSmoothie";
import { CalcCascades, IirFilter } from "fili";
import { PolarH10 } from "polar-h10";
import {
  SCROLL_MAX_LIMIT_FACTOR,
  EXG_DATA_OPTIONS,
  ACC_DATA_OPTIONS,
  DEFAULT_EXG_LINE_CHART_OPTION,
  DEFAULT_ACC_LINE_CHART_OPTION,
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
  EXG_RMS_PRESENTATION_OPTIONS,
  EXG_DELTA,
  MAG_PRESENTATION_OPTIONS,
  MAG_LP_PRESENTATION_OPTIONS,
  PolarH10Data,
  EXG_RMS_WINDOW_MS,
  EXG_RMS_WINDOW_SIZE,
  EXG_STREAM_DELAY_MS,
  EXG_RMS_MIN,
  EXG_RMS_MAX,
  EXG_HP_SCROLL_MIN,
  EXG_RMS_SCROLL_MIN,
  ACC_MAG_BP_MIN,
  ACC_MAG_BP_MAX,
  ACC_MAG_DELTA,
  EXG_RMS_HIGHPASS_CUTOFF_HZ,
  EXG_RMS_HIGHPASS_ORDER,
  AAC_LOWPASS_CUTOFF_HZ,
  AAC_LOWPASS_ORDER,
  AAC_MAG_LOWPASS_ORDER,
  AAC_MAG_BANDPASS_HIGH_CUT_HZ,
  AAC_MAG_BANDPASS_LOW_CUT_HZ,
  ACC_SCROLL_MIN,
  ACC_MAG_SCROLL_MIN,
  EXG_SAMPLE_RATE_HZ,
  ACC_STREAM_DELAY_MS,
  ACC_RANGE_G,
  ACC_SAMPLE_RATE_HZ,
  ACC_DELTA,
  EXG_HP_MIN,
  EXG_HP_MAX,
  ACC_MIN,
  ACC_MAX,
  SCROLL_LEGENT_DISP_TIME_MS,
  BODY_PARTS,
  LOW_BATT_LVL,
} from "./consts";

type ConfigGraphCallback = (
  showTimeserieses: TimeSeries[],
  showTimeserieOptions: ITimeSeriesPresentationOptions[],
  showPastRenderCallbacks: PostRenderCallback[],
  scrollable: boolean,
  minValue: number | undefined,
  maxValue: number | undefined,
  titleText: string,
  disableLabel: boolean,
  horizontalLines: any[],
) => void;

type ConditionChecker = (row: PolarVisRow) => boolean;

const IIRCalc = new CalcCascades();
const DPR = window.devicePixelRatio;

export async function createPolarVisRow(
  content: HTMLElement,
  device: BluetoothDevice,
) {
  const row = new PolarVisRow(content, device);
  await row.init();
}

class PolarVisRow {
  static polarRowID: number = 0;
  static polarVisRows: PolarVisRow[] = [];
  device: BluetoothDevice;
  polarH10: PolarH10;
  deviceName: string;
  battLvl: number;
  parent: HTMLElement;
  polarSensorDiv: HTMLDivElement;
  optionDiv: HTMLDivElement;
  deviceInfoDiv: HTMLDivElement;
  nameDiv: HTMLDivElement;
  loadingDiv: HTMLDivElement;
  disconnectDiv: HTMLDivElement;
  deviceNameDiv: HTMLDivElement;
  battLvlDiv: HTMLDivElement;
  dataInfo: HTMLDivElement;
  bodypartLabel: HTMLDivElement;
  bodypartSelectDiv: HTMLDivElement;
  bodypartSelect: HTMLSelectElement;
  dataCtrl: HTMLDivElement;
  rowOrder: HTMLDivElement;
  visContainerDiv: HTMLDivElement;
  EXGCtrlDiv: HTMLDivElement;
  ACCCtrlDiv: HTMLDivElement;
  order: number;

  EXG_HP_MIN: number = EXG_HP_MIN;
  EXG_HP_MAX: number = EXG_HP_MAX;
  EXG_RMS_MIN: number = EXG_RMS_MIN;
  EXG_RMS_MAX: number = EXG_RMS_MAX;
  ACC_MIN: number = ACC_MIN;
  ACC_MAX: number = ACC_MAX;
  ACC_MAG_BP_MIN: number = ACC_MAG_BP_MIN;
  ACC_MAG_BP_MAX: number = ACC_MAG_BP_MAX;

  orderUpBtn: HTMLButtonElement;
  orderDownBtn: HTMLButtonElement;
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
  ecg_ss_win: Float64Array | undefined = undefined;
  ecg_ss_win_i = 0;
  ecg_ss: number;
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
  acc_mag_ts: TimeSeries | undefined = undefined;
  acc_mag_bp_ts: TimeSeries | undefined = undefined;
  acc_resize_observer: ResizeObserver | undefined = undefined;
  acc_canvas: HTMLCanvasElement | undefined = undefined;
  acc_iir_coef = undefined;
  acc_mag_iir_coef = undefined;
  acc_x_iir: IirFilter | undefined = undefined;
  acc_y_iir: IirFilter | undefined = undefined;
  acc_z_iir: IirFilter | undefined = undefined;
  acc_mag_iir: IirFilter | undefined = undefined;
  configureEXGGraph: ConfigGraphCallback | undefined = undefined;
  configureACCGraph: ConfigGraphCallback | undefined = undefined;

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
      PolarVisRow.polarRowID += 1;
      PolarVisRow.polarVisRows.push(this);
    } catch (err) {
      this.disconnectPolarH10();
      alert(err);
    }
  }

  private removeSelf() {
    if (this.parent.contains(this.polarSensorDiv)) {
      this.parent.removeChild(this.polarSensorDiv);
    }
    const myInd = PolarVisRow.polarVisRows.indexOf(this);
    if (myInd > -1) {
      PolarVisRow.polarVisRows.splice(myInd, 1);
      if (PolarVisRow.polarVisRows.length > 0) {
        if (myInd === PolarVisRow.polarVisRows.length) {
          PolarVisRow.polarVisRows[myInd - 1].orderDownBtn.disabled = true;
        } else if (myInd === 0) {
          PolarVisRow.polarVisRows[0].orderUpBtn.disabled = true;
        }
        PolarVisRow.reOrderRows();
      }
    }
  }
  private static reOrderRows() {
    for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
      const row = PolarVisRow.polarVisRows[i];
      row.order = i;
      row.polarSensorDiv.style.order = i.toString();
    }
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
    this.order = PolarVisRow.polarVisRows.length;
    this.polarSensorDiv.style.order = this.order.toString();

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
    await this.initPolarH10IfUnique();
  }

  async disconnectPolarH10(ev: any = undefined) {
    this.removeSelf();
    if (this.ecg_chart !== undefined) {
      this.ecg_chart.stop();
    }
    if (this.ecg_resize_observer !== undefined) {
      this.ecg_resize_observer.disconnect();
    }
    if (this.ECGDiv !== undefined) {
      this.visContainerDiv?.removeChild(this.ECGDiv);

      this.polarH10.removeEventListener("ECG", this.newECGCallback);
      await this.stopECG();
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
      this.polarH10.removeEventListener("ACC", this.newACCCallback);
      await this.stopAcc();
    }
    this.resetACC();

    this.disconnectPolarH10IfAlone();
  }

  static includesDuplicate(
    self: PolarVisRow,
    key: string = "device",
    conditionCallback: ConditionChecker | undefined = undefined,
  ): number {
    let duplicateInd = -1;
    if (conditionCallback !== undefined) {
      for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
        let row = PolarVisRow.polarVisRows[i];
        if (row !== self && row[key] === self[key] && conditionCallback(row)) {
          duplicateInd = i;
          break;
        }
      }
    } else {
      for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
        let row = PolarVisRow.polarVisRows[i];
        if (row !== self && row[key] === self[key]) {
          duplicateInd = i;
          break;
        }
      }
    }

    return duplicateInd;
  }

  disconnectPolarH10IfAlone() {
    if (PolarVisRow.includesDuplicate(this, "device") === -1) {
      this.device.gatt?.disconnect();
    }
  }

  async initPolarH10IfUnique() {
    const duplicateInd = PolarVisRow.includesDuplicate(this, "device");
    if (duplicateInd < 0) {
      try {
        this.polarH10 = new PolarH10(this.device);
        await this.polarH10.init();
      } catch (err) {
        console.log(err);
        throw new Error("polarH10 device initialization failed!");
      }
    } else {
      this.polarH10 = PolarVisRow.polarVisRows[duplicateInd].polarH10;
    }
  }

  resetECG() {
    this.ecg_canvas = undefined;
    this.ECGDiv = undefined;
    this.ecg_resize = undefined;
    this.ecg_ss_win = undefined;
    this.ecg_chart = undefined;
    this.ecg_ts = undefined;
    this.ecg_hp_ts = undefined;
    this.ecg_rms_ts = undefined;
    this.ecg_resize_observer = undefined;
    this.ecg_rms_iir_coef = undefined;
    this.ecg_rms_iir = undefined;
    this.ecg_ss_win_i = 0;
    this.ecg_ss = 0;
    this.configureEXGGraph = undefined;
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
    this.acc_mag_iir_coef = undefined;
    this.acc_x_iir = undefined;
    this.acc_y_iir = undefined;
    this.acc_z_iir = undefined;
    this.acc_x_lp_ts = undefined;
    this.acc_y_lp_ts = undefined;
    this.acc_z_lp_ts = undefined;
    this.acc_mag_iir = undefined;
    this.acc_rho_ts = undefined;
    this.acc_phi_ts = undefined;
    this.acc_theta_ts = undefined;
    this.acc_mag_ts = undefined;
    this.acc_mag_bp_ts = undefined;
    this.configureACCGraph = undefined;
  }

  private async initDeviceInfo() {
    this.deviceInfoDiv = createDiv("deviceInfoDiv", this.optionDiv, [
      "device-info",
    ]);

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
    disBtn.onclick = this.disconnectPolarH10.bind(this);

    this.battLvl = await this.polarH10.getBatteryLevel();
    this.optionDiv.removeChild(this.loadingDiv);
    this.optionDiv.removeChild(this.nameDiv);
    this.optionDiv.classList.remove("center");

    this.nameDiv.textContent = "";
    this.nameDiv.classList.add("flex");
    this.deviceNameDiv = createDiv(
      "devicename",
      this.nameDiv,
      ["padright-5px", "flexbox"],
      this.deviceName,
    );

    let battStr: string;
    if (this.battLvl > LOW_BATT_LVL) {
      battStr = `🔋${this.battLvl}%`;
    } else {
      battStr = `🪫${this.battLvl}%`;
    }
    this.battLvlDiv = createDiv(
      "battLvl",
      this.nameDiv,
      ["flexbox", "mid-text"],
      battStr,
    );
    this.nameDiv.classList.add("flexbox");
    this.deviceInfoDiv.appendChild(this.disconnectDiv);
    this.deviceInfoDiv.appendChild(this.nameDiv);
    this.optionDiv.appendChild(this.deviceInfoDiv);

    this.dataInfo = createDiv("dataInfo", this.deviceInfoDiv, ["data-info"]);

    this.rowOrder = createDiv("rowOrder", this.optionDiv, ["row-order"]);

    this.orderUpBtn = document.createElement("button");
    const orderUpIcon = document.createElement("i");
    orderUpIcon.classList.add("icon", "icon-arrow-up");
    this.orderUpBtn.appendChild(orderUpIcon);

    this.orderUpBtn.setAttribute("data-tooltip", "Move up");
    this.orderUpBtn.classList.add(
      "btn",
      "btn-primary",
      "btn-sm",
      "tooltip",
      "tooltip-right",
    );
    this.rowOrder.appendChild(this.orderUpBtn);
    this.orderUpBtn.disabled = PolarVisRow.polarVisRows.length < 1;
    this.orderUpBtn.onclick = this.moveUp.bind(this);

    this.orderDownBtn = document.createElement("button");
    const orderDownIcon = document.createElement("i");
    orderDownIcon.classList.add("icon", "icon-arrow-down");
    this.orderDownBtn.appendChild(orderDownIcon);

    this.orderDownBtn.setAttribute("data-tooltip", "Move down");
    this.orderDownBtn.classList.add(
      "btn",
      "btn-primary",
      "btn-sm",
      "tooltip",
      "tooltip-right",
    );
    this.rowOrder.appendChild(this.orderDownBtn);
    this.orderDownBtn.disabled = true;

    if (PolarVisRow.polarVisRows.length > 0) {
      PolarVisRow.polarVisRows[
        PolarVisRow.polarVisRows.length - 1
      ].orderDownBtn.disabled = false;
    }
    this.orderDownBtn.onclick = this.moveDown.bind(this);

    this.bodypartLabel = createDiv(
      "bodypartLabel",
      this.dataInfo,
      ["bodypart-text"],
      "Bodypart:",
    );

    this.bodypartSelectDiv = createDiv("bodypartSelectDiv", this.dataInfo, [
      "bodypart-select",
    ]);

    this.bodypartSelect = createSelect(
      "bodypartSelect",
      this.bodypartSelectDiv,
      ["form-select", "dark-select", "select-sm", "almost-full-width"],
      "",
      BODY_PARTS,
      getPolarRowId,
    );

    this.dataCtrl = createDiv("dataCtrl", this.optionDiv, ["data-ctrl"]);
    this.visContainerDiv = createDiv("visContainer", this.polarSensorDiv, [
      "full-width-height",
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
      EXG_DATA_OPTIONS,
    );
    this.EXGFormSelect.selectedIndex = 0;
    this.EXGFormSelect.onchange = this.changeEXGGraph.bind(this);
    this.EXGFormSelect.disabled = true;

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
      ACC_DATA_OPTIONS,
    );
    this.ACCFormSelect.selectedIndex = 0;
    this.ACCFormSelect.onchange = this.changeACCGraph.bind(this);
    this.ACCFormSelect.disabled = true;
  }

  moveUp(ev: any) {
    this.order -= 1;
    this.polarSensorDiv.style.order = this.order.toString();
    const prevRow = PolarVisRow.polarVisRows[this.order];
    prevRow.order += 1;
    prevRow.polarSensorDiv.style.order = prevRow.order.toString();
    PolarVisRow.polarVisRows[this.order] = this;
    PolarVisRow.polarVisRows[prevRow.order] = prevRow;
    if (this.order === 0) {
      this.orderUpBtn.disabled = true;
      this.orderDownBtn.disabled = false;
      prevRow.orderUpBtn.disabled = false;
    } else if (this.order === PolarVisRow.polarVisRows.length - 2) {
      this.orderDownBtn.disabled = false;
    }
    if (prevRow.order === PolarVisRow.polarVisRows.length - 1) {
      prevRow.orderDownBtn.disabled = true;
      prevRow.orderUpBtn.disabled = false;
    }
  }

  moveDown(ev: any) {
    this.order += 1;
    this.polarSensorDiv.style.order = this.order.toString();
    const nextRow = PolarVisRow.polarVisRows[this.order];
    nextRow.order -= 1;
    nextRow.polarSensorDiv.style.order = nextRow.order.toString();
    PolarVisRow.polarVisRows[this.order] = this;
    PolarVisRow.polarVisRows[nextRow.order] = nextRow;

    if (this.order === PolarVisRow.polarVisRows.length - 1) {
      this.orderUpBtn.disabled = false;
      this.orderDownBtn.disabled = true;
      nextRow.orderDownBtn.disabled = false;
    } else if (this.order === 1) {
      this.orderUpBtn.disabled = false;
    }
    if (nextRow.order === 0) {
      nextRow.orderDownBtn.disabled = false;
      nextRow.orderUpBtn.disabled = true;
    }
  }

  async startECG(
    sampleRate: number = EXG_SAMPLE_RATE_HZ,
    addCallback: boolean = true,
  ) {
    const duplicateInd = PolarVisRow.includesDuplicate(this, "device", ECGIsOn);
    if (duplicateInd < 0) {
      try {
        const startECGReply = await this.polarH10.startECG(sampleRate);
        if (
          startECGReply?.error === "SUCCESS" ||
          startECGReply?.error === "ALREADY IN STATE"
        ) {
          if (addCallback) {
            this.polarH10.addEventListener("ECG", this.newECGCallback);
          }
        } else {
          console.log(startECGReply);
          this.disconnectPolarH10();
        }
      } catch (e) {
        alert(e);
        this.disconnectPolarH10();
      }
    } else {
      this.polarH10.addEventListener("ECG", this.newECGCallback);
    }
  }

  async stopECG() {
    const duplicateInd = PolarVisRow.includesDuplicate(this, "device", ECGIsOn);
    if (duplicateInd < 0) {
      try {
        const stopECGReply = await this.polarH10.stopECG();
        if (stopECGReply) {
          console.log(stopECGReply);
        }
      } catch (e) {
        console.log(e);
        alert(e);
      }
    }
  }

  async startACC(
    range: number = ACC_RANGE_G,
    sampleRate: number = ACC_SAMPLE_RATE_HZ,
    addCallback: boolean = true,
  ) {
    const duplicateInd = PolarVisRow.includesDuplicate(this, "device", ACCIsOn);
    if (duplicateInd < 0) {
      try {
        const startACCReply = await this.polarH10.startACC(range, sampleRate);
        if (
          startACCReply?.error === "SUCCESS" ||
          startACCReply?.error === "ALREADY IN STATE"
        ) {
          if (addCallback) {
            this.polarH10.addEventListener("ACC", this.newACCCallback);
          }
        } else {
          console.log(startACCReply);
          this.disconnectPolarH10();
        }
      } catch (e) {
        alert(e);
        this.disconnectPolarH10();
      }
    } else {
      this.polarH10.addEventListener("ACC", this.newACCCallback);
    }
  }

  async stopAcc() {
    const duplicateInd = PolarVisRow.includesDuplicate(this, "device", ACCIsOn);
    if (duplicateInd < 0) {
      try {
        const stopACCReply = await this.polarH10.stopACC();
        if (stopACCReply) {
          console.log(stopACCReply);
        }
      } catch (e) {
        console.log(e);
        alert(e);
      }
    }
  }

  ECGIsOn() {
    return this.ECGDiv !== undefined;
  }

  ACCIsOn() {
    return this.ACCDiv !== undefined;
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
      this.ecg_ss_win = new Float64Array(EXG_RMS_WINDOW_SIZE);
      this.ecg_ss_win_i = 0;
      this.ecg_ss = 0;

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

      this.configureEXGGraph = configTSforChartGen(
        this.ecg_chart,
        [this.ecg_ts, this.ecg_rms_ts, this.ecg_hp_ts],
        [exg_legend, exg_rms_legend, exg_hp_legend],
      );

      await this.startECG(EXG_SAMPLE_RATE_HZ);
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
          await this.stopECG();
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

      this.ACCDiv.addEventListener("wheel", this.onWheelACC.bind(this));

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
      this.acc_mag_ts = new TimeSeries();
      this.acc_mag_bp_ts = new TimeSeries();

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
      const AAC_MAG_BANDPASS_CENTER = Math.sqrt(
        AAC_MAG_BANDPASS_HIGH_CUT_HZ * AAC_MAG_BANDPASS_LOW_CUT_HZ,
      );
      const AAC_MAG_BANDPASS_BW =
        AAC_MAG_BANDPASS_HIGH_CUT_HZ - AAC_MAG_BANDPASS_LOW_CUT_HZ;
      this.acc_mag_iir_coef = IIRCalc.bandpass({
        order: AAC_MAG_LOWPASS_ORDER,
        characteristic: "butterworth",
        Fs: ACC_SAMPLE_RATE_HZ,
        BW: AAC_MAG_BANDPASS_BW,
        Fc: AAC_MAG_BANDPASS_CENTER,
        preGain: false,
      });
      this.acc_x_iir = IirFilter(this.acc_iir_coef);
      this.acc_y_iir = IirFilter(this.acc_iir_coef);
      this.acc_z_iir = IirFilter(this.acc_iir_coef);
      this.acc_mag_iir = IirFilter(this.acc_mag_iir_coef);
      this.acc_resize();

      this.configureACCGraph = configTSforChartGen(
        this.acc_chart,
        [
          this.acc_x_ts,
          this.acc_y_ts,
          this.acc_z_ts,
          this.acc_x_lp_ts,
          this.acc_y_lp_ts,
          this.acc_z_lp_ts,
          this.acc_rho_ts,
          this.acc_phi_ts,
          this.acc_theta_ts,
          this.acc_mag_ts,
          this.acc_mag_bp_ts,
        ],
        [
          acc_lp_legend,
          tilt_legend,
          acc_mag_legend,
          acc_mag_bp_legend,
          acc_legend,
        ],
      );

      if (this.ACCFormSelect !== undefined) {
        this.ACCFormSelect.disabled = false;
        this.ACCFormSelect.selectedIndex = 0;
      }

      await this.startACC(ACC_RANGE_G, ACC_SAMPLE_RATE_HZ);
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
        await this.stopAcc();

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
      this.ecg_hp_ts !== undefined &&
      this.configureEXGGraph !== undefined
    ) {
      const selected = evt.target.selectedIndex;
      let title: string = "";
      this.ecg_chart.stop();
      switch (selected) {
        case 0: // "Raw":
          title = DEFAULT_EXG_LINE_CHART_OPTION.title?.text || title;
          this.configureEXGGraph(
            [this.ecg_ts],
            [EXG_PRESENTATION_OPTIONS],
            [exg_legend],
            false,
            undefined,
            undefined,
            title,
            false,
            [],
          );
          break;
        case 1: // "Highpass":
          title = `Highpass (${EXG_RMS_HIGHPASS_CUTOFF_HZ}Hz ${EXG_RMS_HIGHPASS_ORDER}th order Butterworth) on ECG/EMG raw`;
          this.configureEXGGraph(
            [this.ecg_hp_ts],
            [EXG_HP_PRESENTATION_OPTIONS],
            [exg_hp_legend],
            true,
            this.EXG_HP_MIN,
            this.EXG_HP_MAX,
            title,
            false,
            [],
          );
          break;
        case 2: //"RMS":
          title = "RMS (Highpass on ECG/EMG raw)";
          this.configureEXGGraph(
            [this.ecg_rms_ts],
            [EXG_RMS_PRESENTATION_OPTIONS],
            [exg_rms_legend],
            true,
            this.EXG_RMS_MIN,
            this.EXG_RMS_MAX,
            title,
            false,
            [],
          );
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
      this.acc_theta_ts !== undefined &&
      this.acc_mag_ts !== undefined &&
      this.acc_mag_bp_ts !== undefined &&
      this.configureACCGraph !== undefined
    ) {
      const selected = evt.target.selectedIndex;
      let title = "";
      this.acc_chart.stop();
      switch (selected) {
        case 0: //"Raw":
          title = DEFAULT_ACC_LINE_CHART_OPTION.title?.text || title;
          this.configureACCGraph(
            [this.acc_x_ts, this.acc_y_ts, this.acc_z_ts],
            [
              X_AXIS_PRESENTATION_OPTIONS,
              Y_AXIS_PRESENTATION_OPTIONS,
              Z_AXIS_PRESENTATION_OPTIONS,
            ],
            [acc_legend],
            true,
            this.ACC_MIN,
            this.ACC_MAX,
            title,
            false,
            [],
          );
          break;
        case 1: //"Lowpass":
          title = `Lowpass (${AAC_LOWPASS_CUTOFF_HZ}Hz ${AAC_LOWPASS_ORDER}th order Butterworth) on Accelerometer raw`;
          this.configureACCGraph(
            [this.acc_x_lp_ts, this.acc_y_lp_ts, this.acc_z_lp_ts],
            [
              X_LP_AXIS_PRESENTATION_OPTIONS,
              Y_LP_AXIS_PRESENTATION_OPTIONS,
              Z_LP_AXIS_PRESENTATION_OPTIONS,
            ],
            [acc_lp_legend],
            true,
            this.ACC_MIN,
            this.ACC_MAX,
            title,
            false,
            [],
          );
          break;

        case 2: //"Tilt":
          title = "Tilt angle [-90°, 90°] from lowpass on accelerometer raw";
          this.configureACCGraph(
            [this.acc_rho_ts, this.acc_phi_ts, this.acc_theta_ts],
            [
              RHO_AXIS_PRESENTATION_OPTIONS,
              PHI_AXIS_PRESENTATION_OPTIONS,
              THETA_AXIS_PRESENTATION_OPTIONS,
            ],
            [tilt_legend],
            false,
            -140,
            140,
            title,
            true,
            [
              { value: 90, color: "#ffffff7f", lineWidth: 1 },
              { value: -90, color: "#ffffff7f", lineWidth: 1 },
            ],
          );
          break;

        case 3: //"Magnitude"
          title = "Accelerometer raw magnitude";
          this.configureACCGraph(
            [this.acc_mag_ts],
            [MAG_PRESENTATION_OPTIONS],
            [acc_mag_legend],
            false,
            undefined,
            undefined,
            title,
            false,
            [],
          );
          break;

        case 4: //"Mag Bandpass"
          title = `Bandpass (${AAC_MAG_BANDPASS_LOW_CUT_HZ}-${AAC_MAG_BANDPASS_HIGH_CUT_HZ}Hz ${AAC_MAG_LOWPASS_ORDER}th order Butterworth) on accelerometer raw magnitude`;
          this.configureACCGraph(
            [this.acc_mag_bp_ts],
            [MAG_LP_PRESENTATION_OPTIONS],
            [acc_mag_bp_legend],
            true,
            this.ACC_MAG_BP_MIN,
            this.ACC_MAG_BP_MAX,
            title,
            false,
            [],
          );
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
      const timeOffset =
        data.event_time_offset_ms +
        data.prev_sample_timestamp_ms +
        estimated_sample_interval;

      for (let s_i = 0; s_i < data.samples.length; s_i++) {
        const plotDelay = s_i * estimated_sample_interval;
        const timestamp = timeOffset + plotDelay;
        const sample_i = (data.samples as Int32Array)[s_i];
        const filtered_sample_i = this.ecg_rms_iir.singleStep(sample_i);
        const filtered_sample_squared_i = filtered_sample_i * filtered_sample_i;
        let data_rms_i: number | undefined = undefined;
        if (this.ecg_ss_win !== undefined) {
          this.ecg_ss += filtered_sample_squared_i;
          if (this.ecg_ss_win_i < EXG_RMS_WINDOW_SIZE) {
            this.ecg_ss_win[this.ecg_ss_win_i] = filtered_sample_squared_i;
            this.ecg_ss_win_i++;
          } else {
            this.ecg_ss -= this.ecg_ss_win[0];
            this.ecg_ss_win.set(this.ecg_ss_win.subarray(1));
            this.ecg_ss_win[EXG_RMS_WINDOW_SIZE - 1] =
              filtered_sample_squared_i;
          }
          if (this.ecg_ss_win_i === EXG_RMS_WINDOW_SIZE) {
            data_rms_i = Math.sqrt(this.ecg_ss / EXG_RMS_WINDOW_SIZE);
          }
        }
        setTimeout(() => {
          this.ecg_ts?.append(timestamp, sample_i);
          this.ecg_hp_ts?.append(timestamp, filtered_sample_i);
          if (data_rms_i !== undefined) {
            this.ecg_rms_ts?.append(timestamp, data_rms_i);
          }
        }, plotDelay);
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
      this.acc_theta_ts !== undefined &&
      this.acc_mag_ts !== undefined &&
      this.acc_mag_bp_ts !== undefined
    ) {
      const numFrame = data.samples.length / 3;
      const estimated_sample_interval =
        (data.sample_timestamp_ms - data.prev_sample_timestamp_ms) / numFrame;
      const timeOffset =
        data.event_time_offset_ms +
        data.prev_sample_timestamp_ms +
        estimated_sample_interval;

      for (let s_i = 0; s_i < data.samples.length; s_i += 3) {
        const frameNum = Math.floor(s_i / 3);
        const plotDelay = frameNum * estimated_sample_interval;
        const timestamp = timeOffset + plotDelay;
        const y_d = -(data.samples as Int16Array)[s_i];
        const x_d = -(data.samples as Int16Array)[s_i + 1];
        const z_d = (data.samples as Int16Array)[s_i + 2];
        const x_lp_d = this.acc_x_iir.singleStep(x_d);
        const y_lp_d = this.acc_y_iir.singleStep(y_d);
        const z_lp_d = this.acc_z_iir.singleStep(z_d);
        const x_lp_d_2 = x_lp_d * x_lp_d;
        const y_lp_d_2 = y_lp_d * y_lp_d;
        const z_lp_d_2 = z_lp_d * z_lp_d;
        const rho =
          (Math.atan(x_lp_d / Math.sqrt(y_lp_d_2 + z_lp_d_2)) / Math.PI) * 180;
        const phi =
          (Math.atan(y_lp_d / Math.sqrt(x_lp_d_2 + z_lp_d_2)) / Math.PI) * 180;
        const theta =
          (Math.atan(Math.sqrt(x_lp_d_2 + y_lp_d_2) / z_lp_d) / Math.PI) * 180;
        const acc_mag = Math.sqrt(x_d * x_d + y_d * y_d + z_d * z_d);
        const acc_mag_bp = this.acc_mag_iir.singleStep(acc_mag);
        setTimeout(() => {
          this.acc_x_ts?.append(timestamp, x_d);
          this.acc_y_ts?.append(timestamp, y_d);
          this.acc_z_ts?.append(timestamp, z_d);
          this.acc_x_lp_ts?.append(timestamp, x_lp_d);
          this.acc_y_lp_ts?.append(timestamp, y_lp_d);
          this.acc_z_lp_ts?.append(timestamp, z_lp_d);
          this.acc_rho_ts?.append(timestamp, rho);
          this.acc_phi_ts?.append(timestamp, phi);
          this.acc_theta_ts?.append(timestamp, theta);
          this.acc_mag_ts?.append(timestamp, acc_mag);
          this.acc_mag_bp_ts?.append(timestamp, acc_mag_bp);
        }, plotDelay);
      }
    }
  }

  onWheelECG(ev: any) {
    if (this.ecg_chart !== undefined) {
      const delta = ev.deltaY < 0 ? EXG_DELTA : -EXG_DELTA;
      switch (this.EXGFormSelect?.selectedIndex) {
        case 0:
          break;
        case 1:
          ev.preventDefault();
          this.EXG_HP_MAX += delta;
          this.EXG_HP_MIN -= delta;
          if (
            this.EXG_HP_MAX < EXG_HP_SCROLL_MIN ||
            this.EXG_HP_MAX <= this.EXG_HP_MIN ||
            this.EXG_HP_MAX / SCROLL_MAX_LIMIT_FACTOR > EXG_HP_MAX
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
            this.EXG_RMS_MAX < EXG_RMS_SCROLL_MIN ||
            this.EXG_RMS_MAX <= this.EXG_RMS_MIN ||
            this.EXG_RMS_MAX / SCROLL_MAX_LIMIT_FACTOR > EXG_RMS_MAX
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
          delta = ev.deltaY < 0 ? ACC_DELTA : -ACC_DELTA;
          this.ACC_MAX += delta;
          this.ACC_MIN -= delta;
          if (
            this.ACC_MAX < ACC_SCROLL_MIN ||
            this.ACC_MAX <= this.ACC_MIN ||
            this.ACC_MAX / SCROLL_MAX_LIMIT_FACTOR > ACC_MAX
          ) {
            this.ACC_MAX -= delta;
            this.ACC_MIN += delta;
          }
          this.acc_chart.options.minValue = this.ACC_MIN;
          this.acc_chart.options.maxValue = this.ACC_MAX;
          break;
        case 2:
        case 3:
          break;
        case 4:
          ev.preventDefault();
          delta = ev.deltaY < 0 ? ACC_MAG_DELTA : -ACC_MAG_DELTA;

          this.ACC_MAG_BP_MAX += delta;
          this.ACC_MAG_BP_MIN -= delta;
          if (
            this.ACC_MAG_BP_MAX < ACC_MAG_SCROLL_MIN ||
            this.ACC_MAG_BP_MAX <= this.ACC_MIN ||
            this.ACC_MAG_BP_MAX / SCROLL_MAX_LIMIT_FACTOR > ACC_MAG_BP_MAX
          ) {
            this.ACC_MAG_BP_MAX -= delta;
            this.ACC_MAG_BP_MIN += delta;
          }
          this.acc_chart.options.minValue = this.ACC_MAG_BP_MIN;
          this.acc_chart.options.maxValue = this.ACC_MAG_BP_MAX;
          break;
      }
    }
  }
}

function configTSforChartGen(
  chart: CustomSmoothie,
  allTimeserieses: TimeSeries[],
  allPostRenderCallbacks: PostRenderCallback[],
) {
  return (
    showTimeserieses: TimeSeries[],
    showTimeserieOptions: ITimeSeriesPresentationOptions[],
    showPastRenderCallbacks: PostRenderCallback[] = [],
    scrollable: boolean = false,
    minValue: number | undefined = undefined,
    maxValue: number | undefined = undefined,
    titleText: string = "",
    disableLabel: boolean = false,
    horizontalLines: any[] = [],
  ) => {
    for (let i = 0; i < allTimeserieses.length; i++) {
      chart.removeTimeSeries(allTimeserieses[i]);
    }

    for (let i = 0; i < allPostRenderCallbacks.length; i++) {
      chart.removePostRenderCallback(allPostRenderCallbacks[i]);
    }

    for (let i = 0; i < showTimeserieses.length; i++) {
      chart.addTimeSeries(showTimeserieses[i], showTimeserieOptions[i]);
    }

    for (let i = 0; i < showPastRenderCallbacks.length; i++) {
      chart.addPostRenderCallback(showPastRenderCallbacks[i]);
    }
    if (scrollable) {
      chart.addPostRenderCallback(scroll_legend);
      setTimeout(() => {
        if (chart) {
          chart.removePostRenderCallback(scroll_legend);
        }
      }, SCROLL_LEGENT_DISP_TIME_MS);
    }
    chart.options.minValue = minValue;
    chart.options.maxValue = maxValue;
    chart.updateValueRange();
    if (titleText.length > 0 && chart.options.title !== undefined) {
      chart.options.title.text = titleText;
    }
    if (chart.options.labels !== undefined) {
      chart.options.labels.disabled = disableLabel;
    }
    chart.options.horizontalLines = horizontalLines;
  };
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

function addLegendGen(
  canvas: HTMLCanvasElement,
  time: number,
  legend: string,
  x: number,
  y: number,
  textBaseline: CanvasTextBaseline = "top",
  textAligh: CanvasTextAlign = "center",
  font: string = "16px Arial",
  fillStyle = "#fbfbfb",
) {
  return (canvas: HTMLCanvasElement, time: number) => {
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      ctx.save();
      ctx.textBaseline = textBaseline;
      ctx.textAlign = textAligh;
      ctx.font = font;
      ctx.fillStyle = fillStyle;
      ctx.fillText(legend, x / window.devicePixelRatio / 2, y);
      ctx.restore();
    }
  };
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

function acc_mag_legend(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (MAG_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = MAG_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText(`― Accelerometer magnitude (mG)`, 10, 5);
    ctx.restore();
  }
}

function acc_mag_bp_legend(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (MAG_LP_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = MAG_LP_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText(`― Bandpass accelerometer magnitude (mG)`, 10, 5);
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

function ECGIsOn(row: PolarVisRow) {
  return row.ECGDiv !== undefined;
}

function ACCIsOn(row: PolarVisRow) {
  return row.ACCDiv !== undefined;
}
