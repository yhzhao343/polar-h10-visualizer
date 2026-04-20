import { createPolarVisRow, PolarVisRow } from "./PolarH10VisualizerRow";
import { VernierVisRow } from "./VernierRespirationBeltVisualizerRow";
import godirect from "@vernier/godirect";
import { SERVICES } from "polar-h10";
import { tableFromIPC, Schema, Field, Float64 } from "apache-arrow";
import { createButtonIcon, createSwitch } from "./helpers";
import { ArrowStreamer } from "./ArrowStreamer";
import { HEART_INDEX } from "./consts";

let top_input_counter = 0;

// Inject Custom Scrollbar styling for the trigger history box
const style = document.createElement("style");
style.textContent = `
    #trigger_history::-webkit-scrollbar { width: 6px; }
    #trigger_history::-webkit-scrollbar-track { background: #181a1b; border-radius: 3px; }
    #trigger_history::-webkit-scrollbar-thumb { background: #484f58; border-radius: 3px; }
    #trigger_history::-webkit-scrollbar-thumb:hover { background: #5f6873; }
    #modal_trigger_history::-webkit-scrollbar { width: 6px; }
    #modal_trigger_history::-webkit-scrollbar-track { background: #181a1b; border-radius: 3px; }
    #modal_trigger_history::-webkit-scrollbar-thumb { background: #484f58; border-radius: 3px; }
    #modal_trigger_history::-webkit-scrollbar-thumb:hover { background: #5f6873; }
`;
document.head.appendChild(style);

function getCurrentTime() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

(window as any).hasAnyConnectedSensor = () => {
  return PolarVisRow.polarVisRows.length || VernierVisRow.vernierVisRows.length;
};

const webapp_container = document.createElement("div");
webapp_container.id = "webapp_container";
webapp_container.classList.add("container");
document.body.appendChild(webapp_container);

// --- TOP BAR LAYOUT ---
const top_bar_div = document.createElement("div");
top_bar_div.id = "top_bar_div";
top_bar_div.style.display = "flex";
top_bar_div.style.justifyContent = "space-between";
top_bar_div.style.alignItems = "center";
top_bar_div.style.padding = "10px 15px";
top_bar_div.style.width = "100%";
top_bar_div.style.borderBottom = "1px solid #484f58";
top_bar_div.style.marginBottom = "10px";
webapp_container.appendChild(top_bar_div);

// 1. LEFT CONTROLS (Sensors)
const left_controls = document.createElement("div");
left_controls.style.display = "flex";
left_controls.style.gap = "10px";
left_controls.style.alignItems = "center";
top_bar_div.appendChild(left_controls);

// Polar Button
const ble_conn_btn = createButtonIcon(
  "monitor_heart",
  0,
  "ble_connect_btn",
  left_controls,
  true,
  bleConnectHandle,
  ["btn", "btn-primary", "btn-action", "s-circle", "tooltip", "tooltip-bottom"],
);
ble_conn_btn.setAttribute("data-tooltip", "Connect Polar H10");
const polarIcon = ble_conn_btn.querySelector("i");
if (polarIcon) polarIcon.style.fontSize = "22px";

// Vernier Button
const vernier_conn_btn = createButtonIcon(
  "air",
  0,
  "vernier_connect_btn",
  left_controls,
  true,
  vernierConnectHandle,
  ["btn", "btn-primary", "btn-action", "s-circle", "tooltip", "tooltip-bottom"],
);
vernier_conn_btn.setAttribute(
  "data-tooltip",
  "Connect Vernier Respiration Belt",
);
const vernierIcon = vernier_conn_btn.querySelector("i");
if (vernierIcon) vernierIcon.style.fontSize = "22px";

// Disconnect All Button
const ble_disconnect_btn = createButtonIcon(
  "cross",
  0,
  "ble_disconnect_btn",
  left_controls,
  false,
  stopStreamExit,
  ["btn", "btn-error", "btn-action", "s-circle", "tooltip", "tooltip-bottom"],
);
ble_disconnect_btn.setAttribute(
  "data-tooltip",
  "Stop all streams and disconnect",
);
ble_disconnect_btn.disabled = true;

// 2. MIDDLE SECTION (Three-way split: Title | Triggers | Meta)
const middle_section = document.createElement("div");
middle_section.style.display = "flex";
middle_section.style.flex = "1";
middle_section.style.alignItems = "center";
top_bar_div.appendChild(middle_section);

