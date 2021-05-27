export class PrecisionPlayerSettings {
    public downloadAudio = true;

    constructor(settings?: PrecisionPlayerOptions) {
        if (settings !== null && settings !== undefined && settings !== {}) {
            this.downloadAudio = (settings.downloadAudio !== undefined) ? settings.downloadAudio : this.downloadAudio;
        }
    }
}

export interface PrecisionPlayerOptions {
    // download audio file
    downloadAudio?: boolean;
}
