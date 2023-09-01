import {PrecisionPlayerSettings} from '../precision-player.settings';
import {WavFormat} from '../obj/wav-format';
import {PPEvent} from '../obj/pp-event';
import {getTimeStampByEvent} from '../obj/functions';

/**
 * Parent class for audio mechanisms. Currently supported: Web Audio API and HTML 5 Audio.
 */
export abstract class AudioMechanism {
    get playDuration(): PlaybackDuration {
        return this._playDuration;
    }

    /**
     * Returns information about the currently used wave file.
     */
    get audioInformation(): {
        original: { duration: number; sampleRate: number; samples: number };
        audioMechanism: { duration: number; sampleRate: number; samples: number }
    } {
        return this._audioInformation;
    }

    /**
     * Event that dispatches when a file is being processed.
     */
    get onFileProcessing(): PPEvent<number> {
        return this._onFileProcessing;
    }

    /**
     * Returns the settings.
     */
    get settings(): PrecisionPlayerSettings {
        return this._settings;
    }

    /**
     * Returns the type of audiomechanism being used.
     */
    get type(): AudioMechanismType {
        return this._type;
    }

    /**
     * Returns the volume
     */
    get volume(): number {
        return this._volume;
    }

    /**
     * Sets the volume
     */
    set volume(value: number) {
    }

    /**
     * Returns the playback rate
     */
    public get playbackRate(): number {
        return this._playbackRate;
    }

    /**
     * Sets the playback rate
     */
    public set playbackRate(value: number) {
    }

    protected _type: AudioMechanismType;
    protected _playbackRate = 1;
    protected _volume = 1;

    // the current status
    protected _status: AudioMechanismStatus;
    protected _playDuration: PlaybackDuration;

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
    protected playbackRatePufferByEvent = 0;
    protected lastPlaybackRateChangedByEvent = {
        timestamp: 0,
        playbackRate: 0
    };

    protected afterEndedCallback = () => {
    };
    // private event if something went wrong
    protected onError: PPEvent<AudioMechanismError>;

    // current time reported by the audio mechanism
    public abstract get currentTime(): number;

    // event dispatches as soon as status changes
    public statuschange: PPEvent<AudioStatusEvent>;
    protected _onFileProcessing: PPEvent<number>;
    // the version of the audio mechanism
    public version = '';
    protected _settings: PrecisionPlayerSettings;

    protected constructor(type: AudioMechanismType, settings?: PrecisionPlayerSettings) {
        this._type = type;
        this.onError = new PPEvent<AudioMechanismError>();
        this._onFileProcessing = new PPEvent<number>();
        this.statuschange = new PPEvent<AudioStatusEvent>();

        this._settings = new PrecisionPlayerSettings();
        if (settings !== undefined && settings !== null) {
            this._settings = settings;
        }
    }

    /**
     * initialize the audio mechanism. If downloadAudio is set to true, the audio file will be downloaded
     * automatically.
     * @param audioFile an URL string or File object
     */
    public initialize(audioFile: string | File) {
        if (this._status === AudioMechanismStatus.PLAYING) {
            // abort playing
            this.stop();
        }

        this._playDuration = {
            eventCalculation: 0,
            audioMechanism: 0
        };
    }

    private _currentTimeByEvent = 0;

    /**
     * starts the audio playback.
     * @param start start position in seconds
     * @param callback function run right after audio started
     */
    public abstract play(start?: number, callback?: () => void): void;

    /**
     * pauses the audio playback.
     * @param callback function run right after audio paused
     */
    public abstract pause(callback?: () => void): void;

    /**
     * stops the audio playback.
     * @param callback function run right after audio stopped
     */
    public stop(callback?: () => void) {
        this._status = AudioMechanismStatus.STOPPED;
    }

