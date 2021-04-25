export class PrecisionPlayerSettings {
    public timestamps = {
        highResolution: true
    }

    public downloadAudio = true;

    constructor(settings?: PrecisionPlayerOptions) {
        if (settings !== null && settings !== undefined && settings !== {}) {
            this.timestamps = (settings.timestamps !== undefined) ? settings.timestamps : this.timestamps;
            this.downloadAudio = (settings.downloadAudio !== undefined) ? settings.downloadAudio : this.downloadAudio;
        }
    }
}

export interface PrecisionPlayerOptions {
    timestamps?: {
        // https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp
        highResolution: boolean;
    }
    // download audio file
    downloadAudio?: boolean;
}
