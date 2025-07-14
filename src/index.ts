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
} from "./consts";

import { SmoothieChart, TimeSeries } from "smoothie";
import { CalcCascades, IirFilter } from "fili";

const IIRCalc = new CalcCascades();

type PostRenderCallback = (HTMLCanvasElement, number) => void;

declare class CustomSmoothie extends SmoothieChart {
  addPostRenderCallback(callback: PostRenderCallback);
  removePostRenderCallback(callback: PostRenderCallback);
}

function CustomSmoothie(option?) {
  SmoothieChart.call(this, option);
  this.postRender = [];
}
CustomSmoothie.prototype = Object.create(SmoothieChart.prototype);
CustomSmoothie.prototype.constructor = CustomSmoothie;
CustomSmoothie.prototype.render = function (canvas, time) {
  SmoothieChart.prototype.render.call(this, canvas, time);
  for (let callback of this.postRender) {
    callback(canvas, time);
  }
};

CustomSmoothie.prototype.addPostRenderCallback = function (
  callback: PostRenderCallback,
) {
  const i = this.postRender.indexOf(callback);
  if (i < 0) {
    this.postRender.push(callback);
  }
};

CustomSmoothie.prototype.removePostRenderCallback = function (
  callback: PostRenderCallback,
) {
  const i = this.postRender.indexOf(callback);
  if (i > -1) {
    return this.postRender.splice(i, 1);
  } else {
    return [];
  }
};

const webapp_container = document.createElement("div");
webapp_container.id = "webapp_container";
webapp_container.classList.add("container");
document.body.appendChild(webapp_container);

const top_bar_div = document.createElement("div");
top_bar_div.id = "top_bar_div";
webapp_container.appendChild(top_bar_div);

const title = document.createElement("h3");
title.textContent = "Polar H10 raw data visualizer";
title.classList.add("title");
top_bar_div.appendChild(title);
top_bar_div.classList.add("center");

const ble_conn_id = "ble_connect_btn";
const ble_conn_btn = document.createElement("button");
ble_conn_btn.setAttribute("data-tooltip", "Connect new Polar H10");
ble_conn_btn.id = ble_conn_id;
ble_conn_btn.classList.add(
  "btn",
  "btn-primary",
  "btn-action",
  "s-circle",
  "ble-conn",
  // "tooltip",
  // "tooltip-right",
);
// ble_conn_btn.setAttribute("id", ble_conn_id);
// ble_conn_btn.setAttribute("class", "btn btn-primary btn-action s-circle");
// ble_conn_btn.setAttribute("style", "float:left; margin: 10px;");
const plus_icon = document.createElement("i");
plus_icon.setAttribute("class", "icon icon-plus");
ble_conn_btn.appendChild(plus_icon);
ble_conn_btn.addEventListener("click", polarConnect);
top_bar_div.appendChild(ble_conn_btn);

const content = document.createElement("div");
content.id = "content_div";
content.classList.add("flexbox", "content");
webapp_container.appendChild(content);

let polarRowID = 0;

