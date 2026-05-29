import { Schema } from "apache-arrow";

export class LslBridge {
    private ws: WebSocket | null = null;
    private url: string;

    // Reconnection Backoff Configuration
    private readonly baseDelay = 1000;
    private readonly maxDelay = 16000;
    private currentDelay = 1000;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isConnecting = false;

    // Dynamic Stream Registry for Automatic Session Recovery & State Checks
    private activeSchemas: Set<Schema> = new Set();

    constructor(url: string = "ws://localhost:8765") {
        this.url = url;
        this.connect();
    }

    private connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.close();
        }

        console.log(`[WS] Connecting to LSL Bridge at ${this.url}...`);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log("[+] Connected to local uWebSockets LSL Bridge.");
            this.isConnecting = false;
            this.currentDelay = this.baseDelay;

            // Re-register active streams upon reconnection
            if (this.activeSchemas.size > 0) {
                console.log(`[WS] Restoring ${this.activeSchemas.size} active stream topologies...`);
                this.activeSchemas.forEach(schema => this.registerStream(schema, true));
            }
        };

        this.ws.onclose = () => {
            this.isConnecting = false;
            this.scheduleReconnect();
        };

        this.ws.onerror = (err) => {
            console.debug("[WS Error] Connection encountered an infrastructure block:", err);
        };
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) return;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.currentDelay);

        this.currentDelay = Math.min(this.currentDelay * 2, this.maxDelay);
    }

    /**
     * Registers channel layouts and logs the schema to the cache registry
     */
    public registerStream(schema: Schema, isReconnectingFlow = false) {
        if (!isReconnectingFlow) {
            this.activeSchemas.add(schema);
        }

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const metaMap = schema.metadata;
        const sensorName = metaMap.get("sensor_name") || "Generic_Sensor";
        const modality = metaMap.get("modality") || "Biosensing";

        const channels = schema.fields
            .map(f => f.name)
            .filter(name => name !== "epoch_timestamp_ms");

        let sampleRate = 0.0;
        if (metaMap.has("filter_Fs")) sampleRate = parseFloat(metaMap.get("filter_Fs")!);
        else if (metaMap.has("lp_filter_Fs")) sampleRate = parseFloat(metaMap.get("lp_filter_Fs")!);

        this.ws.send(JSON.stringify({
            type: "setup",
            sensor_name: sensorName,
            modality: modality,
            channels: channels,
            sample_rate: sampleRate,
            metadata: Object.fromEntries(metaMap)
        }));
    }

    /**
     * Pushes sample arrays down the active network socket, with fallback auto-registration
     */
    public streamData(schema: Schema, data: Record<string, number>) {
        // --- CRITICAL SAFETY FALLBACK: AUTO-REGISTER UNTRACKED SCHEMAS ---
        if (!this.activeSchemas.has(schema)) {
            const sensorName = schema.metadata.get("sensor_name") || "Generic_Sensor";
            const modality = schema.metadata.get("modality") || "Biosensing";
            console.log(`[WS] Intercepted stream payload for unregistered schema (${sensorName} [${modality}]). Auto-registering now...`);

            this.registerStream(schema);
        }

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const metaMap = schema.metadata;
        const sensorName = metaMap.get("sensor_name") || "Generic_Sensor";
        const modality = metaMap.get("modality") || "Biosensing";

        const channels = schema.fields
            .map(f => f.name)
            .filter(name => name !== "epoch_timestamp_ms");

        const sample = channels.map(ch => data[ch] ?? 0);
        const clientTimestampMs = data["epoch_timestamp_ms"] ?? Date.now();

        this.ws.send(JSON.stringify({
            sensor_name: sensorName,
            modality: modality,
            channels: channels,
            sample: sample,
            timestamp_ms: clientTimestampMs
        }));
    }

    public unregisterStream(schema: Schema) {
        this.activeSchemas.delete(schema);
    }
}