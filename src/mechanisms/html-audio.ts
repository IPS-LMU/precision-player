import {AudioMechanism, AudioMechanismStatus, AudioMechanismType, TimingRecord} from './audio-mechanism';
import {EventListener} from '../obj/event-listener';

export class HtmlAudio extends AudioMechanism {
    public get audioElement(): HTMLAudioElement {
        return this._audioElement;
    }

    private _audioElement: HTMLAudioElement;
    private onEnded: EventListener<void>;

    private readyToStart = false;
    public version = '1.0.0';

    public get currentTime(): number {
        return this.audioElement.currentTime;
    }

    constructor() {
        super(AudioMechanismType.HTMLAUDIO);
    }

    public initialize = (audioFile: string | File) => {
        this.onEnded = new EventListener<void>();
        this._audioElement = new Audio();
        this.addAudioEventListeners();

        if (typeof audioFile === 'string') {
            // is url
            this._audioElement.src = audioFile;
        } else {
            // is file
            this._audioElement.srcObject = audioFile
        }
    }

    public play = () => {
        this._audioElement.play();
    }

    public pause = () => {
        this._status = AudioMechanismStatus.PAUSED;
        this._audioElement.pause();
    }

    public stop = () => {
        super.stop();
        this._audioElement.pause();
        this._audioElement.currentTime = 0;
    }

    addAudioEventListeners() {
        this._audioElement.addEventListener('canplay', this.audioEventHandler);
        this._audioElement.addEventListener('canplaythrough', this.audioEventHandler);
        this._audioElement.addEventListener('play', this.audioEventHandler);
        this._audioElement.addEventListener('playing', this.audioEventHandler);
        this._audioElement.addEventListener('pause', this.audioEventHandler);
        this._audioElement.onloadedmetadata = this.onLoadedMetaData;
    }

    removeEventListeners() {
        this._audioElement.removeEventListener('canplay', this.audioEventHandler);
        this._audioElement.removeEventListener('canplaythrough', this.audioEventHandler);
        this._audioElement.removeEventListener('play', this.audioEventHandler);
        this._audioElement.removeEventListener('playing', this.audioEventHandler);
        this._audioElement.removeEventListener('pause', this.audioEventHandler);
        this._audioElement.onloadedmetadata = null;
    }

    audioEventHandler = ($event: Event) => {
        const record: TimingRecord = {
            eventTriggered: Date.now(),
            playTime: this._audioElement.currentTime
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
                    this.onStop(record)
                }
                break;
        }
    }

    private onEndHandler = (record: TimingRecord) => {
        this.onEnd(record);
        this.onEnded.dispatchEvent();
    }

    private onLoadedMetaData = () => {
        this.audioInfo = {
            duration: this._audioElement.duration,
            sampleRate: -1,
            samples: -1
        };
    }

    public destroy = () => {
        super.destroy();
        this.removeEventListeners();
        this.onEnded.unlistenAll();
        this._status = AudioMechanismStatus.INITIALIZED;
    }
}
