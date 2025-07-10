import { PolarH10 } from "./PolarH10";
import {
  DEFAULT_ECG_LINE_CHART_OPTION,
  DEFAULT_ACC_LINE_CHART_OPTION,
  ECG_PRESENTATION_OPTIONS,
  X_AXIS_PRESENTATION_OPTIONS,
  Y_AXIS_PRESENTATION_OPTIONS,
  Z_AXIS_PRESENTATION_OPTIONS,
  PolarH10Data,
} from "./consts";

import { SmoothieChart, TimeSeries } from "smoothie";

const webapp_container = document.createElement("div");
webapp_container.id = "webapp_container";
webapp_container.classList.add("container");
document.body.appendChild(webapp_container);

const top_bar_div = document.createElement("div");
top_bar_div.id = "top_bar_div";
webapp_container.appendChild(top_bar_div);

const title = document.createElement("h2");
title.textContent = "Polar H10 raw data visualizer";
title.classList.add("title");
top_bar_div.appendChild(title);
top_bar_div.classList.add("center");

const ble_conn_id = "ble_connect_btn";
const ble_conn_btn = document.createElement("button");
ble_conn_btn.setAttribute("id", ble_conn_id);
ble_conn_btn.setAttribute("class", "btn btn-primary btn-action s-circle");
ble_conn_btn.setAttribute("style", "float:left; margin: 10px;");
const plus_icon = document.createElement("i");
plus_icon.setAttribute("class", "icon icon-plus");
ble_conn_btn.appendChild(plus_icon);
ble_conn_btn.addEventListener("click", polarConnect);
top_bar_div.appendChild(ble_conn_btn);