// Middle-Left: Title
const middle_left = document.createElement("div");
middle_left.style.display = "flex";
middle_left.style.flex = "1";
middle_left.style.justifyContent = "flex-end";
middle_left.style.paddingRight = "15px";

const title = document.createElement("h4");
title.textContent = "Physiology Data Visualizer";
title.style.margin = "0";
middle_left.appendChild(title);
middle_section.appendChild(middle_left);

// Middle-Center: Event Triggers
const middle_center = document.createElement("div");
middle_center.style.display = "flex";
middle_center.style.flex = "none";
middle_center.style.alignItems = "center";
middle_center.style.borderLeft = "2px solid #484f58";
middle_center.style.borderRight = "2px solid #484f58";
middle_center.style.padding = "0 15px";
middle_center.style.gap = "8px";
middle_section.appendChild(middle_center);

const trigger_btn = createButtonIcon(
  "keyboard",
  0,
  "trigger_btn",
  middle_center,
  true,
  () => {
    renderTriggerModal();
    document.getElementById("trigger-modal")?.classList.add("active");
  },
  ["btn", "btn-primary", "btn-action", "s-circle", "tooltip", "tooltip-bottom"],
);
trigger_btn.setAttribute("data-tooltip", "Configure Event Triggers");

const trigger_history = document.createElement("div");
trigger_history.id = "trigger_history";
trigger_history.style.height = "36px";
trigger_history.style.width = "380px";
trigger_history.style.flex = "none";
trigger_history.style.overflowY = "auto";
trigger_history.style.background = "#181a1b";
trigger_history.style.border = "1px solid #484f58";
trigger_history.style.borderRadius = "4px";
trigger_history.style.padding = "2px 6px";
trigger_history.style.fontSize = "11px";
trigger_history.style.fontFamily = "monospace";
trigger_history.style.color = "#32ff4bcc";
trigger_history.style.lineHeight = "1.2";
middle_center.appendChild(trigger_history);

const trigger_clear_btn = createButtonIcon(
  "backspace",
  0,
  "trigger_clear_btn",
  middle_center,
  true,
  () => {
    trigger_history.innerHTML = "";
  },
  ["btn", "btn-primary", "btn-action", "s-circle", "tooltip", "tooltip-bottom"],
);
trigger_clear_btn.setAttribute("data-tooltip", "Clear Display");

// Floating Trigger Panel Toggle
let isFloatingPanelOpen = false;

const trigger_floating_btn = createButtonIcon(
  "touch_app",
  0,
  "trigger_floating_btn",
  middle_center,
  true,
  toggleFloatingPanel,
  ["btn", "btn-primary", "btn-action", "s-circle", "tooltip", "tooltip-bottom"],
);
trigger_floating_btn.setAttribute(
  "data-tooltip",
  "Toggle Floating Trigger Panel",
);
// trigger_floating_btn.disabled = true;

function toggleFloatingPanel() {
  isFloatingPanelOpen = !isFloatingPanelOpen;
  floatingTriggerPanel.style.display = isFloatingPanelOpen ? "flex" : "none";
  if (isFloatingPanelOpen) {
    renderFloatingTriggerPanel();
    trigger_floating_btn.classList.remove("btn-primary");
  } else {
    trigger_floating_btn.classList.add("btn-primary");
  }
}

// Middle-Right: Meta Inputs
const middle_right = document.createElement("div");
middle_right.style.display = "flex";
middle_right.style.flex = "1.2";
middle_right.style.justifyContent = "flex-start";
middle_right.style.alignItems = "center";
middle_right.style.paddingLeft = "15px";
middle_right.style.gap = "8px";
middle_section.appendChild(middle_right);

function createSpan(parent: HTMLElement, text: string) {
  const span = document.createElement("span");
  span.textContent = text;
  span.className = "bold-text";
  span.style.fontSize = "14px";
  parent.appendChild(span);
  return span;
}

function createInput(parent: HTMLElement, val: string, width: string) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = val;
  input.className = "form-input input-sm dark-input";
  input.style.width = width;
  input.id = `top-bar-${top_input_counter}`;
  parent.appendChild(input);
  top_input_counter += 1;
  return input;
}

createSpan(middle_right, "Study:");
const studyInput = createInput(middle_right, "study", "65px");

createSpan(middle_right, "Sub:");
const subInput = createInput(middle_right, "1", "35px");

createSpan(middle_right, "Ses:");
const sesInput = createInput(middle_right, "1", "35px");

