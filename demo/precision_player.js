/**
 * precision-player v0.3.0
 * Generated: 2026-02-16 16:01:16
 * Author: Julian Poemp
 * LICENSE: MIT
 */

var PrecisionPlayer = (function (exports) {
    'use strict';

    // @license http://opensource.org/licenses/MIT
    // copyright Paul Irish 2015
    // adapted by Julian Poemp 2021
    // Date.now() is supported everywhere except IE8. For IE8 we use the Date.now polyfill
    //   github.com/Financial-Times/polyfill-service/blob/master/polyfills/Date.now/polyfill.js
    // as Safari 6 doesn't have support for NavigationTiming, we use a Date.now() timestamp for relative values
    // if you want values similar to what you'd get with real perf.now, place this towards the head of the page
    // but in reality, you're just getting the delta between now() calls, so it's not terribly important where it's placed
    // original: https://gist.github.com/paulirish/5438650
    (function () {
        if (!('performance' in window)) {
            // @ts-ignore
            window.performance = {};
        }
        Date.now = (Date.now || function () {
            return new Date().getTime();
        });
        if (!('timeOrigin' in window.performance)) {
            var nowOffset = Date.now();
            if (performance.timing && performance.timing.navigationStart) {
                nowOffset = performance.timing.navigationStart;
            }
            // @ts-ignore
            window.performance.timeOrigin = nowOffset;
        }
        if (!('now' in window.performance)) {
            // @ts-ignore
            window.performance.now = function now() {
                return Date.now() - window.performance.timeOrigin;
            };
        }
    })();

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    var PrecisionPlayerSettings = /** @class */ (function () {
        function PrecisionPlayerSettings(settings) {
            this.downloadAudio = true;
            if (settings !== null && settings !== undefined && settings !== {}) {
                this.downloadAudio = (settings.downloadAudio !== undefined) ? settings.downloadAudio : this.downloadAudio;
            }
        }
        return PrecisionPlayerSettings;
    }());

    /**
     * WavFormat Handler. It reads information from raw data of a wave file.
     * http://soundfile.sapp.org/doc/WaveFormat/
     */
    var WavFormat = /** @class */ (function () {
        function WavFormat() {
        }
        /***
         * checks if it is a valid wave file
         * @param buffer the audio file's array buffer
         */
        WavFormat.prototype.isValid = function (buffer) {
            try {
                var bufferPart = buffer.slice(0, 4);
                var test1 = String.fromCharCode.apply(null, new Uint8Array(bufferPart));
                bufferPart = buffer.slice(8, 12);
                var test2 = String.fromCharCode.apply(null, new Uint8Array(bufferPart));
                test1 = test1.slice(0, 4);
                test2 = test2.slice(0, 4);
                var byteCheck = new Uint8Array(buffer.slice(20, 21))[0] === 1;
                return (byteCheck && '' + test1 + '' === 'RIFF' && test2 === 'WAVE');
            }
            catch (e) {
                return false;
            }
        };
        WavFormat.prototype.getChannels = function (buffer) {
            var bufferPart = buffer.slice(22, 24);
            var bufferView = new Uint8Array(bufferPart);
            return bufferView[0];
        };
        WavFormat.prototype.getBitsPerSample = function (buffer) {
            var bufferPart = buffer.slice(34, 36);
            var bufferView = new Uint8Array(bufferPart);
            return bufferView[0];
        };
        WavFormat.prototype.getDuration = function (buffer) {
            var sampleRate = this.getSampleRate(buffer);
            var samples = this.getDurationAsSamples(buffer);
            return samples / sampleRate;
        };
        WavFormat.prototype.getDurationAsSamples = function (buffer) {
            var dataStart = this.getDataStart(buffer);
            var bitsPerSample = this.getBitsPerSample(buffer);
            var channels = this.getChannels(buffer);
            return this.getDataChunkSize(buffer, dataStart) / (channels * bitsPerSample) * 8;
        };
        WavFormat.prototype.getDataChunkSize = function (buffer, dataStart) {
            var bufferPart = buffer.slice(dataStart, dataStart + 4);
            var bufferView = new Uint32Array(bufferPart);
            return bufferView[0];
        };
        WavFormat.prototype.getSampleRate = function (buffer) {
            var bufferPart = buffer.slice(24, 28);
            var bufferView = new Uint32Array(bufferPart);
            return bufferView[0];
        };
        WavFormat.prototype.getDataStart = function (buffer) {
            // search "data" info
            var result = -1;
            var test = '';
            while (test !== 'data') {
                result++;
                if (result + 4 < buffer.byteLength) {
                    var part = String.fromCharCode.apply(null, new Uint8Array(buffer.slice(result, result + 4)));
                    test = '' + part.slice(0, 4) + '';
                }
                else {
                    break;
                }
            }
            result += 4;
            if (result >= buffer.byteLength) {
                return -1;
            }
            else {
                return result;
            }
        };
        return WavFormat;
    }());

    /**
     * This is a custom event implementation, that focuses on processing callbacks
     * as soon as possible.
     */
    var PPEvent = /** @class */ (function () {
        function PPEvent() {
            var _this = this;
            /**
             * adds a callback to the list of callbacks that should be run when event dispatches.
             * @param callback
             */
            this.registerCallback = function (callback) {
                var id = ++PPEvent.callbackIDCounter;
                _this.callbacks["callback_" + id] = {
                    id: id, callback: callback
                };
                return id;
            };
            /**
             * dispatches an event.
             * @param eventArgs
             */
            this.dispatchEvent = function (eventArgs) {
                var callbacks = Object.entries(_this.callbacks);
                if (callbacks.length > 0) {
                    _this.runCallbacks(callbacks[0][1].id, eventArgs);
                }
            };
            /***
             * adds a event listener.
             * @param callback
             */
            this.addEventListener = function (callback) {
                return _this.registerCallback(callback);
            };
            /**
             * removes a callback from the list of callbacks.
             * @param id
             */
            this.removeCallback = function (id) {
                if (_this.callbacks.hasOwnProperty("callback_" + id)) {
                    delete _this.callbacks["callback_" + id];
                }
            };
            /**
             * removes all callbacks from the list.
             */
            this.unlistenAll = function () {
                _this.callbacks = {};
            };
            this.callbacks = {};
        }
        /**
         * runs the list of callbacks.
         * @param id
         * @param eventArgs
         * @private
         */
        PPEvent.prototype.runCallbacks = function (id, eventArgs) {
            var callbacks = Object.entries(this.callbacks);
            var index = callbacks.findIndex(function (pair) { return pair[1].id === id; });
            if (this.callbacks.hasOwnProperty("callback_" + id) && this.callbacks["callback_" + id] !== undefined) {
                this.callbacks["callback_" + id].callback(eventArgs);
                var nextIndex = (index < callbacks.length - 1) ? index + 1 : -1;
                if (nextIndex > -1) {
                    var nextID = callbacks[nextIndex][1].id;
                    this.runCallbacks(nextID, eventArgs);
                }
            }
        };
        /**
         * runs a callback as soon as checkFunction returns true
         * @param checkFunction
         * @param callback
         */
        PPEvent.prototype.afterNextValidEvent = function (checkFunction, callback) {
            var _this = this;
            if (callback === void 0) { callback = function (eventCallback) {
            }; }
            var id = 0;
            var handler = function (event) {
                if (checkFunction(event)) {
                    _this.removeCallback(id);
                    callback(event);
                }
            };
            id = this.addEventListener(handler);
            return id;
        };
        PPEvent.callbackIDCounter = 0;
        return PPEvent;
    }());

    /***
     * returns a HighResolutionTimestamp if supported
     */
    function getHighResTimestamp() {
        // if the polyfill is active the timestamp could be just a calculation of Date.now()
        return performance.timeOrigin + performance.now();
    }
    /***
     * rounds a HighResolutionTimestamp if supported
     */
    function roundHighResTimestamp(timestamp) {
        // if the polyfill is active the timestamp could be just a calculation of Date.now()
        return Math.ceil(timestamp);
    }
    /**
     * retrieves the current timestamps either from the event or from Date.now().
     * timestamps from events could be a higher precision than that from Date.now().
     * @param event
     */
    function getTimeStampByEvent(event) {
        var now = Date.now();
        var highResNow = getHighResTimestamp();
        var highResolutionTimestamp = (event && event.timeStamp !== undefined && event.timeStamp !== null) ?
            performance.timeOrigin + event.timeStamp : highResNow;
        return {
            highResolution: highResolutionTimestamp,
            nowMethod: now
        };
    }

    /**
     * Parent class for audio mechanisms. Currently supported: Web Audio API and HTML 5 Audio.
     */
    var AudioMechanism = /** @class */ (function () {
        function AudioMechanism(type, settings) {
            this._playbackRate = 1;
            this._volume = 1;
            this._audioInformation = {
                file: {
                    fullName: ''
                },
                audioMechanism: {
                    duration: 0,
                    sampleRate: 0,
                    samples: 0
                },
                original: {
                    duration: 0,
                    sampleRate: 0,
                    samples: 0
                }
            };
            this.playStarted = 0;
            this.playbackRatePufferByEvent = 0;
            this.lastPlaybackRateChangedByEvent = {
                timestamp: 0,
                playbackRate: 0
            };
            this.afterEndedCallback = function () {
            };
            // the version of the audio mechanism
            this.version = '';
            this._currentTimeByEvent = 0;
            this._type = type;
            this.onError = new PPEvent();
            this._onFileProcessing = new PPEvent();
            this.statuschange = new PPEvent();
            this._settings = new PrecisionPlayerSettings();
            if (settings !== undefined && settings !== null) {
                this._settings = settings;
            }
        }
        Object.defineProperty(AudioMechanism.prototype, "playDuration", {
            get: function () {
                return this._playDuration;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioMechanism.prototype, "audioInformation", {
            /**
             * Returns information about the currently used wave file.
             */
            get: function () {
                return this._audioInformation;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioMechanism.prototype, "onFileProcessing", {
            /**
             * Event that dispatches when a file is being processed.
             */
            get: function () {
                return this._onFileProcessing;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioMechanism.prototype, "settings", {
            /**
             * Returns the settings.
             */
            get: function () {
                return this._settings;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioMechanism.prototype, "type", {
            /**
             * Returns the type of audiomechanism being used.
             */
            get: function () {
                return this._type;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioMechanism.prototype, "volume", {
            /**
             * Returns the volume
             */
            get: function () {
                return this._volume;
            },
            /**
             * Sets the volume
             */
            set: function (value) {
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioMechanism.prototype, "playbackRate", {
            /**
             * Returns the playback rate
             */
            get: function () {
                return this._playbackRate;
            },
            /**
             * Sets the playback rate
             */
            set: function (value) {
            },
            enumerable: false,
            configurable: true
        });
        /**
         * initialize the audio mechanism. If downloadAudio is set to true, the audio file will be downloaded
         * automatically.
         * @param audioFile an URL string or File object
         */
        AudioMechanism.prototype.initialize = function (audioFile) {
            if (this._status === exports.AudioMechanismStatus.PLAYING) {
                // abort playing
                this.stop();
            }
            this._playDuration = {
                eventCalculation: 0,
                audioMechanism: 0
            };
        };
        /**
         * stops the audio playback.
         * @param callback function run right after audio stopped
         */
        AudioMechanism.prototype.stop = function (callback) {
            this._status = exports.AudioMechanismStatus.STOPPED;
        };
        /**
         * Handler for the statuschanged event as soon as the audio starts playing.
         * @param record timing log
         * @protected
         */
        AudioMechanism.prototype.onPlay = function (record) {
            this.playStarted = record.eventTriggered.nowMethod;
            this.playbackRatePufferByEvent = 0;
            this.lastPlaybackRateChangedByEvent = {
                timestamp: record.eventTriggered.nowMethod,
                playbackRate: this._playbackRate
            };
            if (this._status === exports.AudioMechanismStatus.ENDED || this._status === exports.AudioMechanismStatus.STOPPED) {
                this._playDuration = {
                    audioMechanism: 0,
                    eventCalculation: 0
                };
                record = {
                    eventTriggered: record.eventTriggered,
                    playbackDuration: {
                        audioMechanism: 0,
                        eventCalculation: 0
                    }
                };
            }
            else {
                record.playbackDuration.eventCalculation = this._playDuration.eventCalculation;
            }
            this.changeStatus(exports.AudioMechanismStatus.PLAYING, record);
        };
        /**
         * Handler that is called as soon as the audio is paused.
         * @param record
         * @protected
         */
        AudioMechanism.prototype.onPause = function (record) {
            this._playDuration = {
                eventCalculation: this.calculatePlaybackDurationByEvent(record.eventTriggered.highResolution),
                audioMechanism: record.playbackDuration.audioMechanism
            };
            record.playbackDuration = {
                audioMechanism: this._playDuration.audioMechanism,
                eventCalculation: this._playDuration.eventCalculation
            };
            this.changeStatus(exports.AudioMechanismStatus.PAUSED, record);
        };
        /**
         * Handler that is called as soon as the audio playback stops
         * @param record
         * @protected
         */
        AudioMechanism.prototype.onStop = function (record) {
            record.playbackDuration.eventCalculation = this.calculatePlaybackDurationByEvent(record.eventTriggered.highResolution);
            this.changeStatus(exports.AudioMechanismStatus.STOPPED, record);
        };
        /**
         * Handler that is called as soon as the audio playback arrived at the end of the audio signal.
         * @param record
         * @protected
         */
        AudioMechanism.prototype.onEnd = function (record) {
            // no pause before, e.g. in WebAudio API
            this._playDuration = {
                eventCalculation: this.calculatePlaybackDurationByEvent(record.eventTriggered.highResolution),
                audioMechanism: record.playbackDuration.audioMechanism
            };
            record.playbackDuration.eventCalculation = this._playDuration.eventCalculation;
            this.changeStatus(exports.AudioMechanismStatus.ENDED, record);
        };
        /**
         * Handler that is called as soon as the audio is prepared and ready for playback.
         * @param record
         * @protected
         */
        AudioMechanism.prototype.onReady = function (record) {
            record.playbackDuration.eventCalculation = 0;
            this.changeStatus(exports.AudioMechanismStatus.READY, record);
        };
        /**
         * Changes the current status to a new one and dispatches the statuschange event.
         * @param status
         * @param record
         * @param message
         * @protected
         */
        AudioMechanism.prototype.changeStatus = function (status, record, message) {
            this._status = status;
            var eventArgs = {
                status: this._status,
                message: message,
                timingRecord: record
            };
            if (!message) {
                delete eventArgs.message;
            }
            this.statuschange.dispatchEvent(eventArgs);
        };
        /**
         * Completely destroys the PrecisionPlayer. Call this method when you don't need the PrecisionPlayer anymore.
         */
        AudioMechanism.prototype.destroy = function () {
            this.stop();
            this.statuschange.unlistenAll();
            this._onFileProcessing.unlistenAll();
            this.onError.unlistenAll();
            this.changeStatus(exports.AudioMechanismStatus.DESTROYED, {
                eventTriggered: getTimeStampByEvent(null),
                playbackDuration: this._playDuration
            });
        };
        /**
         * Downloads the audio file from URL.
         * @param audioFileURL the URL to the audio file
         * @param onSuccess function called as soon as download finishes
         * @param onError function called as soon as an error occured
         * @param onProgress function called while the download is in process
         * @private
         */
        AudioMechanism.prototype.downloadAudioFile = function (audioFileURL, onSuccess, onError, onProgress) {
            var _this = this;
            fetch(audioFileURL, {
                method: "GET",
                headers: this._settings.headers
            }).then(function (response) {
                response.arrayBuffer().then(function (arrayBuffer) {
                    onSuccess({
                        arrayBuffer: arrayBuffer,
                        name: _this.extractNameFromURL(audioFileURL)
                    });
                }).catch(function (error) {
                    onError(error === null || error === void 0 ? void 0 : error.message);
                });
            }).catch(function (error) {
                onError(error === null || error === void 0 ? void 0 : error.message);
            });
        };
        /**
         * Loads the audio file regardless it's an URL or a File object.
         * @param audioFile URL string or File object
         * @param onSuccess success callback
         * @param onError error callback
         * @param onProgress progress callback
         */
        AudioMechanism.prototype.loadAudioFile = function (audioFile, onSuccess, onError, onProgress) {
            var _this = this;
            if (typeof audioFile === 'string') {
                // is URL
                var fileName_1 = this.extractNameFromURL(audioFile);
                if (!fileName_1) {
                    onError('Can\'t extract file name from URL. Is it a valid URL?');
                    return;
                }
                if (this._settings.downloadAudio) {
                    this.downloadAudioFile(audioFile, function (result) {
                        var wavFormat = new WavFormat();
                        var originalDuration = -1;
                        if (wavFormat.isValid(result.arrayBuffer)) {
                            originalDuration = wavFormat.getDuration(result.arrayBuffer);
                            _this._audioInformation.original.duration = originalDuration;
                            _this._audioInformation.original.sampleRate = wavFormat.getSampleRate(result.arrayBuffer);
                            _this._audioInformation.original.samples = wavFormat.getDurationAsSamples(result.arrayBuffer);
                        }
                        _this._audioInformation.file.fullName = fileName_1;
                        onSuccess({
                            url: null,
                            arrayBuffer: result.arrayBuffer,
                            originalDuration: originalDuration,
                            name: result.name
                        });
                    }, onError, onProgress);
                }
                else {
                    onSuccess({
                        url: audioFile,
                        arrayBuffer: null,
                        originalDuration: -1,
                        name: fileName_1
                    });
                }
            }
            else {
                // is file
                var reader_1 = new FileReader();
                var successFullRead_1 = true;
                reader_1.onloadend = function () {
                    if (successFullRead_1) {
                        var arrayBuffer = reader_1.result;
                        var fileName = audioFile.name;
                        var wavFormat = new WavFormat();
                        var originalDuration = -1;
                        if (wavFormat.isValid(arrayBuffer)) {
                            originalDuration = wavFormat.getDuration(arrayBuffer);
                            _this._audioInformation.original.duration = originalDuration;
                            _this._audioInformation.original.sampleRate = wavFormat.getSampleRate(arrayBuffer);
                            _this._audioInformation.original.samples = wavFormat.getDurationAsSamples(arrayBuffer);
                        }
                        _this._audioInformation.file.fullName = fileName;
                        onSuccess({
                            url: null,
                            arrayBuffer: reader_1.result,
                            originalDuration: originalDuration,
                            name: fileName
                        });
                    }
                };
                reader_1.onerror = function (e) {
                    successFullRead_1 = false;
                    onError('Can\'t read file blob');
                };
                reader_1.onprogress = onProgress;
                reader_1.readAsArrayBuffer(audioFile);
            }
        };
        /**
         * Extractes the file name from a URL.
         * @param url the URL as string
         * @private
         */
        AudioMechanism.prototype.extractNameFromURL = function (url) {
            var domainRegex = /^(?:blob:\/\/)?(?:https?:\/\/)?[^\/]+/g;
            var regex = new RegExp(domainRegex);
            if (regex.exec(url).length > 0) {
                // remove domain
                url = url.replace(domainRegex, '');
                var filename = url.substr(url.lastIndexOf('/') + 1);
                return filename;
            }
            return null;
        };
        /**
         * Calculates the playback duration from a timestamp when an audio event was triggered.
         * @param eventTriggered
         * @protected
         */
        AudioMechanism.prototype.calculatePlaybackDurationByEvent = function (eventTriggered) {
            return this.playDuration.eventCalculation + this.playbackRatePufferByEvent +
                ((eventTriggered - this.lastPlaybackRateChangedByEvent.timestamp) * this.lastPlaybackRateChangedByEvent.playbackRate);
        };
        return AudioMechanism;
    }());
    exports.AudioMechanismType = void 0;
    (function (AudioMechanismType) {
        AudioMechanismType["WEBAUDIO"] = "WebAudio";
        AudioMechanismType["HTMLAUDIO"] = "HTMLAudio";
    })(exports.AudioMechanismType || (exports.AudioMechanismType = {}));
    /**
     * <b>INITIALIZED:</b> Status right after object initialized<br/>
     * <b>READY:</b> Status after audio was loaded<br/>
     * <b>RESUMING</b> AudioContext needs to be resumed
     * <b>PLAYING:</b> Playback is running<br/>
     * <b>PAUSED:</b> Audio was paused<br/>
     * <b>STOPPED:</b> Audio stopped due action<br/>
     * <b>ENDED:</b> Playback reached end of audio track<br/>
     * <b>FAILED:</b> An Error occurred<br/>
     * <b>DESTROYED:</b> Player was destroyed<br/>
     */
    exports.AudioMechanismStatus = void 0;
    (function (AudioMechanismStatus) {
        AudioMechanismStatus["INITIALIZED"] = "INITIALIZED";
        AudioMechanismStatus["READY"] = "READY";
        AudioMechanismStatus["RESUMING"] = "RESUMING";
        AudioMechanismStatus["PLAYING"] = "PLAYING";
        AudioMechanismStatus["PAUSED"] = "PAUSED";
        AudioMechanismStatus["STOPPED"] = "STOPPED";
        AudioMechanismStatus["ENDED"] = "ENDED";
        AudioMechanismStatus["FAILED"] = "FAILED";
        AudioMechanismStatus["DESTROYED"] = "DESTROYED";
    })(exports.AudioMechanismStatus || (exports.AudioMechanismStatus = {}));

    var HtmlAudio = /** @class */ (function (_super) {
        __extends(HtmlAudio, _super);
        function HtmlAudio(settings) {
            var _this = _super.call(this, exports.AudioMechanismType.HTMLAUDIO, settings) || this;
            _this.readyToStart = false;
            _this.version = '0.1.0';
            /**
             * the central handler for all audio events.
             * @param $event
             */
            _this.audioEventHandler = function ($event) {
                var eventTimestamp = getTimeStampByEvent($event);
                var record = {
                    eventTriggered: eventTimestamp,
                    playbackDuration: {
                        audioMechanism: _this._audioElement.currentTime,
                        eventCalculation: -1
                    }
                };
                switch ($event.type) {
                    case ('canplay'):
                        if (!_this.readyToStart) {
                            _this.onReady(record);
                            _this.readyToStart = true;
                        }
                        break;
                    case ('playing'):
                        _this.onPlay(record);
                        break;
                    case ('pause'):
                        if (_this._status === exports.AudioMechanismStatus.PLAYING) {
                            _this.onEndHandler(record);
                        }
                        else if (_this._status === exports.AudioMechanismStatus.PAUSED) {
                            _this.onPause(record);
                        }
                        else if (_this._status === exports.AudioMechanismStatus.STOPPED) {
                            _this._audioElement.currentTime = 0;
                            _this.onStop(record);
                        }
                        break;
                }
            };
            /**
             * handler for the ended event after the audio file was still playing.
             * @param record
             */
            _this.onEndHandler = function (record) {
                _this.onEnd(record);
                _this.onEnded.dispatchEvent();
            };
            /**
             * Handler for the onloadedmetadata event.
             */
            _this.onLoadedMetaData = function () {
                _this._audioInformation = __assign(__assign({}, _this._audioInformation), { audioMechanism: {
                        duration: _this._audioElement.duration,
                        sampleRate: -1,
                        samples: -1
                    } });
            };
            /**
             * destroy all data related to this instance of the HTML Audio mechanism.
             */
            _this.destroy = function () {
                _super.prototype.destroy.call(_this);
                _this.removeEventListeners();
                _this.onEnded.unlistenAll();
                _this._status = exports.AudioMechanismStatus.INITIALIZED;
            };
            return _this;
        }
        Object.defineProperty(HtmlAudio.prototype, "audioElement", {
            get: function () {
                return this._audioElement;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(HtmlAudio.prototype, "currentTime", {
            get: function () {
                if (this.audioElement) {
                    return this.audioElement.currentTime;
                }
                return 0;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(HtmlAudio.prototype, "playbackRate", {
            set: function (value) {
                this.onPlaybackChange(value);
                this._playbackRate = value;
                if (this.audioElement) {
                    this.audioElement.playbackRate = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(HtmlAudio.prototype, "volume", {
            set: function (value) {
                this._volume = value;
                if (this.audioElement) {
                    this.audioElement.volume = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        HtmlAudio.prototype.initialize = function (audioFile) {
            var _this = this;
            _super.prototype.initialize.call(this, audioFile);
            this.readyToStart = false;
            this.changeStatus(exports.AudioMechanismStatus.INITIALIZED, {
                eventTriggered: getTimeStampByEvent(null),
                playbackDuration: {
                    audioMechanism: this.currentTime,
                    eventCalculation: -1
                }
            });
            this.onEnded = new PPEvent();
            this._audioElement = new Audio();
            this._audioElement.preload = "metadata";
            this._audioElement.playbackRate = this._playbackRate;
            this._audioElement.volume = this._volume;
            this._audioElement.defaultMuted = false;
            this.addAudioEventListeners();
            this.loadAudioFile(audioFile, function (audioLoadEvent) {
                if (audioLoadEvent.url !== null) {
                    // stream by URL
                    _this._audioElement.src = audioLoadEvent.url;
                }
                else {
                    // array buffer
                    if (typeof audioFile === 'string' && audioFile.indexOf('blob:http://') === 0) {
                        _this._audioElement.src = audioFile;
                    }
                    else {
                        _this._audioElement.src = URL.createObjectURL(new File([audioLoadEvent.arrayBuffer], audioLoadEvent.name, {
                            type: 'audio/x-wav'
                        }));
                    }
                }
            }, function (error) {
                console.error(error);
                _this.changeStatus(exports.AudioMechanismStatus.FAILED, {
                    eventTriggered: getTimeStampByEvent(null),
                    playbackDuration: {
                        audioMechanism: _this.currentTime,
                        eventCalculation: -1
                    }
                }, error);
            }, function (event) {
                _this.onFileProcessing.dispatchEvent(event.loaded / event.total);
            });
        };
        HtmlAudio.prototype.play = function (start, callback) {
            if (callback === void 0) { callback = function () {
            }; }
            this._audioElement.currentTime = start !== null && start !== void 0 ? start : this.currentTime;
            this._audioElement.play().catch(function (e) {
                console.error(e);
            });
            this.afterEndedCallback = callback;
        };
        HtmlAudio.prototype.pause = function (callback) {
            if (callback === void 0) { callback = function () {
            }; }
            this._status = exports.AudioMechanismStatus.PAUSED;
            this._audioElement.pause();
            this.afterEndedCallback = callback;
        };
        HtmlAudio.prototype.stop = function (callback) {
            if (callback === void 0) { callback = function () {
            }; }
            _super.prototype.stop.call(this);
            this._audioElement.pause();
            this.afterEndedCallback = callback;
        };
        /**
         * adds handlers for each audio event.
         */
        HtmlAudio.prototype.addAudioEventListeners = function () {
            this._audioElement.addEventListener('abort', this.audioEventHandler);
            this._audioElement.addEventListener('canplay', this.audioEventHandler);
            this._audioElement.addEventListener('canplaythrough', this.audioEventHandler);
            this._audioElement.addEventListener('durationchange', this.audioEventHandler);
            this._audioElement.addEventListener('emptied', this.audioEventHandler);
            this._audioElement.addEventListener('ended', this.audioEventHandler);
            this._audioElement.addEventListener('error', this.audioEventHandler);
            this._audioElement.addEventListener('loadeddata', this.audioEventHandler);
            this._audioElement.addEventListener('loadedmetadata', this.onLoadedMetaData);
            this._audioElement.addEventListener('loadstart', this.onLoadedMetaData);
            this._audioElement.addEventListener('pause', this.audioEventHandler);
            this._audioElement.addEventListener('play', this.audioEventHandler);
            this._audioElement.addEventListener('playing', this.audioEventHandler);
            this._audioElement.addEventListener('progress', this.audioEventHandler);
            this._audioElement.addEventListener('ratechange', this.audioEventHandler);
            this._audioElement.addEventListener('resize', this.audioEventHandler);
            this._audioElement.addEventListener('seeked', this.audioEventHandler);
            this._audioElement.addEventListener('seeking', this.audioEventHandler);
            this._audioElement.addEventListener('stalled', this.audioEventHandler);
            this._audioElement.addEventListener('suspend', this.audioEventHandler);
            this._audioElement.addEventListener('timeupdate', this.audioEventHandler);
            this._audioElement.addEventListener('volumechange', this.audioEventHandler);
            this._audioElement.addEventListener('waiting', this.audioEventHandler);
        };
        /**
         * removes eventhandlers for each audio event. g
         */
        HtmlAudio.prototype.removeEventListeners = function () {
            this._audioElement.removeEventListener('abort', this.audioEventHandler);
            this._audioElement.removeEventListener('canplay', this.audioEventHandler);
            this._audioElement.removeEventListener('canplaythrough', this.audioEventHandler);
            this._audioElement.removeEventListener('durationchange', this.audioEventHandler);
            this._audioElement.removeEventListener('emptied', this.audioEventHandler);
            this._audioElement.removeEventListener('ended', this.audioEventHandler);
            this._audioElement.removeEventListener('error', this.audioEventHandler);
            this._audioElement.removeEventListener('loadeddata', this.audioEventHandler);
            this._audioElement.removeEventListener('loadedmetadata', this.onLoadedMetaData);
            this._audioElement.removeEventListener('loadstart', this.onLoadedMetaData);
            this._audioElement.removeEventListener('pause', this.audioEventHandler);
            this._audioElement.removeEventListener('play', this.audioEventHandler);
            this._audioElement.removeEventListener('playing', this.audioEventHandler);
            this._audioElement.removeEventListener('progress', this.audioEventHandler);
            this._audioElement.removeEventListener('ratechange', this.audioEventHandler);
            this._audioElement.removeEventListener('resize', this.audioEventHandler);
            this._audioElement.removeEventListener('seeked', this.audioEventHandler);
            this._audioElement.removeEventListener('seeking', this.audioEventHandler);
            this._audioElement.removeEventListener('stalled', this.audioEventHandler);
            this._audioElement.removeEventListener('suspend', this.audioEventHandler);
            this._audioElement.removeEventListener('timeupdate', this.audioEventHandler);
            this._audioElement.removeEventListener('volumechange', this.audioEventHandler);
            this._audioElement.removeEventListener('waiting', this.audioEventHandler);
        };
        HtmlAudio.prototype.onPlaybackChange = function (newValue) {
            if (this._status === exports.AudioMechanismStatus.PLAYING) {
                var now = getHighResTimestamp();
                this.playbackRatePufferByEvent += (now - this.lastPlaybackRateChangedByEvent.timestamp) * this.lastPlaybackRateChangedByEvent.playbackRate;
                this.lastPlaybackRateChangedByEvent = {
                    timestamp: now,
                    playbackRate: newValue
                };
            }
        };
        return HtmlAudio;
    }(AudioMechanism));

    var WebAudio = /** @class */ (function (_super) {
        __extends(WebAudio, _super);
        function WebAudio(settings) {
            var _this = _super.call(this, exports.AudioMechanismType.WEBAUDIO, settings) || this;
            _this.version = '0.1.0';
            _this._currentTime = 0;
            _this.startPosition = 0;
            _this.lastPlaybackRateChange = {
                timestamp: 0,
                playbackRate: 0
            };
            _this.playbackRateBuffer = 0;
            _this.audioLoaded = false;
            _this.requestedStatus = null;
            /**
             * decodes the audio buffer.
             * @param arrayBuffer
             * @param callback
             * @param errorCallback
             */
            _this.decodeAudioBuffer = function (arrayBuffer, callback, errorCallback) {
                _this.audioContext.decodeAudioData(arrayBuffer, callback, errorCallback);
            };
            // force download
            _this._settings.downloadAudio = true;
            return _this;
        }
        Object.defineProperty(WebAudio.prototype, "currentTime", {
            get: function () {
                if (this._status === exports.AudioMechanismStatus.PLAYING) {
                    // calculate current time according to audio context's current time
                    // for more precision
                    return this.getCurrentPlayPosition();
                }
                // return the currentTime that was set before
                return this._currentTime;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WebAudio.prototype, "playbackRate", {
            set: function (value) {
                this.onPlaybackRateChange(value);
                this._playbackRate = value;
                if (this.audioBufferSourceNode) {
                    this.audioBufferSourceNode.playbackRate.value = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WebAudio.prototype, "volume", {
            set: function (value) {
                this._volume = value;
                if (this.gainNode) {
                    this.gainNode.gain.value = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        WebAudio.prototype.initialize = function (audioFile) {
            var _this = this;
            _super.prototype.initialize.call(this, audioFile);
            this.initializeSettings();
            this.changeStatus(exports.AudioMechanismStatus.INITIALIZED, {
                eventTriggered: getTimeStampByEvent(null),
                playbackDuration: {
                    audioMechanism: this.currentTime,
                    eventCalculation: -1
                }
            });
            var decode = function (arrayBuffer) {
                _this.decodeAudioBuffer(arrayBuffer, function (audioBuffer) {
                    _this.audioLoaded = true;
                    _this.audioBuffer = audioBuffer;
                    _this._audioInformation = __assign(__assign({}, _this._audioInformation), { audioMechanism: {
                            duration: audioBuffer.duration,
                            sampleRate: audioBuffer.sampleRate,
                            samples: audioBuffer.length
                        } });
                    _this.onReady({
                        eventTriggered: getTimeStampByEvent(null),
                        playbackDuration: {
                            audioMechanism: 0,
                            eventCalculation: 0
                        }
                    });
                }, function (exception) {
                    _this.onError.dispatchEvent({
                        message: 'Could not decode audio file',
                        error: exception,
                        timestamp: getTimeStampByEvent(null).nowMethod
                    });
                    var eventTimestamp = getTimeStampByEvent(null);
                    _this.changeStatus(exports.AudioMechanismStatus.FAILED, {
                        eventTriggered: eventTimestamp,
                        playbackDuration: {
                            audioMechanism: _this.currentTime,
                            eventCalculation: -1
                        }
                    }, 'Can\'t decode audio file.');
                });
            };
            this.loadAudioFile(audioFile, function (audioLoadEvent) {
                if (audioLoadEvent.url !== null) {
                    // url
                    // stream by URL
                    console.error("streaming not supported");
                }
                else {
                    // array buffer
                    decode(audioLoadEvent.arrayBuffer);
                }
            }, function (error) {
                _this.changeStatus(exports.AudioMechanismStatus.FAILED, {
                    eventTriggered: getTimeStampByEvent(null),
                    playbackDuration: {
                        audioMechanism: _this.currentTime,
                        eventCalculation: -1
                    }
                }, error);
            }, function (event) {
                _this.onFileProcessing.dispatchEvent(event.loaded / event.total);
            });
        };
        WebAudio.prototype.play = function (start, callback) {
            var _this = this;
            if (callback === void 0) { callback = function () {
            }; }
            this.requestedStatus = null;
            if (this._status !== exports.AudioMechanismStatus.INITIALIZED) {
                if (this._status === exports.AudioMechanismStatus.ENDED) {
                    // start from beginning
                    this._currentTime = 0;
                }
                if (this._status === exports.AudioMechanismStatus.PLAYING) {
                    // already playing, pause and retry
                    this.pause(function () {
                        _this.play(start, callback);
                    });
                    return;
                }
                var tryResume = function () {
                    var eventTimestamp = getTimeStampByEvent(null);
                    _this.changeStatus(exports.AudioMechanismStatus.RESUMING, {
                        playbackDuration: {
                            audioMechanism: _this.currentTime,
                            eventCalculation: _this.playDuration.eventCalculation
                        },
                        eventTriggered: eventTimestamp
                    });
                    var resumed = false;
                    var timer = -1;
                    _this.audioContext.resume().then(function () {
                        var timestamp = getTimeStampByEvent(null);
                        resumed = true;
                        if (timer > -1) {
                            window.clearTimeout(timer);
                        }
                        _this.onPlay({
                            playbackDuration: {
                                audioMechanism: _this.currentTime,
                                eventCalculation: -1
                            },
                            eventTriggered: timestamp
                        });
                    }).catch(function (error) {
                        console.error(error);
                    });
                    timer = window.setTimeout(function () {
                        if (!resumed) {
                            console.error("Resuming audio context failed.");
                            _this.changeStatus(exports.AudioMechanismStatus.FAILED, {
                                playbackDuration: {
                                    audioMechanism: _this.currentTime,
                                    eventCalculation: -1
                                },
                                eventTriggered: getTimeStampByEvent(null)
                            }, 'Resuming audio context failed.');
                        }
                    }, 50);
                };
                if (this.audioContext.state === 'suspended' && this._status !== exports.AudioMechanismStatus.READY) {
                    tryResume();
                }
                else {
                    this.audioBufferSourceNode = this.audioContext.createBufferSource();
                    this.audioBufferSourceNode.playbackRate.value = this._playbackRate;
                    this.audioBufferSourceNode.buffer = this.audioBuffer;
                    this.gainNode = this.audioContext.createGain();
                    this.gainNode.gain.value = this._volume;
                    this.audioBufferSourceNode.connect(this.gainNode).connect(this.audioContext.destination);
                    this.audioBufferSourceNode.addEventListener('ended', function (event) {
                        _this.updatePlayPosition();
                        _this.onEnd({
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
                    if (this._status !== exports.AudioMechanismStatus.DESTROYED) {
                        this.audioBufferSourceNode.start(0, this.startPosition);
                        var timestamp = getTimeStampByEvent(null);
                        if (this.audioContext.state === 'running') {
                            this.onPlay({
                                playbackDuration: {
                                    audioMechanism: this._currentTime,
                                    eventCalculation: -1
                                },
                                eventTriggered: timestamp
                            });
                        }
                        else {
                            if (this.audioContext.state === 'suspended') {
                                tryResume();
                            }
                            else {
                                this.changeStatus(exports.AudioMechanismStatus.FAILED, {
                                    playbackDuration: {
                                        audioMechanism: this._currentTime,
                                        eventCalculation: -1
                                    },
                                    eventTriggered: timestamp
                                }, "Can't resume audio because the audiocontext has state " + this.audioContext.state + ".");
                            }
                        }
                    }
                }
            }
        };
        WebAudio.prototype.pause = function (callback) {
            if (callback === void 0) { callback = function () {
            }; }
            this.requestedStatus = exports.AudioMechanismStatus.PAUSED;
            this.afterEndedCallback = callback;
            this.updatePlayPosition();
            if (this.audioBufferSourceNode) {
                this.audioBufferSourceNode.stop(0);
            }
        };
        WebAudio.prototype.stop = function (callback) {
            if (callback === void 0) { callback = function () {
            }; }
            if (this.audioBufferSourceNode) {
                this.requestedStatus = exports.AudioMechanismStatus.STOPPED;
                this.afterEndedCallback = callback;
                this.updatePlayPosition();
                this.audioBufferSourceNode.stop(0);
            }
        };
        WebAudio.prototype.initAudioContext = function () {
            var audioContext = window.AudioContext // Default
                // @ts-ignore
                || window.webkitAudioContext // Safari and old versions of Chrome
                // @ts-ignore
                || window.mozAudioContext
                || false;
            if (audioContext) {
                this.audioContext = new audioContext();
            }
        };
        WebAudio.prototype.onEnd = function (record) {
            // onEnd occurs after and stopped fully ended!
            // => each time audio is stopped
            this.disconnectNodes();
            if (this._status === exports.AudioMechanismStatus.PLAYING && this.requestedStatus === null) {
                _super.prototype.onEnd.call(this, __assign(__assign({}, record), { playbackDuration: {
                        audioMechanism: this._currentTime,
                        eventCalculation: -1
                    } }));
            }
            else if (this.requestedStatus === exports.AudioMechanismStatus.STOPPED) {
                var previousCurrentTime = this._currentTime;
                this._currentTime = 0;
                this.playbackRateBuffer = 0;
                this.onStop(__assign(__assign({}, record), { playbackDuration: {
                        audioMechanism: previousCurrentTime,
                        eventCalculation: -1
                    } }));
            }
            else if (this.requestedStatus === exports.AudioMechanismStatus.PAUSED) {
                this.playbackRateBuffer = this._currentTime;
                this.onPause({
                    playbackDuration: {
                        audioMechanism: this._currentTime,
                        eventCalculation: -1
                    }, eventTriggered: record.eventTriggered
                });
            }
            this.afterEndedCallback();
            this.afterEndedCallback = function () {
            };
        };
        WebAudio.prototype.disconnectNodes = function () {
            if (this.audioBufferSourceNode && this.gainNode && this.audioContext && this._status !== 'INITIALIZED') {
                this.audioBufferSourceNode.disconnect(this.gainNode);
                this.gainNode.disconnect(this.audioContext.destination);
                this.audioBufferSourceNode = null;
                this.gainNode = null;
            }
        };
        /**
         * updates current time.
         * @private
         */
        WebAudio.prototype.updatePlayPosition = function () {
            this._currentTime = this.getCurrentPlayPosition();
        };
        WebAudio.prototype.initializeSettings = function () {
            this._currentTime = 0;
            this.startPosition = 0;
            this.audioLoaded = false;
            this.initAudioContext();
            this.audioBuffer = null;
        };
        WebAudio.prototype.onPlaybackRateChange = function (newValue) {
            if (this._status === exports.AudioMechanismStatus.PLAYING) {
                var now = getHighResTimestamp();
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
        };
        /***
         * calculate current play position. Position can be max duration.
         * @private
         */
        WebAudio.prototype.getCurrentPlayPosition = function () {
            if (this.audioContext && this.audioBuffer) {
                var currentTime = this.playbackRateBuffer + (this.audioContext.currentTime - this.lastPlaybackRateChange.timestamp) * this.lastPlaybackRateChange.playbackRate;
                return Math.min(currentTime, this.audioBuffer.duration);
            }
            return 0;
        };
        return WebAudio;
    }(AudioMechanism));

    var AudioPlayer = /** @class */ (function () {
        function AudioPlayer(type, settings, htmlContainer) {
            var _this = this;
            this._settings = new PrecisionPlayerSettings();
            this.timers = {
                statuschange: -1,
                playing: -1
            };
            /** creates an UI for the Precision player
             *
             */
            this.initializeUI = function () {
                if (_this._htmlContainer) {
                    _this._htmlContainer.innerHTML = '';
                    _this._htmlContainer.setAttribute('class', 'ppl-player');
                    var playButtonsDiv = document.createElement('div');
                    playButtonsDiv.setAttribute('class', 'ppl-control ppl-control-buttons');
                    // play button
                    var playButton_1 = document.createElement('button');
                    playButton_1.setAttribute('class', 'ppl-button ppl-play-button');
                    playButton_1.addEventListener('click', function () {
                        if (_this._status === 'PLAYING') {
                            _this.pause();
                            playButton_1.innerHTML = '▶';
                        }
                        else {
                            _this.play(undefined, function () {
                                playButton_1.innerHTML = '▶';
                            });
                            playButton_1.innerHTML = '||';
                        }
                    });
                    playButton_1.innerHTML = '▶';
                    playButtonsDiv.appendChild(playButton_1);
                    // stop button
                    var stopButton = document.createElement('button');
                    stopButton.setAttribute('class', 'ppl-button ppl-stop-button');
                    stopButton.addEventListener('click', function () {
                        _this.stop();
                        playButton_1.innerHTML = '▶';
                    });
                    stopButton.innerHTML = '◼';
                    playButtonsDiv.appendChild(stopButton);
                    _this._htmlContainer.appendChild(playButtonsDiv);
                    // playbackrate
                    var playbackRate = (_this.playbackRate) ? _this.playbackRate : 1;
                    var playBackRateDiv = document.createElement('div');
                    playBackRateDiv.setAttribute('class', 'ppl-control');
                    var playBackRateSliderLabel_1 = document.createElement('label');
                    playBackRateSliderLabel_1.setAttribute('class', 'ppl-rate-range-label');
                    playBackRateSliderLabel_1.setAttribute('id', 'ppl-rate-range-label-' + _this.id);
                    playBackRateSliderLabel_1.innerHTML = "Speed: " + playbackRate + "x";
                    playBackRateDiv.appendChild(playBackRateSliderLabel_1);
                    var playBackRateSlider_1 = document.createElement('input');
                    playBackRateSlider_1.setAttribute('class', 'ppl-button ppl-rate-range');
                    playBackRateSlider_1.setAttribute('type', 'range');
                    playBackRateSlider_1.setAttribute('min', '0.25');
                    playBackRateSlider_1.setAttribute('value', '1');
                    playBackRateSlider_1.setAttribute('max', '2');
                    playBackRateSlider_1.setAttribute('step', '0.05');
                    playBackRateSlider_1.addEventListener('change', function (event) {
                        _this.playbackRate = Number(playBackRateSlider_1.value);
                        playBackRateSliderLabel_1.innerHTML = "Speed: " + playBackRateSlider_1.value + "x";
                    });
                    playBackRateDiv.appendChild(playBackRateSlider_1);
                    _this._htmlContainer.appendChild(playBackRateDiv);
                    // volume
                    var volume = (_this.volume) ? _this.volume : 1;
                    var volumeDiv = document.createElement('div');
                    volumeDiv.setAttribute('class', 'ppl-control');
                    var volumeSliderLabel_1 = document.createElement('label');
                    volumeSliderLabel_1.setAttribute('class', 'ppl-volume-range-label');
                    volumeSliderLabel_1.setAttribute('id', 'ppl-volume-range-label-' + _this.id);
                    volumeSliderLabel_1.innerHTML = "Volume: " + volume * 100 + "%";
                    volumeDiv.appendChild(volumeSliderLabel_1);
                    var volumeSlider_1 = document.createElement('input');
                    volumeSlider_1.setAttribute('class', 'ppl-button ppl-volume-range');
                    volumeSlider_1.setAttribute('type', 'range');
                    volumeSlider_1.setAttribute('min', '0.25');
                    volumeSlider_1.setAttribute('max', '1');
                    volumeSlider_1.setAttribute('step', '0.05');
                    volumeSlider_1.setAttribute('value', '1');
                    volumeSlider_1.addEventListener('change', function (event) {
                        var value = Number(volumeSlider_1.value);
                        _this.volume = value;
                        volumeSliderLabel_1.innerHTML = "Volume: " + Math.round(value * 100) + "%";
                    });
                    volumeDiv.appendChild(volumeSlider_1);
                    _this._htmlContainer.appendChild(volumeDiv);
                    var clearFixDiv = document.createElement('div');
                    clearFixDiv.style.clear = 'both';
                    _this._htmlContainer.appendChild(clearFixDiv);
                    //progress bar
                    var progressBar = document.createElement('div');
                    progressBar.setAttribute('class', 'ppl-progress-bar');
                    var progressBarValue_1 = document.createElement('div');
                    progressBarValue_1.setAttribute('class', 'ppl-progress-bar-value');
                    progressBar.appendChild(progressBarValue_1);
                    _this._htmlContainer.appendChild(progressBar);
                    if (_this.timers.statuschange > -1) {
                        _this.onStatusChange.removeCallback(_this.timers.statuschange);
                    }
                    _this.timers.statuschange = _this.onStatusChange.addEventListener(function (pEvent) {
                        if (pEvent.status === 'PLAYING') {
                            var requestAnimation_1 = function (timestamp) {
                                progressBarValue_1.style.width = (_this._selectedMechanism.currentTime / _this._selectedMechanism.audioInformation.audioMechanism.duration * 100).toFixed(2) + '%';
                                if (_this._status === 'PLAYING') {
                                    window.requestAnimationFrame(requestAnimation_1);
                                }
                            };
                            window.requestAnimationFrame(requestAnimation_1);
                        }
                    });
                }
            };
            if (type === exports.AudioMechanismType.WEBAUDIO || type === exports.AudioMechanismType.HTMLAUDIO) {
                this._id = ++AudioPlayer.idCounter;
                this.type = type;
                if (settings !== null && settings !== undefined) {
                    this._settings = settings;
                }
                this._htmlContainer = htmlContainer;
                this._onStatusChange = new PPEvent();
                if (this.type === exports.AudioMechanismType.HTMLAUDIO) {
                    this._selectedMechanism = new HtmlAudio(this._settings);
                }
                else {
                    this._selectedMechanism = new WebAudio(this._settings);
                }
                // listen to status changes and redirect it to the public onStatusChaneg method
                this._selectedMechanism.statuschange.addEventListener(function (event) {
                    _this._status = event.status;
                    event.timingRecord.playbackDuration.eventCalculation =
                        (event.timingRecord.playbackDuration.eventCalculation > -1) ? event.timingRecord.playbackDuration.eventCalculation / 1000 : -1;
                    _this._onStatusChange.dispatchEvent(__assign({}, event));
                });
            }
            else {
                throw new Error('not supported audio mechanism. Choose \'WebAudio\' or \'HTMLAudio\'');
            }
        }
        Object.defineProperty(AudioPlayer.prototype, "status", {
            get: function () {
                return this._status;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioPlayer.prototype, "id", {
            get: function () {
                return this._id;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioPlayer.prototype, "htmlContainer", {
            get: function () {
                return this._htmlContainer;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioPlayer.prototype, "settings", {
            get: function () {
                return this._settings;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioPlayer.prototype, "selectedMechanism", {
            get: function () {
                return this._selectedMechanism;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioPlayer.prototype, "onStatusChange", {
            get: function () {
                return this._onStatusChange;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioPlayer.prototype, "audioInformation", {
            get: function () {
                return this._selectedMechanism.audioInformation;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioPlayer.prototype, "currentTime", {
            get: function () {
                return this._selectedMechanism.currentTime;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioPlayer.prototype, "volume", {
            get: function () {
                return this._selectedMechanism.volume;
            },
            set: function (value) {
                this._selectedMechanism.volume = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioPlayer.prototype, "playbackRate", {
            get: function () {
                return this._selectedMechanism.playbackRate;
            },
            set: function (value) {
                this._selectedMechanism.playbackRate = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioPlayer.prototype, "onFileProcessing", {
            get: function () {
                return this._selectedMechanism.onFileProcessing;
            },
            enumerable: false,
            configurable: true
        });
        /** initializes the precision player. Call this method AFTER the code that listen to status changes.
         * @param file
         */
        AudioPlayer.prototype.initialize = function (file) {
            this._selectedMechanism.initialize(file);
            this.initializeUI();
        };
        /**
         * starts the audio playback
         * @param start startposition in seconds. If undefined it starts from paused position
         * @param endCallback function called after audio ends
         */
        AudioPlayer.prototype.play = function (start, endCallback) {
            if (endCallback === void 0) { endCallback = function () {
            }; }
            this._onStatusChange.afterNextValidEvent(function (a) { return a.status === exports.AudioMechanismStatus.ENDED; }, endCallback);
            this._selectedMechanism.play(start);
        };
        /**
         * pauses the audio playback
         * @param callback function called when audio paused
         */
        AudioPlayer.prototype.pause = function (callback) {
            if (callback === void 0) { callback = function () {
            }; }
            this._selectedMechanism.pause(callback);
        };
        /**
         * stops the audio playback
         * @param callback function called when audio stopped
         */
        AudioPlayer.prototype.stop = function (callback) {
            if (callback === void 0) { callback = function () {
            }; }
            this._selectedMechanism.stop(callback);
        };
        /**
         * destroys the player. Call this method when you don't need this instance anymore.
         */
        AudioPlayer.prototype.destroy = function () {
            this._selectedMechanism.destroy();
            this._onStatusChange.unlistenAll();
            this.onFileProcessing.unlistenAll();
            this._status = exports.AudioMechanismStatus.INITIALIZED;
            if (this._htmlContainer) {
                this._htmlContainer.innerHTML = '';
            }
        };
        AudioPlayer.idCounter = 0;
        return AudioPlayer;
    }());

    exports.AudioMechanism = AudioMechanism;
    exports.AudioPlayer = AudioPlayer;
    exports.HtmlAudio = HtmlAudio;
    exports.PPEvent = PPEvent;
    exports.PrecisionPlayerSettings = PrecisionPlayerSettings;
    exports.WebAudio = WebAudio;
    exports.getHighResTimestamp = getHighResTimestamp;
    exports.getTimeStampByEvent = getTimeStampByEvent;
    exports.roundHighResTimestamp = roundHighResTimestamp;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

}({}));
