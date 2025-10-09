import { SmoothieChart, TimeSeries } from "smoothie";
import { CustomSmoothie, genSmoothieLegendInfo } from "./CustomSmoothie";
import { CalcCascades, IirFilter } from "fili";
import { PolarH10, PolarSensorType } from "polar-h10";
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
  ECG_RMS_WIN_MIN_MS,
  ECG_RMS_WIN_MAX_MS,
  ECG_RMS_WIN_STEP_MS,
  ECG_RMS_WINDOW_SIZE,
  ECG_STREAM_DELAY_MS,
  ECG_RMS_MIN,
  ECG_RMS_MAX,
  ECG_FILTER_SCROLL_MIN,
  ECG_RMS_SCROLL_MIN,
  ACC_FILTER_MIN,
  ACC_FILTER_MAX,
  ACC_MAG_DELTA,
  ECG_HIGHLOWPASS_CUTOFF_HZ,
  ECG_BANDPASS_LOW_CUT_HZ,
  ECG_BANDPASS_HIGH_CUT_HZ,
  ECG_FILTER_ORDER,
  AAC_LOWPASS_CUTOFF_HZ,
  AAC_LOWPASS_ORDER,
  AAC_FILTER_BANDPASS_HIGH_CUT_HZ,
  AAC_FILTER_BANDPASS_LOW_CUT_HZ,
  ACC_FILTER_HIGHLOWPASS_CUTOFF_HZ,
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
  DEFAULT_MILLIS_PER_PX,
  ECG_STREAM_DELAY_MIN_MS,
  ECG_STREAM_DELAY_MAX_MS,
  ECG_STREAM_DELAY_STEP_MS,
  ECG_MS_PER_PX_MIN,
  ECG_MS_PER_PX_MAX,
  ECG_MS_PER_PX_STEP,
  ACC_STREAM_DELAY_MIN_MS,
  ACC_STREAM_DELAY_MAX_MS,
  ACC_STREAM_DELAY_STEP_MS,
  ECG_BAND_LOW_MIN_HZ,
  ECG_BAND_HIGH_MAX_HZ,
  ECG_BAND_HIGH_STEP_HZ,
  ACC_BAND_LOW_MIN_HZ,
  ACC_BAND_HIGH_MAX_HZ,
  ACC_BAND_HIGH_STEP_HZ,
  ACC_MS_PER_PX_MIN,
  ACC_MS_PER_PX_MAX,
  ACC_MS_PER_PX_STEP,
  ACC_RANGE_OPTIONS,
  ACC_SAMPLE_RATE_OPTIONS,
  FILTER_TYPES,
  FILTER_CHARACTERISTICS,
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

export function startRecording() {
  PolarVisRow.recorded = {};
  const polarNameDict = {};
  for (let row_i = 0; row_i < PolarVisRow.polarVisRows.length; row_i++) {
    const row = PolarVisRow.polarVisRows[row_i];
    const polarName = row.getPolarName();
    if (!(polarName in polarNameDict)) {
      const polar = row.polarH10;
      polarNameDict[polarName] = polar;
      PolarVisRow.recorded[polarName] = {
        ECG: {
          data: [],
          timestamp: [],
        },
        ACC: {
          data_x: [],
          data_y: [],
          data_z: [],
          timestamp: [],
        },
      };
      polar.addEventListener("ECG", row.recordECGData);
      polar.addEventListener("ACC", row.recordACCData);
    }
  }
}
export function stopRecording() {
  const polarNameDict = {};
  for (let row_i = 0; row_i < PolarVisRow.polarVisRows.length; row_i++) {
    const row = PolarVisRow.polarVisRows[row_i];
    const polarName = row.getPolarName();
    if (!(polarName in polarNameDict)) {
      const polar = row.polarH10;
      polarNameDict[polarName] = polar;
      polar.removeEventListener("ECG", row.recordECGData);
      polar.removeEventListener("ACC", row.recordACCData);
    }
  }
  download(
    "Polar-h10-recored_Data",
    JSON.stringify(PolarVisRow.recorded, null, 2),
  );
  PolarVisRow.recorded = {};
}

export class PolarVisRow {
  static polarRowID: number = 0;
  static polarVisRows: PolarVisRow[] = [];
  static recorded = {};
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
  visConfigDiv: HTMLDivElement;

  ECGConfigDiv: HTMLDivElement;
  ECGChartConfigDiv: HTMLDivElement;
  ECGFilterConfigDiv: HTMLDivElement;
  ECGRMSConfigDiv: HTMLDivElement;

  customBodyPartInput: HTMLInputElement;

  ACCConfigDiv: HTMLDivElement;
  ACCChartConfigDiv: HTMLDivElement;
  ACCLPConfigDiv: HTMLDivElement;
  // ACCRMSConfigDiv: HTMLDivElement;
  ACCFilterConfigDiv: HTMLDivElement;

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

  ECGStreamDelayInput: HTMLInputElement | undefined = undefined;
  ECGstreamMPPInput: HTMLInputElement | undefined = undefined;
  ECGRMSWinInput: HTMLInputElement | undefined = undefined;

  ACCStreamDelayInput: HTMLInputElement | undefined = undefined;
  ACCstreamMPPInput: HTMLInputElement | undefined = undefined;

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

  ecg_mss_win: Float64Array | undefined = undefined;
  ecg_mss_win_i: number = 0;
  ecg_buf_head: number = 0;
  ecg_mss: number = 0;

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
  ecg_rms_window_size: number = ECG_RMS_WINDOW_SIZE;
  ecg_stream_delay: number = ECG_STREAM_DELAY_MS;
  acc_stream_delay: number = ACC_STREAM_DELAY_MS;
  ecg_millis_per_px: number = DEFAULT_MILLIS_PER_PX;
  acc_millis_per_px: number = DEFAULT_MILLIS_PER_PX;

  showVisConfig: boolean = false;
  customBodyPart: string = "";
  customBodyPartSpan: HTMLSpanElement | undefined = undefined;

  acc_range_options: number[] | undefined = undefined;
  acc_sample_rate_options: number[] | undefined = undefined;

  acc_range_g: number = ACC_RANGE_G;
  acc_sample_rate_hz: number = ACC_SAMPLE_RATE_HZ;
  ACCSampleRateSelect: HTMLSelectElement | undefined = undefined;
  ACCRangeSelect: HTMLSelectElement | undefined = undefined;
  ECGFilterTypesSelect: HTMLSelectElement | undefined = undefined;
  ECGFilteCharSelect: HTMLSelectElement | undefined = undefined;
  ECGFilterOrderInput: HTMLInputElement | undefined = undefined;
  ECGFilterCutoffInput: HTMLInputElement | undefined = undefined;
  ECGFilterHighCutInput: HTMLInputElement | undefined = undefined;
  ECGFilterLowCutInput: HTMLInputElement | undefined = undefined;

  ACCFilterTypesSelect: HTMLSelectElement | undefined = undefined;
  ACCFilterCharSelect: HTMLSelectElement | undefined = undefined;
  ACCFilterOrderInput: HTMLInputElement | undefined = undefined;
  ACCFilterCutoffInput: HTMLInputElement | undefined = undefined;
  ACCFilterHighCutInput: HTMLInputElement | undefined = undefined;
  ACCFilterLowCutInput: HTMLInputElement | undefined = undefined;

  ACCLPCharSelect: HTMLSelectElement | undefined = undefined;
  ACCLPOrderInput: HTMLInputElement | undefined = undefined;
  ACCLPCutoffInput: HTMLInputElement | undefined = undefined;

  constructor(content: HTMLElement, device: BluetoothDevice) {
    if (device.name === undefined) {
      throw new Error("Invalid Bluetooth device! Missing name");
    }
    this.parent = content;
    this.device = device;
    this.deviceName = this.device?.name?.substring(10) || "";
    this.ecg_rms_window_ms = ECG_RMS_WINDOW_MS;
    this.updateECGRMSWinSize();
    this.initFilterSettings();
    this.showVisConfig = false;
  }

