import {
  createPolarVisRow,
  PolarVisRow,
  startRecording as startPolarRecording,
  stopRecording as stopPolarRecording,
  createButtonIcon,
  download
} from "./PolarH10VisualizerRow";
import { VernierVisRow } from "./VernierRespirationBeltVisualizerRow";
import godirect from "@vernier/godirect";
import { SERVICES } from "polar-h10";

function getCurrentTime() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

// Used by PolarH10VisualizerRow to check if anything is streaming
(window as any).hasAnyActiveStream = () => {
    return PolarVisRow.hasAnyActiveStream() || VernierVisRow.hasAnyActiveStream();
};

const webapp_container = document.createElement("div");
webapp_container.id = "webapp_container";
webapp_container.classList.add("container");
document.body.appendChild(webapp_container);

const top_bar_div = document.createElement("div");
top_bar_div.id = "top_bar_div";
webapp_container.appendChild(top_bar_div);

const title = document.createElement("h3");
title.textContent = "Multimodal Physiological Visualizer";
title.classList.add("title");
top_bar_div.appendChild(title);
top_bar_div.classList.add("center");

function no_suffix() { return undefined; }

// Use Material Icon "monitor_heart" for Polar H10
const ble_conn_btn = createButtonIcon(
  "monitor_heart", "ble_connect_btn", top_bar_div, true, bleConnectHandle,
  ["btn", "btn-primary", "btn-action", "s-circle", "ble-conn", "tooltip", "tooltip-right"],
  no_suffix,
);
ble_conn_btn.setAttribute("data-tooltip", "Connect Polar H10");
const polarIcon = ble_conn_btn.querySelector("i");
if (polarIcon) polarIcon.style.fontSize = "24px"; // Slightly larger icon

// Use Material Icon "air" for Vernier Respiration Belt
const vernier_conn_btn = createButtonIcon(
  "air", "vernier_connect_btn", top_bar_div, true, vernierConnectHandle,
  ["btn", "btn-primary", "btn-action", "s-circle", "ble-conn", "tooltip", "tooltip-right"],
  no_suffix,
);
vernier_conn_btn.setAttribute("data-tooltip", "Connect Vernier Respiration Belt");
const vernierIcon = vernier_conn_btn.querySelector("i");
if (vernierIcon) vernierIcon.style.fontSize = "24px"; // Slightly larger icon

const ble_disconnect_btn = createButtonIcon(
  "cross", "ble_disconnect_btn", top_bar_div, false, stopStreamExit,
  ["btn", "btn-error", "btn-action", "s-circle", "ble-conn", "tooltip", "tooltip-right"],
  no_suffix,
);
ble_disconnect_btn.setAttribute("data-tooltip", "Stop all streams and disconnect");
ble_disconnect_btn.disabled = true;

const content = document.createElement("div");
content.id = "content_div";
content.classList.add("flexbox", "content", "flex-col");
webapp_container.appendChild(content);

// Create separate container divs to isolate the row orders for Polar and Vernier
const polar_content_div = document.createElement("div");
polar_content_div.id = "polar_content_div";
polar_content_div.classList.add("full-width", "flex-col");
content.appendChild(polar_content_div);

const vernier_content_div = document.createElement("div");
vernier_content_div.id = "vernier_content_div";
vernier_content_div.classList.add("full-width", "flex-col");
content.appendChild(vernier_content_div);

if (navigator.bluetooth === undefined) {
  const debug_message = document.createElement("p");
  debug_message.innerHTML = "Web Bluetooth API is not present!<br>\n" +
    "Please make sure you are using the latest chrome/chromium based browser.<br>\n" +
    'Also make sure to enable experimental-web-platform-features in your browser <a href="chrome://flags/#enable-experimental-web-platform-features">chrome://flags/#enable-experimental-web-platform-features</a> ';
  debug_message.setAttribute("style", "margin:5% 20%;font-size:1.4em;");
  content.appendChild(debug_message);
  window.stop();
}

let is_recording = false;

const record_btn = createButtonIcon(
  "radio_button_unchecked", "record_btn", top_bar_div, true, onRecordClicked,
  ["btn", "btn-primary", "btn-action", "s-circle", "record-conn", "center", "tooltip", "tooltip-left"],
  no_suffix,
);

const recording_icon = document.createElement("i");
recording_icon.classList.add("material-icons", "hide", "red");
recording_icon.textContent = "radio_button_checked";
const record_icon = record_btn.children[0];
record_btn.setAttribute("data-tooltip", "Start recording");

record_btn.appendChild(recording_icon);
record_btn.disabled = true;

function onRecordClicked(ev: any) {
  if (is_recording) {
    is_recording = false;
    ble_conn_btn.disabled = false;
    vernier_conn_btn.disabled = false;
    recording_icon.classList.add("hide");
    record_icon.classList.remove("hide");
    record_btn.setAttribute("data-tooltip", "Start recording");

    stopPolarRecording();
    VernierVisRow.is_recording = false;

    // Package all outputs together seamlessly
    const combinedData = {
        Polar: PolarVisRow.recorded,
        Vernier: VernierVisRow.recorded
    };
    download(
        `Multisensor_recording_${getCurrentTime()}.json`,
        JSON.stringify(combinedData, null, 2),
    );
    PolarVisRow.recorded = {};
    VernierVisRow.recorded = {};
  } else {
    is_recording = true;
    ble_conn_btn.disabled = true;
    vernier_conn_btn.disabled = true;
    record_icon.classList.add("hide");
    recording_icon.classList.remove("hide");
    record_btn.setAttribute("data-tooltip", "Stop recording");

    startPolarRecording();

    VernierVisRow.is_recording = true;
    VernierVisRow.recorded = {};
    for (const row of VernierVisRow.vernierVisRows) {
        VernierVisRow.createNewRecordEntry(row);
    }
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
  // Mount this specifically in the polar rows container
  await createPolarVisRow(polar_content_div, device);
  updateButtons();
}

async function vernierConnectHandle() {
  try {
    // Initiate Godirect web bluetooth selection
    const device = await godirect.selectDevice();
    if (!device) return;
    // Mount this specifically in the vernier rows container
    const row = new VernierVisRow(vernier_content_div, device);
    await row.init();
    updateButtons();
  } catch (err) {
    console.error(err);
    alert(err);
  }
}

async function stopStreamExit() {
  await PolarVisRow.disconnectAllPolarH10();
  for (const row of [...VernierVisRow.vernierVisRows]) {
      await row.disconnect();
  }
  updateButtons();
}

function updateButtons() {
    const hasStream = (window as any).hasAnyActiveStream();
    ble_disconnect_btn.disabled = !hasStream;
    if (!is_recording) {
        record_btn.disabled = !hasStream;
    }
}

// Allow decoupled files to trigger global UI button reevaluations
(window as any).updateGlobalButtons = updateButtons;

window.onbeforeunload = function (event) {
  if ((window as any).hasAnyActiveStream()) {
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