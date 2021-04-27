import {PrecisionPlayerSettings} from '../precision-player.settings';
import {WavFormat} from '../obj/wav-format';
import {PPEvent} from '../obj/pp-event';


export abstract class AudioMechanism {
    get audioInformation(): { original: { duration: number; sampleRate: number; samples: number }; audioMechanism: { duration: number; sampleRate: number; samples: number } } {
        return this._audioInformation;
    }

    get onFileProcessing(): PPEvent<number> {
        return this._onFileProcessing;
    }

    get settings(): PrecisionPlayerSettings {
        return this._settings;
    }

    get type(): AudioMechanismType {
        return this._type;
    }

    protected _type: AudioMechanismType;
    protected _status: AudioMechanismStatus;
    protected playDuration: PlaybackDuration;

    protected _audioInformation = {
        file: {
            fullName: ''
        },
        audioMechanism: {
            duration: 0,
            sampleRate: 0,
            samples: 0
        },
        original: {
            duration: 0,
            sampleRate: 0,
            samples: 0
        }
    };

    protected playStarted = 0;
    protected onError: PPEvent<AudioMechanismError>;

    public abstract get currentTime(): number;

    public statuschange = new PPEvent<AudioStatusEvent>();
    protected _onFileProcessing: PPEvent<number>;

    public version = '';
    protected _settings: PrecisionPlayerSettings;

    protected constructor(type: AudioMechanismType, settings?: PrecisionPlayerSettings) {
        this._type = type;
        this.onError = new PPEvent<AudioMechanismError>();
        this._onFileProcessing = new PPEvent<number>();
        this._status = AudioMechanismStatus.INITIALIZED;

        this.playDuration = {
            eventCalculation: 0,
            audioMechanism: 0
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
            this.getTimeStampByEvent = Date.now;
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
            this.playDuration = {
                audioMechanism: 0,
                eventCalculation: 0
            };
            record = {
                eventTriggered: record.eventTriggered,
                playbackDuration: {
                    audioMechanism: 0,
                    eventCalculation: 0
                }
            };
        } else {
            record.playbackDuration.eventCalculation = this.calculatePlaybackDurationByEvent(record.eventTriggered);
        }

        this.changeStatus(AudioMechanismStatus.PLAYING, record);
    }

    protected onPause(record: TimingRecord): void {
        this.playDuration = {
            eventCalculation: this.calculatePlaybackDurationByEvent(record.eventTriggered),
            audioMechanism: record.playbackDuration.audioMechanism
        };
        record.playbackDuration = {
            audioMechanism: this.playDuration.audioMechanism,
            eventCalculation: this.playDuration.eventCalculation
        };
        this.changeStatus(AudioMechanismStatus.PAUSED, record);
    }

    protected onStop(record: TimingRecord): void {
        record.playbackDuration.eventCalculation = this.calculatePlaybackDurationByEvent(record.eventTriggered);
        this.changeStatus(AudioMechanismStatus.STOPPED, record);
    }

    protected onEnd(record: TimingRecord): void {
        // no pause before, e.g. in WebAudio API
        this.playDuration = {
            eventCalculation: this.calculatePlaybackDurationByEvent(record.eventTriggered),
            audioMechanism: record.playbackDuration.audioMechanism
        };

        record.playbackDuration.eventCalculation = this.playDuration.eventCalculation;
        this.changeStatus(AudioMechanismStatus.ENDED, record);
    }

    protected onReady(record: TimingRecord): void {
        record.playbackDuration.eventCalculation = 0;
        this.changeStatus(AudioMechanismStatus.READY, record);
    }

    protected changeStatus(status: AudioMechanismStatus, record: TimingRecord) {
        this._status = status;
        this.statuschange.dispatchEvent({
            status: this._status,
            timingRecord: record
        });
    }

    public destroy() {
        this.statuschange.unlistenAll();
        this._onFileProcessing.unlistenAll();
        this.onError.unlistenAll();
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

    private downloadAudioFile(audioFileURL: string,
                              onSuccess: (arrayBuffer: {
                                  arrayBuffer: ArrayBuffer,
                                  name: string
                              }) => void,
                              onError: (message: string) => void,
                              onProgress?: (event: ProgressEvent) => void
    ) {
        const xhr = new XMLHttpRequest();
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
            const result = xhr.response as ArrayBuffer;
            onSuccess({
                arrayBuffer: result,
                name: this.extractNameFromURL(audioFileURL)
            });
        };
        xhr.onerror = () => {
            onError('could not download audio file');
        };
        xhr.onprogress = onProgress;

        xhr.open('get', audioFileURL, true);
        xhr.send();
    }