const content = document.createElement("div");
content.id = "content_div";
content.classList.add("flexbox", "content");
webapp_container.appendChild(content);

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
  polarSensorDiv.id = "polarSensorDiv";
  polarSensorDiv.classList.add("polar-sensor-row", "flexbox");
  content.appendChild(polarSensorDiv);

  const optionDiv = document.createElement("div");
  optionDiv.id = "optionDiv";
  optionDiv.classList.add("polar-sensor-left-panel");
  polarSensorDiv.appendChild(optionDiv);
  const nameDiv = document.createElement("div");
  nameDiv.classList.add("center");

  if (device.name) {
    nameDiv.textContent = `Conneting ${device.name.substring(10)}`;
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
    content.removeChild(polarSensorDiv);
    return;
  }

  const battLvl = await polarH10.getBatteryLevel();
  optionDiv.removeChild(loadingDiv);

  if (device.name) {
    let battStr: string;
    if (battLvl > 30) {
      battStr = `🔋${battLvl}%`;
    } else {
      battStr = `🪫${battLvl}%`;
    }
    nameDiv.textContent = `${device.name.substring(10)} ${battStr}`;
  }
  console.log(await polarH10.getSensorSettingsFromName("ACC"));

  const disconnectDiv = document.createElement("div");
  disconnectDiv.id = "disconnectDiv";
  optionDiv.appendChild(disconnectDiv);
  disconnectDiv.classList.add("center", "one-third-width");

  const disBtn = document.createElement("button");
  const delIcon = document.createElement("i");
  delIcon.classList.add("icon", "icon-delete");
  disBtn.appendChild(delIcon);

  disBtn.setAttribute("data-tooltip", "disconnect");
  disBtn.classList.add("btn", "btn-primary", "tooltip", "tooltip-top");
  disconnectDiv.appendChild(disBtn);

  const dataCtrl = document.createElement("div");
  dataCtrl.classList.add("center", "two-third-width");
  optionDiv.appendChild(dataCtrl);

  let visContainerDiv = document.createElement("div");
  visContainerDiv.id = "visContainer";
  polarSensorDiv.appendChild(visContainerDiv);
  visContainerDiv.classList.add("full-width", "full-height");
  let ECGDiv: HTMLElement | undefined = undefined;
  let ACCDiv: HTMLElement | undefined = undefined;
  const btnGrp = document.createElement("div");
  btnGrp.classList.add("form-group", "center");
  dataCtrl.appendChild(btnGrp);

  let ecg_resize: (() => void) | undefined = undefined;
  let ecg_chart: SmoothieChart | undefined = undefined;
  let ecg_ts: TimeSeries | undefined = undefined;
  let ecg_resize_observer: ResizeObserver | undefined = undefined;

  let acc_resize: (() => void) | undefined = undefined;
  let acc_chart: SmoothieChart | undefined = undefined;
  let acc_x_ts: TimeSeries | undefined = undefined;
  let acc_y_ts: TimeSeries | undefined = undefined;
  let acc_z_ts: TimeSeries | undefined = undefined;
  let acc_resize_observer: ResizeObserver | undefined = undefined;
  let ecg_canvas: HTMLCanvasElement | undefined = undefined;
  let acc_canvas: HTMLCanvasElement | undefined = undefined;

  disBtn.addEventListener("click", () => {
    device.gatt?.disconnect();
    content.removeChild(polarSensorDiv);

    ecg_resize = undefined;
    if (ecg_chart !== undefined) {
      ecg_chart.stop();
    }
    ecg_chart = undefined;
    ecg_ts = undefined;
    if (ecg_resize_observer !== undefined) {
      ecg_resize_observer.disconnect();
    }
    ecg_resize_observer = undefined;
    if (ECGDiv !== undefined) {
      visContainerDiv.removeChild(ECGDiv);
    }
    ECGDiv = undefined;

    acc_resize = undefined;
    if (acc_chart !== undefined) {
      acc_chart.stop();
    }
    acc_canvas = undefined;
    acc_chart = undefined;
    acc_x_ts = undefined;
    acc_y_ts = undefined;
    acc_z_ts = undefined;
    if (acc_resize_observer !== undefined) {
      acc_resize_observer.disconnect();
    }
    acc_resize_observer = undefined;
    if (ACCDiv !== undefined) {
      visContainerDiv.removeChild(ACCDiv);
    }
    ACCDiv = undefined;
  });

  const newECGCallback = (data: PolarH10Data) => {
    if (
      ecg_ts !== undefined &&
      data.prev_sample_timestamp_ms > 0 &&
      data.samples !== undefined
    ) {
      const estimated_sample_interval =
        (data.sample_timestamp_ms - data.prev_sample_timestamp_ms) /
        data.samples.length;
      for (let s_i = 0; s_i < data.samples.length; s_i++) {
        const timestamp =
          data.event_time_offset_ms +
          data.prev_sample_timestamp_ms +
          estimated_sample_interval * (s_i + 1);
        setTimeout(() => {
          ecg_ts?.append(timestamp, (data.samples as Int32Array)[s_i]);
        }, s_i * estimated_sample_interval);
      }
    }
  };

  const newACCCallback = (data: PolarH10Data) => {
    if (
      acc_x_ts !== undefined &&
      acc_y_ts !== undefined &&
      acc_z_ts !== undefined &&
      data.prev_sample_timestamp_ms > 0 &&
      data.samples !== undefined
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
        setTimeout(() => {
          acc_x_ts?.append(timestamp, (data.samples as Int16Array)[s_i]);
          acc_y_ts?.append(timestamp, (data.samples as Int16Array)[s_i + 1]);
          acc_z_ts?.append(timestamp, (data.samples as Int16Array)[s_i + 2]);
        }, frameNum * estimated_sample_interval);
      }
    }
  };

  const onToggleECG = async (ev: any) => {
    if (ev.target?.checked) {
      ECGDiv = document.createElement("div");
      ECGDiv.id = "ECGDiv";
      // ECGDiv.setAttribute("style", "height:100%;display:flex;");
      let width_class: string;
      if (ACCDiv === undefined) {
        width_class = "full-width";
      } else {
        width_class = "half-width";
        ACCDiv.classList.remove("full-width");
        ACCDiv.classList.add("half-width");
      }
      ECGDiv.classList.add("float-left", "full-height", width_class);
      visContainerDiv.appendChild(ECGDiv);

      ecg_canvas = document.createElement("canvas");
      ecg_canvas.id = "ecg_canvas";
      ECGDiv.appendChild(ecg_canvas);
      ecg_chart = new SmoothieChart(DEFAULT_ECG_LINE_CHART_OPTION);
      ecg_ts = new TimeSeries();
      ecg_chart.addTimeSeries(ecg_ts, ECG_PRESENTATION_OPTIONS);
      ecg_chart.streamTo(ecg_canvas, 600);

      ecg_resize = resizeSmoothieGen(ecg_chart, 1, 1);
      ecg_resize_observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === ECGDiv && ecg_resize !== undefined) {
            ecg_resize();
          }
        }
      });
      ecg_resize_observer.observe(ECGDiv);
      ecg_resize();

      polarH10.addEventListener("ECG", newECGCallback);

      const startECGReply = await polarH10.startECG();
      if (startECGReply) {
        console.log(startECGReply);
      }
    } else {
      if (ECGDiv !== undefined && ecg_canvas !== undefined) {
        if (ECGDiv.contains(ecg_canvas)) {
          if (ACCDiv !== undefined) {
            ACCDiv.classList.remove("half-width");
            ACCDiv.classList.add("full-width");
          }
          const stopECGReply = await polarH10.stopECG();
          if (stopECGReply) {
            console.log(stopECGReply);
          }
          visContainerDiv.removeChild(ECGDiv);
          // visContainerDiv.removeChild(ecg_canvas);
          if (ecg_resize_observer !== undefined) {
            ecg_resize_observer.disconnect();
          }
          polarH10.removeEventListener("ECG", newECGCallback);
          ecg_canvas = undefined;
          ECGDiv = undefined;
          ecg_resize = undefined;
          ecg_chart = undefined;
          ecg_ts = undefined;
          ecg_resize_observer = undefined;
        }
      }
    }
  };

  const onToggleACC = async (ev: any) => {
    if (ev.target?.checked) {
      ACCDiv = document.createElement("div");
      ACCDiv.id = "ACCDiv";
      let width_class: string;
      if (ECGDiv === undefined) {
        width_class = "full-width";
      } else {
        width_class = "half-width";
        ECGDiv.classList.remove("full-width");
        ECGDiv.classList.add("half-width");
      }
      ACCDiv.classList.add("float-left", "full-height", width_class);
      visContainerDiv.appendChild(ACCDiv);

      acc_canvas = document.createElement("canvas");
      acc_canvas.id = "acc_canvas";
      ACCDiv.appendChild(acc_canvas);

      acc_chart = new SmoothieChart(DEFAULT_ACC_LINE_CHART_OPTION);
      acc_x_ts = new TimeSeries();
      acc_y_ts = new TimeSeries();
      acc_z_ts = new TimeSeries();
      acc_chart.addTimeSeries(acc_x_ts, X_AXIS_PRESENTATION_OPTIONS);
      acc_chart.addTimeSeries(acc_y_ts, Y_AXIS_PRESENTATION_OPTIONS);
      acc_chart.addTimeSeries(acc_z_ts, Z_AXIS_PRESENTATION_OPTIONS);
      acc_chart.streamTo(acc_canvas, 600);

      acc_resize = resizeSmoothieGen(acc_chart, 1, 1);
      acc_resize_observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === ACCDiv && acc_resize !== undefined) {
            acc_resize();
          }
        }
      });
      acc_resize_observer.observe(ACCDiv);
      acc_resize();
      polarH10.addEventListener("ACC", newACCCallback);
      const startACCReply = await polarH10.startACC();
      if (startACCReply) {
        console.log(startACCReply);
      }
    } else {
      if (ACCDiv !== undefined && acc_canvas !== undefined) {
        if (ACCDiv.contains(acc_canvas)) {
          ACCDiv.removeChild(acc_canvas);
        }
        if (ECGDiv !== undefined) {
          ECGDiv.classList.remove("half-width");
          ECGDiv.classList.add("full-width");
        }
        polarH10.removeEventListener("ACC", newACCCallback);
        visContainerDiv.removeChild(ACCDiv);

        if (acc_resize_observer !== undefined) {
          acc_resize_observer.disconnect();
        }

        const stopACCReply = await polarH10.stopACC();
        if (stopACCReply) {
          console.log(stopACCReply);
        }

        ACCDiv = undefined;
        acc_canvas = undefined;
        acc_chart = undefined;
        acc_x_ts = undefined;
        acc_y_ts = undefined;
        acc_z_ts = undefined;
        acc_resize_observer = undefined;
      }
    }
  };

  const ECG_switch = createSwitch("EXG", onToggleECG);
  btnGrp.appendChild(ECG_switch);
  const ACC_switch = createSwitch("ACC", onToggleACC);
  btnGrp.appendChild(ACC_switch);
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
    canvas.width = new_width;
    canvas.height = new_height;
    console.log(
      `${new Date().valueOf()} parent: ${parent.id} ${parent.offsetWidth} ${canvas.width} ${parent.offsetHeight} ${canvas.height}`,
    );
  };
  return resize;
}

function createSwitch(labeltext: string, eventHandler: (ev: Event) => void) {
  const label = document.createElement("label");
  label.setAttribute("class", "form-switch");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.addEventListener("change", eventHandler);
  const icon = document.createElement("i");
  icon.setAttribute("class", "form-icon");
  label.textContent = labeltext;
  label.appendChild(input);
  label.appendChild(icon);
  return label;
}
