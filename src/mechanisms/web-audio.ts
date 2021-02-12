import {AudioMechanism, AudioMechanismStatus, AudioMechanismType, TimingRecord} from './audio-mechanism';
import {EventListener} from '../obj/event-listener';
import {PrecisionPlayerSettings} from '../precision-player.settings';


export class WebAudio extends AudioMechanism {
    public version = '0.0.1';

    private audioContext: AudioContext;
    private audioBufferSourceNode: AudioBufferSourceNode;
    private gainNode: GainNode;
    private audioBuffer: AudioBuffer;
    private _currentTime = 0;
    private startPosition = 0;

    private startOffset = 0;
    private startTime = 0;
    private intervalID = -1;

    private audioLoaded = false;

    constructor(settings?: PrecisionPlayerSettings) {
        super(AudioMechanismType.WEBAUDIO, settings);
        this.initAudioContext();
    }

    public initialize = (audioFile: string | File) => {
        const event: EventListener<ArrayBuffer> = new EventListener<ArrayBuffer>();
        const subscrId = event.addEventListener((arrayBuffer: ArrayBuffer) => {
            // decode
            this.decodeAudioBuffer(arrayBuffer, (audioBuffer) => {
                this.audioLoaded = true;
                this.audioBuffer = audioBuffer;

                this.audioInfo = {
                    duration: audioBuffer.duration,
                    sampleRate: audioBuffer.sampleRate,
                    samples: audioBuffer.length
                };

                this.onReady({
                    eventTriggered: this.getTimeStampByEvent(null),
                    playTime: 0
                });
            }, (exception) => {
                this.onError.dispatchEvent({
                    message: 'Could not decode audio file',
                    error: exception,
                    timestamp: this.getTimeStampByEvent(null)
                })
                this.changeStatus(AudioMechanismStatus.FAILED, {
                    eventTriggered: this.getTimeStampByEvent(null),
                    playTime: this.currentTime
                });
            });
            event.removeCallback(subscrId);
        });

        if (typeof audioFile === 'string') {
            // is url
            const url = audioFile;
            const xhr = new XMLHttpRequest();
            xhr.responseType = 'arraybuffer';
            xhr.onload = () => {
                const result = xhr.response as ArrayBuffer;
                event.dispatchEvent(result);
            }
            xhr.open('get', url, true);
            xhr.send();
        } else {
            // is file
            const reader = new FileReader();
            reader.onloadend = () => {
                event.dispatchEvent(reader.result as ArrayBuffer);
            };
            reader.readAsArrayBuffer(audioFile);
        }
    };

    public play = (callback: () => void = () => {
    }) => {
        if (this._status === AudioMechanismStatus.ENDED) {
            // start from beginning
            this._currentTime = 0;
            this.startOffset = 0;
        }

        this.audioBufferSourceNode = new AudioBufferSourceNode(this.audioContext, {
            buffer: this.audioBuffer
        });
        this.gainNode = this.audioContext.createGain();

        this.audioBufferSourceNode.connect(this.gainNode).connect(this.audioContext.destination);
        if (this.intervalID > -1) {
            window.clearInterval(this.intervalID);
            this.intervalID = -1;
        }
        this.intervalID = window.setInterval(() => {
            this.updatePlayPosition();
        }, 100);

        this.audioBufferSourceNode.addEventListener('ended', (event) => {
            this.updatePlayPosition();
            this.onEnd({
                playTime: -1,
                eventTriggered: this.getTimeStampByEvent(event)
            });
            callback();
        });

        this.startPosition = this._currentTime;
        this.startTime = this.audioContext.currentTime;

        this.audioBufferSourceNode.start(0, this.startPosition);
        this.onPlay({
            playTime: this._currentTime,
            eventTriggered: this.getTimeStampByEvent(null)
        });
    }

    public pause = () => {
        this.audioBufferSourceNode.stop(0);
        const timestamp = this.getTimeStampByEvent(null);
        this.onPause({
            playTime: this._currentTime,
            eventTriggered: timestamp
        });
        window.clearInterval(this.intervalID);
    }

    public stop() {
        this.audioBufferSourceNode.stop(0);
        const timestamp = this.getTimeStampByEvent(null);
        this.onStop({
            playTime: this._currentTime,
            eventTriggered: timestamp
        });
        window.clearInterval(this.intervalID);
    }

    private initAudioContext() {
        const audioContext = window.AudioContext // Default
            // @ts-ignore
            || window.webkitAudioContext // Safari and old versions of Chrome
            // @ts-ignore
            || window.mozAudioContext
            || false;
        if (audioContext) {
            if ((this.audioContext === null || this.audioContext === undefined)) {
                // reuse old audiocontext
                this.audioContext = new audioContext();
            }
        }
    }

    protected onEnd(record: TimingRecord) {
        // onEnd occurs on end, pause, and stopped!
        // => each time audio is stopped
        this.updatePlayPosition();
        this.disconnectNodes();

        if (this._status === AudioMechanismStatus.PLAYING) {
            super.onEnd({
                ...record,
                playTime: this._currentTime
            });
            // disconnect after playback is stopped
            window.clearInterval(this.intervalID);
        } else if (this._status === AudioMechanismStatus.PAUSED) {
            this.startOffset = this._currentTime;
        } else if (this._status === AudioMechanismStatus.STOPPED) {
            this._currentTime = 0;
            this.startOffset = 0;
        }
    }

    private disconnectNodes() {
        this.audioBufferSourceNode.disconnect(this.gainNode);
        this.gainNode.disconnect(this.audioContext.destination);
    }

    public get currentTime(): number {
        return this._currentTime;
    }

    private decodeAudioBuffer = (arrayBuffer: ArrayBuffer,
                                 callback: (audioBuffer: AudioBuffer) => void,
                                 errorCallback: (error: DOMException) => void) => {
        this.audioContext.decodeAudioData(arrayBuffer, callback, errorCallback);
    }

    private updatePlayPosition() {
        this._currentTime = (this.startOffset + this.audioContext.currentTime - this.startTime);
    }
}
