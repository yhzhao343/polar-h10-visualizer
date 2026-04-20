import { SmoothieChart } from "smoothie";
import { FilterInfo } from "./consts";
import { PolarVisRow } from "./PolarH10VisualizerRow";

export function updateSearchURL(config: Object) {
  const curr_url_search_string = window.location.search;
  const url_params: URLSearchParams = new URLSearchParams(
    curr_url_search_string,
  );
  for (const [key, val] of Object.entries(config)) {
    url_params.set(key, val);
  }
  if (url_params.toString() !== curr_url_search_string) {
    const new_url = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${url_params.toString()}`;
    window.history.pushState({ path: new_url }, "", new_url);
  }
}

export function resizeSmoothieGen(
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

export function createSwitch(
  labeltext: string,
  eventHandler: (ev: Event) => void,
  id: number,
) {
  const label = document.createElement("label");
  label.setAttribute("class", "form-switch");
  label.classList.add("label-sm");
  const input = document.createElement("input");
  input.id = `${labeltext}-onoff-${id}`;
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

export function createSelect(
  id: string,
  num_id: number,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
  options: string[] | number[] = [],
  selectedInd: number | undefined = undefined,
) {
  const select = document.createElement("select");
  configureHTMLElement(select, id, parent, classList, textContent, num_id);
  addOptionsToSelect(select, options, num_id);
  if (selectedInd !== undefined) {
    select.selectedIndex = selectedInd;
  }
  return select;
}

export function addOptionsToSelect(
  select: HTMLSelectElement,
  options: string[] | number[],
  num_id: number,
) {
  for (let i = 0; i < options.length; i++) {
    const option_str = options[i];
    const option: HTMLOptionElement = document.createElement("option");
    option.id = `${select.id}-${i}-${num_id}`;
    option.textContent = option_str.toString();
    select.appendChild(option);
  }
}

export function createDiv(
  id: string,
  num_id: number,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
) {
  const myDiv = document.createElement("div");
  configureHTMLElement(myDiv, id, parent, classList, textContent, num_id);
  return myDiv;
}

export function createNumInput(
  id: string,
  num_id: number,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  min: number = 0,
  max: number = 100,
  step: number = 1,
  val: number = 1,
  textContent: string = "",
) {
  const myNumInput = document.createElement("input");
  configureHTMLElement(
    myNumInput,
    id,
    parent,
    ["form-input", "input-sm", ...classList],
    textContent,
    num_id,
  );
  myNumInput.setAttribute("type", "number");
  myNumInput.setAttribute("min", min.toString());
  myNumInput.setAttribute("max", max.toString());
  myNumInput.setAttribute("step", step.toString());
  myNumInput.setAttribute("value", val.toString());
  return myNumInput;
}

export function createTextInput(
  id: string,
  num_id: number,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
  // num_id: number,
) {
  const myNumInput = document.createElement("input");
  configureHTMLElement(
    myNumInput,
    id,
    parent,
    ["form-input", "input-sm", ...classList],
    textContent,
    num_id,
  );
  myNumInput.setAttribute("type", "text");
  return myNumInput;
}

export function createSpan(
  id: string,
  num_id: number,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
) {
  const mySpan = document.createElement("span");
  configureHTMLElement(mySpan, id, parent, classList, textContent, num_id);
  return mySpan;
}

export function createSlider(
  id: string,
  num_id: number,
  min: number,
  max: number,
  value: number,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
) {
  const mySlider = document.createElement("input");
  mySlider.setAttribute("type", "range");
  const minStr = min.toString();
  const maxStr = max.toString();
  mySlider.setAttribute("min", minStr);
  mySlider.setAttribute("max", maxStr);
  mySlider.setAttribute("value", value.toString());
  mySlider.setAttribute("data-tooltip", value.toString());
  createSpan(`${id}Min`, num_id, parent, ["padright-5px"], minStr);
  configureHTMLElement(
    mySlider,
    id,
    parent,
    ["slider", "tooltip", ...classList],
    textContent,
    num_id,
  );
  createSpan(
    `${id}Max`,
    num_id,
    parent,
    ["padleft-5px", "padright-5px"],
    maxStr,
  );
  return mySlider;
}

export function createCanvas(
  id: string,
  num_id: number,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
) {
  const myCanvas = document.createElement("canvas");
  configureHTMLElement(myCanvas, id, parent, classList, textContent, num_id);
  return myCanvas;
}

export function configureHTMLElement(
  e: HTMLElement,
  id: string,
  parent: HTMLElement | undefined = undefined,
  classList: string[] = [],
  textContent: string = "",
  // idGenerator: () => number = getPolarRowId,
  num_id: number,
) {
  e.id = `${id}-${num_id}`;
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

// export function getPolarRowId() {
//   return PolarVisRow.polarRowID;
// }

export function ECGIsOn(row: PolarVisRow) {
  return row.ECGDiv !== undefined;
}

export function ACCIsOn(row: PolarVisRow) {
  return row.ACCDiv !== undefined;
}

type TPDir = "top" | "right" | "bottom" | "left";

export function addTooltip(
  e: HTMLElement,
  tooltip: string,
  dir: TPDir = "top",
) {
  e.setAttribute("data-tooltip", tooltip);
  e.classList.add("tooltip", `tooltip-${dir}`);
}

export function createButtonIcon(
  type: string,
  id_suffix: number,
  id: string | undefined = undefined,
  parent: HTMLElement | undefined = undefined,
  isMaterialIcon: boolean = false,
  onclick: GlobalEventHandlers["onclick"] | undefined = undefined,
  classList: string[] = [],
) {
  const btn = document.createElement("button");
  if (id) {
    if (id_suffix !== undefined) {
      btn.id = `${id}-${id_suffix}`;
    } else {
      btn.id = id;
    }
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

export function capitalizeFirstLetter(str: string) {
  if (typeof str !== "string" || str.length === 0) {
    return str; // Handle non-string or empty inputs
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function prettyPrintFilter(filterInfo: FilterInfo, cap: boolean = true) {
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

export function compactPrettyPrintFilter(filterInfo: FilterInfo) {
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
