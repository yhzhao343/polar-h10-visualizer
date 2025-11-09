import {
  createPolarVisRow,
  PolarVisRow,
  startRecording,
  stopRecording,
  createButtonIcon,
} from "./PolarH10VisualizerRow";

// import { HEART_RATE_SERVICE_UUID } from "./consts";
import { SERVICES } from "polar-h10";

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

const ble_conn_btn = createButtonIcon(
  "plus",
  "ble_connect_btn",
  top_bar_div,
  false,
  bleConnectHandle,
  [
    "btn",
    "btn-primary",
    "btn-action",
    "s-circle",
    "ble-conn",
    "tooltip",
    "tooltip-right",
  ],
  () => undefined,
);
ble_conn_btn.setAttribute("data-tooltip", "Connect new Polar H10");

const ble_disconnect_btn = createButtonIcon(
  "cross",
  "ble_disconnect_btn",
  top_bar_div,
  false,
  stopStreamExit,
  [
    "btn",
    "btn-error",
    "btn-action",
    "s-circle",
    "ble-conn",
    "tooltip",
    "tooltip-right",
  ],
  () => undefined,
);
ble_disconnect_btn.setAttribute(
  "data-tooltip",
  "Stop all streams and disconnect",
);
ble_disconnect_btn.disabled = true;

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

async function bleConnectHandle() {
  let device: BluetoothDevice;
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "Polar" }],
      optionalServices: SERVICES,
    });
  } catch (err) {
    console.log(err);
    return;
  }
  await createPolarVisRow(content, device);
}

async function stopStreamExit() {
  await PolarVisRow.disconnectAllPolarH10();
  ble_disconnect_btn.disabled = true;
  record_btn.disabled = true;
}

window.onbeforeunload = function (event) {
  if (PolarVisRow.hasAnyActiveStream()) {
    event.preventDefault();
    event.returnValue = "";
  } else {
    window.close();
  }
};

function location_reload() {
  location.reload();
  console.log("Page reloaded");
}
if (!(window as any).IS_PRODUCTION) {
  new EventSource("/esbuild").addEventListener("change", location_reload);
}
