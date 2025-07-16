// import * as smoothie from "smoothie";
import { IChartOptions, ITimeSeriesPresentationOptions } from "smoothie";
export const PMD_SERVICE_ID = "fb005c80-02e7-f387-1cad-8acd2d8df0c8";
export const PMD_CTRL_CHAR = "fb005c81-02e7-f387-1cad-8acd2d8df0c8";
export const PMD_DATA_CHAR = "fb005c82-02e7-f387-1cad-8acd2d8df0c8";
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

export interface DataHandlerDict {
  [key: (typeof PolarSensorNames)[number]]: ((data: PolarH10Data) => void)[];
}

export interface PolarH10Data {
  type: (typeof PolarSensorNames)[number];
  samples?: Int16Array | Int32Array;
  sample_timestamp_ms: number;
  prev_sample_timestamp_ms: number;
  recv_epoch_time_ms: number;
  event_time_offset_ms: number;
}

export enum PolarSettingType {
  SAMPLE_RATE = 0,
  RESOLUTION = 1,
  RANGE_PN_UNIT = 2,
  RANGE_MILI_UNIT = 3,
  NUM_CHANNELS = 4,
  CONVERSION_FACTOR = 5,
}

function parseUint16(
  d: DataView,
  offset: number,
  little_endian: boolean = true,
) {
  return d.getUint16(offset, little_endian);
}

function parseFloat32(
  d: DataView,
  offset: number,
  little_endian: boolean = true,
) {
  return d.getFloat32(offset, little_endian);
}

function parse4xUint16(
  d: DataView,
  offset: number,
  little_endian: boolean = true,
) {
  return [
    d.getUint16(offset, little_endian),
    d.getUint16(offset + 2, little_endian),
    d.getUint16(offset + 4, little_endian),
    d.getUint16(offset + 6, little_endian),
  ];
}

export const setting_parsers = {
  SAMPLE_RATE: parseUint16,
  RESOLUTION: parseUint16,
  RANGE_PN_UNIT: parseUint16,
  RANGE_MILI_UNIT: parse4xUint16,
  CONVERSION_FACTOR: parseFloat32,
};

interface SettingOffset {
  [key: string]: number;
}

export interface Acceleration {
  x: number;
  y: number;
  z: number;
}

// export interface Triplet

export const setting_parser_offsets: SettingOffset = {
  SAMPLE_RATE: 2,
  RESOLUTION: 2,
  RANGE_PN_UNIT: 2,
  RANGE_MILI_UNIT: 8,
  NUM_CHANNELS: 1,
  CONVERSION_FACTOR: 4,
};

export enum PolarPMDCommand {
  GET_MEASUREMENT_SETTINGS = 0x01,
  REQUEST_MEASUREMENT_START = 0x02,
  REQUEST_MEASUREMENT_STOP = 0x03,
}

export const PolarSettingNames = Object.keys(PolarSettingType).filter((t) =>
  isNaN(Number(t)),
);

export const PolarSensorNames = Object.keys(PolarSensorType).filter((t) =>
  isNaN(Number(t)),
);

export const PolarPMDCommandNames = Object.keys(PolarPMDCommand).filter((t) =>
  isNaN(Number(t)),
);

type PolarSettingNameKeys = (typeof PolarSettingNames)[number];

export interface PolarSensorInfo {
  type: (typeof PolarPMDCommandNames)[number];
  error: (typeof ERROR_MSGS)[number];
  more_frames: number;
  settings: Record<PolarSettingNameKeys, number[] | number[][]>;
}

export interface PMDCtrlReply {
  type: (typeof PolarPMDCommandNames)[number];
  sensor: (typeof PolarSensorNames)[number];
  error: (typeof ERROR_MSGS)[number];
  more_frames: number;
  reserved?: number;
}

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

export const LOW_BATT_LVL = 40;

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
// export const ACC_;

export const ACC_STREAM_DELAY_MS = 600;
export const ACC_SAMPLE_RATE_HZ = 100;
export const ACC_RANGE_G = 4;
export const ACC_MIN = -2000;
export const ACC_MAX = 2000;
export const AAC_LOWPASS_CUTOFF_HZ = 10;
export const AAC_LOWPASS_ORDER = 4;
export const SCROLL_LEGENT_DISP_TIME_MS = 1500;

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
