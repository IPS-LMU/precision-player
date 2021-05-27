import {AudioMechanism, AudioMechanismStatus, AudioMechanismType, TimingRecord} from './audio-mechanism';
import {PrecisionPlayerSettings} from '../precision-player.settings';

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
    private requestedStatus: AudioMechanismStatus = null;

    constructor(settings?: PrecisionPlayerSettings) {
        super(AudioMechanismType.WEBAUDIO, settings);
        // force download
        this._settings.downloadAudio = true;
    }

    public initialize = (audioFile: string | File) => {
        super.initialize(audioFile);
        this.initializeSettings();
        this.changeStatus(AudioMechanismStatus.INITIALIZED, {
                eventTriggered: this.getTimeStampByEvent(null),
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
                    eventTriggered: this.getTimeStampByEvent(null),
                    playbackDuration: {
                        audioMechanism: 0,
                        eventCalculation: 0
                    }
                });
            }, (exception) => {
                this.onError.dispatchEvent({
                    message: 'Could not decode audio file',
                    error: exception,
                    timestamp: this.getTimeStampByEvent(null).nowMethod
                })

                const eventTimestamp = this.getTimeStampByEvent(null);
                this.changeStatus(AudioMechanismStatus.FAILED, {
                    eventTriggered: eventTimestamp,
                    playbackDuration: {
                        audioMechanism: this.currentTime,
                        eventCalculation: -1
                    }
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
                this.onFileProcessing.dispatchEvent(event.loaded / event.total);
            });
    };

    public play = (callback: () => void = () => {
    }) => {
        this.requestedStatus = null;
        if (this._status !== AudioMechanismStatus.INITIALIZED) {
            if (this._status === AudioMechanismStatus.ENDED) {
                // start from beginning
                this._currentTime = 0;
                this.startOffset = 0;
            }

            const tryResume = () => {
                const eventTimestamp = this.getTimeStampByEvent(null);
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
                    const timestamp = this.getTimeStampByEvent(null);

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
                        console.error(`resuming audio context failed`);
                        this.changeStatus(AudioMechanismStatus.FAILED, {
                            playbackDuration: {
                                audioMechanism: this.currentTime,
                                eventCalculation: -1
                            },
                            eventTriggered: this.getTimeStampByEvent(null)
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
                        playbackDuration: {
                            audioMechanism: -1,
                            eventCalculation: -1
                        },
                        eventTriggered: this.getTimeStampByEvent(event)
                    });
                    callback();
                });

                this.startPosition = this._currentTime;
                this.startTime = this.audioContext.currentTime;

                if (this._status !== AudioMechanismStatus.DESTROYED) {
                    this.audioBufferSourceNode.start(0, this.startPosition);
                    const timestamp = this.getTimeStampByEvent(null);

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
                        }
                        this.changeStatus(AudioMechanismStatus.FAILED, {
                            playbackDuration: {
                                audioMechanism: this._currentTime,
                                eventCalculation: -1
                            },
                            eventTriggered: timestamp
                        });
                    }
                }
            }
        }
    }

    public pause = () => {
        this.audioContext.suspend().then(() => {
            const time = this.getTimeStampByEvent(null);
            this.updatePlayPosition();
            this.onPause({
                playbackDuration: {
                    audioMechanism: this._currentTime,
                    eventCalculation: -1
                }, eventTriggered: time
            });
        }).catch((error) => {
            console.error(error);
        });
    }

    public stop() {
        if (this.audioBufferSourceNode) {
            this.requestedStatus = AudioMechanismStatus.STOPPED;
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
        // onEnd occurs on end, pause, and stopped!
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
            this.startOffset = 0;

            this.onStop({
                ...record,
                playbackDuration: {
                    audioMechanism: previousCurrentTime,
                    eventCalculation: -1
                }
            });
        }
    }

    private disconnectNodes() {
        if (this.audioBufferSourceNode && this.gainNode && this.audioContext && this._status !== 'INITIALIZED') {
            this.audioBufferSourceNode.disconnect(this.gainNode);
            this.gainNode.disconnect(this.audioContext.destination);
            this.audioBufferSourceNode = null;
            this.gainNode = null;
        }
    }

    private decodeAudioBuffer = (arrayBuffer: ArrayBuffer,
                                 callback: (audioBuffer: AudioBuffer) => void,
                                 errorCallback: (error: DOMException) => void) => {
        this.audioContext.decodeAudioData(arrayBuffer, callback, errorCallback);
    }

    private updatePlayPosition() {
        this._currentTime = this.getCurrentPlayPosition();
    }

    private initializeSettings() {
        this._currentTime = 0;
        this.startPosition = 0;
        this.startOffset = 0;
        this.startTime = 0;
        this.audioLoaded = false;
        this.initAudioContext();
        this.audioBuffer = null;
    }

    /***
     * calculate current play position. Position can be max duration.
     * @private
     */
    private getCurrentPlayPosition() {
        if (this.audioContext && this.audioBuffer) {
            return Math.min((this.startOffset + this.audioContext.currentTime - this.startTime), this.audioBuffer.duration);
        }

        return 0;
    }
}
