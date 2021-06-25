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

    public get volume(): number {
        return this._selectedMechanism.volume;
    }

    public set volume(value: number) {
        this._selectedMechanism.volume = value;
    }

    public get playbackRate(): number {
        return this._selectedMechanism.playbackRate;
    }

    public set playbackRate(value: number) {
        this._selectedMechanism.playbackRate = value;
    }

    public get onFileProcessing(): PPEvent<number> {
        return this._selectedMechanism.onFileProcessing;
    }

    protected _id: number;
    private static idCounter = 0;
    private readonly type: AudioMechanismType;
    private readonly _selectedMechanism: AudioMechanism;
    private readonly _onStatusChange: PPEvent<AudioStatusEvent>;
    private _status: AudioMechanismStatus;

    private readonly _settings = new PrecisionPlayerSettings();

    private readonly _htmlContainer: HTMLElement;
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

            // listen to status changes and redirect it to the public onStatusChaneg method
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

    /** initializes the precision player. Call this method AFTER the code that listen to status changes.
     * @param file
     */
    public initialize(file: File | string) {
        this._selectedMechanism.initialize(file);
        this.initializeUI();
    }

    /** creates an UI for the Precision player
     *
     */
    private initializeUI = () => {
        if (this._htmlContainer) {
            this._htmlContainer.innerHTML = '';
            this._htmlContainer.setAttribute('class', 'ppl-player');


            const playButtonsDiv = document.createElement("div");
            playButtonsDiv.setAttribute("class", "ppl-control ppl-control-buttons");

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
            playButtonsDiv.appendChild(playButton);

            // stop button
            const stopButton = document.createElement('button');
            stopButton.setAttribute('class', 'ppl-button ppl-stop-button');
            stopButton.addEventListener('click', () => {
                this.stop();
                playButton.innerHTML = '▶';
            });
            stopButton.innerHTML = '◼';
            playButtonsDiv.appendChild(stopButton);
            this._htmlContainer.appendChild(playButtonsDiv);

            // playbackrate
            const playbackRate = (this.playbackRate) ? this.playbackRate : 1;
            const playBackRateDiv = document.createElement("div");
            playBackRateDiv.setAttribute("class", "ppl-control");

            const playBackRateSliderLabel = document.createElement('label');
            playBackRateSliderLabel.setAttribute('class', 'ppl-rate-range-label');
            playBackRateSliderLabel.setAttribute('id', 'ppl-rate-range-label-' + this.id);
            playBackRateSliderLabel.innerHTML = `Speed: ${playbackRate}x`;
            playBackRateDiv.appendChild(playBackRateSliderLabel);

            const playBackRateSlider = document.createElement('input');
            playBackRateSlider.setAttribute('class', 'ppl-button ppl-rate-range');
            playBackRateSlider.setAttribute('type', 'range');
            playBackRateSlider.setAttribute('min', '0.25');
            playBackRateSlider.setAttribute('value', '1');
            playBackRateSlider.setAttribute('max', '2');
            playBackRateSlider.setAttribute('step', '0.05');
            playBackRateSlider.addEventListener('change', (event) => {
                this.playbackRate = Number(playBackRateSlider.value);
                playBackRateSliderLabel.innerHTML = `Speed: ${playBackRateSlider.value}x`
            });
            playBackRateDiv.appendChild(playBackRateSlider);
            this._htmlContainer.appendChild(playBackRateDiv);

            // volume
            const volume = (this.volume) ? this.volume : 1;
            const volumeDiv = document.createElement("div");
            volumeDiv.setAttribute("class", "ppl-control");

            const volumeSliderLabel = document.createElement('label');
            volumeSliderLabel.setAttribute('class', 'ppl-volume-range-label');
            volumeSliderLabel.setAttribute('id', 'ppl-volume-range-label-' + this.id);
            volumeSliderLabel.innerHTML = `Volume: ${volume * 100}%`;
            volumeDiv.appendChild(volumeSliderLabel);

            const volumeSlider = document.createElement('input');
            volumeSlider.setAttribute('class', 'ppl-button ppl-volume-range');
            volumeSlider.setAttribute('type', 'range');
            volumeSlider.setAttribute('min', '0.25');
            volumeSlider.setAttribute('max', '1');
            volumeSlider.setAttribute('step', '0.05');
            volumeSlider.setAttribute('value', '1');
            volumeSlider.addEventListener('change', (event) => {
                const value = Number(volumeSlider.value);
                this.volume = value;
                volumeSliderLabel.innerHTML = `Volume: ${Math.round(value * 100)}%`
            });
            volumeDiv.appendChild(volumeSlider);
            this._htmlContainer.appendChild(volumeDiv);

            const clearFixDiv = document.createElement("div");
            clearFixDiv.style.clear = "both";
            this._htmlContainer.appendChild(clearFixDiv);

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
            this.timers.statuschange = this.onStatusChange.addEventListener((pEvent) => {
                if (pEvent.status === 'PLAYING') {
                    let animationStart;
                    let last = Date.now();
                    const requestAnimation = (timestamp: number) => {
                        if (animationStart === undefined) {
                            animationStart = timestamp;
                        }
                        if (Date.now() - last > 250) {
                            last = Date.now();
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

    /**
     * starts the audio playback
     * @param endCallback
     */
    public play(endCallback = () => {}) {
        this._onStatusChange.afterNextValidEvent(a => a.status === AudioMechanismStatus.ENDED, endCallback);
        this._selectedMechanism.play();
    }

    /**
     * pauses the audio playback
     */
    public pause() {
        this._selectedMechanism.pause();
    }

    /**
     * stops the audio playback
     */
    public stop() {
        this._selectedMechanism.stop();
    }

    /**
     * destroys the player. Call this method when you don't need this instance anymore.
     */
    public destroy() {
        this._selectedMechanism.destroy();
        this._onStatusChange.unlistenAll();
        this.onFileProcessing.unlistenAll();
        this._status = AudioMechanismStatus.INITIALIZED;

        if (this._htmlContainer) {
            this._htmlContainer.innerHTML = '';
        }
    }
}
