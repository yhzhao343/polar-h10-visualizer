import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { tableFromIPC } from 'apache-arrow';
import { StreamInfo, StreamOutlet } from 'node-labstreaminglayer';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    // Parse targeted run directory directory argument input
    const targetDir = process.argv[2];
    if (!targetDir) {
        console.error('[-] Error: Please provide the path to the data recording directory.');
        console.error('    Usage: node replay_arrow.js <path_to_folder>');
        process.exit(1);
    }

    const resolvedPath = path.resolve(targetDir);
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
        console.error(`[-] Error: '${targetDir}' is not a valid directory pathway.`);
        process.exit(1);
    }

    const files = fs.readdirSync(resolvedPath).filter(f => f.endswith('.arrow'));
    if (files.length === 0) {
        console.error('[-] Error: Zero Apache Arrow (.arrow) stream files found in the targeted run directory.');
        process.exit(1);
    }

    console.log(`[+] Parsing ${files.length} Arrow log arrays from target session configuration...`);

    const allSamples = [];
    const outlets = [];

    for (const file of files) {
        const filePath = path.join(resolvedPath, file);
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const table = tableFromIPC(fileBuffer);
            const schema = table.schema;
            const metaMap = schema.metadata;

            const sensorName = metaMap.get('sensor_name') || path.parse(file).name;
            const modality = metaMap.get('modality') || 'Biosensing';

            const fields = schema.fields.map(f => f.name);
            if (!fields.includes('epoch_timestamp_ms')) {
                console.warn(`[!] Skipping ${file}: Missing absolute timeline synchronization vector.`);
                continue;
            }

            // Isolate measurement features by stripping the timestamp axis tracking
            const dataChannels = fields.filter(name => name !== 'epoch_timestamp_ms');
            if (dataChannels.length === 0) {
                console.warn(`[!] Skipping ${file}: No active measurement features parsed.`);
                continue;
            }

            // Extract native sampling frequency coefficients
            let sampleRate = 0.0;
            if (metaMap.has('filter_Fs')) sampleRate = parseFloat(metaMap.get('filter_Fs'));
            else if (metaMap.has('lp_filter_Fs')) sampleRate = parseFloat(metaMap.get('lp_filter_Fs'));

            // Instantiate native LSL network node configs
            const info = new StreamInfo(
                sensorName,
                modality,
                dataChannels.length,
                sampleRate,
                'float32',
                `${sensorName}_${modality}_replay`
            );

            // Rebuild structured XML description nodes
            const desc = info.desc();
            const chns = desc.appendChild('channels');
            dataChannels.forEach((label) => {
                const ch = chns.appendChild('channel');
                ch.appendChildValue('label', label);
                // ch.appendChildValue('unit', modality === 'EXG' ? 'microvolts' : 'milliG');
                if (packet.modality === 'EXG') {
                    ch.appendChildValue('unit', 'microvolts');
                }
            });

            if (metaMap.size > 0) {
                const metaSettings = desc.appendChild('meta_settings');
                for (const [k, v] of metaMap.entries()) {
                    const sanitizedKey = k.replace(/[^a-zA-Z0-9_]/g, '_');
                    metaSettings.appendChildValue(sanitizedKey, String(v));
                }
            }

            const outlet = new StreamOutlet(info);
            outlets.append = outlet; // Keep outlet reference alive in memory space

            // Extract row arrays for high-performance indexing iterations
            const totalRows = table.numRows;
            const timestampCol = table.getChild('epoch_timestamp_ms').toArray();
            const matrixDataChannels = dataChannels.map(ch => table.getChild(ch).toArray());

            for (let i = 0; i < totalRows; i++) {
                const sampleFrame = [];
                for (let c = 0; c < dataChannels.length; c++) {
                    sampleFrame.push(Number(matrixDataChannels[c][i]));
                }

                allSamples.push({
                    t_ms: Number(timestampCol[i]),
                    outlet: outlet,
                    sample: sampleFrame
                });
            }

            console.log(`    -> Bound LSL Outlet: "${sensorName}" [${modality}] (${dataChannels.length} ch, ${totalRows} rows)`);

        } catch (err) {
            console.error(`[-] Failed parsing binary structural layouts for stream tracking file: ${file}`, err);
        }
    }

    if (allSamples.length === 0) {
        console.error('[-] Error: Zero valid timeline metrics compiled across files. Terminating execution.');
        process.exit(1);
    }

    // INTERLEAVED SYNCHRONICITY: Flatten all metrics into a single chronological queue
    console.log('[+] Interleaving global multi-sensor arrays into synchronized timeline matrix...');
    allSamples.sort((a, b) => a.t_ms - b.t_ms);

    console.log('\n[+] Broadcasters active. Streaming to network... (Press Ctrl+C to stop replay)');

    const startWallMs = performance.now();
    const startDataMs = allSamples[0].t_ms;

    try {
        for (const entry of allSamples) {
            const targetRelativeMs = entry.t_ms - startDataMs;

            // Adaptive High-Precision Scheduling Loop
            while (true) {
                const elapsedWallMs = performance.now() - startWallMs;
                const deltaWaitMs = targetRelativeMs - elapsedWallMs;

                if (deltaWaitMs <= 0) break; // Deadline reached

                if (deltaWaitMs > 2.0) {
                    // Cooperative macro-sleep to yield loop and protect CPU cycle allocation
                    await sleep(deltaWaitMs - 1.0);
                } else {
                    // Sub-millisecond precision spin-lock boundary threshold execution
                    // Passthrough to execute immediate microsecond check spikes
                }
            }

            // Convert original Unix epoch timestamp to fractional seconds for native LSL sync tracking
            const originalLslTimestampSec = entry.t_ms / 1000.0;
            entry.outlet.pushSample(entry.sample, originalLslTimestampSec);
        }
        console.log('[+] Replay sequence processed all log batches completely.');
    } catch (err) {
        console.error('[-] Error during streaming runtime loop execution:', err);
    }
}

main();