import { TimeSeries } from "smoothie";
import { CustomSmoothie, SmoothieTSInfo, genSmoothieLegendInfo } from "./CustomSmoothie";
import { createButtonIcon } from "./helpers";
import { ArrowStreamer } from "./ArrowStreamer";
import { Schema, Field, Float64 } from "apache-arrow";
import { DEFAULT_MILLIS_PER_PX } from "./consts";

function createDiv(id: string, parent?: HTMLElement, classList: string[] = [], textContent: string = "") {
    const div = document.createElement("div");
    div.id = id;
    if (classList.length) div.classList.add(...classList);
    if (textContent) div.textContent = textContent;
    if (parent) parent.appendChild(div);
    return div;
}

function createCanvas(id: string, parent?: HTMLElement, classList: string[] = []) {
    const canvas = document.createElement("canvas");
    canvas.id = id;
    if (classList.length) canvas.classList.add(...classList);
    if (parent) parent.appendChild(canvas);
    return canvas;
}

function createSwitch(labeltext: string, eventHandler: (ev: Event) => void, idGenerator: () => number) {
    const label = document.createElement("label");
    label.setAttribute("class", "form-switch");
    label.classList.add("label-sm");
    const input = document.createElement("input");
    input.id = `${labeltext}-onoff-${idGenerator()}`;
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

function addTooltip(e: HTMLElement, tooltip: string, dir: "top" | "right" | "bottom" | "left" = "top") {
    e.setAttribute("data-tooltip", tooltip);
    e.classList.add("tooltip", `tooltip-${dir}`);
}

function resizeSmoothieGen(chart: any, widthRatio: number, heightRatio: number) {
    return () => {
        const canvas: any = chart.canvas;
        if (!canvas) return;
        const parent: HTMLElement = canvas.parentNode;
        if (!parent) return;
        let width = parent.offsetWidth;
        let height = parent.offsetHeight;
        canvas.width = (width * widthRatio) - 5;
        canvas.height = height * heightRatio;
    };
}

export class VernierVisRow {
    static vernierRowID: number = 0;
    static vernierVisRows: VernierVisRow[] = [];

    device: any;
    deviceName: string;
    parent: HTMLElement;
    sensorRowDiv!: HTMLDivElement;
    optionDiv!: HTMLDivElement;
    visContainerDiv!: HTMLDivElement;

    order!: number;
    rowOrder!: HTMLDivElement;
    orderUpBtn!: HTMLButtonElement;
    orderDownBtn!: HTMLButtonElement;

    forceDiv?: HTMLDivElement;
    forceCanvas?: HTMLCanvasElement;
    forceChart?: CustomSmoothie;
    forceResize?: () => void;
    forceResizeObserver?: ResizeObserver;
    forceSwitchInput!: HTMLInputElement;
    forceMax: number = 50;
    forceMin: number = -10;
    forceInfo!: SmoothieTSInfo;

    brDiv?: HTMLDivElement;
    brCanvas?: HTMLCanvasElement;
    brChart?: CustomSmoothie;
    brResize?: () => void;
    brResizeObserver?: ResizeObserver;
    brSwitchInput!: HTMLInputElement;
    brMax: number = 30;
    brMin: number = 0;
    brInfo!: SmoothieTSInfo;

    forceTS!: TimeSeries;
    respRateTS!: TimeSeries;

    forceSensor: any;
    dataCtrl!: HTMLDivElement;
    handleDataBound!: (sensor: any) => void;

    // Arrow Logging
    forceStreamer?: ArrowStreamer;
    brStreamer?: ArrowStreamer;

    is_recording: boolean = false;

    private forceDataWindow: number[] = [];
    private forceTimeWindow: number[] = [];

    constructor(content: HTMLElement, device: any) {
        this.parent = content;
        this.device = device;
        this.deviceName = device.name || "Vernier Respiration Belt";
    }

    async startRecording(dirHandle: FileSystemDirectoryHandle) {

        if (this.forceIsOn()) {
            const forceFileHandle = await dirHandle.getFileHandle(`Vernier_${this.deviceName}_Force.arrow`, { create: true });
            this.forceStreamer = new ArrowStreamer(forceFileHandle, this.getForceSchema())
        }

        if (this.brIsOn()) {
            const brFileHandle = await dirHandle.getFileHandle(`Vernier_${this.deviceName}_BR.arrow`, { create: true });
            this.brStreamer = new ArrowStreamer(brFileHandle, this.getBRSchema())
        }

        this.is_recording = true;
    }

    getForceMeta() {
        return new Map([
            ["sensor_name", "Vernier respiration belt"],
            ["device_name", this.deviceName],
            ["modality", "Force"],
        ]);
    }

    getForceSchema() {
        return new Schema([
            new Field("epoch_timestamp_ms", new Float64(), false),
            new Field("Force_N", new Float64(), false),
        ], this.getForceMeta());
    }

    getBRMeta() {
        return new Map([
            ["sensor_name", "Vernier respiration belt"],
            ["device_name", this.deviceName],
            ["modality", "BR"],
        ])
    }

    getBRSchema() {
        return new Schema([
            new Field("epoch_timestamp_ms", new Float64(), false),
            new Field("BR_bpm", new Float64(), false),
        ], this.getBRMeta());
    }

    async stopRecording() {
        if (this.forceStreamer) {
            await this.forceStreamer.close();
            this.forceStreamer = undefined;
        }
        if (this.brStreamer) {
            await this.brStreamer.close();
            this.brStreamer = undefined;
        }
        this.is_recording = false;
    }

    static hasAnyActiveStream() {
        // return VernierVisRow.vernierVisRows.length > 0;
        for (let i = 0; i < VernierVisRow.vernierVisRows.length - 1; i++) {
            const row = VernierVisRow.vernierVisRows[i];
            if (row.forceDiv !== undefined || row.brDiv !== undefined) return true;
        }
        return false;
    }

    static includesDuplicate(self: VernierVisRow, key: string = "device"): number {
        for (let i = 0; i < VernierVisRow.vernierVisRows.length; i++) {
            let row = VernierVisRow.vernierVisRows[i];
            if (row !== self && row[key] && self[key] && row[key].id === self[key].id) {
                return i;
            }
        }
        return -1;
    }

    async init() {
        this.sensorRowDiv = createDiv(`vernierSensorDiv-${VernierVisRow.vernierRowID}`, this.parent, ["polar-sensor-row", "flexbox"]);

        this.optionDiv = createDiv(`vernierOptionDiv`, this.sensorRowDiv, ["polar-sensor-left-panel", "center"]);

        this.order = VernierVisRow.vernierVisRows.length;
        this.sensorRowDiv.style.order = this.order.toString();

        const deviceInfoDiv = createDiv("deviceInfoDiv", this.optionDiv, ["device-info"]);

        const disconnectDiv = createDiv("disconnectDiv", undefined, ["flexbox", "disconnect"]);
        const disBtn = createButtonIcon(
            "delete", VernierVisRow.vernierRowID, "VernierDistBtn", disconnectDiv, false, () => this.disconnect(), ["btn", "btn-primary", "btn-sm", "s-circle"]
        );
        addTooltip(disBtn, "disconnect", "top");

        const nameDiv = createDiv("nameDiv", undefined, ["flexbox", "flex"]);
        createDiv("devicename", nameDiv, ["flexbox", "mid-text"], this.deviceName);

        deviceInfoDiv.appendChild(disconnectDiv);
        deviceInfoDiv.appendChild(nameDiv);

        this.rowOrder = createDiv("rowOrder", this.optionDiv, ["row-order"]);
        this.orderUpBtn = createButtonIcon(
            "arrow-up", VernierVisRow.vernierRowID, "VernierOrderUpBtn", this.rowOrder, false, this.moveUp, ["btn", "btn-primary", "btn-sm"]
        ) as HTMLButtonElement;
        addTooltip(this.orderUpBtn, "Move up", "right");
        this.orderUpBtn.disabled = VernierVisRow.vernierVisRows.length < 1;

        this.orderDownBtn = createButtonIcon(
            "arrow-down", VernierVisRow.vernierRowID, "VernierOrderDownBtn", this.rowOrder, false, this.moveDown, ["btn", "btn-primary", "btn-sm"]
        ) as HTMLButtonElement;
        addTooltip(this.orderDownBtn, "Move down", "right");
        this.orderDownBtn.disabled = true;

        if (VernierVisRow.vernierVisRows.length > 0) {
            VernierVisRow.vernierVisRows[VernierVisRow.vernierVisRows.length - 1].orderDownBtn.disabled = false;
        }

        this.dataCtrl = createDiv("dataCtrl", this.optionDiv, ["data-ctrl", "full-width", "flexbox"]);

        const forceCtrlDiv = createDiv("forceCtrlDiv", this.dataCtrl, ["half-width"]);
        const forceSwitch = createSwitch("Force", this.onToggleForce, () => VernierVisRow.vernierRowID);
        forceCtrlDiv.appendChild(forceSwitch);
        this.forceSwitchInput = forceSwitch.querySelector("input") as HTMLInputElement;

        const brCtrlDiv = createDiv("brCtrlDiv", this.dataCtrl, ["half-width"]);
        const brSwitch = createSwitch("Resp", this.onToggleBR, () => VernierVisRow.vernierRowID);
        brCtrlDiv.appendChild(brSwitch);
        this.brSwitchInput = brSwitch.querySelector("input") as HTMLInputElement;

        this.visContainerDiv = createDiv("vernierVisContainer", this.sensorRowDiv, ["visContainer", "full-width"]);

        this.forceTS = new TimeSeries();
        this.respRateTS = new TimeSeries();

        this.forceInfo = new SmoothieTSInfo(undefined, undefined, "Force: -- N", "left", 2, 30, true, "top", "bold 20px 'Roboto Mono'", "#32ff4bcc");
        this.brInfo = new SmoothieTSInfo(undefined, undefined, "BR: -- bpm", "left", 2, 30, true, "top", "bold 20px 'Roboto Mono'", "#ff70ffcc");

        const duplicateInd = VernierVisRow.includesDuplicate(this, "device");
        if (duplicateInd < 0) {
            this.forceSensor = this.device.getSensor(1);
            this.forceSensor.setEnabled(true);
            await this.device.start();
        } else {
            this.forceSensor = VernierVisRow.vernierVisRows[duplicateInd].forceSensor;
        }

        this.handleDataBound = this.handleData.bind(this);
        this.forceSensor.on('value-changed', this.handleDataBound);

        VernierVisRow.vernierRowID++;
        VernierVisRow.vernierVisRows.push(this);

        this.forceSwitchInput.checked = true;
        this.onToggleForce({ target: this.forceSwitchInput });

        this.brSwitchInput.checked = true
        this.onToggleBR({ target: this.brSwitchInput });
    }

    moveUp = (ev: any) => {
        this.order -= 1;
        this.sensorRowDiv.style.order = this.order.toString();
        const prevRow = VernierVisRow.vernierVisRows[this.order];
        prevRow.order += 1;
        prevRow.sensorRowDiv.style.order = prevRow.order.toString();
        VernierVisRow.vernierVisRows[this.order] = this;
        VernierVisRow.vernierVisRows[prevRow.order] = prevRow;
        if (this.order === 0) {
            this.orderUpBtn.disabled = true;
            this.orderDownBtn.disabled = false;
            prevRow.orderUpBtn.disabled = false;
        } else if (this.order === VernierVisRow.vernierVisRows.length - 2) {
            this.orderDownBtn.disabled = false;
        }
        if (prevRow.order === VernierVisRow.vernierVisRows.length - 1) {
            prevRow.orderDownBtn.disabled = true;
            prevRow.orderUpBtn.disabled = false;
        }
    };

    moveDown = (ev: any) => {
        this.order += 1;
        this.sensorRowDiv.style.order = this.order.toString();
        const nextRow = VernierVisRow.vernierVisRows[this.order];
        nextRow.order -= 1;
        nextRow.sensorRowDiv.style.order = nextRow.order.toString();
        VernierVisRow.vernierVisRows[this.order] = this;
        VernierVisRow.vernierVisRows[nextRow.order] = nextRow;

        if (this.order === VernierVisRow.vernierVisRows.length - 1) {
            this.orderUpBtn.disabled = false;
            this.orderDownBtn.disabled = true;
            nextRow.orderDownBtn.disabled = false;
        } else if (this.order === 1) {
            this.orderUpBtn.disabled = false;
        }
        if (nextRow.order === 0) {
            nextRow.orderDownBtn.disabled = false;
            nextRow.orderUpBtn.disabled = true;
        }
    };

    private static reOrderRows() {
        for (let i = 0; i < VernierVisRow.vernierVisRows.length; i++) {
            const row = VernierVisRow.vernierVisRows[i];
            row.order = i;
            row.sensorRowDiv.style.order = i.toString();
        }
    }

    onToggleForce = (ev: any) => {
        if (ev.target?.checked) {
            let width_class = this.brDiv === undefined ? "full-width" : "half-width";
            if (this.brDiv) {
                this.brDiv.classList.remove("full-width");
                this.brDiv.classList.add("half-width");
            }
            this.forceDiv = createDiv("forceDiv", this.visContainerDiv, ["float-left", "almost-full-height", width_class]);
            this.forceDiv.addEventListener("wheel", this.onWheelForce);

            if (this.brDiv && this.visContainerDiv.contains(this.brDiv)) {
                this.visContainerDiv.insertBefore(this.forceDiv, this.brDiv);
            }

            this.forceCanvas = createCanvas("forceCanvas", this.forceDiv);
            this.forceChart = new CustomSmoothie({
                limitFPS: 60,
                millisPerPixel: DEFAULT_MILLIS_PER_PX * 2,
                scaleSmoothing: 0.1,
                tooltip: false,
                minValueScale: 1,
                maxValueScale: 1,
                grid: { strokeStyle: "#484f58", fillStyle: "#000000", lineWidth: 1, millisPerLine: 1000, borderVisible: false },
                title: { text: "Respiration Force (N)", fillStyle: "#ffffff80", fontSize: 14, fontFamily: "Arial", verticalAlign: "bottom" },
                minValue: this.forceMin,
                maxValue: this.forceMax
            });

            this.forceChart.configureTimeSeries(
                [this.forceTS],
                [{ strokeStyle: "#32ff4bcc", lineWidth: 2 }],
                [genSmoothieLegendInfo("― Force (N)", 10, 0)],
                true, this.forceMin, this.forceMax, 1, 1,
                "Respiration Force (N)", false, [], true, true, true
            );
            this.forceChart.addSmoothieTSInfo(this.forceInfo);
            this.forceChart.streamTo(this.forceCanvas, 0);

            this.forceResize = resizeSmoothieGen(this.forceChart, 1, 1);
            this.forceResizeObserver = new ResizeObserver(() => this.forceResize!());
            this.forceResizeObserver.observe(this.forceDiv);
            this.forceResize();
            this.forceChart.start();
        } else {
            if (this.forceChart) this.forceChart.stop();
            if (this.forceDiv) {
                this.visContainerDiv.removeChild(this.forceDiv);
                this.forceResizeObserver?.disconnect();
                this.forceDiv = undefined;
                this.forceChart = undefined;
            }
            if (this.brDiv) {
                this.brDiv.classList.remove("half-width");
                this.brDiv.classList.add("full-width");
            }
        }
        if (typeof (window as any).updateGlobalButtons === "function") {
            (window as any).updateGlobalButtons();
        }
    };

    onToggleBR = (ev: any) => {
        if (ev.target?.checked) {
            let width_class = this.forceDiv === undefined ? "full-width" : "half-width";
            if (this.forceDiv) {
                this.forceDiv.classList.remove("full-width");
                this.forceDiv.classList.add("half-width");
            }
            this.brDiv = createDiv("brDiv", this.visContainerDiv, ["float-left", "almost-full-height", width_class]);
            this.brDiv.addEventListener("wheel", this.onWheelBR);

            this.brCanvas = createCanvas("brCanvas", this.brDiv);
            this.brChart = new CustomSmoothie({
                limitFPS: 60,
                millisPerPixel: DEFAULT_MILLIS_PER_PX * 2,
                scaleSmoothing: 0.1,
                tooltip: false,
                minValueScale: 1,
                maxValueScale: 1,
                grid: { strokeStyle: "#484f58", fillStyle: "#000000", lineWidth: 1, millisPerLine: 1000, borderVisible: false },
                title: { text: "Breathing Rate (bpm)", fillStyle: "#ffffff80", fontSize: 14, fontFamily: "Arial", verticalAlign: "bottom" },
                minValue: this.brMin,
                maxValue: this.brMax
            });

            this.brChart.configureTimeSeries(
                [this.respRateTS],
                [{ strokeStyle: "#ff70ffcc", lineWidth: 2 }],
                [genSmoothieLegendInfo("― Resp Rate (bpm)", 10, 0)],
                true, this.brMin, this.brMax, 1, 1,
                "Calculated Breathing Rate (bpm)", false, [], true, true, true
            );
            this.brChart.addSmoothieTSInfo(this.brInfo);
            this.brChart.streamTo(this.brCanvas, 0);

            this.brResize = resizeSmoothieGen(this.brChart, 1, 1);
            this.brResizeObserver = new ResizeObserver(() => this.brResize!());
            this.brResizeObserver.observe(this.brDiv);
            this.brResize();
            this.brChart.start();
        } else {
            if (this.brChart) this.brChart.stop();
            if (this.brDiv) {
                this.visContainerDiv.removeChild(this.brDiv);
                this.brResizeObserver?.disconnect();
                this.brDiv = undefined;
                this.brChart = undefined;
            }
            if (this.forceDiv) {
                this.forceDiv.classList.remove("half-width");
                this.forceDiv.classList.add("full-width");
            }
        }
        if (typeof (window as any).updateGlobalButtons === "function") {
            (window as any).updateGlobalButtons();
        }
    };

    forceIsOn() {
        return this.forceDiv !== undefined;
    }

    brIsOn() {
        return this.brDiv !== undefined;
    }

    onWheelForce = (ev: any) => {
        if (this.forceChart && !this.forceChart.yScaleIsAuto()) {
            ev.preventDefault();
            const delta = ev.deltaY < 0 ? 2 : -2;
            this.forceMax += delta;
            this.forceMin -= delta;
            if (this.forceMax <= this.forceMin + 1) {
                this.forceMax -= delta;
                this.forceMin += delta;
            }
            this.forceChart.options.minValue = this.forceMin;
            this.forceChart.options.maxValue = this.forceMax;
        }
    };

    onWheelBR = (ev: any) => {
        if (this.brChart && !this.brChart.yScaleIsAuto()) {
            ev.preventDefault();
            const delta = ev.deltaY < 0 ? 2 : -2;
            this.brMax += delta;
            if (this.brMax < 5) this.brMax -= delta; // Prevent zooming too close for bpm
            this.brChart.options.minValue = this.brMin;
            this.brChart.options.maxValue = this.brMax;
        }
    };

    handleData(sensor: any) {
        const force = sensor.value;
        const timestamp = performance.now();
        const epoch_timestamp = Date.now();

        this.forceTS.append(epoch_timestamp, force);
        this.forceInfo.text = `Force:${force.toFixed(1).padStart(6, " ")}(N)`;

        const br = this.calculateBreathingRate(force, timestamp);
        if (br > 0) {
            this.respRateTS.append(epoch_timestamp, br);
            this.brInfo.text = `BR:${br.toFixed(1).padStart(6, " ")}(bpm)`;
        }

        if (this.is_recording) {
            if (this.forceStreamer != undefined) {
                this.forceStreamer.push({
                    epoch_timestamp_ms: epoch_timestamp,
                    Force_N: force,
                });
            }
            if (this.brStreamer != undefined) {
                this.brStreamer.push({
                    epoch_timestamp_ms: epoch_timestamp,
                    BR_bpm: br,
                })
            }
        }
    }

    calculateBreathingRate(force: number, timestamp: number) {
        this.forceDataWindow.push(force);
        this.forceTimeWindow.push(timestamp);

        // Maintain a 20 second window for accurate breathing cycles
        while (this.forceTimeWindow.length > 0 && timestamp - this.forceTimeWindow[0] > 20000) {
            this.forceTimeWindow.shift();
            this.forceDataWindow.shift();
        }

        if (this.forceDataWindow.length < 20) return 0;

        // Apply moving average smoothing (window size 5)
        const smoothed: number[] = [];
        for (let i = 0; i < this.forceDataWindow.length; i++) {
            let sum = 0, count = 0;
            for (let j = Math.max(0, i - 2); j <= Math.min(this.forceDataWindow.length - 1, i + 2); j++) {
                sum += this.forceDataWindow[j];
                count++;
            }
            smoothed.push(sum / count);
        }

        const mean = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;
        let crossings = 0;

        for (let i = 1; i < smoothed.length; i++) {
            if ((smoothed[i - 1] < mean && smoothed[i] >= mean) ||
                (smoothed[i - 1] > mean && smoothed[i] <= mean)) {
                crossings++;
            }
        }

        const timeSpanMinutes = (timestamp - this.forceTimeWindow[0]) / 60000;
        if (timeSpanMinutes === 0) return 0;
        return (crossings / 2) / timeSpanMinutes;
    }

    async disconnect() {
        try { await this.stopRecording(); } catch (e) { console.error(e); }
        if (this.forceChart) this.forceChart.stop();
        if (this.brChart) this.brChart.stop();

        if (this.sensorRowDiv && this.parent && this.parent.contains(this.sensorRowDiv)) {
            this.parent.removeChild(this.sensorRowDiv);
        }
        const index = VernierVisRow.vernierVisRows.indexOf(this);
        if (index > -1) {
            VernierVisRow.vernierVisRows.splice(index, 1);
            if (VernierVisRow.vernierVisRows.length > 0) {
                if (index === VernierVisRow.vernierVisRows.length) {
                    VernierVisRow.vernierVisRows[index - 1].orderDownBtn.disabled = true;
                } else if (index === 0) {
                    VernierVisRow.vernierVisRows[0].orderUpBtn.disabled = true;
                }
                VernierVisRow.reOrderRows();
            }
        }

        try {
            if (this.forceSensor && this.handleDataBound) {
                if (typeof this.forceSensor.removeListener === 'function') {
                    this.forceSensor.removeListener('value-changed', this.handleDataBound);
                } else if (typeof this.forceSensor.off === 'function') {
                    this.forceSensor.off('value-changed', this.handleDataBound);
                } else if (typeof this.forceSensor.removeEventListener === 'function') {
                    this.forceSensor.removeEventListener('value-changed', this.handleDataBound);
                }
            }
        } catch (e) { console.error("Error removing Vernier listener", e); }

        // Only close device connection if no other rows are using it
        const duplicateInd = VernierVisRow.includesDuplicate(this, "device");
        if (duplicateInd < 0) {
            if (this.device) {
                try {
                    await this.device.stop();
                    this.device.close();
                } catch (e) { console.error("Error stopping Vernier device", e); }
            }
        }

        if (typeof (window as any).updateGlobalButtons === "function") {
            (window as any).updateGlobalButtons();
        }
    }
}