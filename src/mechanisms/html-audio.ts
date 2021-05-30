import {
    AudioLoadEvent,
    AudioMechanism,
    AudioMechanismStatus,
    AudioMechanismType,
    TimingRecord
} from './audio-mechanism';
import {PrecisionPlayerSettings} from '../precision-player.settings';
import {PPEvent} from '../obj/pp-event';

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
                eventTriggered: this.getTimeStampByEvent(null),
                playbackDuration: {
                    audioMechanism: this.currentTime,
                    eventCalculation: -1
                }
            }
        );

        this.onEnded = new PPEvent<void>();
        this._audioElement = new Audio();
        this._audioElement.preload = 'auto';

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
                            type: 'audio/wav'
                        }));
                    }
                }
            },
            (error) => {
                console.error(error);
                this.changeStatus(AudioMechanismStatus.FAILED, {
                    eventTriggered: this.getTimeStampByEvent(null),
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

    public play() {
        this._audioElement.play();
    }

    public pause() {
        this._status = AudioMechanismStatus.PAUSED;
        this._audioElement.pause();
    }

    public stop() {
        super.stop();
        this._audioElement.pause();
    }

    /**
     * adds handlers for each audio event.
     */
    addAudioEventListeners() {
        this._audioElement.addEventListener('canplay', this.audioEventHandler);
        this._audioElement.addEventListener('canplaythrough', this.audioEventHandler);
        this._audioElement.addEventListener('play', this.audioEventHandler);
        this._audioElement.addEventListener('playing', this.audioEventHandler);
        this._audioElement.addEventListener('pause', this.audioEventHandler);
        this._audioElement.onloadedmetadata = this.onLoadedMetaData;
    }

    /**
     * removes eventhandlers for each audio event.
     */
    removeEventListeners() {
        this._audioElement.removeEventListener('canplay', this.audioEventHandler);
        this._audioElement.removeEventListener('canplaythrough', this.audioEventHandler);
        this._audioElement.removeEventListener('play', this.audioEventHandler);
        this._audioElement.removeEventListener('playing', this.audioEventHandler);
        this._audioElement.removeEventListener('pause', this.audioEventHandler);
        this._audioElement.onloadedmetadata = null;
    }

    /**
     * the central handler for all audio events.
     * @param $event
     */
    audioEventHandler = ($event: Event) => {
        const eventTimestamp = this.getTimeStampByEvent($event);

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
            case('canplaythrough'):
                break;
            case ('play'):
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