  getPolarName() {
    const alternative_name =
      this.customBodyPart || BODY_PARTS[this.bodypartSelect.selectedIndex];
    if (alternative_name.length > 0) {
      return `${this.deviceName}-${alternative_name}`;
    } else {
      return this.deviceName;
    }
  }

  updateECGRMSWinSize() {
    this.ecg_rms_window_size = Math.round(
      ECG_SAMPLE_RATE_HZ / (1000 / this.ecg_rms_window_ms),
    );
  }

  updateECGRMSWin() {
    // this.ecg_rms
    this.ecg_mss_win_i = 0;
    this.ecg_buf_head = 0;
    this.ecg_mss = 0;
    this.ecg_mss_win = new Float64Array(this.ecg_rms_window_ms);
  }

  initECGFilterSettings() {
    this.ecg_filter_info = {
      type: "highpass",
      order: ECG_FILTER_ORDER,
      characteristic: "butterworth",
      Fs: ECG_SAMPLE_RATE_HZ,
      Fc: ECG_HIGHLOWPASS_CUTOFF_HZ,
      Fl: ECG_BANDPASS_LOW_CUT_HZ,
      Fh: ECG_BANDPASS_HIGH_CUT_HZ,
      BW: ECG_BANDPASS_HIGH_CUT_HZ - ECG_BANDPASS_LOW_CUT_HZ,
      gain: undefined,
      preGain: false,
    };
  }

  initACCLowpassFilterSettings() {
    this.acc_lp_info = {
      type: "lowpass",
      order: AAC_LOWPASS_ORDER,
      characteristic: "butterworth",
      Fs: this.acc_sample_rate_hz,
      Fc: AAC_LOWPASS_CUTOFF_HZ,
      Fl: 1,
      Fh: 10,
      BW: undefined,
      gain: undefined,
      preGain: false,
    };
  }