    public loadAudioFile(audioFile: string | File,
                         onSuccess: (event: AudioLoadEvent) => void,
                         onError: (message: string) => any,
                         onProgress?: (event: ProgressEvent) => void
    ) {
        if (typeof audioFile === 'string') {
            const fileName = this.extractNameFromURL(audioFile);
            if (this._settings.downloadAudio) {
                this.downloadAudioFile(audioFile, (result) => {
                    const fileName = this.extractNameFromURL(audioFile);
                    const wavFormat = new WavFormat();
                    const originalDuration = wavFormat.getDuration(result.arrayBuffer);
                    this._audioInformation.file.fullName = fileName;
                    this._audioInformation.original.duration = originalDuration;
                    this._audioInformation.original.sampleRate = wavFormat.getSampleRate(result.arrayBuffer);
                    this._audioInformation.original.samples = wavFormat.getDurationAsSamples(result.arrayBuffer);

                    onSuccess({
                        url: null,
                        arrayBuffer: result.arrayBuffer,
                        originalDuration: originalDuration,
                        name: result.name
                    });
                }, onError, onProgress);
            } else {
                onSuccess({
                    url: audioFile,
                    arrayBuffer: null,
                    originalDuration: -1,
                    name: fileName
                });
            }
        } else {
            // is file
            const reader = new FileReader();
            reader.onloadend = () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                const fileName = (audioFile as File).name;
                const wavFormat = new WavFormat();
                const originalDuration = wavFormat.getDuration(arrayBuffer);
                this._audioInformation.original.duration = originalDuration;
                this._audioInformation.original.sampleRate = wavFormat.getSampleRate(arrayBuffer);
                this._audioInformation.original.samples = wavFormat.getDurationAsSamples(arrayBuffer);

                this._audioInformation.file.fullName = fileName;

                onSuccess({
                    url: null,
                    arrayBuffer: reader.result as ArrayBuffer,
                    originalDuration: originalDuration,
                    name: fileName
                });
            };
            reader.onerror = (e) => {
                console.error(e);
                onError('Can not read file blob');
            }
            reader.onprogress = onProgress;
            reader.readAsArrayBuffer(audioFile);
        }
    }

    private extractNameFromURL(url: string) {
        const domainRegex = /^(?:blob:)?https?:\/\/[^\/]+/g;
        const regex = new RegExp(domainRegex);
        if (regex.exec(url).length > 0) {
            // remove domain
            url = url.replace(domainRegex, '');
            const filename = url.substr(url.lastIndexOf('/') + 1);
            return filename;
        }
        return null;
    }

    protected calculatePlaybackDurationByEvent(eventTriggered: number) {
        return this.playDuration.eventCalculation + eventTriggered - this.playStarted;
    }
}

export enum AudioMechanismType {
    WEBAUDIO = 'WebAudio',
    HTMLAUDIO = 'HTMLAudio'
}

/**
 * <b>INITIALIZED:</b> Status right after object initialized<br/>
 * <b>READY:</b> Status after audio was loaded<br/>
 * <b>RESUMING</b> AudioContext needs to be resumed
 * <b>PLAYING:</b> Playback is running<br/>
 * <b>PAUSED:</b> Audio was paused<br/>
 * <b>STOPPED:</b> Audio stopped due action<br/>
 * <b>ENDED:</b> Playback reached end of audio track<br/>
 */
export enum AudioMechanismStatus {
    INITIALIZED = 'INITIALIZED',
    READY = 'READY',
    RESUMING = 'RESUMING',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    STOPPED = 'STOPPED',
    ENDED = 'ENDED',
    FAILED = 'FAILED'
}

export interface PlaybackDuration {
    audioMechanism: number;
    eventCalculation: number;
}

export interface TimingRecord {
    eventTriggered: number;
    playbackDuration: PlaybackDuration;
}

export interface AudioStatusEvent {
    status: AudioMechanismStatus;
    timingRecord: TimingRecord;
}

export interface AudioMechanismError {
    message: string;
    error: any;
    timestamp: number;
}

export interface AudioLoadEvent {
    url: string;
    originalDuration: number;
    arrayBuffer: ArrayBuffer;
    name: string;
}
