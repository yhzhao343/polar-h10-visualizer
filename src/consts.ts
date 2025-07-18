import { IChartOptions, ITimeSeriesPresentationOptions } from "smoothie";

export const BODY_PARTS = [
  "",
  "LShoulder",
  "RShoulder",
  "Chest",
  "MiddleSpine",
  "LowerSpine",
  "Hip",
  "LThigh",
  "RThigh",
];
const date2000 = new Date("2000-01-01T00:00:00Z");
const date2018 = new Date("2018-01-01T00:00:00Z");
export const EPOCH2000_OFFSET_MS = date2000.valueOf();
export const EPOCH2000_OFFSET_NS = BigInt(EPOCH2000_OFFSET_MS) * BigInt(1e6);
export const EPOCH2018_OFFSET_MS = date2018.valueOf();
export const EPOCH2018_OFFSET_NS = BigInt(EPOCH2018_OFFSET_MS) * BigInt(1e6);
export const EXTRA_OFFSET_NS = EPOCH2018_OFFSET_NS - EPOCH2000_OFFSET_NS;
const EXTRA_OFFSET_MS_WHOLE = EXTRA_OFFSET_NS / BigInt(1e6);
const EXTRA_OFFSET_MS_DECIMAL =
  Number(EXTRA_OFFSET_NS - EXTRA_OFFSET_MS_WHOLE * BigInt(1e6)) / 1e6;
export const EXTRA_OFFSET_MS =
  EXTRA_OFFSET_MS_DECIMAL + Number(EXTRA_OFFSET_MS_DECIMAL);

export const ERROR_MSGS = [
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
  "DEVICE IN CHARGER",
];

export const SCROLL_MAX_LIMIT_FACTOR = 5;
export const LOW_BATT_LVL = 35;

export const EXG_STREAM_DELAY_MS = 600;
export const EXG_RMS_WINDOW_MS = 200;
export const EXG_RMS_WINDOW_SIZE = Math.round(130 / (1000 / EXG_RMS_WINDOW_MS));
export const EXG_HP_MIN = -120;
export const EXG_HP_MAX = 120;
export const EXG_RMS_MIN = 0;
export const EXG_RMS_MAX = 120;
export const EXG_RMS_HIGHPASS_CUTOFF_HZ = 25;
export const EXG_RMS_HIGHPASS_ORDER = 4;
export const EXG_SAMPLE_RATE_HZ = 130;
export const EXG_HP_SCROLL_MIN = 5;
export const EXG_RMS_SCROLL_MIN = 5;
export const EXG_DELTA = 1;

export const ACC_STREAM_DELAY_MS = 600;
export const ACC_SAMPLE_RATE_HZ = 100;
export const ACC_RANGE_G = 4;
export const ACC_MIN = -2000;
export const ACC_MAX = 2000;
export const AAC_LOWPASS_CUTOFF_HZ = 10;
export const AAC_LOWPASS_ORDER = 4;
export const SCROLL_LEGENT_DISP_TIME_MS = 1500;
export const ACC_DELTA = 10;
export const ACC_SCROLL_MIN = 100;

export const AAC_MAG_BANDPASS_HIGH_CUT_HZ = 2.5;
export const AAC_MAG_BANDPASS_LOW_CUT_HZ = 0.1;
export const AAC_MAG_LOWPASS_ORDER = 4;
export const ACC_MAG_BP_MIN = -20;
export const ACC_MAG_BP_MAX = 20;
export const ACC_MAG_DELTA = 1;
export const ACC_MAG_SCROLL_MIN = 1;

export const DEFAULT_EXG_LINE_CHART_OPTION: IChartOptions = {
  // limitFPS: 60,
  grid: {
    strokeStyle: "#484f58",
    fillStyle: "#000000",
    lineWidth: 1,
    millisPerLine: 1000,
    borderVisible: false,
  },
  title: {
    text: "ECG/EMG raw (0.7–40 Hz)",
    fontFamily: "Arial",
    verticalAlign: "bottom",
    fillStyle: "#ffffff80",
    fontSize: 14,
  },
  responsive: false,
  nonRealtimeData: true,
  millisPerPixel: 8,
  scaleSmoothing: 0.1,
  tooltip: true,
};

export const DEFAULT_ACC_LINE_CHART_OPTION: IChartOptions = {
  // limitFPS: 60,
  minValue: ACC_MIN,
  maxValue: ACC_MAX,
  grid: {
    strokeStyle: "#484f58",
    fillStyle: "#000000",
    lineWidth: 1,
    millisPerLine: 1000,
    borderVisible: false,
  },
  title: {
    text: "Accelerometer raw",
    fontFamily: "Arial",
    verticalAlign: "bottom",
    fillStyle: "#ffffff80",
    fontSize: 14,
  },
  labels: {
    disabled: false,
  },
  responsive: false,
  nonRealtimeData: true,
  millisPerPixel: 8,
  scaleSmoothing: 0.1,
  tooltip: true,
};

export const EXG_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ebebebcc",
};

export const EXG_HP_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ffdcaacc",
};

export const EXG_RMS_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#dcaaffcc",
  fillStyle: "#f0beff99",
};

export const X_AXIS_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ff453acc",
};

export const Y_AXIS_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#32ff4bcc",
};

export const Z_AXIS_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#0a84ffcc",
};

export const X_LP_AXIS_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ff776ccc",
};

export const Y_LP_AXIS_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#64ff7dcc",
};

export const Z_LP_AXIS_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#3cb6ffcc",
};

export const RHO_AXIS_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#6effffcc",
};

export const PHI_AXIS_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ff70ffcc",
};

export const THETA_AXIS_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ffff78cc",
};

export const MAG_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#ffdcaacc",
};

export const MAG_LP_PRESENTATION_OPTIONS: ITimeSeriesPresentationOptions = {
  lineWidth: 2,
  interpolation: "linear",
  strokeStyle: "#dcaaffcc",
};

export enum PolarSensorType {
  ECG = 0,
  PPG = 1,
  ACC = 2,
  PPI = 3,
  GYRO = 5,
  MAGNETOMETER = 6,
  SDK_MODE = 9,
  LOCATION = 10,
  PRESSURE = 11,
  TEMPERATURE = 12,
}

export const PolarSensorNames = Object.keys(PolarSensorType).filter((t) =>
  isNaN(Number(t)),
);

export interface PolarH10Data {
  type: (typeof PolarSensorNames)[number];
  samples?: Int16Array | Int32Array;
  sample_timestamp_ms: number;
  prev_sample_timestamp_ms: number;
  recv_epoch_time_ms: number;
  event_time_offset_ms: number;
}

export const EXG_DATA_OPTIONS = [
  "Raw", `${EXG_RMS_HIGHPASS_CUTOFF_HZ.toFixed(0)}Hz Highpass`, "RMS"
];
export const ACC_DATA_OPTIONS = [
  "Raw", `${AAC_LOWPASS_CUTOFF_HZ.toFixed(0)}Hz Lowpass`,
  "Tilt", "Magnitude",
  `${AAC_MAG_BANDPASS_LOW_CUT_HZ.toFixed(1)}-${AAC_MAG_BANDPASS_HIGH_CUT_HZ.toFixed(1)}Hz mag`
];