  initACCFilterSettings() {
    this.acc_filter_info = {
      type: "bandpass",
      order: AAC_FILTER_ORDER,
      characteristic: "butterworth",
      Fs: this.acc_sample_rate_hz,
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

  initFilterSettings() {
    this.initECGFilterSettings();
    this.initACCLowpassFilterSettings();
    this.initACCFilterSettings();
  }

  updateBandpass(filter_info: FilterInfo) {
    if (filter_info.Fh !== undefined && filter_info.Fl != undefined) {
      filter_info.BW = filter_info.Fh - filter_info.Fl;
      filter_info.Fc = Math.sqrt(filter_info.Fh * filter_info.Fl);
    }
  }

  recordECGData = (data: PolarH10Data) => {
    if (data.samples !== undefined) {
      const estimated_sample_interval =
        (data.sample_timestamp_ms - data.prev_sample_timestamp_ms) /
        data.samples.length;
      const timeOffset =
        data.event_time_offset_ms +
        data.prev_sample_timestamp_ms +
        estimated_sample_interval;
      const polarName = this.getPolarName();
      for (let s_i = 0; s_i < data.samples.length; s_i++) {
        const plotDelay = s_i * estimated_sample_interval;
        const timestamp = timeOffset + plotDelay;
        const sample_i = (data.samples as Int32Array)[s_i];
        PolarVisRow.recorded[polarName].ECG.timestamp.push(timestamp);
        PolarVisRow.recorded[polarName].ECG.data.push(sample_i);
      }
    }
  };

  recordACCData = (data: PolarH10Data) => {
    if (data.samples !== undefined) {
      const numFrame = data.samples.length / 3;
      const estimated_sample_interval =
        (data.sample_timestamp_ms - data.prev_sample_timestamp_ms) / numFrame;
      const timeOffset =
        data.event_time_offset_ms +
        data.prev_sample_timestamp_ms +
        estimated_sample_interval;
      const polarName = this.getPolarName();
      for (let s_i = 0; s_i < data.samples.length; s_i += 3) {
        const frameNum = Math.floor(s_i / 3);
        const plotDelay = frameNum * estimated_sample_interval;
        const timestamp = timeOffset + plotDelay;
        const y_d = -(data.samples as Int16Array)[s_i];
        const x_d = -(data.samples as Int16Array)[s_i + 1];
        const z_d = (data.samples as Int16Array)[s_i + 2];
        PolarVisRow.recorded[polarName].ACC.timestamp.push(timestamp);
        PolarVisRow.recorded[polarName].ACC.data_x.push(x_d);
        PolarVisRow.recorded[polarName].ACC.data_y.push(y_d);
        PolarVisRow.recorded[polarName].ACC.data_z.push(z_d);
      }
    }
  };

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
      const duplicateInd = this.includesDuplicate("device");
      console.log(`duplicateInd: ${duplicateInd}`);
      if (duplicateInd > -1) {
        const duplicateRow = PolarVisRow.polarVisRows[duplicateInd];
        const customBodyPart = duplicateRow.customBodyPart;

        if (customBodyPart) {
          this.onCustomBodyPart({ target: { value: customBodyPart } });
        } else {
          this.bodypartSelect.selectedIndex =
            duplicateRow.bodypartSelect.selectedIndex;
        }
      }
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

  toggleVisConfig = (ev: any) => {
    this.showVisConfig = !this.showVisConfig;
    if (this.showVisConfig) {
      this.visContainerDiv.classList.add("hide");
      this.visConfigDiv.classList.remove("hide");
      this.filterConfigBtn.classList.add("btn-success");
    } else {
      this.visContainerDiv.classList.remove("hide");
      this.visConfigDiv.classList.add("hide");
      this.filterConfigBtn.classList.remove("btn-success");
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
        const filtered_sample_squared_n_i =
          (filtered_sample_i / this.ecg_rms_window_size) * filtered_sample_i;
        let data_rms_i: number | undefined = undefined;
        if (this.ecg_mss_win !== undefined) {
          this.ecg_mss += filtered_sample_squared_n_i;
          if (this.ecg_mss_win_i < this.ecg_rms_window_size) {
            this.ecg_mss_win[this.ecg_mss_win_i] = filtered_sample_squared_n_i;
            this.ecg_mss_win_i++;
          } else {
            this.ecg_mss -= this.ecg_mss_win[this.ecg_buf_head];
            this.ecg_mss_win[this.ecg_buf_head] = filtered_sample_squared_n_i;
            this.ecg_buf_head =
              (this.ecg_buf_head + 1) % this.ecg_rms_window_size;
          }
          if (this.ecg_mss_win_i === this.ecg_rms_window_size) {
            data_rms_i = Math.sqrt(this.ecg_mss);
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
            `RMS using ${this.ecg_rms_window_ms}ms window on ${prettyPrintFilter(this.ecg_filter_info, false)} EXG`,
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
              genSmoothieLegendInfo("― ACC magnitude (mG)", 10, 0),
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
              genSmoothieLegendInfo("― ACC magnitude (mG)", 10, 0),
            ],
            true,
            this.ACC_MIN,
            this.ACC_MAX,
            1,
            1,
            `${prettyPrintFilter(this.acc_lp_info)} on accelerometer raw`,
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
              genSmoothieLegendInfo("― ACC magnitude (mG)", 10, 0),
            ],
            true,
            this.ACC_FILTER_MIN,
            this.ACC_FILTER_MAX,
            1,
            1,
            `${prettyPrintFilter(this.acc_filter_info)} on accelerometer`,
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

  disableAllOtherSameSwitch() {
    for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
      const row = PolarVisRow.polarVisRows[i];
      if (row !== this && row.polarH10 === this.polarH10) {
        row.ECGSwitchInput.disabled = true;
        row.ACCSwitchInput.disabled = true;
      }
    }
  }

  enableAllOtherSameSwitch() {
    for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
      const row = PolarVisRow.polarVisRows[i];
      if (row !== this && row.polarH10 === this.polarH10) {
        row.ECGSwitchInput.disabled = false;
        row.ACCSwitchInput.disabled = false;
      }
    }
  }

  onToggleECG = async (ev: any) => {
    this.ACCSwitchInput.disabled = true;
    this.disableAllOtherSameSwitch();
    if (ev.target?.checked) {
      this.initECGFilterSettings();
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
      this.ecg_chart.options.millisPerPixel = this.ecg_millis_per_px;
      this.ecg_ts = new TimeSeries();
      this.ecg_rms_ts = new TimeSeries();
      this.ecg_filter_ts = new TimeSeries();
      // this.ecg_chart.addTimeSeries(this.ecg_ts, ECG_PRESENTATION_OPTIONS);
      this.ecg_chart.streamTo(this.ecg_canvas, this.ecg_stream_delay);

      // this.ecg_chart.addPostRenderCallback(ECG_legend);

      this.updateECGRMSWinSize();
      this.updateECGRMSWin();

      this.ecg_resize = resizeSmoothieGen(this.ecg_chart, 1, 1);
      this.ecg_resize_observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === this.ECGDiv && this.ecg_resize !== undefined) {
            this.ecg_resize();
          }
        }
      });
      this.ecg_resize_observer.observe(this.ECGDiv);
      this.ecgFilterCoefReset();
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
    this.enableAllOtherSameSwitch();
  };

  onToggleACC = async (ev: any) => {
    this.disableAllOtherSameSwitch();
    if (this.ECGSwitchInput) {
      this.ECGSwitchInput.disabled = true;
    }
    if (ev.target?.checked) {
      this.initACCLowpassFilterSettings();
      this.initACCFilterSettings();
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
      this.acc_chart.options.millisPerPixel = this.acc_millis_per_px;

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

      this.acc_chart.streamTo(this.acc_canvas, this.acc_stream_delay);

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

      await this.startACC(this.acc_range_g, this.acc_sample_rate_hz);
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
    this.enableAllOtherSameSwitch();
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
        const acc_settings = await this.polarH10.getSensorSettingsFromId(
          PolarSensorType.ACC,
        );
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
    this.ecg_mss_win = undefined;
    this.ecg_chart = undefined;
    this.ecg_ts = undefined;
    this.ecg_filter_ts = undefined;
    this.ecg_rms_ts = undefined;
    this.ecg_resize_observer = undefined;
    this.ecg_filter_iir_coef = undefined;
    this.ecg_filter_iir = undefined;
    this.ecg_mss_win_i = 0;
    this.ecg_mss = 0;
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

  onBodypartSelect = (ev: any) => {
    const selectedInd = ev.target.selectedIndex;
    for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
      const row = PolarVisRow.polarVisRows[i];
      if (row !== this && row.polarH10 === this.polarH10) {
        row.bodypartSelect.selectedIndex = selectedInd;
      }
    }
  };

  onCustomBodyPart = (ev: any) => {
    const customBodyPartStr = ev.target.value;
    for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
      const row = PolarVisRow.polarVisRows[i];
      row.customBodyPart = customBodyPartStr;
      if (row.polarH10 === this.polarH10) {
        if (row.customBodyPartSpan !== undefined) {
          row.customBodyPartSpan.textContent = customBodyPartStr;
          row.customBodyPartInput.value = customBodyPartStr;
        }
      }
    }
    if (customBodyPartStr.length === 0) {
      for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
        const row = PolarVisRow.polarVisRows[i];
        if (row.polarH10 === this.polarH10) {
          row.customBodyPartSpan?.classList.add("hide");
          row.bodypartSelect?.classList.remove("hide");
        }
      }
    } else {
      for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
        const row = PolarVisRow.polarVisRows[i];
        if (row.polarH10 === this.polarH10) {
          row.customBodyPartSpan?.classList.remove("hide");
          row.bodypartSelect?.classList.add("hide");
        }
      }
    }
  };

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
      this.toggleVisConfig,
      ["btn", "btn-sm"],
    );
    if (this.showVisConfig) {
      this.filterConfigBtn.classList.add("btn-primary");
    }
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
      ["form-select", "dark-input", "select-sm", "almost-full-width"],
      "",
      BODY_PARTS,
      undefined,
      getPolarRowId,
    );
    this.bodypartSelect.addEventListener("change", this.onBodypartSelect);

    this.customBodyPartSpan = createSpan(
      "customBodyPartSpan",
      this.bodypartSelectDiv,
      ["hide", "hide-overflow"],
      this.customBodyPart,
    );

    this.dataCtrl = createDiv("dataCtrl", this.optionDiv, ["data-ctrl"]);

    this.visContainerDiv = createDiv("visContainer", this.polarSensorDiv, [
      "visContainer",
    ]);

    this.visConfigDiv = createDiv("visConfigDiv", this.polarSensorDiv, [
      "visContainer",
    ]);

    if (this.showVisConfig) {
      this.visContainerDiv.classList.add("hide");
    } else {
      this.visConfigDiv.classList.add("hide");
    }
    this.initVisConfigDiv();
  }

  onECGStreamDelayChange = (ev: any) => {
    if (ev.target.valueAsNumber < ECG_STREAM_DELAY_MIN_MS) {
      ev.target.valueAsNumber = ECG_STREAM_DELAY_MIN_MS;
      ev.target.value = ECG_STREAM_DELAY_MIN_MS.toString();
    } else if (ev.target.valueAsNumber > ECG_STREAM_DELAY_MAX_MS) {
      ev.target.valueAsNumber = ECG_STREAM_DELAY_MAX_MS;
      ev.target.value = ECG_STREAM_DELAY_MAX_MS.toString();
    }
    this.ecg_stream_delay = ev.target.valueAsNumber;
    if (this.ECGStreamDelayInput !== undefined) {
      this.ECGStreamDelayInput.value = ev.target.value;
    }
    if (this.ecg_chart !== undefined) {
      if ("delay" in this.ecg_chart) {
        this.ecg_chart.stop();
        this.ecg_chart.delay = this.ecg_stream_delay;
        this.ecg_chart.start();
      }
    }
  };

  onECGRMSWinInput = (ev: any) => {
    let rms_input = parseFloat(ev.target.value);
    if (rms_input < ECG_RMS_WIN_MIN_MS) {
      rms_input = ECG_RMS_WIN_MIN_MS;
    }
    if (rms_input > ECG_RMS_WIN_MAX_MS) {
      rms_input = ECG_RMS_WIN_MAX_MS;
    }
    this.ecg_rms_window_ms = rms_input;
    this.updateECGRMSWinSize();
    this.updateECGRMSWin();
    this.ecgFilterSelectGraphRestart();
  };

  onACCStreamDelayChange = (ev: any) => {
    if (ev.target.valueAsNumber < ACC_STREAM_DELAY_MIN_MS) {
      ev.target.valueAsNumber = ACC_STREAM_DELAY_MIN_MS;
      ev.target.value = ACC_STREAM_DELAY_MIN_MS.toString();
    } else if (ev.target.valueAsNumber > ACC_STREAM_DELAY_MAX_MS) {
      ev.target.valueAsNumber = ACC_STREAM_DELAY_MAX_MS;
      ev.target.value = ACC_STREAM_DELAY_MAX_MS.toString();
    }
    this.acc_stream_delay = ev.target.valueAsNumber;
    if (this.ACCStreamDelayInput !== undefined) {
      this.ACCStreamDelayInput.value = ev.target.value;
    }
    if (this.acc_chart !== undefined) {
      if ("delay" in this.acc_chart) {
        this.acc_chart.stop();
        this.acc_chart.delay = this.acc_stream_delay;
        this.acc_chart.start();
      }
    }
  };

  onECGMPPChange = (ev: any) => {
    if (ev.target.valueAsNumber < ECG_MS_PER_PX_MIN) {
      ev.target.valueAsNumber = ECG_MS_PER_PX_MIN;
      ev.target.value = ECG_MS_PER_PX_MIN.toString();
    } else if (ev.target.valueAsNumber > ECG_MS_PER_PX_MAX) {
      ev.target.valueAsNumber = ECG_MS_PER_PX_MAX;
      ev.target.value = ECG_MS_PER_PX_MAX.toString();
    }
    this.ecg_millis_per_px = ev.target.valueAsNumber;
    if (this.ECGstreamMPPInput !== undefined) {
      this.ECGstreamMPPInput.value = ev.target.value;
    }
    if (this.ecg_chart !== undefined) {
      this.ecg_chart.stop();
      this.ecg_chart.options.millisPerPixel = this.ecg_millis_per_px;
      this.ecg_chart.start();
    }
  };

  onACCMPPChange = (ev: any) => {
    if (ev.target.valueAsNumber < ACC_MS_PER_PX_MIN) {
      ev.target.valueAsNumber = ACC_MS_PER_PX_MIN;
      ev.target.value = ACC_MS_PER_PX_MIN.toString();
    } else if (ev.target.valueAsNumber > ACC_MS_PER_PX_MAX) {
      ev.target.valueAsNumber = ACC_MS_PER_PX_MAX;
      ev.target.value = ACC_MS_PER_PX_MAX.toString();
    }
    this.acc_millis_per_px = ev.target.valueAsNumber;
    if (this.ACCstreamMPPInput !== undefined) {
      this.ACCstreamMPPInput.value = ev.target.value;
    }
    if (this.acc_chart !== undefined) {
      this.acc_chart.stop();
      this.acc_chart.options.millisPerPixel = this.acc_millis_per_px;
      this.acc_chart.start();
    }
  };

  onACCRangeSelect = async (ev: any) => {
    const selectedInd = ev.target.selectedIndex;
    const ACCRange = ACC_RANGE_OPTIONS[selectedInd];
    for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
      const row = PolarVisRow.polarVisRows[i];
      if (row.polarH10 === this.polarH10) {
        if (row.ACCRangeSelect !== undefined) {
          row.ACCRangeSelect.selectedIndex = selectedInd;
        }
        row.acc_range_g = ACCRange;
        row.initACCLowpassFilterSettings();
        row.initACCFilterSettings();
      }
    }
    await this.restartAllACC();
  };

  onACCSampleRateSelect = async (ev: any) => {
    const selectedInd = ev.target.selectedIndex;
    const ACCSampleRate = ACC_SAMPLE_RATE_OPTIONS[selectedInd];

    for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
      const row = PolarVisRow.polarVisRows[i];
      if (row.polarH10 === this.polarH10) {
        if (row.ACCSampleRateSelect !== undefined) {
          row.ACCSampleRateSelect.selectedIndex = selectedInd;
        }
        row.acc_sample_rate_hz = ACCSampleRate;
        row.initACCLowpassFilterSettings();
        row.initACCFilterSettings();
      }
    }
    await this.restartAllACC();
  };

  onECGFilterType = (ev: any) => {
    const selectedInd = ev.target.selectedIndex;
    if (selectedInd === 2) {
      this.ecg_filter_info.Fl = ECG_BANDPASS_LOW_CUT_HZ;
      this.ecg_filter_info.Fh = ECG_BANDPASS_HIGH_CUT_HZ;
      this.ecg_filter_info.BW =
        ECG_BANDPASS_HIGH_CUT_HZ - ECG_BANDPASS_LOW_CUT_HZ;
      this.ecg_filter_info.Fc = Math.sqrt(
        ECG_BANDPASS_LOW_CUT_HZ * ECG_BANDPASS_HIGH_CUT_HZ,
      );
      if (this.ECGFilterLowCutInput !== undefined) {
        this.ECGFilterLowCutInput.value = ECG_BANDPASS_LOW_CUT_HZ.toString();
      }
      if (this.ECGFilterHighCutInput !== undefined) {
        this.ECGFilterHighCutInput.value = ECG_BANDPASS_HIGH_CUT_HZ.toString();
      }
    } else {
      this.ecg_filter_info.Fc = ECG_HIGHLOWPASS_CUTOFF_HZ;
      if (this.ECGFilterCutoffInput !== undefined) {
        this.ECGFilterCutoffInput.value = ECG_HIGHLOWPASS_CUTOFF_HZ.toString();
      }
    }
    if (this.ECGFilterCutoffInput !== undefined) {
      if (selectedInd === 2) {
        this.ECGFilterCutoffInput.classList.add("hide");
      } else {
        this.ECGFilterCutoffInput.classList.remove("hide");
      }
    }
    if (this.ECGFilterLowCutInput !== undefined) {
      if (selectedInd === 2) {
        this.ECGFilterLowCutInput.classList.remove("hide");
      } else {
        this.ECGFilterLowCutInput.classList.add("hide");
      }
    }
    if (this.ECGFilterHighCutInput !== undefined) {
      if (selectedInd === 2) {
        this.ECGFilterHighCutInput.classList.remove("hide");
      } else {
        this.ECGFilterHighCutInput.classList.add("hide");
      }
    }
    const ECGFilterType = FILTER_TYPES[selectedInd];
    this.ecg_filter_info.type = ECGFilterType;
    this.ecgFilterSelectGraphRestart();
  };

  onACCFilterType = (ev: any) => {
    const selectedInd = ev.target.selectedIndex;
    if (selectedInd === 2) {
      this.acc_filter_info.Fl = AAC_FILTER_BANDPASS_LOW_CUT_HZ;
      this.acc_filter_info.Fh = AAC_FILTER_BANDPASS_HIGH_CUT_HZ;
      this.acc_filter_info.BW =
        AAC_FILTER_BANDPASS_HIGH_CUT_HZ - AAC_FILTER_BANDPASS_LOW_CUT_HZ;
      this.acc_filter_info.Fc = Math.sqrt(
        AAC_FILTER_BANDPASS_LOW_CUT_HZ * AAC_FILTER_BANDPASS_HIGH_CUT_HZ,
      );
      if (this.ACCFilterLowCutInput !== undefined) {
        this.ACCFilterLowCutInput.value =
          AAC_FILTER_BANDPASS_LOW_CUT_HZ.toString();
      }
      if (this.ACCFilterHighCutInput !== undefined) {
        this.ACCFilterHighCutInput.value =
          AAC_FILTER_BANDPASS_HIGH_CUT_HZ.toString();
      }
    } else {
      this.acc_filter_info.Fc = AAC_FILTER_BANDPASS_HIGH_CUT_HZ;
      if (this.ACCFilterCutoffInput !== undefined) {
        this.ACCFilterCutoffInput.value =
          AAC_FILTER_BANDPASS_HIGH_CUT_HZ.toString();
      }
    }
    if (this.ACCFilterCutoffInput !== undefined) {
      if (selectedInd === 2) {
        this.ACCFilterCutoffInput.classList.add("hide");
      } else {
        this.ACCFilterCutoffInput.classList.remove("hide");
      }
    }
    if (this.ACCFilterLowCutInput !== undefined) {
      if (selectedInd === 2) {
        this.ACCFilterLowCutInput.classList.remove("hide");
      } else {
        this.ACCFilterLowCutInput.classList.add("hide");
      }
    }
    if (this.ACCFilterHighCutInput !== undefined) {
      if (selectedInd === 2) {
        this.ACCFilterHighCutInput.classList.remove("hide");
      } else {
        this.ACCFilterHighCutInput.classList.add("hide");
      }
    }
    const ACCFilterType = FILTER_TYPES[selectedInd];
    this.acc_filter_info.type = ACCFilterType;
    this.accFilterSelectGraphRestart(3);
  };

  onECGFilterOrder = (ev: any) => {
    let newOrder = parseInt(ev.target.value);
    if (newOrder < 1) {
      newOrder = 1;
    }
    if (newOrder > 12) {
      newOrder = 12;
    }
    this.ecg_filter_info.order = newOrder as FilterInfo["order"];
    this.ecgFilterSelectGraphRestart();
  };

  onACCFilterOrder = (ev: any) => {
    let newOrder = parseInt(ev.target.value);
    if (newOrder < 1) {
      newOrder = 1;
    }
    if (newOrder > 12) {
      newOrder = 12;
    }
    this.acc_filter_info.order = newOrder as FilterInfo["order"];
    this.accFilterSelectGraphRestart(3);
  };

  onACCLPOrder = (ev: any) => {
    let newOrder = parseInt(ev.target.value);
    if (newOrder < 1) {
      newOrder = 1;
    }
    if (newOrder > 12) {
      newOrder = 12;
    }
    this.acc_lp_info.order = newOrder as FilterInfo["order"];
    this.accFilterSelectGraphRestart(1);
  };

  onECGFilterChar = (ev: any) => {
    const selectedInd = ev.target.selectedIndex;
    const ECGFilterChar = FILTER_CHARACTERISTICS[selectedInd];
    this.ecg_filter_info.characteristic = ECGFilterChar;
    this.ecgFilterSelectGraphRestart();
  };

  onACCFilterChar = (ev: any) => {
    const selectedInd = ev.target.selectedIndex;
    const ACCFilterChar = FILTER_CHARACTERISTICS[selectedInd];
    this.acc_filter_info.characteristic = ACCFilterChar;
    this.accFilterSelectGraphRestart(3);
  };

  onACCLPChar = (ev: any) => {
    const selectedInd = ev.target.selectedIndex;
    const ACCLPChar = FILTER_CHARACTERISTICS[selectedInd];
    this.acc_lp_info.characteristic = ACCLPChar;
    this.accFilterSelectGraphRestart(1);
  };

  onECGFilterCutoff = (ev: any) => {
    let cutOff = parseFloat(ev.target.value);
    if (cutOff < ECG_BAND_LOW_MIN_HZ) {
      cutOff = ECG_BAND_LOW_MIN_HZ;
    }
    if (cutOff > ECG_BAND_HIGH_MAX_HZ) {
      cutOff = ECG_BAND_HIGH_MAX_HZ;
    }
    if (this.ECGFilterCutoffInput !== undefined) {
      this.ECGFilterCutoffInput.value = cutOff.toString();
    }
    this.ecg_filter_info.Fc = cutOff;
    this.ecgFilterSelectGraphRestart();
  };

  onACCFilterCutoff = (ev: any) => {
    let cutOff = parseFloat(ev.target.value);
    if (cutOff < ACC_BAND_LOW_MIN_HZ) {
      cutOff = ACC_BAND_LOW_MIN_HZ;
    }
    if (cutOff > ACC_BAND_HIGH_MAX_HZ) {
      cutOff = ACC_BAND_HIGH_MAX_HZ;
    }
    if (this.ACCFilterCutoffInput !== undefined) {
      this.ACCFilterCutoffInput.value = cutOff.toString();
    }
    this.acc_filter_info.Fc = cutOff;
    this.accFilterSelectGraphRestart(3);
  };

  onACCLPCutoff = (ev: any) => {
    let cutOff = parseFloat(ev.target.value);
    if (cutOff < ACC_BAND_LOW_MIN_HZ) {
      cutOff = ACC_BAND_LOW_MIN_HZ;
    }
    if (cutOff > ACC_BAND_HIGH_MAX_HZ) {
      cutOff = ACC_BAND_HIGH_MAX_HZ;
    }
    if (this.ACCLPCutoffInput !== undefined) {
      this.ACCLPCutoffInput.value = cutOff.toString();
    }
    this.acc_lp_info.Fc = cutOff;
    this.accFilterSelectGraphRestart(1);
  };

  onECGFilterLowCutoff = (ev: any) => {
    let cutOff = parseFloat(ev.target.value);
    if (this.ecg_filter_info.Fh !== undefined) {
      if (cutOff >= this.ecg_filter_info.Fh) {
        cutOff = this.ecg_filter_info.Fh - ECG_BAND_HIGH_STEP_HZ;
      }
    }
    if (cutOff > ECG_BAND_HIGH_MAX_HZ) {
      cutOff = ECG_BAND_LOW_MIN_HZ;
    }
    if (cutOff < ECG_BAND_LOW_MIN_HZ) {
      cutOff = ECG_BAND_LOW_MIN_HZ;
    }

    this.ecg_filter_info.Fl = cutOff;
    this.updateBandpass(this.ecg_filter_info);
    if (this.ECGFilterHighCutInput !== undefined) {
      this.ECGFilterHighCutInput.min = (
        cutOff + ECG_BAND_HIGH_STEP_HZ
      ).toString();
      if (this.ECGFilterLowCutInput !== undefined) {
        this.ECGFilterLowCutInput.value = cutOff.toString();
      }
    }
    this.ecgFilterSelectGraphRestart();
  };

  onACCFilterLowCutoff = (ev: any) => {
    let cutOff = parseFloat(ev.target.value);
    if (this.acc_filter_info.Fh !== undefined) {
      if (cutOff >= this.acc_filter_info.Fh) {
        cutOff = this.acc_filter_info.Fh - ACC_BAND_HIGH_STEP_HZ;
      }
    }
    if (cutOff > ACC_BAND_HIGH_MAX_HZ) {
      cutOff = ACC_BAND_LOW_MIN_HZ;
    }
    if (cutOff < ACC_BAND_LOW_MIN_HZ) {
      cutOff = ACC_BAND_LOW_MIN_HZ;
    }

    this.acc_filter_info.Fl = cutOff;
    this.updateBandpass(this.acc_filter_info);
    if (this.ACCFilterHighCutInput !== undefined) {
      this.ACCFilterHighCutInput.min = (
        cutOff + ACC_BAND_HIGH_STEP_HZ
      ).toString();
      if (this.ACCFilterLowCutInput !== undefined) {
        this.ACCFilterLowCutInput.value = cutOff.toString();
      }
    }
    this.accFilterSelectGraphRestart(3);
  };

  onECGFilterHighCutoff = (ev: any) => {
    let cutOff = parseFloat(ev.target.value);
    if (this.ecg_filter_info.Fl !== undefined) {
      if (cutOff <= this.ecg_filter_info.Fl) {
        cutOff = this.ecg_filter_info.Fl + ECG_BAND_HIGH_STEP_HZ;
      }
    }
    if (cutOff > ECG_BAND_HIGH_MAX_HZ) {
      cutOff = ECG_BAND_LOW_MIN_HZ;
    }
    if (cutOff < ECG_BAND_LOW_MIN_HZ) {
      cutOff = ECG_BAND_LOW_MIN_HZ;
    }

    this.ecg_filter_info.Fh = cutOff;
    this.updateBandpass(this.ecg_filter_info);
    if (this.ECGFilterLowCutInput !== undefined) {
      this.ECGFilterLowCutInput.max = (
        cutOff - ECG_BAND_HIGH_STEP_HZ
      ).toString();
      if (this.ECGFilterHighCutInput !== undefined) {
        this.ECGFilterHighCutInput.value = cutOff.toString();
      }
    }
    this.ecgFilterSelectGraphRestart();
  };

  onACCFilterHighCutoff = (ev: any) => {
    let cutOff = parseFloat(ev.target.value);
    if (this.acc_filter_info.Fl !== undefined) {
      if (cutOff <= this.acc_filter_info.Fl) {
        cutOff = this.acc_filter_info.Fl + ACC_BAND_HIGH_STEP_HZ;
      }
    }
    if (cutOff > ACC_BAND_HIGH_MAX_HZ) {
      cutOff = ACC_BAND_LOW_MIN_HZ;
    }
    if (cutOff < ACC_BAND_LOW_MIN_HZ) {
      cutOff = ACC_BAND_LOW_MIN_HZ;
    }

    this.acc_filter_info.Fh = cutOff;
    this.updateBandpass(this.acc_filter_info);
    if (this.ACCFilterLowCutInput !== undefined) {
      this.ACCFilterLowCutInput.max = (
        cutOff - ACC_BAND_HIGH_STEP_HZ
      ).toString();
      if (this.ACCFilterHighCutInput !== undefined) {
        this.ACCFilterHighCutInput.value = cutOff.toString();
      }
    }
    this.accFilterSelectGraphRestart(3);
  };

  ecgFilterSelectGraphRestart() {
    this.ecgFilterCoefReset();
    const preSelected = this.ECGFormSelect.selectedIndex;
    const preDisabled = this.ECGFormSelect.disabled;
    this.generateECGFormSelect();
    this.ECGFormSelect.disabled = preDisabled;
    this.ECGFormSelect.selectedIndex = preSelected;
    if (preSelected === 1) {
      this.changeECGGraph({ target: { selectedIndex: preSelected } });
    }
  }

  accFilterSelectGraphRestart(target: number = 3) {
    this.accFilterCoefReset();
    const preSelected = this.ACCFormSelect.selectedIndex;
    const preDisabled = this.ACCFormSelect.disabled;
    this.generateACCFormSelect();
    this.ACCFormSelect.disabled = preDisabled;
    this.ACCFormSelect.selectedIndex = preSelected;
    if (preSelected === target) {
      this.changeACCGraph({ target: { selectedIndex: preSelected } });
    }
  }

  ecgFilterCoefReset() {
    this.ecg_filter_iir_coef = IIRCalc[this.ecg_filter_info.type](
      this.ecg_filter_info,
    );
    this.ecg_filter_iir = IirFilter(this.ecg_filter_iir_coef);
  }

  accFilterCoefReset() {
    this.acc_filter_iir_coef = IIRCalc[this.acc_filter_info.type](
      this.acc_filter_info,
    );
    this.acc_x_filter_iir = IirFilter(this.acc_filter_iir_coef);
    this.acc_y_filter_iir = IirFilter(this.acc_filter_iir_coef);
    this.acc_z_filter_iir = IirFilter(this.acc_filter_iir_coef);
    this.acc_mag_filter_iir = IirFilter(this.acc_filter_iir_coef);
  }

  async restartAllACC() {
    const ACCOnRows: PolarVisRow[] = [];
    for (let i = 0; i < PolarVisRow.polarVisRows.length; i++) {
      const row = PolarVisRow.polarVisRows[i];
      if (row.polarH10 === this.polarH10) {
        if (row.ACCIsOn()) {
          await row.onToggleACC({ target: { checked: false } });
          ACCOnRows.push(row);
        }
      }
    }
    for (let i = 0; i < ACCOnRows.length; i++) {
      await ACCOnRows[i].onToggleACC({ target: { checked: true } });
    }
  }

  private initVisConfigDiv() {
    this.ECGConfigDiv = createDiv("ECGConfigDiv", this.visConfigDiv, [
      "float-left",
      "almost-full-height",
      "config-div",
      "half-width",
      "flexbox",
      "flex-col",
    ]);

    const ECGTitleRow = createDiv("ECGChartConfigTitleRow", this.ECGConfigDiv, [
      "full-width",
      "flexbox",
    ]);

    createDiv(
      "ECGChartConfigTitle",
      ECGTitleRow,
      ["fourty-width", "center", "bold-text"],
      "EXG Visualization Configs",
    );

    const customBodypartInputDiv = createDiv(
      "customBodypartInputDiv",
      ECGTitleRow,
      ["sixty-width", "flexbox"],
    );

    const customBodypartSpan = createSpan(
      "customBodypartSpan",
      customBodypartInputDiv,
      ["padright-5px", "padleft-5px"],
      "Custom Bodypart:",
    );

    this.customBodyPartInput = createTextInput(
      "customBodyPartInput",
      customBodypartInputDiv,
      ["dark-input", "custom-bodypart-input-width"],
    );
    this.customBodyPartInput.addEventListener("input", this.onCustomBodyPart);

    this.ECGChartConfigDiv = createDiv("ECGChartConfigDiv", this.ECGConfigDiv, [
      "full-width",
      "flexbox",
    ]);

    const ECGstreamDelayDiv = createDiv(
      "ECGChartStreamDelay",
      this.ECGChartConfigDiv,
      ["full-width", "flexbox"],
    );

    createSpan(
      "ECGStreamDelayLabel",
      ECGstreamDelayDiv,
      ["padleft-5px", "padright-5px"],
      "Delay (ms):",
    );

    this.ECGStreamDelayInput = createNumInput(
      "ECGStreamDelayInput",
      ECGstreamDelayDiv,
      ["marginright-5px", "dark-input", "input-width-4_5"],
      ECG_STREAM_DELAY_MIN_MS,
      ECG_STREAM_DELAY_MAX_MS,
      ECG_STREAM_DELAY_STEP_MS,
      this.ecg_stream_delay,
    );
    this.ECGStreamDelayInput.addEventListener(
      "change",
      this.onECGStreamDelayChange,
    );

    createSpan(
      "ECGStreamDataWidthLabel",
      ECGstreamDelayDiv,
      ["padright-5px"],
      "Data width (ms/px):",
    );

    this.ECGstreamMPPInput = createNumInput(
      "ECGStreamMPPInput",
      ECGstreamDelayDiv,
      ["marginright-5px", "dark-input", "input-width-3_5"],
      ECG_MS_PER_PX_MIN,
      ECG_MS_PER_PX_MAX,
      ECG_MS_PER_PX_STEP,
      this.ecg_millis_per_px,
    );
    this.ECGstreamMPPInput.addEventListener("change", this.onECGMPPChange);

    createSpan(
      "ECGSRMSLabel",
      ECGstreamDelayDiv,
      ["padright-5px"],
      "RMS window (ms): ",
    );

    this.ECGRMSWinInput = createNumInput(
      "ECGRMSWinInput",
      ECGstreamDelayDiv,
      ["marginright-5px", "dark-input", "input-width-4_5"],
      ECG_RMS_WIN_MIN_MS,
      ECG_RMS_WIN_MAX_MS,
      ECG_RMS_WIN_STEP_MS,
      this.ecg_rms_window_ms,
    );
    this.ECGRMSWinInput.addEventListener("change", this.onECGRMSWinInput);

    this.ECGFilterConfigDiv = createDiv(
      "ECGFilterConfigDiv",
      this.ECGConfigDiv,
      ["full-width", "flexbox"],
    );

    createSpan(
      "ECGFilterTypeSpan",
      this.ECGFilterConfigDiv,
      ["padleft-5px", "padright-5px"],
      "Filter Type:",
    );
    this.ECGFilterTypesSelect = createSelect(
      "ECGFilterTypesSelect",
      this.ECGFilterConfigDiv,
      ["form-select", "dark-input", "select-sm", "filter-type-width"],
      "",
      FILTER_TYPES,
      FILTER_TYPES.indexOf(this.ecg_filter_info.type),
    );
    this.ECGFilterTypesSelect.addEventListener("change", this.onECGFilterType);

    createSpan(
      "ECGFilterCharSpan",
      this.ECGFilterConfigDiv,
      ["padleft-5px", "padright-5px"],
      "Char:",
    );
    this.ECGFilteCharSelect = createSelect(
      "ECGFilteCharSelect",
      this.ECGFilterConfigDiv,
      ["form-select", "dark-input", "select-sm", "filter-char-width"],
      "",
      FILTER_CHARACTERISTICS,
      FILTER_CHARACTERISTICS.indexOf(this.ecg_filter_info.characteristic),
    );
    this.ECGFilteCharSelect.addEventListener("change", this.onECGFilterChar);

    createSpan(
      "ECGFilterOrderSpan",
      this.ECGFilterConfigDiv,
      ["padleft-5px", "padright-5px"],
      "Order:",
    );

    this.ECGFilterOrderInput = createNumInput(
      "ECGFilterOrderInput",
      this.ECGFilterConfigDiv,
      ["dark-input", "input-width-3_5"],
      1,
      12,
      1,
      this.ecg_filter_info.order,
    );
    this.ECGFilterOrderInput.addEventListener("change", this.onECGFilterOrder);

    createSpan(
      "ECGFilterCutoffSpan",
      this.ECGFilterConfigDiv,
      ["padleft-5px", "padright-5px"],
      "Cutoff (Hz):",
    );

    this.ECGFilterCutoffInput = createNumInput(
      "ECGFilterCutoffInput",
      this.ECGFilterConfigDiv,
      ["dark-input", "freq-input-width"],
      ECG_BAND_LOW_MIN_HZ,
      ECG_BAND_HIGH_MAX_HZ,
      ECG_BAND_HIGH_STEP_HZ,
      this.ecg_filter_info.Fc,
    );
    this.ECGFilterCutoffInput.addEventListener(
      "change",
      this.onECGFilterCutoff,
    );

    this.ECGFilterLowCutInput = createNumInput(
      "ECGFilterLowCutInput",
      this.ECGFilterConfigDiv,
      ["margin-left-5", "dark-input", "freq-input-width", "hide"],
      ECG_BAND_LOW_MIN_HZ,
      this.ecg_filter_info.Fh,
      ECG_BAND_HIGH_STEP_HZ,
      this.ecg_filter_info.Fl,
    );
    this.ECGFilterLowCutInput.addEventListener(
      "change",
      this.onECGFilterLowCutoff,
    );

    this.ECGFilterHighCutInput = createNumInput(
      "ECGFilterHighCutInput",
      this.ECGFilterConfigDiv,
      ["margin-left-5", "dark-input", "freq-input-width", "hide"],
      this.ecg_filter_info.Fl,
      ECG_BAND_HIGH_MAX_HZ,
      ECG_BAND_HIGH_STEP_HZ,
      this.ecg_filter_info.Fh,
    );
    this.ECGFilterHighCutInput.addEventListener(
      "change",
      this.onECGFilterHighCutoff,
    );

    if (this.ECGFilterTypesSelect.selectedIndex === 2) {
      this.ECGFilterCutoffInput.classList.add("hide");
      this.ECGFilterLowCutInput.classList.remove("hide");
      this.ECGFilterHighCutInput.classList.remove("hide");
    }

    this.ECGRMSConfigDiv = createDiv("ECGRMSConfigDiv", this.ECGConfigDiv, [
      "full-width",
    ]);

    this.ACCConfigDiv = createDiv("ACCConfigDiv", this.visConfigDiv, [
      "float-left",
      "almost-full-height",
      "config-div",
      "half-width",
      "flexbox",
      "flex-col",
    ]);

    const ACCTitleRow = createDiv("ECGChartConfigTitleRow", this.ACCConfigDiv, [
      "full-width",
      "flexbox",
    ]);

    createDiv(
      "ACCChartConfigTitle",
      ACCTitleRow,
      ["fourty-width", "center", "bold-text"],
      "Accelerometer Visualization Configs",
    );

    const ACCSampleRateRange = createDiv("ACCSampleRateRange", ACCTitleRow, [
      "sixty-width",
    ]);
    const ACCSampleRateSpan = createSpan(
      "ACCSampleRateSpan",
      ACCSampleRateRange,
      ["padright-5px", "padleft-5px"],
      "Fs (Hz):",
    );

    this.ACCSampleRateSelect = createSelect(
      "ACCSampleRateSelect",
      ACCSampleRateRange,
      ["form-select", "dark-input", "select-sm", "input-width-4_5"],
      "",
      ACC_SAMPLE_RATE_OPTIONS,
      ACC_SAMPLE_RATE_OPTIONS.indexOf(this.acc_sample_rate_hz),
    );
    this.ACCSampleRateSelect.addEventListener(
      "change",
      this.onACCSampleRateSelect,
    );

    const ACCRangeSpan = createSpan(
      "ACCRangeSpan",
      ACCSampleRateRange,
      ["padright-5px", "padleft-5px"],
      "Range (±G):",
    );

    this.ACCRangeSelect = createSelect(
      "ACCRangeSelect",
      ACCSampleRateRange,
      ["form-select", "dark-input", "select-sm", "input-width-3_5"],
      "",
      ACC_RANGE_OPTIONS,
      ACC_RANGE_OPTIONS.indexOf(this.acc_range_g),
    );

    this.ACCRangeSelect.addEventListener("change", this.onACCRangeSelect);

    this.ACCChartConfigDiv = createDiv("ACCChartConfigDiv", this.ACCConfigDiv, [
      "full-width",
      "flexbox",
    ]);

    const ACCDisplaySettingsDiv = createDiv(
      "ACCDisplaySettingsDiv",
      this.ACCChartConfigDiv,
      ["full-width", "flexbox"],
    );

    createSpan(
      "ACCStreamDelayLabel",
      ACCDisplaySettingsDiv,
      ["padleft-5px", "padright-5px"],
      "Delay (ms):",
    );

    this.ACCStreamDelayInput = createNumInput(
      "ACCStreamDelayInput",
      ACCDisplaySettingsDiv,
      ["marginright-5px", "dark-input", "input-width-4_5"],
      ACC_STREAM_DELAY_MIN_MS,
      ACC_STREAM_DELAY_MAX_MS,
      ACC_STREAM_DELAY_STEP_MS,
      this.acc_stream_delay,
    );
    this.ACCStreamDelayInput.addEventListener(
      "change",
      this.onACCStreamDelayChange,
    );

    createSpan(
      "ACCStreamDataWidthLabel",
      ACCDisplaySettingsDiv,
      ["padright-5px"],
      "Data width (ms/px):",
    );

    this.ACCstreamMPPInput = createNumInput(
      "ACCSteamMPPInput",
      ACCDisplaySettingsDiv,
      ["marginright-5px", "dark-input", "input-width-3_5"],
      ACC_MS_PER_PX_MIN,
      ACC_MS_PER_PX_MAX,
      ACC_MS_PER_PX_STEP,
    );
    this.ACCstreamMPPInput.value = this.acc_millis_per_px.toString();
    this.ACCstreamMPPInput.addEventListener("change", this.onACCMPPChange);

    this.ACCLPConfigDiv = createDiv("ACCLPConfigDiv", this.ACCConfigDiv, [
      "full-width",
      "flexbox",
    ]);

    createSpan(
      "ACCLPCharSpan",
      this.ACCLPConfigDiv,
      ["padleft-5px", "padright-5px"],
      "Lowpass filter characteristic:",
    );

    this.ACCLPCharSelect = createSelect(
      "ACCLPCharSelect",
      this.ACCLPConfigDiv,
      ["form-select", "dark-input", "select-sm", "filter-char-width"],
      "",
      FILTER_CHARACTERISTICS,
      FILTER_CHARACTERISTICS.indexOf(this.acc_lp_info.characteristic),
    );
    this.ACCLPCharSelect.addEventListener("change", this.onACCLPChar);

    createSpan(
      "ACCLPOrderSpan",
      this.ACCLPConfigDiv,
      ["padleft-5px", "padright-5px"],
      "Order:",
    );

    this.ACCLPOrderInput = createNumInput(
      "ACCLPOrderInput",
      this.ACCLPConfigDiv,
      ["dark-input", "input-width-3_5"],
      1,
      12,
      1,
      this.acc_lp_info.order,
    );
    this.ACCLPOrderInput.addEventListener("change", this.onACCLPOrder);

    createSpan(
      "ACCLPCutoffSpan",
      this.ACCLPConfigDiv,
      ["padleft-5px", "padright-5px"],
      "Cutoff (Hz):",
    );

    this.ACCLPCutoffInput = createNumInput(
      "ACCLPCutoffInput",
      this.ACCLPConfigDiv,
      ["dark-input", "freq-input-width"],
      ACC_BAND_LOW_MIN_HZ,
      ACC_SAMPLE_RATE_OPTIONS[this.ACCSampleRateSelect.selectedIndex] / 2,
      ECG_BAND_HIGH_STEP_HZ,
      this.acc_lp_info.Fc,
    );
    this.ACCLPCutoffInput.addEventListener("change", this.onACCLPCutoff);

    //-------------------------------------------------------------------------//
    this.ACCFilterConfigDiv = createDiv(
      "ACCFilterConfigDiv",
      this.ACCConfigDiv,
      ["full-width", "flexbox"],
    );

    createSpan(
      "ACCFilterTypeSpan",
      this.ACCFilterConfigDiv,
      ["padleft-5px", "padright-5px"],
      "Filter Type:",
    );
    this.ACCFilterTypesSelect = createSelect(
      "ACCFilterTypesSelect",
      this.ACCFilterConfigDiv,
      ["form-select", "dark-input", "select-sm", "filter-type-width"],
      "",
      FILTER_TYPES,
      FILTER_TYPES.indexOf(this.acc_filter_info.type),
    );
    this.ACCFilterTypesSelect.addEventListener("change", this.onACCFilterType);

    createSpan(
      "ACCFilterCharSpan",
      this.ACCFilterConfigDiv,
      ["padleft-5px", "padright-5px"],
      "Char:",
    );
    this.ACCFilterCharSelect = createSelect(
      "ACCFilterCharSelect",
      this.ACCFilterConfigDiv,
      ["form-select", "dark-input", "select-sm", "filter-char-width"],
      "",
      FILTER_CHARACTERISTICS,
      FILTER_CHARACTERISTICS.indexOf(this.acc_filter_info.characteristic),
    );
    this.ACCFilterCharSelect.addEventListener("change", this.onACCFilterChar);

    createSpan(
      "ACCFilterOrderSpan",
      this.ACCFilterConfigDiv,
      ["padleft-5px", "padright-5px"],
      "Order:",
    );

    this.ACCFilterOrderInput = createNumInput(
      "ACCFilterOrderInput",
      this.ACCFilterConfigDiv,
      ["dark-input", "input-width-3_5"],
      1,
      12,
      1,
      this.acc_filter_info.order,
    );
    this.ACCFilterOrderInput.addEventListener("change", this.onACCFilterOrder);

    createSpan(
      "ACCFilterCutoffSpan",
      this.ACCFilterConfigDiv,
      ["padleft-5px", "padright-5px"],
      "Cutoff (Hz):",
    );

    this.ACCFilterCutoffInput = createNumInput(
      "ACCFilterCutoffInput",
      this.ACCFilterConfigDiv,
      ["dark-input", "freq-input-width", "hide"],
      ACC_BAND_LOW_MIN_HZ,
      ACC_SAMPLE_RATE_OPTIONS[this.ACCSampleRateSelect.selectedIndex] / 2,
      ECG_BAND_HIGH_STEP_HZ,
      this.acc_filter_info.Fc,
    );
    this.ACCFilterCutoffInput.addEventListener(
      "change",
      this.onACCFilterCutoff,
    );

    this.ACCFilterLowCutInput = createNumInput(
      "ACCFilterLowCutInput",
      this.ACCFilterConfigDiv,
      ["margin-left-5", "dark-input", "freq-input-width"],
      ACC_BAND_LOW_MIN_HZ,
      this.acc_filter_info.Fh,
      ACC_BAND_HIGH_STEP_HZ,
      this.acc_filter_info.Fl,
    );
    this.ACCFilterLowCutInput.addEventListener(
      "change",
      this.onACCFilterLowCutoff,
    );

    this.ACCFilterHighCutInput = createNumInput(
      "ACCFilterHighCutInput",
      this.ACCFilterConfigDiv,
      ["margin-left-5", "dark-input", "freq-input-width"],
      this.acc_filter_info.Fl,
      ACC_BAND_HIGH_MAX_HZ,
      ACC_BAND_HIGH_STEP_HZ,
      this.acc_filter_info.Fh,
    );
    this.ACCFilterHighCutInput.addEventListener(
      "change",
      this.onACCFilterHighCutoff,
    );

    if (this.ACCFilterTypesSelect.selectedIndex !== 2) {
      this.ACCFilterCutoffInput.classList.remove("hide");
      this.ACCFilterLowCutInput.classList.add("hide");
      this.ACCFilterHighCutInput.classList.add("hide");
    }
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
      ["form-select", "dark-input", "select-sm", "almost-full-width"],
      "",
      [
        "Raw",
        compactPrettyPrintFilter(this.ecg_filter_info),
        `${this.ecg_rms_window_ms}ms RMS`,
      ],
      selectedInd,
    );
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
      ["form-select", "dark-input", "select-sm", "almost-full-width"],
      "",
      [
        "Raw",
        compactPrettyPrintFilter(this.acc_lp_info),
        "Tilt",
        compactPrettyPrintFilter(this.acc_filter_info),
      ],
      selectedInd,
    );
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
        if (e.name === "NetworkError") {
          this.disconnectPolarH10();
        }
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
        if (e.name === "NetworkError") {
          this.disconnectPolarH10();
        }
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
  options: string[] | number[] = [],
  selectedInd: number | undefined = undefined,
  idGenerator: () => number = getPolarRowId,
) {
  const select = document.createElement("select");
  configureHTMLElement(select, id, parent, classList, textContent, idGenerator);
  addOptionsToSelect(select, options, idGenerator);
  if (selectedInd !== undefined) {
    select.selectedIndex = selectedInd;
  }
  return select;
}

