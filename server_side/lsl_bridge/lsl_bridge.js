import uWS from 'uWebSockets.js';
import { StreamInfo, StreamOutlet } from 'node-labstreaminglayer';

const dynamicOutlets = {};

function getOrCreateOutlet(packet) {
    const key = `${packet.sensor_name}_${packet.modality}`;

    if (!dynamicOutlets[key]) {
        const info = new StreamInfo(
            packet.sensor_name,
            packet.modality,
            packet.channels.length,
            parseFloat(packet.sample_rate || 0.0),
            'float32',
            key
        );

        const desc = info.desc();

        const chns = desc.appendChild('channels');
        packet.channels.forEach((label) => {
            const ch = chns.appendChild('channel');
            ch.appendChildValue('label', label);
            if (packet.modality === 'EXG') {
                ch.appendChildValue('unit', 'microvolts');
            }
        });

        if (packet.metadata) {
            const settingsGroup = desc.appendChild('meta_settings');
            Object.entries(packet.metadata).forEach(([metaKey, metaVal]) => {
                const sanitizedKey = metaKey.replace(/[^a-zA-Z0-9_]/g, '_');
                settingsGroup.appendChildValue(sanitizedKey, String(metaVal));
            });
        }

        console.log(`[+] Auto-Configured LSL Node: ${packet.sensor_name} [${packet.modality}]`);
        dynamicOutlets[key] = new StreamOutlet(info);
    }
    return dynamicOutlets[key];
}

uWS.App().ws('/*', {
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024,
    message: (ws, message) => {
        try {
            const packet = JSON.parse(Buffer.from(message).toString());

            if (packet.type === 'setup') {
                getOrCreateOutlet(packet);
                return;
            }

            const outlet = getOrCreateOutlet(packet);
            if (outlet && packet.timestamp_ms) {
                // Convert Millisecond Unix Epoch to Fractional Seconds for LSL Compatibility
                const lslTimestampSec = packet.timestamp_ms / 1000.0;

                // Pass explicit timestamp to preserve original hardware sampling moments
                outlet.pushSample(packet.sample, lslTimestampSec);
            }
        } catch (err) {
            console.error('[-] Error handling incoming socket frame:', err);
        }
    }
}).listen(8765, (token) => {
    if (token) console.log('[+] Dynamic Unix-Epoch LSL Bridge running on port 8765');
});