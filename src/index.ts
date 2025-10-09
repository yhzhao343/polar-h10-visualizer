import {
  createPolarVisRow,
  PolarVisRow,
  startRecording,
  stopRecording,
} from "./PolarH10VisualizerRow";

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
  "tooltip",
  "tooltip-right",
);

const content = document.createElement("div");
content.id = "content_div";
content.classList.add("flexbox", "content");
webapp_container.appendChild(content);

if (navigator.bluetooth === undefined) {
  const debug_message = document.createElement("p");

  debug_message.innerHTML =
    "Web Bluetooth API is not present!<br>\n" +
    "Please make sure you are using the latest chrome/chromium based browser.<br>\n" +
    'Also make sure to enable experimental-web-platform-features in your browser <a href="chrome://flags/#enable-experimental-web-platform-features">chrome://flags/#enable-experimental-web-platform-features</a> ';
  debug_message.setAttribute("style", "margin:5% 20%;font-size:1.4em;");
  content.appendChild(debug_message);

  window.stop();
}

const plus_icon = document.createElement("i");
plus_icon.setAttribute("class", "icon icon-plus");
ble_conn_btn.appendChild(plus_icon);
ble_conn_btn.addEventListener(
  "click",
  bleConnectHandle,
  // polarConnectHandleGen(content, createPolarVisRow),
);
top_bar_div.appendChild(ble_conn_btn);

let is_recording = false;
const record_id = "record_btn";
const record_btn = document.createElement("button");
record_btn.setAttribute("data-tooltip", "Start recording");
record_btn.id = record_id;
record_btn.classList.add(
  "btn",
  "btn-primary",
  "btn-action",
  "s-circle",
  "record-conn",
  "center",
  "tooltip",
  "tooltip-left",
);
const record_icon = document.createElement("i");
record_icon.classList.add("material-icons");
record_icon.textContent = "radio_button_unchecked";

const recording_icon = document.createElement("i");
recording_icon.classList.add("material-icons", "hide", "red");
recording_icon.textContent = "radio_button_checked";

record_btn.appendChild(record_icon);
record_btn.appendChild(recording_icon);
top_bar_div.appendChild(record_btn);

record_btn.addEventListener("click", onRecordClicked);
record_btn.disabled = true;

function onRecordClicked(ev: any) {
  if (is_recording) {
    is_recording = false;
    ble_conn_btn.disabled = false;
    recording_icon.classList.add("hide");
    record_icon.classList.remove("hide");
    record_btn.setAttribute("data-tooltip", "Start recording");
    stopRecording();
  } else {
    is_recording = true;
    ble_conn_btn.disabled = true;
    record_icon.classList.add("hide");
    recording_icon.classList.remove("hide");
    record_btn.setAttribute("data-tooltip", "Stop recording");
    startRecording();
  }
}

function polarConnectHandleGen(parentCoponent: HTMLElement, btDeviceHandler) {
  return async (ev: any) => {
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
    btDeviceHandler(parentCoponent, device);
  };
}

async function bleConnectHandle() {
  // polarConnectHandleGen(content, createPolarVisRow)
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
    updateRecordEnable();
    return;
  }
  await createPolarVisRow(content, device);
  updateRecordEnable();
}

function updateRecordEnable() {
  if (PolarVisRow.polarVisRows.length > 0) {
    record_btn.disabled = false;
  } else {
    record_btn.disabled = true;
  }
  return PolarVisRow.polarVisRows.length;
}

function location_reload() {
  location.reload();
  console.log("Page reloaded");
}
if (!(window as any).IS_PRODUCTION) {
  new EventSource("/esbuild").addEventListener("change", location_reload);
}