function addOptionsToSelect(
  select: HTMLSelectElement,
  options: string[] | number[],
  idGenerator: () => number = getPolarRowId,
) {
  for (let i = 0; i < options.length; i++) {
    const option_str = options[i];
    const option: HTMLOptionElement = document.createElement("option");
    option.id = `${select.id}-${i}-${idGenerator()}`;
    option.textContent = option_str.toString();
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

function createNumInput(
  id: string,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  min: number = 0,
  max: number = 100,
  step: number = 1,
  val: number = 1,
  textContent: string = "",
  idGenerator: () => number = getPolarRowId,
) {
  const myNumInput = document.createElement("input");
  configureHTMLElement(
    myNumInput,
    id,
    parent,
    ["form-input", "input-sm", ...classList],
    textContent,
    idGenerator,
  );
  myNumInput.setAttribute("type", "number");
  myNumInput.setAttribute("min", min.toString());
  myNumInput.setAttribute("max", max.toString());
  myNumInput.setAttribute("step", step.toString());
  myNumInput.setAttribute("value", val.toString());
  return myNumInput;
}

function createTextInput(
  id: string,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
  idGenerator: () => number = getPolarRowId,
) {
  const myNumInput = document.createElement("input");
  configureHTMLElement(
    myNumInput,
    id,
    parent,
    ["form-input", "input-sm", ...classList],
    textContent,
    idGenerator,
  );
  myNumInput.setAttribute("type", "text");
  return myNumInput;
}

function createSpan(
  id: string,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
  idGenerator: () => number = getPolarRowId,
) {
  const mySpan = document.createElement("span");
  configureHTMLElement(mySpan, id, parent, classList, textContent, idGenerator);
  return mySpan;
}

function createSlider(
  id: string,
  min: number,
  max: number,
  value: number,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
  idGenerator: () => number = getPolarRowId,
) {
  const mySlider = document.createElement("input");
  mySlider.setAttribute("type", "range");
  const minStr = min.toString();
  const maxStr = max.toString();
  mySlider.setAttribute("min", minStr);
  mySlider.setAttribute("max", maxStr);
  mySlider.setAttribute("value", value.toString());
  mySlider.setAttribute("data-tooltip", value.toString());
  createSpan(`${id}Min`, parent, ["padright-5px"], minStr);
  configureHTMLElement(
    mySlider,
    id,
    parent,
    ["slider", "tooltip", ...classList],
    textContent,
    idGenerator,
  );
  createSpan(`${id}Max`, parent, ["padleft-5px", "padright-5px"], maxStr);
  return mySlider;
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

export function download(
  filename: string,
  content: string,
  mimeType: string = "application/json",
) {
  const a = document.createElement("a"); // Create "a" element
  const blob = new Blob([content], { type: mimeType }); // Create a blob (file-like object)
  const url = URL.createObjectURL(blob); // Create an object URL from blob
  a.setAttribute("href", url); // Set "a" element link
  a.setAttribute("download", filename); // Set download filename
  a.click(); // Start downloading
}