    /**
     * Handler for the statuschanged event as soon as the audio starts playing.
     * @param record timing log
     * @protected
     */
    protected onPlay(record: TimingRecord): void {
        this.playStarted = record.eventTriggered.nowMethod;
        this.playbackRatePufferByEvent = 0;
        this.lastPlaybackRateChangedByEvent = {
            timestamp: record.eventTriggered.nowMethod,
            playbackRate: this._playbackRate
        };

        if (this._status === AudioMechanismStatus.ENDED || this._status === AudioMechanismStatus.STOPPED) {
            this._playDuration = {
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
            record.playbackDuration.eventCalculation = this._playDuration.eventCalculation;
        }
        this.changeStatus(AudioMechanismStatus.PLAYING, record);
    }

    /**
     * Handler that is called as soon as the audio is paused.
     * @param record
     * @protected
     */
    protected onPause(record: TimingRecord): void {
        this._playDuration = {
            eventCalculation: this.calculatePlaybackDurationByEvent(record.eventTriggered.highResolution),
            audioMechanism: record.playbackDuration.audioMechanism
        };
        record.playbackDuration = {
            audioMechanism: this._playDuration.audioMechanism,
            eventCalculation: this._playDuration.eventCalculation
        };
        this.changeStatus(AudioMechanismStatus.PAUSED, record);
    }

    /**
     * Handler that is called as soon as the audio playback stops
     * @param record
     * @protected
     */
    protected onStop(record: TimingRecord): void {
        record.playbackDuration.eventCalculation = this.calculatePlaybackDurationByEvent(record.eventTriggered.highResolution);
        this.changeStatus(AudioMechanismStatus.STOPPED, record);
    }

    /**
     * Handler that is called as soon as the audio playback arrived at the end of the audio signal.
     * @param record
     * @protected
     */
    protected onEnd(record: TimingRecord): void {
        // no pause before, e.g. in WebAudio API
        this._playDuration = {
            eventCalculation: this.calculatePlaybackDurationByEvent(record.eventTriggered.highResolution),
            audioMechanism: record.playbackDuration.audioMechanism
        };

        record.playbackDuration.eventCalculation = this._playDuration.eventCalculation;
        this.changeStatus(AudioMechanismStatus.ENDED, record);
    }

    /**
     * Handler that is called as soon as the audio is prepared and ready for playback.
     * @param record
     * @protected
     */
    protected onReady(record: TimingRecord): void {
        record.playbackDuration.eventCalculation = 0;
        this.changeStatus(AudioMechanismStatus.READY, record);
    }

    /**
     * Changes the current status to a new one and dispatches the statuschange event.
     * @param status
     * @param record
     * @param message
     * @protected
     */
    protected changeStatus(status: AudioMechanismStatus, record: TimingRecord, message?: string) {
        this._status = status;
        const eventArgs = {
            status: this._status,
            message: message,
            timingRecord: record
        };
        if (!message) {
            delete eventArgs.message;
        }
        this.statuschange.dispatchEvent(eventArgs);
    }

    /**
     * Completely destroys the PrecisionPlayer. Call this method when you don't need the PrecisionPlayer anymore.
     */
    public destroy() {
        this.stop();
        this.statuschange.unlistenAll();
        this._onFileProcessing.unlistenAll();
        this.onError.unlistenAll();

        this.changeStatus(AudioMechanismStatus.DESTROYED, {
            eventTriggered: getTimeStampByEvent(null),
            playbackDuration: this._playDuration
        });
    }

    /**
     * Downloads the audio file from URL.
     * @param audioFileURL the URL to the audio file
     * @param onSuccess function called as soon as download finishes
     * @param onError function called as soon as an error occured
     * @param onProgress function called while the download is in process
     * @private
     */
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

    /**
     * Loads the audio file regardless it's an URL or a File object.
     * @param audioFile URL string or File object
     * @param onSuccess success callback
     * @param onError error callback
     * @param onProgress progress callback
     */
    public loadAudioFile(audioFile: string | File,
                         onSuccess: (event: AudioLoadEvent) => void,
                         onError: (message: string) => any,
                         onProgress?: (event: ProgressEvent) => void
    ) {
        if (typeof audioFile === 'string') {
            // is URL
            const fileName = this.extractNameFromURL(audioFile);
            if (!fileName) {
                onError('Can\'t extract file name from URL. Is it a valid URL?');
                return;
            }
            if (this._settings.downloadAudio) {
                this.downloadAudioFile(audioFile, (result) => {
                    const wavFormat = new WavFormat();
                    let originalDuration = -1;
                    if (wavFormat.isValid(result.arrayBuffer)) {
                        originalDuration = wavFormat.getDuration(result.arrayBuffer);
                        this._audioInformation.original.duration = originalDuration;
                        this._audioInformation.original.sampleRate = wavFormat.getSampleRate(result.arrayBuffer);
                        this._audioInformation.original.samples = wavFormat.getDurationAsSamples(result.arrayBuffer);
                    }
                    this._audioInformation.file.fullName = fileName;

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
            let successFullRead = true;

            reader.onloadend = () => {
                if (successFullRead) {
                    const arrayBuffer = reader.result as ArrayBuffer;
                    const fileName = (audioFile as File).name;
                    const wavFormat = new WavFormat();
                    let originalDuration = -1;
                    if (wavFormat.isValid(arrayBuffer)) {
                        originalDuration = wavFormat.getDuration(arrayBuffer);
                        this._audioInformation.original.duration = originalDuration;
                        this._audioInformation.original.sampleRate = wavFormat.getSampleRate(arrayBuffer);
                        this._audioInformation.original.samples = wavFormat.getDurationAsSamples(arrayBuffer);

                    }
                    this._audioInformation.file.fullName = fileName;
                    onSuccess({
                        url: null,
                        arrayBuffer: reader.result as ArrayBuffer,
                        originalDuration: originalDuration,
                        name: fileName
                    });
                }
            };
            reader.onerror = (e) => {
                successFullRead = false;
                onError('Can\'t read file blob');
            }
            reader.onprogress = onProgress;
            reader.readAsArrayBuffer(audioFile);
        }
    }

    /**
     * Extractes the file name from a URL.
     * @param url the URL as string
     * @private
     */
    private extractNameFromURL(url: string) {
        const domainRegex = /^(?:blob:\/\/)?(?:https?:\/\/)?[^\/]+/g;
        const regex = new RegExp(domainRegex);
        if (regex.exec(url).length > 0) {
            // remove domain
            url = url.replace(domainRegex, '');
            const filename = url.substr(url.lastIndexOf('/') + 1);
            return filename;
        }
        return null;
    }

    /**
     * Calculates the playback duration from a timestamp when an audio event was triggered.
     * @param eventTriggered
     * @protected
     */
    protected calculatePlaybackDurationByEvent(eventTriggered: number) {
        return this.playDuration.eventCalculation + this.playbackRatePufferByEvent +
            ((eventTriggered - this.lastPlaybackRateChangedByEvent.timestamp) * this.lastPlaybackRateChangedByEvent.playbackRate);
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
 * <b>FAILED:</b> An Error occurred<br/>
 * <b>DESTROYED:</b> Player was destroyed<br/>
 */
export enum AudioMechanismStatus {
    INITIALIZED = 'INITIALIZED',
    READY = 'READY',
    RESUMING = 'RESUMING',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    STOPPED = 'STOPPED',
    ENDED = 'ENDED',
    FAILED = 'FAILED',
    DESTROYED = 'DESTROYED'
}

export interface PlaybackDuration {
    audioMechanism: number;
    eventCalculation: number;
}

export interface TimingRecord {
    eventTriggered: {
        highResolution: number;
        nowMethod: number;
    },
    playbackDuration: PlaybackDuration;
}

export interface AudioStatusEvent {
    status: AudioMechanismStatus;
    message?: string;
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
