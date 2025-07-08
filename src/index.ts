import { PolarH10 } from "./PolarH10";
import {
  PMDCtrlReply,
  DEFAULT_EEG_LINE_CHART_OPTION,
  DEFAULT_TIME_SERIES_PRESENTATION_OPTIONS,
  PolarH10Data,
} from "./consts";

import { SmoothieChart, TimeSeries } from "smoothie";

const webapp_container = document.createElement("div");
webapp_container.setAttribute(
  "style",
  "height:100%;width:100%;position:relative",
);
document.body.appendChild(webapp_container);

const top_bar_div = document.createElement("div");
webapp_container.appendChild(top_bar_div);

const title = document.createElement("h2");
title.textContent = "Polar H10 raw data visualizer";
title.setAttribute(
  "style",
  "display: inline-block; justify-content: center; align-items: center; margin-top:10px;",
);
top_bar_div.appendChild(title);
top_bar_div.setAttribute(
  "style",
  "justify-content: center; align-items: center; text-align: center;",
);

const ble_conn_id = "ble_connect_btn";
const ble_conn_btn = document.createElement("button");
ble_conn_btn.setAttribute("id", ble_conn_id);
ble_conn_btn.setAttribute("class", "btn btn-primary btn-action s-circle");
ble_conn_btn.setAttribute("style", "float:right; margin: 10px;");
const plus_icon = document.createElement("i");
plus_icon.setAttribute("class", "icon icon-plus");
ble_conn_btn.appendChild(plus_icon);
ble_conn_btn.addEventListener("click", polarConnect);
top_bar_div.appendChild(ble_conn_btn);

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
  polarSensorDiv.setAttribute("style", "height:12%;width:100%;display:flex;");
  webapp_container.appendChild(polarSensorDiv);

  const optionDiv = document.createElement("div");
  optionDiv.id = "optionDiv";
  optionDiv.setAttribute(
    "style",
    "width:160px;display:flex;flex-wrap:wrap;margin-left:10px",
  );
  polarSensorDiv.appendChild(optionDiv);
  const nameDiv = document.createElement("div");
  nameDiv.classList.add("center");

  if (device.name) {
    nameDiv.textContent = `Conneting ${device.name.substring(10)}`;
  }
  optionDiv.appendChild(nameDiv);

  const loadingDiv = document.createElement("div");
  loadingDiv.classList.add("loading", "loading-lg");
  loadingDiv.setAttribute("style", "width:160px;");
  optionDiv.appendChild(loadingDiv);
  let polarH10: PolarH10;
  try {
    polarH10 = new PolarH10(device);
    await polarH10.init();
  } catch (err) {
    console.log(err);
    webapp_container.removeChild(polarSensorDiv);
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

  const disconnectDiv = document.createElement("div");
  disconnectDiv.id = "disconnectDiv";
  optionDiv.appendChild(disconnectDiv);
  disconnectDiv.classList.add("center");
  disconnectDiv.setAttribute("style", "width:60px;");

  const disBtn = document.createElement("button");
  const delIcon = document.createElement("i");
  delIcon.classList.add("icon", "icon-delete");
  disBtn.appendChild(delIcon);
  // disBtn.textContent = "-";
  disBtn.setAttribute("data-tooltip", "disconnect");
  disBtn.classList.add("btn", "btn-primary", "tooltip", "tooltip-top");
  disconnectDiv.appendChild(disBtn);
  disBtn.addEventListener("click", () => {
    device.gatt?.disconnect();
    webapp_container.removeChild(polarSensorDiv);
  });

  const dataCtrl = document.createElement("div");
  dataCtrl.classList.add("center");
  dataCtrl.setAttribute("style", "width:90px;");
  optionDiv.appendChild(dataCtrl);

  let visContainerDiv = document.createElement("div");
  visContainerDiv.id = "visContainer";
  polarSensorDiv.appendChild(visContainerDiv);
  visContainerDiv.setAttribute("style", "flex-grow:1;display: flex;");
  let ECGDiv: HTMLElement | undefined = undefined;
  let ACCDiv: HTMLElement | undefined = undefined;
  const btnGrp = document.createElement("div");
  btnGrp.classList.add("form-group");
  btnGrp.setAttribute("style", "justify-content: center; align-items: center;");
  dataCtrl.appendChild(btnGrp);

  let ecg_resize: (() => void) | undefined = undefined;
  let ecg_chart: SmoothieChart | undefined = undefined;
  let ecg_ts: TimeSeries | undefined = undefined;

  const newECGCallback = (data: PolarH10Data) => {
    if (
      ecg_ts !== undefined &&
      data.prev_sample_timestamp_ms > 0 &&
      data.samples !== undefined
    ) {
      const estimated_sample_interval =
        (data.sample_timestamp_ms - data.prev_sample_timestamp_ms) /
        data.samples.length;
      console.log(`estimated sample rate: ${1000 / estimated_sample_interval}`);
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

  const onToggleECG = async (ev: any) => {
    if (ev.target?.checked) {
      ECGDiv = document.createElement("div");
      ECGDiv.setAttribute("style", "flex:3;");
      visContainerDiv.appendChild(ECGDiv);
      const ecg_canvas = document.createElement("canvas");
      ECGDiv.appendChild(ecg_canvas);
      ecg_resize = resizeCanvasGen(ecg_canvas, 1, 1);
      window.addEventListener("resize", ecg_resize);
      ecg_resize();
      ecg_chart = new SmoothieChart(DEFAULT_EEG_LINE_CHART_OPTION);
      ecg_ts = new TimeSeries();
      ecg_chart.addTimeSeries(ecg_ts, DEFAULT_TIME_SERIES_PRESENTATION_OPTIONS);
      ecg_chart.streamTo(ecg_canvas, 600);
      polarH10.addEventListener("ECG", newECGCallback);
      console.log(polarH10);
      const startECGReply = await polarH10.startECG();
      if (startECGReply) {
        console.log(startECGReply);
      }
    } else {
      if (ECGDiv !== undefined) {
        if (visContainerDiv.contains(ECGDiv)) {
          const stopECGReply = await polarH10.stopECG();
          if (stopECGReply) {
            console.log(stopECGReply);
          }
          visContainerDiv.removeChild(ECGDiv);
          if (ecg_resize !== undefined) {
            window.removeEventListener("resize", ecg_resize);
          }
          polarH10.removeEventListener("ECG", newECGCallback);
          ECGDiv = undefined;
          ACCDiv = undefined;
          ecg_resize = undefined;
          ecg_chart = undefined;
          ecg_ts = undefined;
        }
      }
    }
  };

  const onToggleACC = (ev: any) => {
    console.log(ev.target?.checked);
    if (ev.target?.checked) {
    } else {
      if (ACCDiv !== undefined) {
        if (visContainerDiv.contains(ACCDiv)) {
          visContainerDiv.removeChild(ACCDiv);
        }
      }
    }
  };

  const ECG_switch = createSwitch("EXG", onToggleECG);
  btnGrp.appendChild(ECG_switch);
  const ACC_switch = createSwitch("ACC", onToggleACC);
  btnGrp.appendChild(ACC_switch);
}

function resizeCanvasGen(
  canvas: HTMLCanvasElement,
  widthRatio: number,
  heightRatio: number,
) {
  return () => {
    canvas.width = (canvas.parentNode as HTMLElement).offsetWidth * widthRatio;
    canvas.height =
      (canvas.parentNode as HTMLElement).offsetHeight * heightRatio;
  };
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
