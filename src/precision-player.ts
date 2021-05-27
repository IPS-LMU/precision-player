import {
    AudioMechanism,
    AudioMechanismStatus,
    AudioMechanismType,
    AudioStatusEvent,
    TimingRecord
} from './mechanisms/audio-mechanism';
import {PPEvent} from './obj/pp-event';
import {HtmlAudio} from './mechanisms/html-audio';
import {WebAudio} from './mechanisms/web-audio';
import {PrecisionPlayerSettings} from './precision-player.settings';


export class AudioPlayer {
    get status(): AudioMechanismStatus {
        return this._status;
    }
    get id(): number {
        return this._id;
    }
    get htmlContainer(): HTMLElement {
        return this._htmlContainer;
    }

    get settings(): PrecisionPlayerSettings {
        return this._settings;
    }

    public get selectedMechanism(): AudioMechanism {
        return this._selectedMechanism;
    }

    public get onStatusChange(): PPEvent<AudioStatusEvent> {
        return this._onStatusChange;
    }

    public get audioInformation(): any {
        return this._selectedMechanism.audioInformation;
    }

    public get currentTime(): number {
        return this._selectedMechanism.currentTime;
    }

    public get onFileProcessing(): PPEvent<number> {
        return this._selectedMechanism.onFileProcessing;
    }

    public get supportsHighResTimestamps(){
        return (window.performance.now || (window.performance as any).webkitNow);
    }

    protected _id: number;
    private static idCounter = 0;
    private type: AudioMechanismType;
    private _selectedMechanism: AudioMechanism;
    private _onStatusChange: PPEvent<AudioStatusEvent>;
    private _status: AudioMechanismStatus;

    private _settings = new PrecisionPlayerSettings();

    private _htmlContainer: HTMLElement;
    private timers = {
        statuschange: -1,
        playing: -1
    };

    constructor(type: AudioMechanismType, settings?: PrecisionPlayerSettings, htmlContainer?: HTMLDivElement) {
        if (type === AudioMechanismType.WEBAUDIO || type === AudioMechanismType.HTMLAUDIO) {
            this._id = ++AudioPlayer.idCounter;
            this.type = type;
            if (settings !== null && settings !== undefined) {
                this._settings = settings;
            }

            this._htmlContainer = htmlContainer;

            this._onStatusChange = new PPEvent<{
                id: number;
                status: AudioMechanismStatus,
                timingRecord: TimingRecord
            }>();

            if (this.type === AudioMechanismType.HTMLAUDIO) {
                this._selectedMechanism = new HtmlAudio(this._settings);
            } else {
                this._selectedMechanism = new WebAudio(this._settings);
            }

            this._selectedMechanism.statuschange.addEventListener((event) => {
                this._status = event.status;
                event.timingRecord.playbackDuration.eventCalculation =
                    (event.timingRecord.playbackDuration.eventCalculation > -1) ? event.timingRecord.playbackDuration.eventCalculation / 1000 : -1;
                this._onStatusChange.dispatchEvent({
                    ...event
                });
            });

        } else {
            throw new Error('not supported audio mechanism. Choose \'WebAudio\' or \'HTMLAudio\'');
        }
    }

    public initialize(file: File | string) {
        this._selectedMechanism.initialize(file);
        this.initializeUI();
    }

    private initializeUI = () => {
        if (this._htmlContainer) {
            this._htmlContainer.innerHTML = '';
            this._htmlContainer.setAttribute('class', 'ppl-player');

            // play button
            const playButton = document.createElement('button');
            playButton.setAttribute('class', 'ppl-button ppl-play-button');
            playButton.addEventListener('click', () => {
                if (this._status === 'PLAYING') {
                    this.pause();
                    playButton.innerHTML = '▶';
                } else {
                    this.play(() => {
                        playButton.innerHTML = '▶';
                    });
                    playButton.innerHTML = '||';
                }
            });
            playButton.innerHTML = '▶';
            this._htmlContainer.appendChild(playButton);

            // stop button
            const stopButton = document.createElement('button');
            stopButton.setAttribute('class', 'ppl-button ppl-stop-button');
            stopButton.addEventListener('click', () => {
                this.stop();
                playButton.innerHTML = '▶';
            });
            stopButton.innerHTML = '◼';
            this._htmlContainer.appendChild(stopButton);

            //progress bar
            const progressBar = document.createElement('div');
            progressBar.setAttribute('class', 'ppl-progress-bar');
            const progressBarValue = document.createElement('div');
            progressBarValue.setAttribute('class', 'ppl-progress-bar-value');
            progressBar.appendChild(progressBarValue);

            this._htmlContainer.appendChild(progressBar);

            if (this.timers.statuschange > -1) {
                this.onStatusChange.removeCallback(this.timers.statuschange);
            }
            this.timers.statuschange = this.onStatusChange.addEventListener((statusObj) => {
                if (statusObj.status === 'PLAYING') {
                    let animationStart;
                    const requestAnimation = (timestamp: number) => {
                        if (animationStart === undefined) {
                            animationStart = timestamp;
                        }
                        progressBarValue.style.width = (this._selectedMechanism.currentTime / this._selectedMechanism.audioInformation.audioMechanism.duration * 100).toFixed(2) + '%';
                        if (this._status === 'PLAYING') {
                            window.requestAnimationFrame(requestAnimation);
                        }
                    }
                    window.requestAnimationFrame(requestAnimation);
                }
            });
        }
    }

    public isBrowserCompatible(): boolean {
        // TODO implement!
        return false;
    }

    public play(endCallback = () => {
    }) {
        this.onStatusChange.afterNextValidEvent(a => a.status === AudioMechanismStatus.ENDED, endCallback);
        this._selectedMechanism.play();
    }

    public pause() {
        this._selectedMechanism.pause();
    }

    public stop() {
        this._selectedMechanism.stop();
    }

    public destroy() {
        this._selectedMechanism.destroy();
        this._onStatusChange.unlistenAll();
        this.onFileProcessing
        this._status = AudioMechanismStatus.INITIALIZED;

        if (this._htmlContainer) {
            this._htmlContainer.innerHTML = '';
        }
    }
}
