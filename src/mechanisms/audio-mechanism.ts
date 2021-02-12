import {EventListener} from '../obj/event-listener';
import {PrecisionPlayerSettings} from '../precision-player.settings';


export abstract class AudioMechanism {
    get settings(): PrecisionPlayerSettings {
        return this._settings;
    }

    get type(): AudioMechanismType {
        return this._type;
    }

    protected _type: AudioMechanismType;
    protected _status: AudioMechanismStatus;
    protected playTime: {
        playTimeEvent: number;
        playTimeComponent: number;
    };

    protected audioInfo = {
        duration: 0,
        sampleRate: 0,
        samples: 0
    };

    protected playStarted = 0;
    protected onError: EventListener<AudioMechanismError>;

    public abstract get currentTime(): number;

    public statuschange = new EventListener<AudioStatusEvent>();
    public version = '';
    private _settings: PrecisionPlayerSettings;

    protected constructor(type: AudioMechanismType, settings?: PrecisionPlayerSettings) {
        this._type = type;
        this.onError = new EventListener<AudioMechanismError>();
        this._status = AudioMechanismStatus.INITIALIZED;

        this.playTime = {
            playTimeEvent: 0,
            playTimeComponent: 0
        };

        this._settings = new PrecisionPlayerSettings();
        if (settings !== undefined && settings !== null) {
            this._settings = settings;
        }


        if (this._settings.timestamps.highResolution) {
            this.getTimeStampByEvent = (event?: Event) => {
                if (event && event.timeStamp !== undefined && event.timeStamp !== null) {
                    return event.timeStamp;
                }
                return performance.now();
            };
        } else {
            this.getTimeStampByEvent = () => {
                return Date.now();
            };
        }
    }

    public abstract initialize: (audioFile: string | File) => void;

    public play: () => void;
    public abstract pause: () => void;

    public stop() {
        this._status = AudioMechanismStatus.STOPPED;
    }

    protected onPlay(record: TimingRecord): void {
        this.playStarted = record.eventTriggered;
        if (this._status === AudioMechanismStatus.ENDED) {
            this.playTime = {
                playTimeComponent: 0,
                playTimeEvent: 0
            };
        }
        this.changeStatus(AudioMechanismStatus.PLAYING, record);
    }

    protected onPause(record: TimingRecord): void {
        this.playTime = {
            playTimeEvent: this.playTime.playTimeEvent + record.eventTriggered - this.playStarted,
            playTimeComponent: record.playTime
        };
        this.changeStatus(AudioMechanismStatus.PAUSED, record);
    }

    protected onStop(record: TimingRecord): void {
        this.changeStatus(AudioMechanismStatus.STOPPED, record);
    }

    protected onEnd(record: TimingRecord): void {
        // no pause before, e.g. in WebAudio API
        this.playTime = {
            playTimeEvent: this.playTime.playTimeEvent + record.eventTriggered - this.playStarted,
            playTimeComponent: record.playTime
        };

        this.changeStatus(AudioMechanismStatus.ENDED, record);
    }

    protected onReady(record: TimingRecord): void {
        this.changeStatus(AudioMechanismStatus.READY, record);
    }

    protected changeStatus(status: AudioMechanismStatus, record: TimingRecord) {
        this._status = status;
        this.statuschange.dispatchEvent({
            id: -1,
            status: this._status,
            timingRecord: record
        });
    }

    public destroy() {
        this.statuschange.unlistenAll();
    }

    public getCurrentTimeStamp() {
        if (this.settings.timestamps.highResolution) {
            return performance.now();
        } else {
            return Date.now();
        }
    }

    public getTimeStampByEvent = (event: Event) => {
        return -1;
    }
}

export enum AudioMechanismType {
    WEBAUDIO = 'WebAudio',
    HTMLAUDIO = 'HTMLAudio'
}

/**
 * <b>INITIALIZED:</b> Status right after object initialized<br/>
 * <b>READY:</b> Status after audio was loaded<br/>
 * <b>PLAYING:</b> Playback is running<br/>
 * <b>PAUSED:</b> Audio was paused<br/>
 * <b>STOPPED:</b> Audio stopped due action<br/>
 * <b>ENDED:</b> Playback reached end of audio track<br/>
 */
export enum AudioMechanismStatus {
    INITIALIZED = 'INITIALIZED',
    READY = 'READY',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    STOPPED = 'STOPPED',
    ENDED = 'ENDED',
    FAILED = 'FAILED'
}

export interface TimingRecord {
    eventTriggered: number;
    playTime: number;
}

export interface AudioStatusEvent {
    id: number;
    status: AudioMechanismStatus;
    timingRecord: TimingRecord;
}

export interface AudioMechanismError {
    message: string;
    error: any;
    timestamp: number;
}