// Export CSV Switch
const exportCsvSwitch = createSwitch("Export CSV", () => {}, 9999);
exportCsvSwitch.style.marginLeft = "5px";
exportCsvSwitch.style.marginBottom = "0";
const exportCsvCheckbox = exportCsvSwitch.querySelector(
  "input",
) as HTMLInputElement;
exportCsvCheckbox.checked = true; // Checked by default
middle_right.appendChild(exportCsvSwitch);

// 3. RIGHT CONTROLS (Recording)
const right_controls = document.createElement("div");
right_controls.style.display = "flex";
right_controls.style.gap = "10px";
right_controls.style.alignItems = "center";
top_bar_div.appendChild(right_controls);

// Folder Picker
const folderContainer = document.createElement("div");
folderContainer.style.display = "flex";
folderContainer.style.alignItems = "center";
folderContainer.style.gap = "5px";

let directoryHandle: FileSystemDirectoryHandle | null = null;
let currentRunDirHandle: FileSystemDirectoryHandle | null = null;

const folder_btn = createButtonIcon(
  "folder",
  0,
  "folder_btn",
  folderContainer,
  true,
  selectFolderHandle,
  ["btn", "btn-primary", "btn-action", "s-circle", "tooltip", "tooltip-bottom"],
);
folder_btn.setAttribute("data-tooltip", "Select Export Folder");

const folderLabel = document.createElement("span");
folderLabel.textContent = "No folder selected";
folderLabel.style.maxWidth = "120px";
folderLabel.style.whiteSpace = "nowrap";
folderLabel.style.overflow = "hidden";
folderLabel.style.textOverflow = "ellipsis";
folderLabel.style.fontSize = "14px";
folderContainer.appendChild(folderLabel);
right_controls.appendChild(folderContainer);

// Timer Label
const timerLabel = document.createElement("span");
timerLabel.textContent = "00:00:00";
timerLabel.className = "bold-text";
timerLabel.style.fontSize = "16px";
timerLabel.style.fontFamily = "monospace";
right_controls.appendChild(timerLabel);

let recordingTimer: ReturnType<typeof setInterval> | null = null;
let recordingStartTime: number = 0;
let recordingStartTimeIso: string = "";

