// http://soundfile.sapp.org/doc/WaveFormat/
export class WavFormat {
    /***
     * checks if it is a valid wave file
     * @param buffer the audio file's array buffer
     */
    public isValid(buffer: ArrayBuffer): boolean {
        let bufferPart = buffer.slice(0, 4);
        let test1 = String.fromCharCode.apply(null, new Uint8Array(bufferPart));

        bufferPart = buffer.slice(8, 12);
        let test2 = String.fromCharCode.apply(null, new Uint8Array(bufferPart));
        test1 = test1.slice(0, 4);
        test2 = test2.slice(0, 4);
        const byteCheck = new Uint8Array(buffer.slice(20, 21))[0] === 1;
        return (byteCheck && '' + test1 + '' === 'RIFF' && test2 === 'WAVE');
    }

    protected getChannels(buffer: ArrayBuffer) {
        const bufferPart = buffer.slice(22, 24);
        const bufferView = new Uint8Array(bufferPart);

        return bufferView[0];
    }

    protected getBitsPerSample(buffer: ArrayBuffer) {
        const bufferPart = buffer.slice(34, 36);
        const bufferView = new Uint8Array(bufferPart);

        return bufferView[0];
    }

    public getDuration(buffer) {
        if (this.isValid(buffer)) {
            const dataStart = this.getDataStart(buffer);
            const bitsPerSample = this.getBitsPerSample(buffer);
            const channels = this.getChannels(buffer);
            const sampleRate = this.getSampleRate(buffer);
            const samples = this.getDataChunkSize(buffer, dataStart) / (channels * bitsPerSample) * 8;
            return samples / sampleRate;
        }
        return -1;
    }

    protected getDataChunkSize(buffer: ArrayBuffer, dataStart: number): number {
        const bufferPart = buffer.slice(dataStart, dataStart + 4);
        const bufferView = new Uint32Array(bufferPart);

        return bufferView[0];
    }

    protected getSampleRate(buffer: ArrayBuffer) {
        const bufferPart = buffer.slice(24, 28);
        const bufferView = new Uint32Array(bufferPart);

        return bufferView[0];
    }

    private getDataStart(buffer: ArrayBuffer) {
        // search "data" info
        let result = -1;
        let test = '';

        while (test !== 'data') {
            result++;
            if (result + 4 < buffer.byteLength) {
                const part = String.fromCharCode.apply(null, new Uint8Array(buffer.slice(result, result + 4)));
                test = '' + part.slice(0, 4) + '';
            } else {
                break;
            }
        }

        result += 4;

        if (result >= buffer.byteLength) {
            return -1;
        } else {
            return result;
        }
    }
}