async function polarConnect() {
  let device: BluetoothDevice;
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "Polar" }],
      optionalServices: [
        "battery_service",
        "fb005c80-02e7-f387-1cad-8acd2d8df0c8",
      ],
    });
  } catch (err) {
    console.log(err);
    return;
  }
  if (device.gatt?.connected) {
    return;
  }

  const polarSensorDiv = document.createElement("div");
  polarSensorDiv.id = `polarSensorDiv-${polarRowID}`;
  polarSensorDiv.classList.add("polar-sensor-row", "flexbox");
  content.appendChild(polarSensorDiv);

  const optionDiv = document.createElement("div");
  optionDiv.id = `optionDiv-${polarRowID}`;
  optionDiv.classList.add("polar-sensor-left-panel", "center");
  polarSensorDiv.appendChild(optionDiv);
  const nameDiv = document.createElement("div");
  nameDiv.id = `device-name-batt-${polarRowID}`;
  nameDiv.classList.add("center", "flexbox");

  let DeviceName;

  if (device.name) {
    DeviceName = device.name.substring(10);
    nameDiv.textContent = `Conneting ${DeviceName}`;
  }
  optionDiv.appendChild(nameDiv);

  const loadingDiv = document.createElement("div");
  loadingDiv.classList.add("loading", "loading-lg", "full-width", "flexbox");
  optionDiv.appendChild(loadingDiv);
  let polarH10: PolarH10;
  try {
    polarH10 = new PolarH10(device);
    await polarH10.init();
  } catch (err) {
    console.log(err);
    alert(err);
    if (content.contains(polarSensorDiv)) {
      content.removeChild(polarSensorDiv);
    }
    return;
  }

  const battLvl = await polarH10.getBatteryLevel();
  optionDiv.removeChild(loadingDiv);
  optionDiv.removeChild(nameDiv);
  optionDiv.classList.remove("center");

  if (device.name) {
    nameDiv.textContent = "";
    nameDiv.classList.add("flex");
    const deviceNameDiv = document.createElement("div");
    deviceNameDiv.textContent = DeviceName;
    deviceNameDiv.classList.add("padright-5px", "flexbox");
    nameDiv.appendChild(deviceNameDiv);
    let battStr: string;
    if (battLvl > 30) {
      battStr = `🔋${battLvl}%`;
    } else {
      battStr = `🪫${battLvl}%`;
    }
    const battLvlDiv = document.createElement("div");
    battLvlDiv.textContent = battStr;
    battLvlDiv.classList.add("flexbox");
    nameDiv.appendChild(battLvlDiv);
    // nameDiv.textContent = `${device.name.substring(10)} ${battStr}`;
  }
  console.log(await polarH10.getSensorSettingsFromName("ACC"));

  const disconnectDiv = document.createElement("div");
  disconnectDiv.id = `disconnectDiv-${polarRowID}`;
  optionDiv.appendChild(disconnectDiv);
  disconnectDiv.classList.add("flexbox", "disconnect");
  // disconnectDiv.classList.add();

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
  disconnectDiv.appendChild(disBtn);

  nameDiv.classList.add("flexbox");
  optionDiv.appendChild(nameDiv);

  const dataInfo = document.createElement("div");
  dataInfo.classList.add("left", "full-width", "flexbox");
  optionDiv.appendChild(dataInfo);

  const bodypartLabel = document.createElement("div");
  bodypartLabel.id = `bodypartLabel-${polarRowID}`;
  bodypartLabel.textContent = "Bodypart:";
  bodypartLabel.classList.add("half-width", "center");
  dataInfo.appendChild(bodypartLabel);

  const bodypartSelectDiv = document.createElement("div");
  bodypartSelectDiv.id = `bodypartSelectDiv-${polarRowID}`;
  bodypartSelectDiv.classList.add("half-width");
  dataInfo.appendChild(bodypartSelectDiv);

  const bodypartSelect = document.createElement("select");
  bodypartSelect.id = `bodypartSelect-${polarRowID}`;
  bodypartSelect.classList.add(
    "form-select",
    "dark-select",
    "select-sm",
    "almost-full-width",
  );
  bodypartSelectDiv.appendChild(bodypartSelect);
  addOptionsToSelect(bodypartSelect, BODY_PARTS);

  // "half-width"

  const dataCtrl = document.createElement("div");
  dataCtrl.id = `dataCtrl-${polarRowID}`;
  dataCtrl.classList.add("left", "full-width", "flexbox");
  optionDiv.appendChild(dataCtrl);

  let visContainerDiv = document.createElement("div");
  visContainerDiv.id = `visContainer-${polarRowID}`;
  polarSensorDiv.appendChild(visContainerDiv);
  visContainerDiv.classList.add("full-width", "full-height");
  let LOCAL_EXG_HP_MIN = EXG_HP_MIN;
  let LOCAL_EXG_HP_MAX = EXG_HP_MAX;
  let LOCAL_EXG_RMS_MIN = EXG_RMS_MIN;
  let LOCAL_EXG_RMS_MAX = EXG_RMS_MAX;
  let LOCAL_ACC_MIN = ACC_MIN;
  let LOCAL_ACC_MAX = ACC_MAX;
  // let accCalibBtn: HTMLButtonElement | undefined = undefined;
  // let accTiltOffsetbBtn: HTMLButtonElement | undefined = undefined;

  let EXGFormSelect: HTMLSelectElement | undefined = undefined;
  let ACCFormSelect: HTMLSelectElement | undefined = undefined;
  let ECGDiv: HTMLElement | undefined = undefined;
  let ACCDiv: HTMLElement | undefined = undefined;

  let ecg_resize: (() => void) | undefined = undefined;
  // let ecg_chart: SmoothieChart | undefined = undefined;
  let ecg_chart: CustomSmoothie | undefined = undefined;
  let ecg_ts: TimeSeries | undefined = undefined;
  let ecg_hp_ts: TimeSeries | undefined = undefined;
  let ecg_rms_win: Float64Array | undefined = undefined;
  let ecg_rms_win_i = 0;
  let ecg_rms_ts: TimeSeries | undefined = undefined;
  let ecg_resize_observer: ResizeObserver | undefined = undefined;
  let ecg_rms_iir_coef = undefined;
  let ecg_rms_iir = undefined;
  let ecg_canvas: HTMLCanvasElement | undefined = undefined;

  let acc_resize: (() => void) | undefined = undefined;
  let acc_chart: CustomSmoothie | undefined = undefined;
  let acc_x_ts: TimeSeries | undefined = undefined;
  let acc_y_ts: TimeSeries | undefined = undefined;
  let acc_z_ts: TimeSeries | undefined = undefined;
  let acc_x_lp_ts: TimeSeries | undefined = undefined;
  let acc_y_lp_ts: TimeSeries | undefined = undefined;
  let acc_z_lp_ts: TimeSeries | undefined = undefined;
  let acc_rho_ts: TimeSeries | undefined = undefined;
  let acc_phi_ts: TimeSeries | undefined = undefined;
  let acc_theta_ts: TimeSeries | undefined = undefined;
  let acc_resize_observer: ResizeObserver | undefined = undefined;
  let acc_canvas: HTMLCanvasElement | undefined = undefined;
  let acc_iir_coef = undefined;
  let acc_x_iir = undefined;
  let acc_y_iir = undefined;
  let acc_z_iir = undefined;

  const disconnectPolarH10 = () => {
    device.gatt?.disconnect();
    if (content.contains(polarSensorDiv)) {
      content.removeChild(polarSensorDiv);
    }
    if (ecg_chart !== undefined) {
      ecg_chart.stop();
    }
    if (ecg_resize_observer !== undefined) {
      ecg_resize_observer.disconnect();
    }
    if (ECGDiv !== undefined) {
      visContainerDiv.removeChild(ECGDiv);
    }
    resetECG();

    if (acc_chart !== undefined) {
      acc_chart.stop();
    }
    if (acc_resize_observer !== undefined) {
      acc_resize_observer.disconnect();
    }
    if (ACCDiv !== undefined) {
      visContainerDiv.removeChild(ACCDiv);
    }
    resetACC();
  };

  disBtn.addEventListener("click", disconnectPolarH10);

  const newECGCallback = (data: PolarH10Data) => {
    if (
      ecg_ts !== undefined &&
      ecg_rms_ts !== undefined &&
      ecg_hp_ts !== undefined &&
      data.prev_sample_timestamp_ms > 0 &&
      data.samples !== undefined &&
      ecg_rms_iir !== undefined
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

        tsUpdate(ecg_ts, data_i, timestamp, data_i_timeout_ms);

        const filtered_data_i = ecg_rms_iir.singleStep(data_i);
        tsUpdate(ecg_hp_ts, filtered_data_i, timestamp, data_i_timeout_ms);

        if (ecg_rms_win !== undefined) {
          if (ecg_rms_win_i < EXG_RMS_WINDOW_SIZE) {
            ecg_rms_win[ecg_rms_win_i] = filtered_data_i;
            ecg_rms_win_i++;
          } else {
            ecg_rms_win.set(ecg_rms_win.subarray(1));
            ecg_rms_win[EXG_RMS_WINDOW_SIZE - 1] = filtered_data_i;
            const data_rms_i = rms(ecg_rms_win);
            tsUpdate(ecg_rms_ts, data_rms_i, timestamp, data_i_timeout_ms);
          }
        }
      }
    }
  };

  const newACCCallback = (data: PolarH10Data) => {
    if (
      acc_x_ts !== undefined &&
      acc_y_ts !== undefined &&
      acc_z_ts !== undefined &&
      acc_x_lp_ts !== undefined &&
      acc_y_lp_ts !== undefined &&
      acc_z_lp_ts !== undefined &&
      data.prev_sample_timestamp_ms > 0 &&
      data.samples !== undefined &&
      acc_x_iir !== undefined &&
      acc_y_iir !== undefined &&
      acc_z_iir !== undefined &&
      acc_rho_ts !== undefined &&
      acc_phi_ts !== undefined &&
      acc_theta_ts !== undefined
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
        tsUpdate(acc_x_ts, x_d, timestamp, data_i_timeout_ms);
        tsUpdate(acc_y_ts, y_d, timestamp, data_i_timeout_ms);
        tsUpdate(acc_z_ts, z_d, timestamp, data_i_timeout_ms);
        const x_lp_d = acc_x_iir.singleStep(x_d);
        const y_lp_d = acc_y_iir.singleStep(y_d);
        const z_lp_d = acc_z_iir.singleStep(z_d);
        tsUpdate(acc_x_lp_ts, x_lp_d, timestamp, data_i_timeout_ms);
        tsUpdate(acc_y_lp_ts, y_lp_d, timestamp, data_i_timeout_ms);
        tsUpdate(acc_z_lp_ts, z_lp_d, timestamp, data_i_timeout_ms);
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
        tsUpdate(acc_rho_ts, rho, timestamp, data_i_timeout_ms);
        tsUpdate(acc_phi_ts, phi, timestamp, data_i_timeout_ms);
        tsUpdate(acc_theta_ts, theta, timestamp, data_i_timeout_ms);
      }
    }
  };

  const onToggleECG = async (ev: any) => {
    if (ACC_switch_input) {
      (ACC_switch_input as HTMLInputElement).disabled = true;
    }
    if (ev.target?.checked) {
      ECGDiv = document.createElement("div");
      ECGDiv.id = `ECGDiv-${polarRowID}`;
      ECGDiv.addEventListener("wheel", onWheelECG);
      // ECGDiv.setAttribute("style", "height:100%;display:flex;");
      let width_class: string;
      if (ACCDiv === undefined) {
        width_class = "full-width";
      } else {
        width_class = "half-width";
        ACCDiv.classList.remove("full-width");
        ACCDiv.classList.add("half-width");
        visContainerDiv.removeChild(ACCDiv);
      }
      ECGDiv.classList.add("float-left", "almost-full-height", width_class);
      visContainerDiv.appendChild(ECGDiv);

      if (ACCDiv !== undefined) {
        visContainerDiv.appendChild(ACCDiv);
      }

      ecg_canvas = document.createElement("canvas");
      ecg_canvas.id = `ecg_canvas-${polarRowID}`;
      ECGDiv.appendChild(ecg_canvas);
      ecg_chart = new CustomSmoothie(DEFAULT_EXG_LINE_CHART_OPTION);
      // (ecg_chart as any).options.title.text = "EXG";
      ecg_ts = new TimeSeries();
      ecg_chart.addTimeSeries(ecg_ts, EXG_PRESENTATION_OPTIONS);
      ecg_chart.streamTo(ecg_canvas, EXG_STREAM_DELAY_MS);
      ecg_rms_ts = new TimeSeries();
      ecg_hp_ts = new TimeSeries();
      ecg_chart.addPostRenderCallback(exg_legend);
      ecg_rms_win = new Float64Array(EXG_RMS_WINDOW_SIZE);
      ecg_rms_win_i = 0;

      ecg_resize = resizeSmoothieGen(ecg_chart, 1, 1);
      ecg_resize_observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === ECGDiv && ecg_resize !== undefined) {
            ecg_resize();
          }
        }
      });
      ecg_resize_observer.observe(ECGDiv);
      ecg_rms_iir_coef = IIRCalc.highpass({
        order: EXG_RMS_HIGHPASS_ORDER,
        characteristic: "butterworth",
        Fs: EXG_SAMPLE_RATE_HZ,
        Fc: EXG_RMS_HIGHPASS_CUTOFF_HZ,
        preGain: false,
      });
      ecg_rms_iir = IirFilter(ecg_rms_iir_coef);
      ecg_resize();

      if (EXGFormSelect !== undefined) {
        EXGFormSelect.disabled = false;
        EXGFormSelect.selectedIndex = 0;
      }

      polarH10.addEventListener("ECG", newECGCallback);

      try {
        const startECGReply = await polarH10.startECG(EXG_SAMPLE_RATE_HZ);
        if (startECGReply) {
          console.log(startECGReply);
        }
      } catch (e) {
        console.log(e);
        disconnectPolarH10();
      }
    } else {
      if (
        ECGDiv !== undefined &&
        ecg_canvas !== undefined &&
        ecg_chart !== undefined
      ) {
        ecg_chart.stop();
        if (EXGFormSelect !== undefined) {
          EXGFormSelect.disabled = true;
          EXGFormSelect.selectedIndex = 0;
        }
        if (ECGDiv.contains(ecg_canvas)) {
          ACCDiv?.classList.remove("half-width");
          ACCDiv?.classList.add("full-width");
          const stopECGReply = await polarH10.stopECG();
          if (stopECGReply) {
            console.log(stopECGReply);
          }
          visContainerDiv.removeChild(ECGDiv);
          ecg_resize_observer?.disconnect();
          polarH10.removeEventListener("ECG", newECGCallback);
          resetECG();
        }
      }
    }
    if (ACC_switch_input) {
      (ACC_switch_input as HTMLInputElement).disabled = false;
    }
  };

  function resetECG() {
    ecg_canvas = undefined;
    ECGDiv = undefined;
    ecg_resize = undefined;
    ecg_rms_win = undefined;
    ecg_chart = undefined;
    ecg_ts = undefined;
    ecg_hp_ts = undefined;
    ecg_rms_ts = undefined;
    ecg_resize_observer = undefined;
    ecg_rms_iir_coef = undefined;
    ecg_rms_iir = undefined;
    ecg_rms_win_i = 0;
  }

  const onToggleACC = async (ev: any) => {
    if (EXG_switch_input) {
      (EXG_switch_input as HTMLInputElement).disabled = true;
    }
    if (ev.target?.checked) {
      // EXG_switch.disabled = true;
      ACCDiv = document.createElement("div");
      ACCDiv.id = `ACCDiv-${polarRowID}`;
      ACCDiv.addEventListener("wheel", onWheelACC);
      let width_class: string;
      if (ECGDiv === undefined) {
        width_class = "full-width";
      } else {
        width_class = "half-width";
        ECGDiv.classList.remove("full-width");
        ECGDiv.classList.add("half-width");
      }
      ACCDiv.classList.add("float-left", "almost-full-height", width_class);
      visContainerDiv.appendChild(ACCDiv);

      acc_canvas = document.createElement("canvas");
      acc_canvas.id = `acc_canvas-${polarRowID}`;
      ACCDiv.appendChild(acc_canvas);

      acc_chart = new CustomSmoothie(DEFAULT_ACC_LINE_CHART_OPTION);
      acc_x_ts = new TimeSeries();
      acc_y_ts = new TimeSeries();
      acc_z_ts = new TimeSeries();
      acc_chart.addTimeSeries(acc_x_ts, X_AXIS_PRESENTATION_OPTIONS);
      acc_chart.addTimeSeries(acc_y_ts, Y_AXIS_PRESENTATION_OPTIONS);
      acc_chart.addTimeSeries(acc_z_ts, Z_AXIS_PRESENTATION_OPTIONS);
      acc_chart.streamTo(acc_canvas, ACC_STREAM_DELAY_MS);
      acc_chart.addPostRenderCallback(acc_legend);
      acc_chart.addPostRenderCallback(scroll_legend);
      setTimeout(() => {
        if (acc_chart) {
          acc_chart.removePostRenderCallback(scroll_legend);
        }
      }, SCROLL_LEGENT_DISP_TIME_MS);
      acc_x_lp_ts = new TimeSeries();
      acc_y_lp_ts = new TimeSeries();
      acc_z_lp_ts = new TimeSeries();
      acc_rho_ts = new TimeSeries();
      acc_phi_ts = new TimeSeries();
      acc_theta_ts = new TimeSeries();

      acc_resize = resizeSmoothieGen(acc_chart, 1, 1);
      acc_resize_observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === ACCDiv && acc_resize !== undefined) {
            acc_resize();
          }
        }
      });
      acc_resize_observer.observe(ACCDiv);
      acc_iir_coef = IIRCalc.lowpass({
        order: AAC_LOWPASS_ORDER,
        characteristic: "butterworth",
        Fs: ACC_SAMPLE_RATE_HZ,
        Fc: AAC_LOWPASS_CUTOFF_HZ,
        preGain: false,
      });
      acc_x_iir = IirFilter(acc_iir_coef);
      acc_y_iir = IirFilter(acc_iir_coef);
      acc_z_iir = IirFilter(acc_iir_coef);
      acc_resize();

      if (ACCFormSelect !== undefined) {
        ACCFormSelect.disabled = false;
        ACCFormSelect.selectedIndex = 0;
      }

      polarH10.addEventListener("ACC", newACCCallback);

      try {
        const startACCReply = await polarH10.startACC(
          ACC_RANGE_G,
          ACC_SAMPLE_RATE_HZ,
        );
        if (startACCReply) {
          console.log(startACCReply);
        }
      } catch (e) {
        console.log(e);
        disconnectPolarH10();
      }

      // if (accCalibBtn !== undefined) {
      //   accCalibBtn.disabled = false;
      // }
      // if (accTiltOffsetbBtn !== undefined) {
      //   accTiltOffsetbBtn.disabled = true;
      // }
    } else {
      if (
        ACCDiv !== undefined &&
        acc_canvas !== undefined &&
        acc_chart !== undefined
      ) {
        acc_chart.stop();
        if (ACCFormSelect !== undefined) {
          ACCFormSelect.disabled = true;
          ACCFormSelect.selectedIndex = 0;
        }
        if (ACCDiv.contains(acc_canvas)) {
          ACCDiv.removeChild(acc_canvas);
        }
        ECGDiv?.classList.remove("half-width");
        ECGDiv?.classList.add("full-width");
        polarH10.removeEventListener("ACC", newACCCallback);
        visContainerDiv.removeChild(ACCDiv);
        acc_resize_observer?.disconnect();

        const stopACCReply = await polarH10.stopACC();
        if (stopACCReply) {
          console.log(stopACCReply);
        }
        resetACC();
      }
      // if (accCalibBtn !== undefined) {
      //   accCalibBtn.disabled = true;
      // }
      // if (accTiltOffsetbBtn !== undefined) {
      //   accTiltOffsetbBtn.disabled = true;
      // }
    }
    if (EXG_switch_input) {
      (EXG_switch_input as HTMLInputElement).disabled = false;
    }
  };

  function resetACC() {
    ACCDiv = undefined;
    acc_resize = undefined;
    acc_canvas = undefined;
    acc_chart = undefined;
    acc_x_ts = undefined;
    acc_y_ts = undefined;
    acc_z_ts = undefined;
    acc_resize_observer = undefined;
    acc_iir_coef = undefined;
    acc_x_iir = undefined;
    acc_y_iir = undefined;
    acc_z_iir = undefined;
    acc_x_lp_ts = undefined;
    acc_y_lp_ts = undefined;
    acc_z_lp_ts = undefined;
    acc_rho_ts = undefined;
    acc_phi_ts = undefined;
    acc_theta_ts = undefined;
  }

  const onWheelECG = (ev: any) => {
    if (ecg_chart !== undefined) {
      let delta = 0;
      if (ev.deltaY < 0) {
        delta = 1;
      } else if (ev.deltaY > 0) {
        delta = -1;
      }
      switch (EXGFormSelect?.selectedIndex) {
        case 0:
          break;
        case 1:
          ev.preventDefault();
          LOCAL_EXG_HP_MAX += delta;
          LOCAL_EXG_HP_MIN -= delta;
          if (
            LOCAL_EXG_HP_MAX < 5 ||
            LOCAL_EXG_HP_MAX <= LOCAL_EXG_HP_MIN ||
            LOCAL_EXG_HP_MAX / 2 > EXG_HP_MAX
          ) {
            LOCAL_EXG_HP_MAX -= delta;
            LOCAL_EXG_HP_MIN += delta;
          }
          ecg_chart.options.minValue = LOCAL_EXG_HP_MIN;
          ecg_chart.options.maxValue = LOCAL_EXG_HP_MAX;
          break;
        case 2:
          ev.preventDefault();
          LOCAL_EXG_RMS_MAX += delta;
          if (
            LOCAL_EXG_RMS_MAX < 5 ||
            LOCAL_EXG_RMS_MAX <= LOCAL_EXG_RMS_MIN ||
            LOCAL_EXG_RMS_MAX / 2 > EXG_RMS_MAX
          ) {
            LOCAL_EXG_RMS_MAX -= delta;
          }
          ecg_chart.options.maxValue = LOCAL_EXG_RMS_MAX;

          break;
      }
    }
  };

  const onWheelACC = (ev: any) => {
    if (acc_chart !== undefined) {
      let delta = 0;

      switch (ACCFormSelect?.selectedIndex) {
        case 0:
        case 1:
          ev.preventDefault();
          if (ev.deltaY < 0) {
            delta = 10;
          } else if (ev.deltaY > 0) {
            delta = -10;
          }
          LOCAL_ACC_MAX += delta;
          LOCAL_ACC_MIN -= delta;
          if (
            LOCAL_ACC_MAX < 100 ||
            LOCAL_ACC_MAX <= LOCAL_ACC_MIN ||
            LOCAL_ACC_MAX / 2 > ACC_MAX
          ) {
            LOCAL_ACC_MAX -= delta;
            LOCAL_ACC_MIN += delta;
          }
          acc_chart.options.minValue = LOCAL_ACC_MIN;
          acc_chart.options.maxValue = LOCAL_ACC_MAX;
          break;
        case 2:
          break;
      }
    }
  };

  const EXGCtrlDiv = document.createElement("div");
  EXGCtrlDiv.id = `EXGCtrlDiv-${polarRowID}`;
  dataCtrl.append(EXGCtrlDiv);
  const EXG_switch = createSwitch("EXG", onToggleECG);
  EXGCtrlDiv.classList.add("half-width");
  EXGCtrlDiv.appendChild(EXG_switch);
  const EXG_switch_input = EXG_switch.children.item(0);

  const EXGDropDown = document.createElement("div");
  EXGDropDown.classList.add("form-group");
  EXGCtrlDiv.appendChild(EXGDropDown);

  EXGFormSelect = document.createElement("select");
  EXGFormSelect.disabled = true;
  EXGFormSelect.id = `EXGDispOptions-${polarRowID}`;
  EXGFormSelect.classList.add(
    "form-select",
    "dark-select",
    "select-sm",
    "almost-full-width",
  );
  EXGDropDown.appendChild(EXGFormSelect);

  addOptionsToSelect(EXGFormSelect, ["Raw", "Highpass", "RMS"]);

  EXGFormSelect.selectedIndex = 0;

  EXGFormSelect.onchange = (evt: any) => {
    if (
      ecg_canvas !== undefined &&
      ecg_chart !== undefined &&
      ecg_ts !== undefined &&
      ecg_rms_ts !== undefined &&
      ecg_hp_ts !== undefined
    ) {
      // console.log(evt.target);
      const selected = evt.target.selectedIndex;
      ecg_chart.stop();
      switch (selected) {
        case 0: // "Raw":
          ecg_chart.removeTimeSeries(ecg_rms_ts);
          ecg_chart.removeTimeSeries(ecg_hp_ts);
          ecg_chart.addTimeSeries(ecg_ts, EXG_PRESENTATION_OPTIONS);
          ecg_chart.options.minValue = undefined;
          ecg_chart.options.maxValue = undefined;
          ecg_chart.updateValueRange();
          if (ecg_chart.options.title) {
            ecg_chart.options.title.text =
              DEFAULT_EXG_LINE_CHART_OPTION.title?.text;
          }

          if (
            ecg_chart.removePostRenderCallback(exg_rms_legend).length ||
            ecg_chart.removePostRenderCallback(exg_hp_legend).length
          ) {
            ecg_chart.addPostRenderCallback(exg_legend);
          }

          break;
        case 1: // "Highpass":
          ecg_chart.removeTimeSeries(ecg_ts);
          ecg_chart.removeTimeSeries(ecg_rms_ts);
          ecg_chart.addTimeSeries(ecg_hp_ts, EXG_HP_PRESENTATION_OPTIONS);
          ecg_chart.options.minValue = LOCAL_EXG_HP_MIN;
          ecg_chart.options.maxValue = LOCAL_EXG_HP_MAX;
          ecg_chart.updateValueRange();
          if (ecg_chart.options.title) {
            ecg_chart.options.title.text = `Highpass (${EXG_RMS_HIGHPASS_CUTOFF_HZ}Hz ${EXG_RMS_HIGHPASS_ORDER}th order Butterworth) on ECG/EMG raw`;
          }
          if (
            ecg_chart.removePostRenderCallback(exg_legend).length ||
            ecg_chart.removePostRenderCallback(exg_rms_legend).length
          ) {
            ecg_chart.addPostRenderCallback(exg_hp_legend);
            ecg_chart.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (ecg_chart) {
                ecg_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }
          break;
        case 2: //"RMS":
          ecg_chart.removeTimeSeries(ecg_ts);
          ecg_chart.removeTimeSeries(ecg_hp_ts);
          ecg_chart.addTimeSeries(ecg_rms_ts, EXG_RMS_PRESENTATION_OPTIONS);
          ecg_chart.options.minValue = LOCAL_EXG_RMS_MIN;
          ecg_chart.options.maxValue = LOCAL_EXG_RMS_MAX;
          ecg_chart.updateValueRange();
          if (ecg_chart.options.title) {
            ecg_chart.options.title.text = `RMS (Highpass on ECG/EMG raw)`;
          }
          if (
            ecg_chart.removePostRenderCallback(exg_legend).length ||
            ecg_chart.removePostRenderCallback(exg_hp_legend).length
          ) {
            ecg_chart.addPostRenderCallback(exg_rms_legend);
            ecg_chart.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (ecg_chart) {
                ecg_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }
          break;
      }
      ecg_chart.start();
    }
  };

  const ACCCtrlDiv = document.createElement("div");
  ACCCtrlDiv.id = `ACCCtrlDiv-${polarRowID}`;
  dataCtrl.append(ACCCtrlDiv);
  const ACC_switch = createSwitch("ACC", onToggleACC);
  ACCCtrlDiv.classList.add("half-width");
  ACCCtrlDiv.appendChild(ACC_switch);
  const ACC_switch_input = ACC_switch.children.item(0);

  const ACCDropDown = document.createElement("div");
  ACCDropDown.classList.add("form-group");
  ACCCtrlDiv.appendChild(ACCDropDown);

  ACCFormSelect = document.createElement("select");
  ACCFormSelect.disabled = true;
  ACCFormSelect.id = `ACCDispOptions-${polarRowID}`;
  ACCFormSelect.classList.add(
    "form-select",
    "dark-select",
    "select-sm",
    "almost-full-width",
  );
  ACCDropDown.appendChild(ACCFormSelect);

  addOptionsToSelect(ACCFormSelect, ["Raw", "Lowpass", "Tilt"]);

  ACCFormSelect.selectedIndex = 0;

  ACCFormSelect.onchange = (evt: any) => {
    if (
      acc_canvas !== undefined &&
      acc_chart !== undefined &&
      acc_x_ts !== undefined &&
      acc_y_ts !== undefined &&
      acc_z_ts !== undefined &&
      acc_x_lp_ts !== undefined &&
      acc_y_lp_ts !== undefined &&
      acc_z_lp_ts !== undefined
    ) {
      // console.log(evt.target.selectedIndex);
      const selected = evt.target.selectedIndex;
      acc_chart.stop();
      switch (selected) {
        case 0: //"Raw":
          acc_chart.removeTimeSeries(acc_x_lp_ts);
          acc_chart.removeTimeSeries(acc_y_lp_ts);
          acc_chart.removeTimeSeries(acc_z_lp_ts);
          acc_chart.removeTimeSeries(acc_rho_ts);
          acc_chart.removeTimeSeries(acc_phi_ts);
          acc_chart.removeTimeSeries(acc_theta_ts);
          acc_chart.addTimeSeries(acc_x_ts, X_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(acc_y_ts, Y_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(acc_z_ts, Z_AXIS_PRESENTATION_OPTIONS);
          acc_chart.options.minValue = LOCAL_ACC_MIN;
          acc_chart.options.maxValue = LOCAL_ACC_MAX;
          acc_chart.updateValueRange();
          if (acc_chart.options.title) {
            acc_chart.options.title.text =
              DEFAULT_ACC_LINE_CHART_OPTION.title?.text;
          }
          if (acc_chart.options.labels) {
            acc_chart.options.labels.disabled = false;
          }
          acc_chart.options.horizontalLines = [];
          if (
            acc_chart.removePostRenderCallback(acc_lp_legend).length ||
            acc_chart.removePostRenderCallback(tilt_legend).length
          ) {
            acc_chart.addPostRenderCallback(acc_legend);
            acc_chart.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (acc_chart) {
                acc_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }
          // if (accCalibBtn !== undefined) {
          //   accCalibBtn.disabled = false;
          // }
          // if (accTiltOffsetbBtn !== undefined) {
          //   accTiltOffsetbBtn.disabled = true;
          // }

          break;
        case 1: //"Lowpass":
          acc_chart.removeTimeSeries(acc_x_ts);
          acc_chart.removeTimeSeries(acc_y_ts);
          acc_chart.removeTimeSeries(acc_z_ts);
          acc_chart.removeTimeSeries(acc_rho_ts);
          acc_chart.removeTimeSeries(acc_phi_ts);
          acc_chart.removeTimeSeries(acc_theta_ts);
          acc_chart.addTimeSeries(acc_x_lp_ts, X_LP_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(acc_y_lp_ts, Y_LP_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(acc_z_lp_ts, Z_LP_AXIS_PRESENTATION_OPTIONS);
          acc_chart.options.minValue = LOCAL_ACC_MIN;
          acc_chart.options.maxValue = LOCAL_ACC_MAX;
          acc_chart.updateValueRange();
          if (acc_chart.options.title) {
            acc_chart.options.title.text = `Lowpass (${AAC_LOWPASS_CUTOFF_HZ}Hz ${AAC_LOWPASS_ORDER}th order Butterworth) on Accelerometer raw`;
          }
          if (acc_chart.options.labels) {
            acc_chart.options.labels.disabled = false;
          }

          acc_chart.options.horizontalLines = [];

          if (
            acc_chart.removePostRenderCallback(acc_legend).length ||
            acc_chart.removePostRenderCallback(tilt_legend).length
          ) {
            acc_chart.addPostRenderCallback(acc_lp_legend);
            acc_chart?.addPostRenderCallback(scroll_legend);
            setTimeout(() => {
              if (acc_chart) {
                acc_chart.removePostRenderCallback(scroll_legend);
              }
            }, SCROLL_LEGENT_DISP_TIME_MS);
          }
          // if (accCalibBtn !== undefined) {
          //   accCalibBtn.disabled = false;
          // }
          // if (accTiltOffsetbBtn !== undefined) {
          //   accTiltOffsetbBtn.disabled = true;
          // }

          break;
        case 2: //"Tilt":
          acc_chart.removeTimeSeries(acc_x_ts);
          acc_chart.removeTimeSeries(acc_y_ts);
          acc_chart.removeTimeSeries(acc_z_ts);
          acc_chart.removeTimeSeries(acc_x_lp_ts);
          acc_chart.removeTimeSeries(acc_y_lp_ts);
          acc_chart.removeTimeSeries(acc_z_lp_ts);
          acc_chart.addTimeSeries(acc_rho_ts, RHO_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(acc_phi_ts, PHI_AXIS_PRESENTATION_OPTIONS);
          acc_chart.addTimeSeries(
            acc_theta_ts,
            THETA_AXIS_PRESENTATION_OPTIONS,
          );
          acc_chart.options.minValue = -140;
          acc_chart.options.maxValue = 140;
          if (acc_chart.options.title) {
            acc_chart.options.title.text = `Tilt angle [-90°, 90°] from lowpass on accelerometer raw`;
          }
          if (acc_chart.options.labels) {
            acc_chart.options.labels.disabled = true;
          }
          acc_chart.options.horizontalLines = [
            { value: 90, color: "#ffffff7f", lineWidth: 1 },
            { value: -90, color: "#ffffff7f", lineWidth: 1 },
          ];

          if (
            acc_chart.removePostRenderCallback(acc_legend).length ||
            acc_chart.removePostRenderCallback(acc_lp_legend).length
          ) {
            acc_chart.addPostRenderCallback(tilt_legend);
          }
          // if (accCalibBtn !== undefined) {
          //   accCalibBtn.disabled = true;
          // }
          // if (accTiltOffsetbBtn !== undefined) {
          //   accTiltOffsetbBtn.disabled = false;
          // }
          break;
      }
      acc_chart.start();
    }
  };

  // const ACCExtraCtrlDiv = document.createElement("div");
  // ACCExtraCtrlDiv.id = "ACCExtraCtrlDiv";
  // ACCExtraCtrlDiv.classList.add("one-third-width", "center");
  // dataCtrl.appendChild(ACCExtraCtrlDiv);

  // accCalibBtn = document.createElement("button");
  // accCalibBtn.id = "accCalibBtn";
  // accCalibBtn.setAttribute(
  //   "data-tooltip",
  //   "Place the sensor on a flat surface. Don't touch!",
  // );
  // accCalibBtn.textContent = "Calibrate";
  // accCalibBtn.disabled = true;
  // accCalibBtn.classList.add(
  //   "btn",
  //   "btn-primary",
  //   "btn-sm",
  //   "ninty-width",
  //   "tooltip",
  //   "tooltip-right",
  // );
  // ACCExtraCtrlDiv.appendChild(accCalibBtn);

  // accTiltOffsetbBtn = document.createElement("button");
  // accTiltOffsetbBtn.id = "accTiltOffsetbBtn";
  // accTiltOffsetbBtn.setAttribute(
  //   "data-tooltip",
  //   "Use the current tilt angles as the origin",
  // );
  // accTiltOffsetbBtn.textContent = "Set Tilt";
  // accTiltOffsetbBtn.disabled = true;
  // accTiltOffsetbBtn.classList.add(
  //   "btn",
  //   "btn-primary",
  //   "btn-sm",
  //   "ninty-width",
  //   "tooltip",
  //   "tooltip-right",
  // );
  // ACCExtraCtrlDiv.appendChild(accTiltOffsetbBtn);
  polarRowID++;
}

function resizeSmoothieGen(
  chart: SmoothieChart,
  widthRatio: number,
  heightRatio: number,
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
    console.log(
      `Resize at ${new Date().valueOf()} parent: ${parent.id} ${parent.offsetWidth} ${canvas.width} ${parent.offsetHeight} ${canvas.height}`,
    );
  };
  return resize;
}

function createSwitch(labeltext: string, eventHandler: (ev: Event) => void) {
  const label = document.createElement("label");
  label.setAttribute("class", "form-switch");
  label.classList.add("label-sm");
  const input = document.createElement("input");
  input.id = `${labeltext}-onoff-${polarRowID}`;
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
    ctx.fillText("Scroll to change y-range", canvas.width / 2, 20);
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
    if (X_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = RHO_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― ρ° ∠(X-axis, Horizon)", 10, 5);

    if (Y_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = PHI_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― ϕ° ∠(Y-axis, Horizon)", 170, 5);

    if (Z_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = THETA_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― θ° ∠(Z-axis, Gravity)", 330, 5);

    ctx.restore();
  }
}

function acc_lp_legend(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    if (X_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = X_LP_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― Lowpass X axis (mG)", 10, 5);

    if (Y_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
      ctx.fillStyle = Y_LP_AXIS_PRESENTATION_OPTIONS.strokeStyle;
    }
    ctx.fillText("― Lowpass Y axis (mG)", 170, 5);

    if (Z_AXIS_PRESENTATION_OPTIONS.strokeStyle !== undefined) {
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

function addOptionsToSelect(select: HTMLSelectElement, options: string[]) {
  for (let i = 0; i < options.length; i++) {
    const option_str = options[i];
    const option: HTMLOptionElement = document.createElement("option");
    option.id = `${select.id}-${polarRowID}-${i}`;
    option.textContent = option_str;
    select.appendChild(option);
  }
}