function updateTimerUI() {
  const diff = Math.floor((Date.now() - recordingStartTime) / 1000);
  const h = Math.floor(diff / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((diff % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (diff % 60).toString().padStart(2, "0");
  timerLabel.textContent = `${h}:${m}:${s}`;
}

// Record Button
let is_recording = false;
const record_btn = createButtonIcon(
  "radio_button_unchecked",
  0,
  "record_btn",
  right_controls,
  true,
  onRecordClicked,
  [
    "btn",
    "btn-primary",
    "btn-action",
    "s-circle",
    "center",
    "tooltip",
    "tooltip-bottom",
  ],
);

const recording_icon = document.createElement("i");
recording_icon.classList.add("material-icons", "hide", "red");
recording_icon.textContent = "radio_button_checked";
const record_icon = record_btn.children[0];
record_btn.setAttribute("data-tooltip", "Start recording");
record_btn.appendChild(recording_icon);
record_btn.disabled = true;

// --- MAIN CONTENT AREA ---
const content = document.createElement("div");
content.id = "content_div";
content.classList.add("flexbox", "content", "flex-col");
webapp_container.appendChild(content);

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
  debug_message.innerHTML =
    "Web Bluetooth API is not present!<br>\n" +
    "Please make sure you are using the latest chrome/chromium based browser.<br>\n" +
    'Also make sure to enable experimental-web-platform-features in your browser <a href="chrome://flags/#enable-experimental-web-platform-features">chrome://flags/#enable-experimental-web-platform-features</a> ';
  debug_message.setAttribute("style", "margin:5% 20%;font-size:1.4em;");
  content.appendChild(debug_message);
  window.stop();
}

// --- EVENT TRIGGER LOGIC ---
let triggerEntries = [
  { key: "0", desc: "Event 0" },
  { key: "1", desc: "Event 1" },
];
let triggerStreamer: ArrowStreamer | null = null;

// Floating Panel construction
const floatingTriggerPanel = document.createElement("div");
floatingTriggerPanel.id = "floating_trigger_panel";
floatingTriggerPanel.style.position = "fixed";
floatingTriggerPanel.style.bottom = "20px";
floatingTriggerPanel.style.right = "20px";
floatingTriggerPanel.style.background = "rgba(27, 29, 31, 0.9)";
floatingTriggerPanel.style.border = "1px solid #484f58";
floatingTriggerPanel.style.borderRadius = "8px";
floatingTriggerPanel.style.padding = "12px";
floatingTriggerPanel.style.display = "none";
floatingTriggerPanel.style.flexDirection = "column";
floatingTriggerPanel.style.gap = "8px";
floatingTriggerPanel.style.zIndex = "1000";
floatingTriggerPanel.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
document.body.appendChild(floatingTriggerPanel);

function renderFloatingTriggerPanel() {
  floatingTriggerPanel.innerHTML = "";

  const title = document.createElement("div");
  title.className = "bold-text";
  title.style.color = "#ffffff";
  title.style.marginBottom = "4px";
  title.style.textAlign = "center";
  title.style.fontSize = "14px";
  title.textContent = "Triggers";
  floatingTriggerPanel.appendChild(title);

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn btn-clear float-right";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "8px";
  closeBtn.style.right = "8px";
  closeBtn.onclick = toggleFloatingPanel;
  floatingTriggerPanel.appendChild(closeBtn);

  if (triggerEntries.length === 0) {
    const empty = document.createElement("div");
    empty.style.color = "#888";
    empty.style.fontSize = "12px";
    empty.style.textAlign = "center";
    empty.style.marginTop = "8px";
    empty.textContent = "No triggers configured.";
    floatingTriggerPanel.appendChild(empty);
    return;
  }

  triggerEntries.forEach((entry) => {
    if (entry.key.trim() === "") return;
    const btn = document.createElement("button");
    btn.className = "btn btn-primary btn-sm";
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.style.fontFamily = "monospace";
    btn.textContent = `[${entry.key}] ${entry.desc}`;
    btn.disabled = !is_recording;
    btn.onclick = () => {
      if (is_recording) fireTrigger(entry.key);
    };
    floatingTriggerPanel.appendChild(btn);
  });
}

// Modal construction
const triggerModal = document.createElement("div");
triggerModal.className = "modal";
triggerModal.id = "trigger-modal";

const modalOverlay = document.createElement("a");
modalOverlay.className = "modal-overlay";
modalOverlay.style.background = "rgba(0, 0, 0, 0.40)"; // Enhanced dark-mode overlay
modalOverlay.setAttribute("aria-label", "Close");
modalOverlay.onclick = () => triggerModal.classList.remove("active");

const modalContainer = document.createElement("div");
modalContainer.className = "modal-container";
modalContainer.style.background = "#1b1d1f";
modalContainer.style.color = "#e8e8e8";
modalContainer.style.maxWidth = "600px"; // Widen modal to fit row nicely
modalContainer.style.width = "90vw";

const modalHeader = document.createElement("div");
modalHeader.className = "modal-header";
const modalClose = document.createElement("button");
modalClose.className = "btn btn-clear float-right";
modalClose.setAttribute("aria-label", "Close");
modalClose.onclick = () => triggerModal.classList.remove("active");

const modalTitle = document.createElement("div");
modalTitle.className = "modal-title h5 bold-text";
modalTitle.style.color = "#ffffff"; // Highly legible white title
modalTitle.textContent = "Configure Event Triggers";
modalHeader.appendChild(modalClose);
modalHeader.appendChild(modalTitle);

const modalBody = document.createElement("div");
modalBody.className = "modal-body";

const triggerListDiv = document.createElement("div");
const addTriggerBtn = document.createElement("button");
addTriggerBtn.className = "btn btn-primary btn-sm";
addTriggerBtn.textContent = "Add Trigger (+)";
addTriggerBtn.style.marginTop = "10px";
addTriggerBtn.onclick = () => {
  triggerEntries.push({ key: "", desc: "" });
  renderTriggerModal();
};

modalBody.appendChild(triggerListDiv);
modalBody.appendChild(addTriggerBtn);

const modalTriggerHistoryWrapper = document.createElement("div");
modalTriggerHistoryWrapper.style.marginTop = "20px";
modalTriggerHistoryWrapper.style.display = "none"; // Hide initially

const modalTriggerHistoryTitle = document.createElement("h6");
modalTriggerHistoryTitle.textContent = "Live Event History";
modalTriggerHistoryWrapper.appendChild(modalTriggerHistoryTitle);

const modalTriggerHistory = document.createElement("div");
modalTriggerHistory.id = "modal_trigger_history";
modalTriggerHistory.style.height = "250px";
modalTriggerHistory.style.width = "100%";
modalTriggerHistory.style.overflowY = "auto";
modalTriggerHistory.style.background = "#181a1b";
modalTriggerHistory.style.border = "1px solid #484f58";
modalTriggerHistory.style.borderRadius = "4px";
modalTriggerHistory.style.padding = "8px";
modalTriggerHistory.style.fontSize = "13px";
modalTriggerHistory.style.fontFamily = "monospace";
modalTriggerHistory.style.color = "#32ff4bcc";
modalTriggerHistory.style.lineHeight = "1.4";
modalTriggerHistoryWrapper.appendChild(modalTriggerHistory);

modalBody.appendChild(modalTriggerHistoryWrapper);

modalContainer.appendChild(modalHeader);
modalContainer.appendChild(modalBody);
triggerModal.appendChild(modalOverlay);
triggerModal.appendChild(modalContainer);
document.body.appendChild(triggerModal);

function renderTriggerModal() {
  triggerListDiv.innerHTML = "";

  // Virtual array injecting the unchangeable defaults into the rendering logic
  const allEntries = [
    { key: "[", desc: "recording start", builtIn: true },
    { key: "]", desc: "recording ends", builtIn: true },
    ...triggerEntries.map((e) => ({ ...e, builtIn: false })),
  ];

  allEntries.forEach((entry, idx) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.marginBottom = "8px";
    row.style.alignItems = "center";

    // Delete Button (Left side)
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-error btn-sm";
    delBtn.textContent = "−";
    delBtn.disabled = is_recording;
    delBtn.style.flexShrink = "0";

    if (entry.builtIn) {
      delBtn.style.visibility = "hidden"; // Cannot delete built-ins
    } else {
      delBtn.onclick = () => {
        triggerEntries.splice(idx - 2, 1); // Offset for the two built-ins
        renderTriggerModal();
        if (isFloatingPanelOpen) renderFloatingTriggerPanel();
      };
    }

    const keyInput = document.createElement("input");
    keyInput.id = `modal-${top_input_counter}`;
    keyInput.className = "form-input input-sm dark-input";
    keyInput.style.width = "30px";
    keyInput.style.flexShrink = "0";
    keyInput.maxLength = 1;
    keyInput.value = entry.key;
    keyInput.disabled = is_recording || entry.builtIn;
    keyInput.placeholder = "Key";

    keyInput.onchange = (e) => {
      const val = (e.target as HTMLInputElement).value;

      // Protect built-ins
      if (val === "[" || val === "]") {
        alert("[ and ] are reserved for start/stop triggers.");
        (e.target as HTMLInputElement).value = triggerEntries[idx - 2].key;
        return;
      }

      const actualEntry = triggerEntries[idx - 2];
      const isDuplicate = triggerEntries.some(
        (t) => t !== actualEntry && t.key.toLowerCase() === val.toLowerCase(),
      );

      // Auto-delete duplicates after 1s
      if (isDuplicate && val.trim() !== "") {
        alert(`The key '${val}' is already used. This entry will be removed.`);
        actualEntry.key = val;
        keyInput.style.borderColor = "#ff453a";
        setTimeout(() => {
          const i = triggerEntries.indexOf(actualEntry);
          if (i > -1) {
            triggerEntries.splice(i, 1);
            renderTriggerModal();
            if (isFloatingPanelOpen) renderFloatingTriggerPanel();
          }
        }, 1000);
        return;
      }

      actualEntry.key = val;
      if (isFloatingPanelOpen) renderFloatingTriggerPanel();
    };
    top_input_counter += 1;

    const descInput = document.createElement("input");
    descInput.className = "form-input input-sm dark-input";
    descInput.style.width = "375px";
    descInput.value = entry.desc;
    descInput.disabled = is_recording || entry.builtIn;
    descInput.placeholder = "Description";
    descInput.onchange = (e) => {
      triggerEntries[idx - 2].desc = (e.target as HTMLInputElement).value;
      if (isFloatingPanelOpen) renderFloatingTriggerPanel();
    };
    descInput.id = `modal-${top_input_counter}`;
    top_input_counter += 1;

    // Send Button for custom triggers (Right side)
    const sendBtn = document.createElement("button");
    sendBtn.className = "btn btn-success btn-sm tooltip";
    sendBtn.setAttribute("data-tooltip", "Fire Trigger Manually");
    sendBtn.textContent = "Send";
    sendBtn.disabled = !is_recording;
    sendBtn.style.flexShrink = "0";
    if (entry.builtIn) {
      sendBtn.style.visibility = "hidden";
    } else {
      sendBtn.onclick = () => {
        if (entry.key.trim() !== "") {
          if (is_recording) fireTrigger(entry.key);
        } else {
          alert("Please assign a key first.");
        }
      };
    }

    // Append in correct order: Delete -> Key -> Description -> Send
    row.appendChild(delBtn);
    row.appendChild(keyInput);
    row.appendChild(descInput);
    row.appendChild(sendBtn);

    triggerListDiv.appendChild(row);
  });

  addTriggerBtn.disabled = is_recording;
  modalTriggerHistoryWrapper.style.display = is_recording ? "block" : "none";
}
renderTriggerModal();

// Shared trigger function
function fireTrigger(key: string) {
  const entry = triggerEntries.find(
    (t) => t.key.toLowerCase() === key.toLowerCase(),
  );
  if (entry) {
    const now = Date.now();
    let timeStr = "00:00:00";
    if (is_recording) {
      const diff = Math.floor((now - recordingStartTime) / 1000);
      const h = Math.floor(diff / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((diff % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const s = (diff % 60).toString().padStart(2, "0");
      timeStr = `${h}:${m}:${s}`;
    }

    const histItem = document.createElement("div");
    histItem.textContent = `[${timeStr}] ${entry.key}: ${entry.desc}`;
    trigger_history.appendChild(histItem);
    trigger_history.scrollTop = trigger_history.scrollHeight;

    const modalHistItem = document.createElement("div");
    modalHistItem.textContent = `[${timeStr}] ${entry.key}: ${entry.desc}`;
    modalTriggerHistory.appendChild(modalHistItem);
    modalTriggerHistory.scrollTop = modalTriggerHistory.scrollHeight;

    if (is_recording && triggerStreamer) {
      triggerStreamer.push({
        epoch_timestamp_ms: now,
        key_code: entry.key.charCodeAt(0),
      });
    }
  }
}

window.addEventListener("keydown", (e) => {
  if (e.repeat) return; // Prevent holding-down spam
  if (
    e.target &&
    ["INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
  )
    return;

  // Block manual [ and ] to preserve system integrity
  if (e.key === "[" || e.key === "]") return;

  if (is_recording) fireTrigger(e.key);
});

// --- FUNCTIONALITY ---

async function selectFolderHandle() {
  try {
    directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    const name = directoryHandle.name;
    folderLabel.textContent = name;
    folderContainer.setAttribute("data-tooltip", name);
    folderContainer.classList.add("tooltip", "tooltip-bottom");
    updateButtons();
  } catch (e) {
    console.error(e);
  }
}

async function convertArrowToCSV(
  fileHandle: FileSystemFileHandle,
  dirHandle: FileSystemDirectoryHandle,
) {
  const file = await fileHandle.getFile();
  const buffer = await file.arrayBuffer();

  // Parse the Arrow IPC file
  const table = tableFromIPC(buffer);
  const fields = table.schema.fields.map((f) => f.name);
  const cols = fields.map((f) => table.getChild(f));

  const csvName = file.name.replace(".arrow", ".csv");
  const csvFileHandle = await dirHandle.getFileHandle(csvName, {
    create: true,
  });
  const writable = await csvFileHandle.createWritable();

  // Write header
  await writable.write(fields.join(",") + "\n");

  const numRows = table.numRows;
  const CHUNK_SIZE = 10000;

  // Batch chunk processing to avoid memory/string limits
  for (let i = 0; i < numRows; i += CHUNK_SIZE) {
    let chunkStr = "";
    const end = Math.min(i + CHUNK_SIZE, numRows);
    for (let j = i; j < end; j++) {
      const rowArr: any[] = [];
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c];
        rowArr.push(col ? col.get(j) : "");
      }
      chunkStr += rowArr.join(",") + "\n";
    }
    await writable.write(chunkStr);
  }
  await writable.close();
}

async function onRecordClicked(ev: any) {
  if (is_recording) {
    is_recording = false;
    record_btn.classList.add("btn-primary");
    renderTriggerModal(); // Re-enable trigger settings inputs
    if (isFloatingPanelOpen) renderFloatingTriggerPanel();

    // Stop Timer
    if (recordingTimer) clearInterval(recordingTimer);
    recordingTimer = null;

    // Lock UI during shutdown and CSV parsing
    ble_conn_btn.disabled = true;
    // trigger_floating_btn.disabled = false;
    vernier_conn_btn.disabled = true;
    record_btn.disabled = true;
    recording_icon.textContent = "hourglass_empty"; // Indicate processing

    // Record Built-in Stop Trigger
    if (triggerStreamer) {
      const stopNow = Date.now();
      const diff = Math.floor((stopNow - recordingStartTime) / 1000);
      const h = Math.floor(diff / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((diff % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const s = (diff % 60).toString().padStart(2, "0");

      triggerStreamer.push({
        epoch_timestamp_ms: stopNow,
        key_code: "]".charCodeAt(0),
      });

      const histItem = document.createElement("div");
      histItem.textContent = `[${h}:${m}:${s}] ]: recording ends`;
      trigger_history.appendChild(histItem);
      trigger_history.scrollTop = trigger_history.scrollHeight;

      const modalHistItem = document.createElement("div");
      modalHistItem.textContent = `[${h}:${m}:${s}] ]: recording ends`;
      modalTriggerHistory.appendChild(modalHistItem);
      modalTriggerHistory.scrollTop = modalTriggerHistory.scrollHeight;

      await triggerStreamer.close();
      triggerStreamer = null;
    }

    // Gracefully stop all streams (flush Arrow caches to disk)
    for (const row of PolarVisRow.polarVisRows) {
      try {
        await row.stopRecording();
      } catch (e) {
        console.error(e);
      }
    }
    for (const row of VernierVisRow.vernierVisRows) {
      try {
        await row.stopRecording();
      } catch (e) {
        console.error(e);
      }
    }

    // Export Master Metadata JSON & Parse CSVs
    if (currentRunDirHandle) {
      try {
        // Build centralized Metadata object
        const metadataExport: any = {
          study: studyInput.value,
          sub: subInput.value,
          ses: sesInput.value,
          recording_start_time: recordingStartTimeIso,
          recording_end_time: new Date().toISOString(),
          sensors: [],
        };

        for (const row of PolarVisRow.polarVisRows) {
          if (row.ECGIsOn())
            metadataExport.sensors.push(Object.fromEntries(row.getEcgMeta()));
          if (row.ACCIsOn())
            metadataExport.sensors.push(Object.fromEntries(row.getAccMeta()));
          if (row.bodypartSelect.selectedIndex === HEART_INDEX)
            metadataExport.sensors.push(Object.fromEntries(row.getHRMeta()));
        }
        for (const row of VernierVisRow.vernierVisRows) {
          if (row.forceIsOn())
            metadataExport.sensors.push(Object.fromEntries(row.getForceMeta()));
          if (row.brIsOn())
            metadataExport.sensors.push(Object.fromEntries(row.getBRMeta()));
        }

        const trigMeta: any = {
          sensor_name: "Keyboard",
          modality: "Event_Trigger",
          "trigger_[": "recording start",
          "trigger_]": "recording ends",
        };
        triggerEntries.forEach((t) => {
          if (t.key.trim() !== "") trigMeta[`trigger_${t.key}`] = t.desc;
        });
        metadataExport.sensors.push(trigMeta);

        const metaFileHandle = await currentRunDirHandle.getFileHandle(
          `metadata.json`,
          { create: true },
        );
        const metaWritable = await metaFileHandle.createWritable();
        await metaWritable.write(JSON.stringify(metadataExport, null, 2));
        await metaWritable.close();

        // Convert saved arrow streams to CSV
        if (exportCsvCheckbox.checked) {
          for await (const [name, handle] of (
            currentRunDirHandle as any
          ).entries()) {
            if (handle.kind === "file" && name.endsWith(".arrow")) {
              await convertArrowToCSV(
                handle as FileSystemFileHandle,
                currentRunDirHandle,
              );
            }
          }
        }
      } catch (err) {
        console.error("Error in Export Process:", err);
      }
    }

    // Reset UI State
    timerLabel.textContent = "00:00:00";
    recording_icon.textContent = "radio_button_checked";
    recording_icon.classList.add("hide");
    record_icon.classList.remove("hide");
    record_btn.setAttribute("data-tooltip", "Start recording");

    ble_conn_btn.disabled = false;
    vernier_conn_btn.disabled = false;
    updateButtons();
  } else {
    if (!directoryHandle) return;

    is_recording = true;
    renderTriggerModal(); // Disable trigger settings inputs
    if (isFloatingPanelOpen) renderFloatingTriggerPanel();
    ble_conn_btn.disabled = true;
    vernier_conn_btn.disabled = true;
    // trigger_floating_btn.disabled = true;
    record_icon.classList.add("hide");
    recording_icon.classList.remove("hide");
    record_btn.setAttribute("data-tooltip", "Stop recording");
    record_btn.classList.remove("btn-primary");

    // Reset and Start Timer
    timerLabel.textContent = "00:00:00";
    recordingStartTime = Date.now();
    recordingStartTimeIso = new Date(recordingStartTime).toISOString();
    recordingTimer = setInterval(updateTimerUI, 1000);

    const sName = studyInput.value || "study";
    const sub = subInput.value || "1";
    const ses = sesInput.value || "1";
    const dStr = getCurrentTime();
    const runFolderName = `${sName}_sub-${sub}_ses-${ses}_date-${dStr}`;

    currentRunDirHandle = await directoryHandle.getDirectoryHandle(
      runFolderName,
      { create: true },
    );

    // Initialize Event Trigger Arrow Streamer
    const triggerMeta = new Map<string, string>([
      ["sensor_name", "Keyboard"],
      ["modality", "Event_Trigger"],
      ["trigger_[", "recording start"],
      ["trigger_]", "recording ends"],
    ]);
    triggerEntries.forEach((t) => {
      if (t.key.trim() !== "") triggerMeta.set(`trigger_${t.key}`, t.desc);
    });

    const triggerSchema = new Schema(
      [
        new Field("epoch_timestamp_ms", new Float64(), false),
        new Field("key_code", new Float64(), false),
      ],
      triggerMeta,
    );

    const triggerFileHandle = await currentRunDirHandle.getFileHandle(
      `Event_Triggers.arrow`,
      { create: true },
    );
    triggerStreamer = new ArrowStreamer(triggerFileHandle, triggerSchema);

    // Clear history views for the new recording
    trigger_history.innerHTML = "";
    modalTriggerHistory.innerHTML = "";

    // Record Built-in Start Trigger
    const startNow = Date.now();
    triggerStreamer.push({
      epoch_timestamp_ms: startNow,
      key_code: "[".charCodeAt(0),
    });

    const histItem = document.createElement("div");
    histItem.textContent = `[00:00:00] [: recording start`;
    trigger_history.appendChild(histItem);
    trigger_history.scrollTop = trigger_history.scrollHeight;

    const modalHistItem = document.createElement("div");
    modalHistItem.textContent = `[00:00:00] [: recording start`;
    modalTriggerHistory.appendChild(modalHistItem);
    modalTriggerHistory.scrollTop = modalTriggerHistory.scrollHeight;

    // Initialize Sensor Streams
    for (const row of PolarVisRow.polarVisRows)
      await row.startRecording(currentRunDirHandle);
    for (const row of VernierVisRow.vernierVisRows)
      await row.startRecording(currentRunDirHandle);
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
  await createPolarVisRow(polar_content_div, device);
  updateButtons();
}

async function vernierConnectHandle() {
  try {
    const device = await godirect.selectDevice();
    if (!device) return;
    const row = new VernierVisRow(vernier_content_div, device);
    await row.init();
    updateButtons();
  } catch (err) {
    console.error(err);
    alert(err);
  }
}

async function stopStreamExit() {
  if (is_recording) {
    try {
      await onRecordClicked(null);
    } catch (e) {
      console.error(e);
    }
  }
  try {
    await PolarVisRow.disconnectAllPolarH10();
  } catch (e) {
    console.error(e);
  }
  for (const row of [...VernierVisRow.vernierVisRows]) {
    try {
      await row.disconnect();
    } catch (e) {
      console.error(e);
    }
  }
  updateButtons();
}

function updateButtons() {
  const hasStream = (window as any).hasAnyConnectedSensor();
  ble_disconnect_btn.disabled = !hasStream;
  if (!is_recording) {
    record_btn.disabled = !(hasStream && directoryHandle !== null);
  }
}

(window as any).updateGlobalButtons = updateButtons;

window.onbeforeunload = function (event) {
  if ((window as any).hasAnyConnectedSensor()) {
    event.preventDefault();
    event.returnValue = "";
  } else {
    window.close();
  }
};

function location_reload() {
  location.reload();
}
if (!(window as any).IS_PRODUCTION) {
  new EventSource("/esbuild").addEventListener("change", location_reload);
}
