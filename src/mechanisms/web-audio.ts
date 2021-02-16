import {AudioMechanism, AudioMechanismStatus, AudioMechanismType, TimingRecord} from './audio-mechanism';
import {PrecisionPlayerSettings} from '../precision-player.settings';


export class WebAudio extends AudioMechanism {
    public version = '0.0.2';

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
        // force download
        this._settings.downloadAudio = true;
        this.initAudioContext();
    }

    public initialize = (audioFile: string | File) => {
        const decode = (arrayBuffer: ArrayBuffer) => {
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
        }

        this.loadAudioFile(audioFile, (audioLoadEvent) => {
                if (audioLoadEvent.url !== null) {
                    // url
                    // stream by URL
                    console.error(`streaming not supported`);
                } else {
                    // array buffer
                    decode(audioLoadEvent.arrayBuffer);
                }
            },
            (error) => {
                console.error(error);
            },
            (event) => {
                this.onProgress.dispatchEvent(event.loaded / event.total);
            });
    };

    public play = (callback: () => void = () => {
    }) => {
        if (this._status === AudioMechanismStatus.ENDED) {
            // start from beginning
            this._currentTime = 0;
            this.startOffset = 0;
        }

        this.audioBufferSourceNode = this.audioContext.createBufferSource();
        this.audioBufferSourceNode.buffer = this.audioBuffer;
        this.gainNode = this.audioContext.createGain();

        const doAfterResume = () => {
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

        const doAfterResumeFailed = (error) => {
            console.error(error);
        }

        if (this.audioContext.state === 'suspended') {
            this.changeStatus(AudioMechanismStatus.RESUMING, {
                playTime: this.currentTime,
                eventTriggered: this.getCurrentTimeStamp()
            })
            this.audioContext.resume().then(doAfterResume).catch(doAfterResumeFailed);
        } else {
            doAfterResume();
        }
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
