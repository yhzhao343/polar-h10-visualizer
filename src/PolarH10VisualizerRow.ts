import { SmoothieChart, TimeSeries } from "smoothie";
import { CustomSmoothie, genSmoothieLegendInfo } from "./CustomSmoothie";
import { CalcCascades, IirFilter } from "fili";
import { PolarH10 } from "polar-h10";
import {
  SCROLL_MAX_LIMIT_FACTOR,
  DEFAULT_ECG_LINE_CHART_OPTION,
  DEFAULT_ACC_LINE_CHART_OPTION,
  ECG_PRESENTATION_OPTIONS,
  X_AXIS_PRESENTATION_OPTIONS,
  Y_AXIS_PRESENTATION_OPTIONS,
  Z_AXIS_PRESENTATION_OPTIONS,
  X_LP_AXIS_PRESENTATION_OPTIONS,
  Y_LP_AXIS_PRESENTATION_OPTIONS,
  Z_LP_AXIS_PRESENTATION_OPTIONS,
  X_FILTER_AXIS_PRESENTATION_OPTIONS,
  Y_FILTER_AXIS_PRESENTATION_OPTIONS,
  Z_FILTER_AXIS_PRESENTATION_OPTIONS,
  MAG_FILTER_PRESENTATION_OPTIONS,
  RHO_AXIS_PRESENTATION_OPTIONS,
  PHI_AXIS_PRESENTATION_OPTIONS,
  THETA_AXIS_PRESENTATION_OPTIONS,
  ECG_FILTER_PRESENTATION_OPTIONS,
  ECG_RMS_PRESENTATION_OPTIONS,
  ECG_DELTA,
  MAG_PRESENTATION_OPTIONS,
  MAG_LP_PRESENTATION_OPTIONS,
  PolarH10Data,
  ECG_RMS_WINDOW_MS,
  ECG_RMS_WINDOW_SIZE,
  ECG_STREAM_DELAY_MS,
  ECG_RMS_MIN,
  ECG_RMS_MAX,
  ECG_FILTER_SCROLL_MIN,
  ECG_RMS_SCROLL_MIN,
  ACC_FILTER_MIN,
  ACC_FILTER_MAX,
  ACC_MAG_DELTA,
  ECG_HIGHPASS_CUTOFF_HZ,
  ECG_FILTER_ORDER,
  AAC_LOWPASS_CUTOFF_HZ,
  AAC_LOWPASS_ORDER,
  AAC_FILTER_BANDPASS_HIGH_CUT_HZ,
  AAC_FILTER_BANDPASS_LOW_CUT_HZ,
  AAC_FILTER_ORDER,
  ACC_SCROLL_MIN,
  ACC_MAG_SCROLL_MIN,
  ECG_SAMPLE_RATE_HZ,
  ACC_STREAM_DELAY_MS,
  ACC_RANGE_G,
  ACC_SAMPLE_RATE_HZ,
  ACC_DELTA,
  ECG_FILTER_MIN,
  ECG_FILTER_MAX,
  ACC_MIN,
  ACC_MAX,
  BODY_PARTS,
  LOW_BATT_LVL,
  FilterInfo,
} from "./consts";

type ConditionChecker = (row: PolarVisRow) => boolean;

