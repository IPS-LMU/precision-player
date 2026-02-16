import {AudioMechanism, AudioMechanismStatus, AudioMechanismType, TimingRecord} from './audio-mechanism';
import {PrecisionPlayerSettings} from '../precision-player.settings';
import {getHighResTimestamp, getTimeStampByEvent} from '../obj/functions';

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

    public set playbackRate(value: number) {
        this.onPlaybackRateChange(value);
        this._playbackRate = value;
        if (this.audioBufferSourceNode) {
            this.audioBufferSourceNode.playbackRate.value = value;
        }
    }

    public set volume(value: number) {
        this._volume = value
        if (this.gainNode) {
            this.gainNode.gain.value = value;
        }
    }

    public version = '0.1.0';
    private audioContext: AudioContext;
    private audioBufferSourceNode: AudioBufferSourceNode;
    private gainNode: GainNode;
    private audioBuffer: AudioBuffer;
    private _currentTime = 0;
    private startPosition = 0;

    private lastPlaybackRateChange = {
        timestamp: 0,
        playbackRate: 0
    };
    private playbackRateBuffer = 0;

    private audioLoaded = false;
    private requestedStatus: AudioMechanismStatus = null;

    constructor(settings?: PrecisionPlayerSettings) {
        super(AudioMechanismType.WEBAUDIO, settings);
        // force download
        this._settings.downloadAudio = true;
    }

    public initialize(audioFile: string | File) {
        super.initialize(audioFile);
        this.initializeSettings();
        this.changeStatus(AudioMechanismStatus.INITIALIZED, {
                eventTriggered: getTimeStampByEvent(null),
                playbackDuration: {
                    audioMechanism: this.currentTime,
                    eventCalculation: -1
                }
            }
        );

        const decode = (arrayBuffer: ArrayBuffer) => {
            this.decodeAudioBuffer(arrayBuffer, (audioBuffer) => {
                this.audioLoaded = true;
                this.audioBuffer = audioBuffer;

                this._audioInformation = {
                    ...this._audioInformation,
                    audioMechanism: {
                        duration: audioBuffer.duration,
                        sampleRate: audioBuffer.sampleRate,
                        samples: audioBuffer.length
                    }
                };

                this.onReady({
                    eventTriggered: getTimeStampByEvent(null),
                    playbackDuration: {
                        audioMechanism: 0,
                        eventCalculation: 0
                    }
                });
            }, (exception) => {
                this.onError.dispatchEvent({
                    message: 'Could not decode audio file',
                    error: exception,
                    timestamp: getTimeStampByEvent(null).nowMethod
                })

                const eventTimestamp = getTimeStampByEvent(null);
                this.changeStatus(AudioMechanismStatus.FAILED, {
                    eventTriggered: eventTimestamp,
                    playbackDuration: {
                        audioMechanism: this.currentTime,
                        eventCalculation: -1
                    }
                }, 'Can\'t decode audio file.');
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
    };

    public play(start?: number, callback: () => void = () => {
    }) {
        this.requestedStatus = null;

        if (this._status !== AudioMechanismStatus.INITIALIZED) {
            if (this._status === AudioMechanismStatus.ENDED) {
                // start from beginning
                this._currentTime = 0;
            }

            if (this._status === AudioMechanismStatus.PLAYING) {
                // already playing, pause and retry
                this.pause(() => {
                    this.play(start, callback);
                });
                return;
            }

            const tryResume = () => {
                const eventTimestamp = getTimeStampByEvent(null);
                this.changeStatus(AudioMechanismStatus.RESUMING, {
                    playbackDuration: {
                        audioMechanism: this.currentTime,
                        eventCalculation: this.playDuration.eventCalculation
                    },
                    eventTriggered: eventTimestamp
                });
                let resumed = false;
                let timer = -1;
                this.audioContext.resume().then(() => {
                    const timestamp = getTimeStampByEvent(null);

                    resumed = true;
                    if (timer > -1) {
                        window.clearTimeout(timer);
                    }

                    this.onPlay({
                        playbackDuration: {
                            audioMechanism: this.currentTime,
                            eventCalculation: -1
                        },
                        eventTriggered: timestamp
                    });
                }).catch((error) => {
                    console.error(error);
                });

                timer = window.setTimeout(() => {
                    if (!resumed) {
                        console.error(`Resuming audio context failed.`);
                        this.changeStatus(AudioMechanismStatus.FAILED, {
                            playbackDuration: {
                                audioMechanism: this.currentTime,
                                eventCalculation: -1
                            },
                            eventTriggered: getTimeStampByEvent(null)
                        }, 'Resuming audio context failed.');
                    }
                }, 50);
            }

            if (this.audioContext.state === 'suspended' && this._status !== AudioMechanismStatus.READY) {
                tryResume();
            } else {
                this.audioBufferSourceNode = this.audioContext.createBufferSource();
                this.audioBufferSourceNode.playbackRate.value = this._playbackRate;
                this.audioBufferSourceNode.buffer = this.audioBuffer;
                this.gainNode = this.audioContext.createGain();
                this.gainNode.gain.value = this._volume;

                this.audioBufferSourceNode.connect(this.gainNode).connect(this.audioContext.destination);
                this.audioBufferSourceNode.addEventListener('ended', (event) => {
                    this.updatePlayPosition();
                    this.onEnd({
                        playbackDuration: {
                            audioMechanism: -1,
                            eventCalculation: -1
                        },
                        eventTriggered: getTimeStampByEvent(event)
                    });
                    callback();
                });

                this.lastPlaybackRateChange = {
                    timestamp: this.audioContext.currentTime,
                    playbackRate: this._playbackRate
                };

                this._currentTime = start !== undefined ? start : this._currentTime;

                this.startPosition = this._currentTime;
                this.playbackRateBuffer = start !== undefined ? start : this.playbackRateBuffer;

                if (this._status !== AudioMechanismStatus.DESTROYED) {
                    this.audioBufferSourceNode.start(0, this.startPosition);
                    const timestamp = getTimeStampByEvent(null);

                    if (this.audioContext.state === 'running') {
                        this.onPlay({
                            playbackDuration: {
                                audioMechanism: this._currentTime,
                                eventCalculation: -1
                            },
                            eventTriggered: timestamp
                        });
                    } else {
                        if (this.audioContext.state === 'suspended') {
                            tryResume();
                        } else {
                            this.changeStatus(AudioMechanismStatus.FAILED, {
                                playbackDuration: {
                                    audioMechanism: this._currentTime,
                                    eventCalculation: -1
                                },
                                eventTriggered: timestamp
                            }, `Can\'t resume audio because the audiocontext has state ${this.audioContext.state}.`);
                        }
                    }
                }
            }
        }
    }

    public pause(callback: () => void = () => {
    }) {
        this.requestedStatus = AudioMechanismStatus.PAUSED;
        this.afterEndedCallback = callback;
        this.updatePlayPosition();
        if (this.audioBufferSourceNode) {
            this.audioBufferSourceNode.stop(0);
        }
    }

    public stop(callback: () => void = () => {
    }) {
        if (this.audioBufferSourceNode) {
            this.requestedStatus = AudioMechanismStatus.STOPPED;
            this.afterEndedCallback = callback;
            this.updatePlayPosition();
            this.audioBufferSourceNode.stop(0);
        }
    }

    private initAudioContext() {
        const audioContext = window.AudioContext // Default
            // @ts-ignore
            || window.webkitAudioContext // Safari and old versions of Chrome
            // @ts-ignore
            || window.mozAudioContext
            || false;
        if (audioContext) {
            this.audioContext = new audioContext();
        }
    }

    protected onEnd(record: TimingRecord) {
        // onEnd occurs after and stopped fully ended!
        // => each time audio is stopped
        this.disconnectNodes();
        if (this._status === AudioMechanismStatus.PLAYING && this.requestedStatus === null) {
            super.onEnd({
                ...record,
                playbackDuration: {
                    audioMechanism: this._currentTime,
                    eventCalculation: -1
                }
            });
        } else if (this.requestedStatus === AudioMechanismStatus.STOPPED) {
            const previousCurrentTime = this._currentTime;
            this._currentTime = 0;
            this.playbackRateBuffer = 0;

            this.onStop({
                ...record,
                playbackDuration: {
                    audioMechanism: previousCurrentTime,
                    eventCalculation: -1
                }
            });
        } else if (this.requestedStatus === AudioMechanismStatus.PAUSED) {
            this.playbackRateBuffer = this._currentTime;
            this.onPause({
                playbackDuration: {
                    audioMechanism: this._currentTime,
                    eventCalculation: -1
                }, eventTriggered: record.eventTriggered
            });
        }
        this.afterEndedCallback();
        this.afterEndedCallback = () => {
        };
    }

    private disconnectNodes() {
        if (this.audioBufferSourceNode && this.gainNode && this.audioContext && this._status !== 'INITIALIZED') {
            this.audioBufferSourceNode.disconnect(this.gainNode);
            this.gainNode.disconnect(this.audioContext.destination);
            this.audioBufferSourceNode = null;
            this.gainNode = null;
        }
    }

    /**
     * decodes the audio buffer.
     * @param arrayBuffer
     * @param callback
     * @param errorCallback
     */
    private decodeAudioBuffer = (arrayBuffer: ArrayBuffer,
                                 callback: (audioBuffer: AudioBuffer) => void,
                                 errorCallback: (error: DOMException) => void) => {
        this.audioContext.decodeAudioData(arrayBuffer, callback, errorCallback);
    }

    /**
     * updates current time.
     * @private
     */
    private updatePlayPosition() {
        this._currentTime = this.getCurrentPlayPosition();
    }

    private initializeSettings() {
        this._currentTime = 0;
        this.startPosition = 0;
        this.audioLoaded = false;
        this.initAudioContext();
        this.audioBuffer = null;
    }

    private onPlaybackRateChange(newValue: number) {
        if (this._status === AudioMechanismStatus.PLAYING) {
            const now = getHighResTimestamp();
            this.playbackRateBuffer += (this.audioContext.currentTime - this.lastPlaybackRateChange.timestamp) * this.lastPlaybackRateChange.playbackRate;
            this.playbackRatePufferByEvent += (now - this.lastPlaybackRateChangedByEvent.timestamp) * this.lastPlaybackRateChangedByEvent.playbackRate;

            this.lastPlaybackRateChange = {
                timestamp: this.audioContext.currentTime,
                playbackRate: newValue
            };

            this.lastPlaybackRateChangedByEvent = {
                timestamp: now,
                playbackRate: newValue
            };
        }
    }

    /***
     * calculate current play position. Position can be max duration.
     * @private
     */
    private getCurrentPlayPosition() {
        if (this.audioContext && this.audioBuffer) {
            const currentTime = this.playbackRateBuffer + (this.audioContext.currentTime - this.lastPlaybackRateChange.timestamp) * this.lastPlaybackRateChange.playbackRate;
            return Math.min(currentTime, this.audioBuffer.duration);
        }

        return 0;
    }
}
