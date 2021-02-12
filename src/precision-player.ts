import {
    AudioMechanism,
    AudioMechanismStatus,
    AudioMechanismType,
    AudioStatusEvent,
    TimingRecord
} from './mechanisms/audio-mechanism';
import {EventListener} from './obj/event-listener';
import {HtmlAudio} from './mechanisms/html-audio';
import {WebAudio} from './mechanisms/web-audio';
import {PrecisionPlayerSettings} from './precision-player.settings';

export class PrecisionPlayer {
    get settings(): PrecisionPlayerSettings {
        return this._settings;
    }

    public get selectedMechanism(): AudioMechanism {
        return this._selectedMechanism;
    }

    public get statuschange(): EventListener<AudioStatusEvent> {
        return this._statuschange;
    }

    public get currentTime(): number {
        return this._selectedMechanism.currentTime;
    }

    protected _id: number;
    private static idCounter = 0;
    private type: AudioMechanismType;
    private _selectedMechanism: AudioMechanism;
    private _statuschange: EventListener<AudioStatusEvent>;
    private _status: AudioMechanismStatus;

    private _settings = new PrecisionPlayerSettings();

    constructor(type: AudioMechanismType, settings?: PrecisionPlayerSettings) {
        if (type === AudioMechanismType.WEBAUDIO || type === AudioMechanismType.HTMLAUDIO) {
            this._id = ++PrecisionPlayer.idCounter;
            this.type = type;
            if (settings !== null && settings !== undefined) {
                this._settings = settings;
            }

            this._statuschange = new EventListener<{
                id: number;
                status: AudioMechanismStatus,
                timingRecord: TimingRecord
            }>();

            console.log(`sett`);
            console.log(this._settings);
            if (this.type === AudioMechanismType.HTMLAUDIO) {
                this._selectedMechanism = new HtmlAudio(this._settings);
            } else {
                this._selectedMechanism = new WebAudio(this._settings);
            }

            this._selectedMechanism.statuschange.addEventListener((event) => {
                this._status = event.status;
                this._statuschange.dispatchEvent({
                    id: this._id,
                    ...event
                });
            });

        } else {
            throw new Error('not supported audio mechanism. Choose \'WebAudio\' or \'HTMLAudio\'');
        }
    }

    public initialize(file: File | string) {
        this._selectedMechanism.initialize(file);
    }

    public isBrowserCompatible(): boolean {
        // TODO implement!
        return false;
    }

    public play(endCallback = () => {
    }) {
        this.statuschange.afterNextValidEvent(a => a.status === AudioMechanismStatus.ENDED, endCallback);
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
        this._statuschange.unlistenAll();
        this._status = AudioMechanismStatus.INITIALIZED;
    }
}