const IIRCalc = new CalcCascades();

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
  extraDataCtrl: HTMLDivElement;
  rowOrder: HTMLDivElement;
  visContainerDiv: HTMLDivElement;
  ECGCtrlDiv: HTMLDivElement;
  ACCCtrlDiv: HTMLDivElement;
  order: number;

  ECG_FILTER_MIN: number = ECG_FILTER_MIN;
  ECG_FILTER_MAX: number = ECG_FILTER_MAX;
  ECG_RMS_MIN: number = ECG_RMS_MIN;
  ECG_RMS_MAX: number = ECG_RMS_MAX;
  ACC_MIN: number = ACC_MIN;
  ACC_MAX: number = ACC_MAX;
  ACC_FILTER_MIN: number = ACC_FILTER_MIN;
  ACC_FILTER_MAX: number = ACC_FILTER_MAX;

  disBtn: HTMLButtonElement;
  orderUpBtn: HTMLButtonElement;
  orderDownBtn: HTMLButtonElement;
  show3DBtn: HTMLButtonElement;
  filterConfigBtn: HTMLButtonElement;
  ECGFormSelect: HTMLSelectElement;
  ECGSwitchInput: HTMLInputElement;
  ECGDropDown: HTMLDivElement;
  ACCFormSelect: HTMLSelectElement;
  ACCSwitchInput: HTMLInputElement;
  ACCDropDown: HTMLDivElement;

  ECGDiv: HTMLElement | undefined = undefined;
  ACCDiv: HTMLElement | undefined = undefined;

  ecg_resize: (() => void) | undefined = undefined;
  ecg_chart: CustomSmoothie | undefined = undefined;
  ecg_resize_observer: ResizeObserver | undefined = undefined;
  ecg_canvas: HTMLCanvasElement | undefined = undefined;

  ecg_filter_iir_coef = undefined;
  ecg_ts: TimeSeries | undefined = undefined;

  ecg_filter_info: FilterInfo;
  ecg_filter_iir: IirFilter | undefined = undefined;
  ecg_filter_ts: TimeSeries | undefined = undefined;
  ecg_rms_ts: TimeSeries | undefined = undefined;

  ecg_ss_win: Float64Array | undefined = undefined;
  ecg_ss_win_i: number = 0;
  ecg_ss: number = 0;

  acc_resize: (() => void) | undefined = undefined;
  acc_chart: CustomSmoothie | undefined = undefined;
  acc_resize_observer: ResizeObserver | undefined = undefined;
  acc_canvas: HTMLCanvasElement | undefined = undefined;

  acc_x_ts: TimeSeries | undefined = undefined;
  acc_y_ts: TimeSeries | undefined = undefined;
  acc_z_ts: TimeSeries | undefined = undefined;
  acc_mag_ts: TimeSeries | undefined = undefined;

  acc_lp_info: FilterInfo;
  acc_lp_iir_coef = undefined;
  acc_x_lp_iir: IirFilter | undefined = undefined;
  acc_y_lp_iir: IirFilter | undefined = undefined;
  acc_z_lp_iir: IirFilter | undefined = undefined;
  acc_mag_lp_iir: IirFilter | undefined = undefined;
  acc_x_lp_ts: TimeSeries | undefined = undefined;
  acc_y_lp_ts: TimeSeries | undefined = undefined;
  acc_z_lp_ts: TimeSeries | undefined = undefined;
  acc_mag_lp_ts: TimeSeries | undefined = undefined;

  acc_rho_ts: TimeSeries | undefined = undefined;
  acc_phi_ts: TimeSeries | undefined = undefined;
  acc_theta_ts: TimeSeries | undefined = undefined;

  acc_filter_info: FilterInfo;
  acc_filter_iir_coef = undefined;
  acc_x_filter_iir: IirFilter | undefined = undefined;
  acc_y_filter_iir: IirFilter | undefined = undefined;
  acc_z_filter_iir: IirFilter | undefined = undefined;
  acc_mag_filter_iir: IirFilter | undefined = undefined;
  acc_x_filter_ts: TimeSeries | undefined = undefined;
  acc_y_filter_ts: TimeSeries | undefined = undefined;
  acc_z_filter_ts: TimeSeries | undefined = undefined;
  acc_mag_filter_ts: TimeSeries | undefined = undefined;

  ecg_rms_window_ms: number = ECG_RMS_WINDOW_MS;

  constructor(content: HTMLElement, device: BluetoothDevice) {
    if (device.name === undefined) {
      throw new Error("Invalid Bluetooth device! Missing name");
    }
    this.parent = content;
    this.device = device;
    this.deviceName = this.device?.name?.substring(10) || "";
    this.ecg_rms_window_ms = ECG_RMS_WINDOW_MS;
    this.ecg_filter_info = {
      type: "highpass",
      order: ECG_FILTER_ORDER,
      characteristic: "butterworth",
      Fs: ECG_SAMPLE_RATE_HZ,
      Fc: ECG_HIGHPASS_CUTOFF_HZ,
      Fl: undefined,
      Fh: undefined,
      BW: undefined,
      gain: undefined,
      preGain: false,
    };

    this.acc_lp_info = {
      type: "lowpass",
      order: AAC_LOWPASS_ORDER,
      characteristic: "butterworth",
      Fs: ACC_SAMPLE_RATE_HZ,
      Fc: AAC_LOWPASS_CUTOFF_HZ,
      Fl: undefined,
      Fh: undefined,
      BW: undefined,
      gain: undefined,
      preGain: false,
    };

    this.acc_filter_info = {
      type: "bandpass",
      order: AAC_FILTER_ORDER,
      characteristic: "butterworth",
      Fs: ACC_SAMPLE_RATE_HZ,
      Fc: Math.sqrt(
        AAC_FILTER_BANDPASS_LOW_CUT_HZ * AAC_FILTER_BANDPASS_HIGH_CUT_HZ,
      ),
      Fl: AAC_FILTER_BANDPASS_LOW_CUT_HZ,
      Fh: AAC_FILTER_BANDPASS_HIGH_CUT_HZ,
      BW: AAC_FILTER_BANDPASS_HIGH_CUT_HZ - AAC_FILTER_BANDPASS_LOW_CUT_HZ,
      gain: undefined,
      preGain: false,
    };
  }

  disconnectPolarH10 = async (ev: any = undefined) => {
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
  };

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

  moveUp = (ev: any) => {
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
  };

  moveDown = (ev: any) => {
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
  };

  newECGCallback = (data: PolarH10Data) => {
    if (
      this.ecg_ts !== undefined &&
      this.ecg_rms_ts !== undefined &&
      this.ecg_filter_ts !== undefined &&
      data.prev_sample_timestamp_ms > 0 &&
      data.samples !== undefined &&
      this.ecg_filter_iir !== undefined
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
        const filtered_sample_i = this.ecg_filter_iir.singleStep(sample_i);
        const filtered_sample_squared_i = filtered_sample_i * filtered_sample_i;
        let data_rms_i: number | undefined = undefined;
        if (this.ecg_ss_win !== undefined) {
          this.ecg_ss += filtered_sample_squared_i;
          if (this.ecg_ss_win_i < ECG_RMS_WINDOW_SIZE) {
            this.ecg_ss_win[this.ecg_ss_win_i] = filtered_sample_squared_i;
            this.ecg_ss_win_i++;
          } else {
            this.ecg_ss -= this.ecg_ss_win[0];
            this.ecg_ss_win.set(this.ecg_ss_win.subarray(1));
            this.ecg_ss_win[ECG_RMS_WINDOW_SIZE - 1] =
              filtered_sample_squared_i;
          }
          if (this.ecg_ss_win_i === ECG_RMS_WINDOW_SIZE) {
            data_rms_i = Math.sqrt(this.ecg_ss / ECG_RMS_WINDOW_SIZE);
          }
        }
        setTimeout(() => {
          this.ecg_ts?.append(timestamp, sample_i);
          this.ecg_filter_ts?.append(timestamp, filtered_sample_i);
          if (data_rms_i !== undefined) {
            this.ecg_rms_ts?.append(timestamp, data_rms_i);
          }
        }, plotDelay);
      }
    }
  };

  newACCCallback = (data: PolarH10Data) => {
    if (
      data.prev_sample_timestamp_ms > 0 &&
      data.samples !== undefined &&
      this.acc_x_ts !== undefined &&
      this.acc_y_ts !== undefined &&
      this.acc_z_ts !== undefined &&
      this.acc_mag_ts !== undefined &&
      this.acc_x_lp_ts !== undefined &&
      this.acc_y_lp_ts !== undefined &&
      this.acc_z_lp_ts !== undefined &&
      this.acc_mag_lp_ts !== undefined &&
      this.acc_rho_ts !== undefined &&
      this.acc_phi_ts !== undefined &&
      this.acc_theta_ts !== undefined &&
      this.acc_x_filter_ts !== undefined &&
      this.acc_y_filter_ts !== undefined &&
      this.acc_z_filter_ts !== undefined &&
      this.acc_mag_filter_ts !== undefined &&
      this.acc_x_lp_iir !== undefined &&
      this.acc_y_lp_iir !== undefined &&
      this.acc_z_lp_iir !== undefined &&
      this.acc_mag_lp_iir !== undefined &&
      this.acc_x_filter_iir !== undefined &&
      this.acc_y_filter_iir !== undefined &&
      this.acc_z_filter_iir !== undefined &&
      this.acc_mag_filter_iir !== undefined
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
        const x_lp_d = this.acc_x_lp_iir.singleStep(x_d);
        const y_lp_d = this.acc_y_lp_iir.singleStep(y_d);
        const z_lp_d = this.acc_z_lp_iir.singleStep(z_d);
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
        const mag_lp_d = this.acc_mag_lp_iir.singleStep(acc_mag);
        const x_filter_d = this.acc_x_filter_iir.singleStep(x_d);
        const y_filter_d = this.acc_y_filter_iir.singleStep(y_d);
        const z_filter_d = this.acc_z_filter_iir.singleStep(z_d);
        const mag_filter_d = this.acc_mag_filter_iir.singleStep(acc_mag);
        setTimeout(() => {
          this.acc_x_ts?.append(timestamp, x_d);
          this.acc_y_ts?.append(timestamp, y_d);
          this.acc_z_ts?.append(timestamp, z_d);
          this.acc_mag_ts?.append(timestamp, acc_mag);

          this.acc_rho_ts?.append(timestamp, rho);
          this.acc_phi_ts?.append(timestamp, phi);
          this.acc_theta_ts?.append(timestamp, theta);

          this.acc_x_lp_ts?.append(timestamp, x_lp_d);
          this.acc_y_lp_ts?.append(timestamp, y_lp_d);
          this.acc_z_lp_ts?.append(timestamp, z_lp_d);
          this.acc_mag_lp_ts?.append(timestamp, mag_lp_d);

          this.acc_x_filter_ts?.append(timestamp, x_filter_d);
          this.acc_y_filter_ts?.append(timestamp, y_filter_d);
          this.acc_z_filter_ts?.append(timestamp, z_filter_d);
          this.acc_mag_filter_ts?.append(timestamp, mag_filter_d);
        }, plotDelay);
      }
    }
  };

  changeECGGraph = (evt: any) => {
    if (
      this.ecg_chart !== undefined &&
      this.ecg_ts !== undefined &&
      this.ecg_filter_ts !== undefined &&
      this.ecg_rms_ts !== undefined
    ) {
      const selected = evt.target.selectedIndex;
      this.ecg_chart.stop();
      switch (selected) {
        case 0: // "Raw":
          this.ecg_chart.configureTimeSeries(
            [this.ecg_ts],
            [ECG_PRESENTATION_OPTIONS],
            [genSmoothieLegendInfo("― Voltage (μV)", 10, 0)],
            false,
            undefined,
            undefined,
            1,
            1,
            DEFAULT_ECG_LINE_CHART_OPTION.title?.text ||
              "EXG raw voltage (0.7–40 Hz)",
            false,
            [],
            true,
            false,
            true,
          );
          break;
        case 1: // filter:
          this.ecg_chart.configureTimeSeries(
            [this.ecg_filter_ts],
            [ECG_FILTER_PRESENTATION_OPTIONS],
            [genSmoothieLegendInfo("― Voltage (μV)", 10, 0)],
            true,
            this.ECG_FILTER_MIN,
            this.ECG_FILTER_MAX,
            1,
            1,
            `${prettyPrintFilter(this.ecg_filter_info)} on EXG raw`,
            false,
            [],
            true,
            true,
            true,
          );
          break;
        case 2: //"RMS":
          this.ecg_chart.configureTimeSeries(
            [this.ecg_rms_ts],
            [ECG_RMS_PRESENTATION_OPTIONS],
            [genSmoothieLegendInfo(`― RMS voltage (μV)`, 10, 0)],
            true,
            this.ECG_RMS_MIN,
            this.ECG_RMS_MAX,
            1,
            1,
            `RMS using ${this.ecg_rms_window_ms}ms window on filtered EXG`,
            false,
            [],
            true,
            true,
            true,
          );
          break;
      }
      this.ecg_chart.start();
    }
  };

  changeACCGraph = (evt: any) => {
    if (
      this.acc_chart !== undefined &&
      this.acc_x_ts !== undefined &&
      this.acc_y_ts !== undefined &&
      this.acc_z_ts !== undefined &&
      this.acc_x_lp_ts !== undefined &&
      this.acc_y_lp_ts !== undefined &&
      this.acc_z_lp_ts !== undefined &&
      this.acc_mag_lp_ts !== undefined &&
      this.acc_rho_ts !== undefined &&
      this.acc_phi_ts !== undefined &&
      this.acc_theta_ts !== undefined &&
      this.acc_mag_ts !== undefined &&
      this.acc_x_filter_ts !== undefined &&
      this.acc_y_filter_ts !== undefined &&
      this.acc_z_filter_ts !== undefined &&
      this.acc_mag_filter_ts !== undefined // &&
      // this.configureACCGraph !== undefined
    ) {
      const selected = evt.target.selectedIndex;
      let title = "";
      this.acc_chart.stop();
      switch (selected) {
        case 0: //"Raw":
          this.acc_chart.configureTimeSeries(
            [this.acc_x_ts, this.acc_y_ts, this.acc_z_ts, this.acc_mag_ts],
            [
              X_AXIS_PRESENTATION_OPTIONS,
              Y_AXIS_PRESENTATION_OPTIONS,
              Z_AXIS_PRESENTATION_OPTIONS,
              MAG_PRESENTATION_OPTIONS,
            ],
            [
              genSmoothieLegendInfo("― X-axis (mG)", 10, 0),
              genSmoothieLegendInfo("― Y-axis (mG)", 10, 0),
              genSmoothieLegendInfo("― Z-axis (mG)", 10, 0),
              genSmoothieLegendInfo("― Accelerometer magnitude (mG)", 10, 0),
            ],
            true,
            this.ACC_MIN,
            this.ACC_MAX,
            1,
            1,
            DEFAULT_ACC_LINE_CHART_OPTION.title?.text || "Accelerometer raw",
            false,
            [],
            true,
            true,
            true,
          );
          break;
        case 1: //"Lowpass":
          this.acc_chart.configureTimeSeries(
            [
              this.acc_x_lp_ts,
              this.acc_y_lp_ts,
              this.acc_z_lp_ts,
              this.acc_mag_lp_ts,
            ],
            [
              X_LP_AXIS_PRESENTATION_OPTIONS,
              Y_LP_AXIS_PRESENTATION_OPTIONS,
              Z_LP_AXIS_PRESENTATION_OPTIONS,
              MAG_LP_PRESENTATION_OPTIONS,
            ],
            [
              genSmoothieLegendInfo("― X-axis (mG)", 10, 0),
              genSmoothieLegendInfo("― Y-axis (mG)", 10, 0),
              genSmoothieLegendInfo("― Z-axis (mG)", 10, 0),
              genSmoothieLegendInfo("― Accelerometer magnitude (mG)", 10, 0),
            ],
            true,
            this.ACC_MIN,
            this.ACC_MAX,
            1,
            1,
            `Lowpass (${AAC_LOWPASS_CUTOFF_HZ}Hz ${AAC_LOWPASS_ORDER}th order Butterworth) on accelerometer raw`,
            false,
            [],
            true,
            true,
            true,
          );
          break;

        case 2: //"Tilt":
          this.acc_chart.configureTimeSeries(
            [this.acc_rho_ts, this.acc_phi_ts, this.acc_theta_ts],
            [
              RHO_AXIS_PRESENTATION_OPTIONS,
              PHI_AXIS_PRESENTATION_OPTIONS,
              THETA_AXIS_PRESENTATION_OPTIONS,
            ],
            [
              genSmoothieLegendInfo("― ρ° ∠(X-axis, Horizon)", 10, 0),
              genSmoothieLegendInfo("― ϕ° ∠(Y-axis, Horizon)", 10, 0),
              genSmoothieLegendInfo("― θ° ∠(Z-axis, -Gravity)", 10, 0),
            ],
            false,
            -120,
            120,
            1.3,
            1.3,
            "Tilt angle [-90°, 90°] from lowpass on accelerometer raw",
            false,
            [
              { value: 90, color: "#ffffff7f", lineWidth: 1 },
              { value: -90, color: "#ffffff7f", lineWidth: 1 },
            ],
            true,
            true,
            true,
          );
          break;

        case 3: //"filter"
          this.acc_chart.configureTimeSeries(
            [
              this.acc_x_filter_ts,
              this.acc_y_filter_ts,
              this.acc_z_filter_ts,
              this.acc_mag_filter_ts,
            ],
            [
              X_FILTER_AXIS_PRESENTATION_OPTIONS,
              Y_FILTER_AXIS_PRESENTATION_OPTIONS,
              Z_FILTER_AXIS_PRESENTATION_OPTIONS,
              MAG_FILTER_PRESENTATION_OPTIONS,
            ],
            [
              genSmoothieLegendInfo("― X-axis (mG)", 10, 0),
              genSmoothieLegendInfo("― Y-axis (mG)", 10, 0),
              genSmoothieLegendInfo("― Z-axis (mG)", 10, 0),
              genSmoothieLegendInfo("― Accelerometer magnitude (mG)", 10, 0),
            ],
            true,
            this.ACC_FILTER_MIN,
            this.ACC_FILTER_MAX,
            1,
            1,
            `${prettyPrintFilter(this.acc_filter_info)} on accelerometer raw magnitude`,
            false,
            [],
            true,
            true,
            true,
          );
          break;
      }
      this.acc_chart.start();
    }
  };

  onWheelECG = (ev: any) => {
    if (this.ecg_chart !== undefined && !this.ecg_chart.yScaleIsAuto()) {
      const delta = ev.deltaY < 0 ? ECG_DELTA : -ECG_DELTA;
      switch (this.ECGFormSelect?.selectedIndex) {
        case 0:
          break;
        case 1:
          if (
            this.ECG_FILTER_MAX !== undefined &&
            this.ECG_FILTER_MIN !== undefined
          ) {
            ev.preventDefault();
            this.ECG_FILTER_MAX += delta;
            this.ECG_FILTER_MIN -= delta;
            if (
              this.ECG_FILTER_MAX < ECG_FILTER_SCROLL_MIN ||
              this.ECG_FILTER_MAX <= this.ECG_FILTER_MIN ||
              this.ECG_FILTER_MAX / SCROLL_MAX_LIMIT_FACTOR > ECG_FILTER_MAX
            ) {
              this.ECG_FILTER_MAX -= delta;
              this.ECG_FILTER_MIN += delta;
            }
            this.ecg_chart.options.minValue = this.ECG_FILTER_MIN;
            this.ecg_chart.options.maxValue = this.ECG_FILTER_MAX;
          }
          break;
        case 2:
          if (this.ECG_RMS_MAX !== undefined) {
            ev.preventDefault();
            this.ECG_RMS_MAX += delta;
            if (
              this.ECG_RMS_MAX < ECG_RMS_SCROLL_MIN ||
              this.ECG_RMS_MAX <= this.ECG_RMS_MIN ||
              this.ECG_RMS_MAX / SCROLL_MAX_LIMIT_FACTOR > ECG_RMS_MAX
            ) {
              this.ECG_RMS_MAX -= delta;
            }
            this.ecg_chart.options.minValue = 0;
            this.ecg_chart.options.maxValue = this.ECG_RMS_MAX;

            break;
          }
      }
    }
  };

  onWheelACC = (ev: any) => {
    if (this.acc_chart !== undefined && !this.acc_chart.yScaleIsAuto()) {
      let delta = 0;
      switch (this.ACCFormSelect?.selectedIndex) {
        case 0:
        case 1:
          if (this.ACC_MAX !== undefined && this.ACC_MIN !== undefined) {
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
          }
          break;
        case 2:
          break;
        case 3:
          if (
            this.ACC_FILTER_MAX !== undefined &&
            this.ACC_FILTER_MIN !== undefined
          ) {
            ev.preventDefault();
            delta = ev.deltaY < 0 ? ACC_MAG_DELTA : -ACC_MAG_DELTA;

            this.ACC_FILTER_MAX += delta;
            this.ACC_FILTER_MIN -= delta;
            if (
              this.ACC_FILTER_MAX < ACC_MAG_SCROLL_MIN ||
              this.ACC_FILTER_MAX <= this.ACC_MIN ||
              this.ACC_FILTER_MAX / SCROLL_MAX_LIMIT_FACTOR > ACC_FILTER_MAX
            ) {
              this.ACC_FILTER_MAX -= delta;
              this.ACC_FILTER_MIN += delta;
            }
            this.acc_chart.options.minValue = this.ACC_FILTER_MIN;
            this.acc_chart.options.maxValue = this.ACC_FILTER_MAX;
          }
          break;
      }
    }
  };

  onToggleECG = async (ev: any) => {
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
      this.ECGDiv.addEventListener("wheel", this.onWheelECG);
      if (this.ACCDiv !== undefined) {
        this.visContainerDiv.appendChild(this.ACCDiv);
      }
      this.ecg_canvas = createCanvas("ecg_canvas", this.ECGDiv);

      this.ecg_chart = new CustomSmoothie(DEFAULT_ECG_LINE_CHART_OPTION);
      this.ecg_ts = new TimeSeries();
      this.ecg_rms_ts = new TimeSeries();
      this.ecg_filter_ts = new TimeSeries();
      // this.ecg_chart.addTimeSeries(this.ecg_ts, ECG_PRESENTATION_OPTIONS);
      this.ecg_chart.streamTo(this.ecg_canvas, ECG_STREAM_DELAY_MS);

      // this.ecg_chart.addPostRenderCallback(ECG_legend);
      this.ecg_ss_win = new Float64Array(ECG_RMS_WINDOW_SIZE);
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
      this.ecg_filter_iir_coef = IIRCalc[this.ecg_filter_info.type](
        this.ecg_filter_info,
      );
      this.ecg_filter_iir = IirFilter(this.ecg_filter_iir_coef);
      this.ecg_resize();

      if (this.ECGFormSelect !== undefined) {
        this.ECGFormSelect.disabled = false;
        this.ECGFormSelect.selectedIndex = 0;
      }

      await this.startECG(ECG_SAMPLE_RATE_HZ);
      this.changeECGGraph({ target: { selectedIndex: 0 } });
    } else {
      if (
        this.ECGDiv !== undefined &&
        this.ecg_canvas !== undefined &&
        this.ecg_chart !== undefined
      ) {
        this.ecg_chart.stop();
        if (this.ECGFormSelect !== undefined) {
          this.ECGFormSelect.disabled = true;
          this.ECGFormSelect.selectedIndex = 0;
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
  };

  onToggleACC = async (ev: any) => {
    if (this.ECGSwitchInput) {
      this.ECGSwitchInput.disabled = true;
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

      this.ACCDiv.addEventListener("wheel", this.onWheelACC);

      this.acc_canvas = createCanvas("acc_canvas", this.ACCDiv);

      this.acc_chart = new CustomSmoothie(DEFAULT_ACC_LINE_CHART_OPTION);

      this.acc_x_ts = new TimeSeries();
      this.acc_y_ts = new TimeSeries();
      this.acc_z_ts = new TimeSeries();
      this.acc_mag_ts = new TimeSeries();

      this.acc_x_lp_ts = new TimeSeries();
      this.acc_y_lp_ts = new TimeSeries();
      this.acc_z_lp_ts = new TimeSeries();
      this.acc_mag_lp_ts = new TimeSeries();

      this.acc_rho_ts = new TimeSeries();
      this.acc_phi_ts = new TimeSeries();
      this.acc_theta_ts = new TimeSeries();

      this.acc_x_filter_ts = new TimeSeries();
      this.acc_y_filter_ts = new TimeSeries();
      this.acc_z_filter_ts = new TimeSeries();
      this.acc_mag_filter_ts = new TimeSeries();

      this.acc_chart.streamTo(this.acc_canvas, ACC_STREAM_DELAY_MS);

      this.acc_resize = resizeSmoothieGen(this.acc_chart, 1, 1);
      this.acc_resize_observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === this.ACCDiv && this.acc_resize !== undefined) {
            this.acc_resize();
          }
        }
      });
      this.acc_resize_observer.observe(this.ACCDiv);
      this.acc_lp_iir_coef = IIRCalc[this.acc_lp_info.type](this.acc_lp_info);

      this.acc_x_lp_iir = IirFilter(this.acc_lp_iir_coef);
      this.acc_y_lp_iir = IirFilter(this.acc_lp_iir_coef);
      this.acc_z_lp_iir = IirFilter(this.acc_lp_iir_coef);
      this.acc_mag_lp_iir = IirFilter(this.acc_lp_iir_coef);

      this.acc_filter_iir_coef = IIRCalc[this.acc_filter_info.type](
        this.acc_filter_info,
      );

      this.acc_x_filter_iir = IirFilter(this.acc_filter_iir_coef);
      this.acc_y_filter_iir = IirFilter(this.acc_filter_iir_coef);
      this.acc_z_filter_iir = IirFilter(this.acc_filter_iir_coef);
      this.acc_mag_filter_iir = IirFilter(this.acc_filter_iir_coef);

      this.acc_resize();

      if (this.ACCFormSelect !== undefined) {
        this.ACCFormSelect.disabled = false;
        this.ACCFormSelect.selectedIndex = 0;
      }

      await this.startACC(ACC_RANGE_G, ACC_SAMPLE_RATE_HZ);
      this.changeACCGraph({ target: { selectedIndex: 0 } });
      this.show3DBtn.disabled = false;
    } else {
      this.show3DBtn.disabled = true;
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
    if (this.ECGSwitchInput) {
      this.ECGSwitchInput.disabled = false;
    }
  };

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

  includesDuplicate(
    key: string = "device",
    conditionCallback: ConditionChecker | undefined = undefined,
  ): number {
    let duplicateInd = -1;
    if (conditionCallback !== undefined) {
      for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
        let row = PolarVisRow.polarVisRows[i];
        if (row !== this && row[key] === this[key] && conditionCallback(row)) {
          duplicateInd = i;
          break;
        }
      }
    } else {
      for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
        let row = PolarVisRow.polarVisRows[i];
        if (row !== this && row[key] === this[key]) {
          duplicateInd = i;
          break;
        }
      }
    }

    return duplicateInd;
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
    if (this.includesDuplicate("device") === -1) {
      this.device.gatt?.disconnect();
    }
  }

  async initPolarH10IfUnique() {
    const duplicateInd = this.includesDuplicate("device");
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
    this.ecg_filter_ts = undefined;
    this.ecg_rms_ts = undefined;
    this.ecg_resize_observer = undefined;
    this.ecg_filter_iir_coef = undefined;
    this.ecg_filter_iir = undefined;
    this.ecg_ss_win_i = 0;
    this.ecg_ss = 0;
    // this.configureECGGraph = undefined;
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
    this.acc_lp_iir_coef = undefined;
    this.acc_filter_iir_coef = undefined;
    this.acc_x_lp_iir = undefined;
    this.acc_y_lp_iir = undefined;
    this.acc_z_lp_iir = undefined;
    this.acc_mag_lp_iir = undefined;
    this.acc_x_lp_ts = undefined;
    this.acc_y_lp_ts = undefined;
    this.acc_z_lp_ts = undefined;
    this.acc_rho_ts = undefined;
    this.acc_phi_ts = undefined;
    this.acc_theta_ts = undefined;
    this.acc_mag_ts = undefined;
    // this.configureACCGraph = undefined;
  }

  private async initDeviceInfo() {
    this.deviceInfoDiv = createDiv("deviceInfoDiv", this.optionDiv, [
      "device-info",
    ]);

    this.disconnectDiv = createDiv("disconnectDiv", undefined, [
      "flexbox",
      "disconnect",
    ]);

    this.disBtn = createButtonIcon(
      "delete",
      "distBtn",
      this.disconnectDiv,
      false,
      this.disconnectPolarH10,
      ["btn", "btn-primary", "btn-sm", "s-circle"],
    );

    addTooltip(this.disBtn, "disconnect", "top");

    this.battLvl = await this.polarH10.getBatteryLevel();
    this.optionDiv.removeChild(this.loadingDiv);
    this.optionDiv.removeChild(this.nameDiv);
    this.optionDiv.classList.remove("center");

    this.nameDiv.textContent = "";
    this.nameDiv.classList.add("flex");
    this.deviceNameDiv = createDiv(
      "devicename",
      this.nameDiv,
      ["flexbox"],
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
      ["flexbox", "small-mid-text"],
      battStr,
    );
    this.nameDiv.classList.add("flexbox");
    this.deviceInfoDiv.appendChild(this.disconnectDiv);
    this.deviceInfoDiv.appendChild(this.nameDiv);
    this.optionDiv.appendChild(this.deviceInfoDiv);

    this.dataInfo = createDiv("dataInfo", this.deviceInfoDiv, ["data-info"]);

    this.extraDataCtrl = createDiv("extraDataCtrl", this.optionDiv, [
      "extra-data-ctrl",
      "center",
    ]);

    this.filterConfigBtn = createButtonIcon(
      "settings",
      "filterConfigBtn",
      this.extraDataCtrl,
      true,
      undefined,
      ["btn", "btn-sm"],
    );
    addTooltip(this.filterConfigBtn, "settings, work-in-progress", "left");

    this.show3DBtn = createButtonIcon(
      "view_in_ar",
      "show3DBtn",
      this.extraDataCtrl,
      true,
      undefined,
      ["btn", "btn-sm"],
    );
    this.show3DBtn.disabled = true;
    addTooltip(this.show3DBtn, "3D Tilt, work-in-progress", "left");

    this.rowOrder = createDiv("rowOrder", this.optionDiv, ["row-order"]);

    this.orderUpBtn = createButtonIcon(
      "arrow-up",
      "orderUpBtn",
      this.rowOrder,
      false,
      this.moveUp,
      ["btn", "btn-primary", "btn-sm"],
    );
    addTooltip(this.orderUpBtn, "Move up", "right");

    this.orderUpBtn.disabled = PolarVisRow.polarVisRows.length < 1;
    addTooltip(this.orderUpBtn, "Move up", "right");

    this.orderDownBtn = createButtonIcon(
      "arrow-down",
      "orderDownBtn",
      this.rowOrder,
      false,
      this.moveDown,
      ["btn", "btn-primary", "btn-sm"],
    );
    addTooltip(this.orderDownBtn, "Move down", "right");

    this.orderDownBtn.disabled = true;

    if (PolarVisRow.polarVisRows.length > 0) {
      PolarVisRow.polarVisRows[
        PolarVisRow.polarVisRows.length - 1
      ].orderDownBtn.disabled = false;
    }

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

    // filterConfigBtn

    this.visContainerDiv = createDiv("visContainer", this.polarSensorDiv, [
      "visContainer",
    ]);
  }

  private async initDeviceGraphCtrl() {
    this.ECGCtrlDiv = createDiv("ECGCtrlDiv", this.dataCtrl, ["half-width"]);
    const ECG_switch = createSwitch("EXG", this.onToggleECG);
    this.ECGCtrlDiv.appendChild(ECG_switch);
    this.ECGSwitchInput = ECG_switch.children.item(0) as HTMLInputElement;
    this.ECGDropDown = createDiv("ECGDropDownDiv", this.ECGCtrlDiv, [
      "form-group",
    ]);
    this.generateECGFormSelect();

    this.ACCCtrlDiv = createDiv("ACCCtrlDiv", this.dataCtrl, ["half-width"]);
    const ACC_switch = createSwitch("ACC", this.onToggleACC);
    this.ACCCtrlDiv.appendChild(ACC_switch);
    this.ACCSwitchInput = ACC_switch.children.item(0) as HTMLInputElement;
    this.ACCDropDown = createDiv("ACCDropDownDiv", this.ACCCtrlDiv, [
      "form-group",
    ]);
    this.generateACCFormSelect();
  }

  private generateECGFormSelect(
    selectedInd: number = 0,
    disabled: boolean = true,
  ) {
    if (this.ECGFormSelect !== undefined) {
      const parent = this.ECGFormSelect.parentElement;
      parent?.removeChild(this.ECGFormSelect);
    }
    this.ECGFormSelect = createSelect(
      "ECGFormSelect",
      this.ECGDropDown,
      ["form-select", "dark-select", "select-sm", "almost-full-width"],
      "",
      ["Raw", compactPrettyPrintFilter(this.ecg_filter_info), "RMS"],
    );
    this.ECGFormSelect.selectedIndex = selectedInd;
    this.ECGFormSelect.onchange = this.changeECGGraph;
    this.ECGFormSelect.disabled = disabled;
  }

  private generateACCFormSelect(
    selectedInd: number = 0,
    disabled: boolean = true,
  ) {
    if (this.ACCFormSelect !== undefined) {
      const parent = this.ACCFormSelect.parentElement;
      parent?.removeChild(this.ACCFormSelect);
    }
    this.ACCFormSelect = createSelect(
      "ACCFormSelect",
      this.ACCDropDown,
      ["form-select", "dark-select", "select-sm", "almost-full-width"],
      "",
      [
        "Raw",
        compactPrettyPrintFilter(this.acc_lp_info),
        "Tilt",
        compactPrettyPrintFilter(this.acc_filter_info),
      ],
    );
    this.ACCFormSelect.selectedIndex = selectedInd;
    this.ACCFormSelect.onchange = this.changeACCGraph;
    this.ACCFormSelect.disabled = disabled;
  }

  async startECG(
    sampleRate: number = ECG_SAMPLE_RATE_HZ,
    addCallback: boolean = true,
  ) {
    const duplicateInd = this.includesDuplicate("device", ECGIsOn);
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
    const duplicateInd = this.includesDuplicate("device", ECGIsOn);
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
    const duplicateInd = this.includesDuplicate("device", ACCIsOn);
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
    const duplicateInd = this.includesDuplicate("device", ACCIsOn);
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

type TPDir = "top" | "right" | "bottom" | "left";

function addTooltip(e: HTMLElement, tooltip: string, dir: TPDir = "top") {
  e.setAttribute("data-tooltip", tooltip);
  e.classList.add("tooltip", `tooltip-${dir}`);
}

function createButtonIcon(
  type: string,
  id: string | undefined = undefined,
  parent: HTMLElement | undefined = undefined,
  isMaterialIcon: boolean = false,
  onclick: GlobalEventHandlers["onclick"] | undefined = undefined,
  classList: string[] = [],
  idGenerator: () => number = getPolarRowId,
) {
  const btn = document.createElement("button");
  if (id) {
    btn.id = `${id}-${idGenerator()}`;
  }
  btn.classList.add("flexbox", "center");
  const icon = document.createElement("i");
  if (isMaterialIcon) {
    icon.classList.add("material-icons");
    icon.textContent = type;
  } else {
    icon.classList.add("icon", `icon-${type}`);
  }

  btn.appendChild(icon);
  if (classList.length > 0) {
    btn.classList.add(...classList);
  }
  if (onclick) {
    btn.onclick = onclick;
  }
  if (parent) {
    parent.appendChild(btn);
  }
  return btn;
}

function capitalizeFirstLetter(str) {
  if (typeof str !== "string" || str.length === 0) {
    return str; // Handle non-string or empty inputs
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function prettyPrintFilter(filterInfo: FilterInfo, cap: boolean = true) {
  let str: string = "";
  if (filterInfo.type === "lowpass" || filterInfo.type === "highpass") {
    str = `${filterInfo.type} (${Number.isInteger(filterInfo.Fc) ? filterInfo.Fc : filterInfo.Fc?.toFixed(1)}Hz ${filterInfo.order} order ${capitalizeFirstLetter(filterInfo.characteristic)})`;
  } else {
    str = `bandpass (${Number.isInteger(filterInfo.Fl) ? filterInfo.Fl : filterInfo.Fl?.toFixed(1)}-${Number.isInteger(filterInfo.Fh) ? filterInfo.Fh : filterInfo.Fh?.toFixed(1)}Hz ${filterInfo.order} order ${capitalizeFirstLetter(filterInfo.characteristic)})`;
  }
  if (cap) {
    str = capitalizeFirstLetter(str);
  }
  return str;
}

function compactPrettyPrintFilter(filterInfo: FilterInfo) {
  let str: string = "";
  if (filterInfo.type === "lowpass" || filterInfo.type === "highpass") {
    str = `${Number.isInteger(filterInfo.Fc) ? filterInfo.Fc : filterInfo.Fc?.toFixed(1)}Hz ${filterInfo.type}`;
  } else {
    str = `${Number.isInteger(filterInfo.Fl) ? filterInfo.Fl : filterInfo.Fl?.toFixed(1)}-${Number.isInteger(filterInfo.Fh) ? filterInfo.Fh : filterInfo.Fh?.toFixed(1)}Hz ${filterInfo.type}`;
  }
  return str;
}
