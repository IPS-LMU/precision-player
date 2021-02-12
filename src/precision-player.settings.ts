export class PrecisionPlayerSettings {
    public timestamps = {
        highResolution: true
    }

    constructor(settings?: PrecisionPlayerOptions) {
        if (settings !== null && settings !== undefined) {
            this.timestamps = settings.timestamps;
        }
    }
}

export interface PrecisionPlayerOptions {
    timestamps: {
        /*
        https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp
         */
        highResolution: boolean
    }
}
