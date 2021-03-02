import {AudioMechanism, AudioMechanismStatus, AudioMechanismType, TimingRecord} from './audio-mechanism';
import {PrecisionPlayerSettings} from '../precision-player.settings';

/***
 * Possible Improvements
 * 1. Use of web workers (events?)
 * 2. Use of audio worklet? https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet#browser_compatibility
 * 3. It's more precise to get playcursor manually without interval. DONE
 * 4. Can we assume that playcursor reaches end when onend was triggered? -> yes DONE
 * 5. https://github.com/parallel-js/parallel.js could be interesting
 */

export class WebAudio extends AudioMechanism {
    public get currentTime(): number {
        if (this._status === AudioMechanismStatus.PLAYING) {
            // calculate current time according to audio context's current time
            // for more precision
            return this.getCurrentPlayPosition();
        }
        // return the currentTime that was set before
        return this._currentTime;
    }

    public version = '0.0.4';
    private audioContext: AudioContext;
    private audioBufferSourceNode: AudioBufferSourceNode;
    private gainNode: GainNode;
    private audioBuffer: AudioBuffer;
    private _currentTime = 0;
    private startPosition = 0;

    private startOffset = 0;
    private startTime = 0;

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

        const tryResume = () => {
            this.changeStatus(AudioMechanismStatus.RESUMING, {
                playTime: this.currentTime,
                eventTriggered: this.getCurrentTimeStamp()
            });
            let resumed = false;
            let timer = -1;
            this.audioContext.resume().then(() => {
                const timestamp = this.getTimeStampByEvent(null);

                resumed = true;
                if (timer > -1) {
                    window.clearTimeout(timer);
                }

                this.onPlay({
                    playTime: this._currentTime,
                    eventTriggered: timestamp
                });
            }).catch((error) => {
                console.error(error);
            });

            timer = window.setTimeout(() => {
                if (!resumed) {
                    console.error(`resuming audio context failed`);
                    this.changeStatus(AudioMechanismStatus.FAILED, {
                        playTime: this.currentTime,
                        eventTriggered: this.getCurrentTimeStamp()
                    });
                }
            }, 50);
        }

        if (this.audioContext.state === 'suspended' && this._status !== AudioMechanismStatus.READY) {
            tryResume();
        } else {
            this.audioBufferSourceNode = this.audioContext.createBufferSource();
            this.audioBufferSourceNode.buffer = this.audioBuffer;
            this.gainNode = this.audioContext.createGain();

            this.audioBufferSourceNode.connect(this.gainNode).connect(this.audioContext.destination);
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
            const timestamp = this.getTimeStampByEvent(null);

            if (this.audioContext.state === 'running') {
                this.onPlay({
                    playTime: this._currentTime,
                    eventTriggered: timestamp
                });
            } else {
                if (this.audioContext.state === 'suspended') {
                    tryResume();
                }
                this.changeStatus(AudioMechanismStatus.FAILED, {
                    playTime: this._currentTime,
                    eventTriggered: timestamp
                });
            }
        }
    }

    public pause = () => {
        this.audioContext.suspend();
        this.updatePlayPosition();
        const timestamp = this.getTimeStampByEvent(null);
        this.onPause({
            playTime: this._currentTime,
            eventTriggered: timestamp
        });
    }

    public stop() {
        this.audioBufferSourceNode.stop(0);
        const timestamp = this.getTimeStampByEvent(null);
        this.onStop({
            playTime: this._currentTime,
            eventTriggered: timestamp
        });
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
        this.disconnectNodes();

        if (this._status === AudioMechanismStatus.PLAYING) {
            super.onEnd({
                ...record,
                playTime: this._currentTime
            });
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

    private decodeAudioBuffer = (arrayBuffer: ArrayBuffer,
                                 callback: (audioBuffer: AudioBuffer) => void,
                                 errorCallback: (error: DOMException) => void) => {
        this.audioContext.decodeAudioData(arrayBuffer, callback, errorCallback);
    }

    private updatePlayPosition() {
        this._currentTime = this.getCurrentPlayPosition();
    }

    /***
     * calculate current play position. Position can be max duration.
     * @private
     */
    private getCurrentPlayPosition() {
        return Math.min((this.startOffset + this.audioContext.currentTime - this.startTime), this.audioBuffer.duration);
    }
}
