import {
    AudioLoadEvent,
    AudioMechanism,
    AudioMechanismStatus,
    AudioMechanismType,
    TimingRecord
} from './audio-mechanism';
import {PrecisionPlayerSettings} from '../precision-player.settings';
import {PPEvent} from '../obj/pp-event';
import {getHighResTimestamp, getTimeStampByEvent} from '../obj/functions';

export class HtmlAudio extends AudioMechanism {
    public get audioElement(): HTMLAudioElement {
        return this._audioElement;
    }

    public get currentTime(): number {
        if (this.audioElement) {
            return this.audioElement.currentTime;
        }
        return 0;
    }

    public set playbackRate(value: number) {
        this.onPlaybackChange(value);
        this._playbackRate = value;
        if (this.audioElement) {
            this.audioElement.playbackRate = value;
        }
    }

    public set volume(value: number) {
        this._volume = value;
        if (this.audioElement) {
            this.audioElement.volume = value;
        }
    }

    private _audioElement: HTMLAudioElement;
    private onEnded: PPEvent<void>;

    private readyToStart = false;
    public version = '0.1.0';

    constructor(settings?: PrecisionPlayerSettings) {
        super(AudioMechanismType.HTMLAUDIO, settings);
    }

    public initialize(audioFile: string | File) {
        super.initialize(audioFile);
        this.readyToStart = false;
        this.changeStatus(AudioMechanismStatus.INITIALIZED, {
                eventTriggered: getTimeStampByEvent(null),
                playbackDuration: {
                    audioMechanism: this.currentTime,
                    eventCalculation: -1
                }
            }
        );

        this.onEnded = new PPEvent<void>();
        this._audioElement = new Audio();
        this._audioElement.preload = "metadata";
        this._audioElement.playbackRate = this._playbackRate;
        this._audioElement.volume = this._volume;
        this._audioElement.defaultMuted = false;

        this.addAudioEventListeners();

        this.loadAudioFile(audioFile, (audioLoadEvent: AudioLoadEvent) => {
                if (audioLoadEvent.url !== null) {
                    // stream by URL
                    this._audioElement.src = audioLoadEvent.url;
                } else {
                    // array buffer
                    if (typeof audioFile === 'string' && audioFile.indexOf('blob:http://') === 0) {
                        this._audioElement.src = audioFile;
                    } else {
                        this._audioElement.src = URL.createObjectURL(new File([audioLoadEvent.arrayBuffer], audioLoadEvent.name, {
                            type: 'audio/x-wav'
                        }));
                    }
                }
            },
            (error) => {
                console.error(error);
                this.changeStatus(AudioMechanismStatus.FAILED, {
                    eventTriggered: getTimeStampByEvent(null),
                    playbackDuration: {
                        audioMechanism: this.currentTime,
                        eventCalculation: -1
                    }
                }, error);
            },
            (event) => {
                this.onFileProcessing.dispatchEvent(event.loaded / event.total);
            });
    }

    public play(start?: number, callback: () => void = () => {
    }) {
        this._audioElement.currentTime = start ?? this.currentTime;
        this._audioElement.play().catch((e)=>{
            console.error(e)
        });
        this.afterEndedCallback = callback;
    }

    public pause(callback: () => void = () => {
    }) {
        this._status = AudioMechanismStatus.PAUSED;
        this._audioElement.pause();
        this.afterEndedCallback = callback;
    }

    public stop(callback: () => void = () => {
    }) {
        super.stop();
        this._audioElement.pause();
        this.afterEndedCallback = callback;
    }

    /**
     * adds handlers for each audio event.
     */
    addAudioEventListeners() {
        this._audioElement.addEventListener('abort', this.audioEventHandler);
        this._audioElement.addEventListener('canplay', this.audioEventHandler);
        this._audioElement.addEventListener('canplaythrough', this.audioEventHandler);
        this._audioElement.addEventListener('durationchange', this.audioEventHandler);
        this._audioElement.addEventListener('emptied', this.audioEventHandler);
        this._audioElement.addEventListener('ended', this.audioEventHandler);
        this._audioElement.addEventListener('error', this.audioEventHandler);
        this._audioElement.addEventListener('loadeddata', this.audioEventHandler);
        this._audioElement.addEventListener('loadedmetadata', this.onLoadedMetaData);
        this._audioElement.addEventListener('loadstart', this.onLoadedMetaData);
        this._audioElement.addEventListener('pause', this.audioEventHandler);
        this._audioElement.addEventListener('play', this.audioEventHandler);
        this._audioElement.addEventListener('playing', this.audioEventHandler);
        this._audioElement.addEventListener('progress', this.audioEventHandler);
        this._audioElement.addEventListener('ratechange', this.audioEventHandler);
        this._audioElement.addEventListener('resize', this.audioEventHandler);
        this._audioElement.addEventListener('seeked', this.audioEventHandler);
        this._audioElement.addEventListener('seeking', this.audioEventHandler);
        this._audioElement.addEventListener('stalled', this.audioEventHandler);
        this._audioElement.addEventListener('suspend', this.audioEventHandler);
        this._audioElement.addEventListener('timeupdate', this.audioEventHandler);
        this._audioElement.addEventListener('volumechange', this.audioEventHandler);
        this._audioElement.addEventListener('waiting', this.audioEventHandler);
    }

