import {
    tableFromArrays,
    RecordBatchFileWriter,
    RecordBatch,
    Schema,
} from "apache-arrow";

export class ArrowStreamer {
    private fileWritable!: FileSystemWritableFileStream;
    private writePromise!: Promise<void>;
    private keysOrdered: string[];

    private flushPromise: Promise<void> = Promise.resolve();
    private writer: RecordBatchFileWriter;
    private isClosed = false;

    private buffer: Record<string, Float64Array> = {};
    private counts: number = 0;
    private maxCount: number = 512;

    constructor(
        private fileHandle: FileSystemFileHandle,
        private schema: Schema,
    ) {
        this.keysOrdered = schema.fields.map((f) => f.name);

        this.writer = new RecordBatchFileWriter();
        this.writePromise = this.init();
    }

    private async init() {
        this.fileWritable = await this.fileHandle.createWritable();
        const asyncIterable = this
            .writer as unknown as AsyncIterable<Uint8Array>;
        try {
            for await (const chunk of asyncIterable) {
                await this.fileWritable.write(chunk as any);
            }
        } finally {
            await this.fileWritable.close();
        }
    }

    push(data: Record<string, number>) {
        if (this.isClosed) return;

        for (const key of this.keysOrdered) {
            if (!this.buffer[key])
                this.buffer[key] = new Float64Array(this.maxCount);
            this.buffer[key][this.counts] = data[key] ?? 0;
        }

        this.counts++;

        if (this.counts >= this.maxCount) {
            this.flush();
        }
    }

    private flush() {
        if (this.counts === 0) return;

        const arrays: Record<string, Float64Array> = {};

        for (const key of this.keysOrdered) {
            arrays[key] = this.buffer[key].slice(0, this.counts);
        }

        this.counts = 0;

        this.flushPromise = this.flushPromise.then(() =>
            this.encodeAndEnqueue(arrays),
        );
    }

    private async encodeAndEnqueue(arrays: Record<string, Float64Array>) {
        await new Promise((resolve) => setTimeout(resolve, 0));

        const table = tableFromArrays(arrays);

        for (const batch of table.batches) {
            this.writer.write(new RecordBatch(this.schema, batch.data));
        }
    }

    async close() {
        if (this.isClosed) return;
        this.isClosed = true;

        this.flush();

        await this.flushPromise;

        this.writer.close();

        await this.writePromise;
    }
}