    /**
     * removes eventhandlers for each audio event. g
     */
    removeEventListeners() {
        this._audioElement.removeEventListener('abort', this.audioEventHandler);
        this._audioElement.removeEventListener('canplay', this.audioEventHandler);
        this._audioElement.removeEventListener('canplaythrough', this.audioEventHandler);
        this._audioElement.removeEventListener('durationchange', this.audioEventHandler);
        this._audioElement.removeEventListener('emptied', this.audioEventHandler);
        this._audioElement.removeEventListener('ended', this.audioEventHandler);
        this._audioElement.removeEventListener('error', this.audioEventHandler);
        this._audioElement.removeEventListener('loadeddata', this.audioEventHandler);
        this._audioElement.removeEventListener('loadedmetadata', this.onLoadedMetaData);
        this._audioElement.removeEventListener('loadstart', this.onLoadedMetaData);
        this._audioElement.removeEventListener('pause', this.audioEventHandler);
        this._audioElement.removeEventListener('play', this.audioEventHandler);
        this._audioElement.removeEventListener('playing', this.audioEventHandler);
        this._audioElement.removeEventListener('progress', this.audioEventHandler);
        this._audioElement.removeEventListener('ratechange', this.audioEventHandler);
        this._audioElement.removeEventListener('resize', this.audioEventHandler);
        this._audioElement.removeEventListener('seeked', this.audioEventHandler);
        this._audioElement.removeEventListener('seeking', this.audioEventHandler);
        this._audioElement.removeEventListener('stalled', this.audioEventHandler);
        this._audioElement.removeEventListener('suspend', this.audioEventHandler);
        this._audioElement.removeEventListener('timeupdate', this.audioEventHandler);
        this._audioElement.removeEventListener('volumechange', this.audioEventHandler);
        this._audioElement.removeEventListener('waiting', this.audioEventHandler);
    }

    /**
     * the central handler for all audio events.
     * @param $event
     */
    audioEventHandler = ($event: Event) => {
        const eventTimestamp = getTimeStampByEvent($event);

        const record: TimingRecord = {
            eventTriggered: eventTimestamp,
            playbackDuration: {
                audioMechanism: this._audioElement.currentTime,
                eventCalculation: -1
            }
        };

        switch ($event.type) {
            case ('canplay'):
                if (!this.readyToStart) {
                    this.onReady(record);
                    this.readyToStart = true;
                }
                break;
            case ('playing'):
                this.onPlay(record);
                break;
            case ('pause'):
                if (this._status === AudioMechanismStatus.PLAYING) {
                    this.onEndHandler(record);
                } else if (this._status === AudioMechanismStatus.PAUSED) {
                    this.onPause(record);
                } else if (this._status === AudioMechanismStatus.STOPPED) {
                    this._audioElement.currentTime = 0;
                    this.onStop(record);
                }
                break;
        }
    }

    /**
     * handler for the ended event after the audio file was still playing.
     * @param record
     */
    private onEndHandler = (record: TimingRecord) => {
        this.onEnd(record);
        this.onEnded.dispatchEvent();
    }

    /**
     * Handler for the onloadedmetadata event.
     */
    private onLoadedMetaData = () => {
        this._audioInformation = {
            ...this._audioInformation,
            audioMechanism: {
                duration: this._audioElement.duration,
                sampleRate: -1,
                samples: -1
            }
        };
    }

    private onPlaybackChange(newValue: number) {
        if (this._status === AudioMechanismStatus.PLAYING) {
            const now = getHighResTimestamp();
            this.playbackRatePufferByEvent += (now - this.lastPlaybackRateChangedByEvent.timestamp) * this.lastPlaybackRateChangedByEvent.playbackRate;

            this.lastPlaybackRateChangedByEvent = {
                timestamp: now,
                playbackRate: newValue
            };
        }
    }

    /**
     * destroy all data related to this instance of the HTML Audio mechanism.
     */
    public destroy = () => {
        super.destroy();
        this.removeEventListeners();
        this.onEnded.unlistenAll();
        this._status = AudioMechanismStatus.INITIALIZED;
    }
}
