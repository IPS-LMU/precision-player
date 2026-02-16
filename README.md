# Precision Player v0.3.0

A Javascript/Typescript media player with focus on high precision without third party dependencies. ~ 30 KB size

## Installation

### Loading via script tag

1. Download the precision_player.min.js file to your project.
2. Add to the `head` tag :

   ````html
   <script type="text/javascript" src="path/precision_player.min.js"></script>
   ````
3. Now you can use it like that:
    ````javascript
   // initialize object with WebAudio (other is "HTMLAudio"
   var pPlayer = new PrecisionPlayer.Audioplayer("WebAudio");
   pPlayer.onStatusChange.addEventListener(function(event){
     console.log(event);
   });
   
   // wait till audio file was loaded and then call a function
   pPlayer.onStatusChange.afterNextValidEvent(function(a) {
     return a.status === "READY";
   }, function (event) {
         console.log(event);
         setTimeout(function() {
             console.log("start!");
             pPlayer.play();
         }, 5000);
    });
   
    // initialize with source to audio file (url or File object)
    pPlayer.initialize("./AudioEventsTest.wav");
    ````

### Use in Typescript project

Actually this repository is not an npm package.

1. Clone this repository next to your project.
2. Go to `precision-player` and call `npm install`.
3. Call `npm run build`.
4. Go to the directory of your project and call
    ````shell
   npm install --save file:../precision-player/dist
   ````
5. Add this to your tsconfig.json:
   ````js
   /* ... */
   "paths": {
      "@julianpoemp/precision-player": [
      "../precision-player/dist"
      ]
   }
   /* .... */
   ````

## Audio States

The audio states reported by the Precision Player are:

* **INITIALIZED**: the audio mechanism was initialized.
* **READY**: the audio mechanism is ready to start playing.
* **RESUMING**: the audio context needs to be resumed (AudioContext only).
* **PLAYING**: the audio playback started.
* **PAUSED**: the audio playback was paused.
* **STOPPED**: the audio playback was stopped by an interaction.
* **ENDED**: the end of the audio file was reached.
* **FAILED**: the audio playback failed.

## Options

You can give the <code>PrecisionPlayer()</code> constructor a JSON object as second parameter. The following table shows
the supported options separated by points according to their hierarchy.

Aa example, the path `timestamps.highResolution` represents the JSON structure:

````js
{
    timestamps: {
        highResolution: true
    }
}
````

All options are optional. The following options are supported:

<table>
<thead>
<tr>
<th>Option</th>
<th>Type</th>
<th>Description</th>
</tr></thead>
<tbody>
   <tr>
      <td>
         timestamps.highResolution
      </td>
      <td>
         boolean
      </td>
      <td>
         Use <a href="https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp">DOMHighResTimeStamp</a> instead of <code>Date.now()</code>. If this option is enabled and the browser support this type, <code>event.timestamp</code> can be read, too. Perhaps this option allows to be more precise.
      </td>
   </tr>
   <tr>
      <td>
         downloadAudio
      </td>
      <td>
         boolean
      </td>
      <td>
         The audio file should be downloaded completely before decoding. Download starts on `initialize()` call. Must be `true` if `Authorization` needed.
      </td>
   </tr>
   <tr>
      <td>
         headers
      </td>
      <td>
         string[][] | Record&lt;string, string&gt;
      </td>
      <td>
         Array or dictionary with headers. On dictionary the key is considered the name of the header.
      </td>
   </tr>
</tbody>
</table>

## Events

The Precision Player uses an own Implementation of EventListeners. Each event listener contains an array of callbacks
that are run sequentially as soon as an event is dispatched, without calling `setTimeout()` in order to run callbacks as
soon as possible.

<table>
<thead>
<tr>
<th>Option</th>
<th>Type</th>
<th>Result Type</th>
<th>Description</th>
</tr></thead>
<tbody>
   <tr>
      <td>
         Audioplayer.onStatusChange
      </td>
      <td>
         PPEvent
      </td>
      <td>
         AudioStatusEvent
      </td>
      <td>
        Triggers whenever status of the playback changes.
      </td>
   </tr>
    <tr>
      <td>
         Audioplayer.onFileProcessing
      </td>
      <td>
         PPEvent
      </td>
      <td>
         number
      </td>
      <td>
        Triggers while file is read by the file reader. Returns the progress as percent value.
      </td>
   </tr>
</tbody>
</table>

## AudioPlayer Methods

### constructor(type: AudioMechanismType, settings?: PrecisionPlayerSettings, htmlContainer?: HTMLDivElement)

* type: Either "HTMLAudio" or "WebAudio"
* settings (optional): See [Options](#Options).
* htmlContainer (HTMLElement, optional): If set a GUI is created inside that HTMLElement (should be `div`).

### initialize(file: File | string)

initializes the precision player. Call this method AFTER the code that listen to status changes.

* file: File Blob or URL to the audio file

### play(start?: number, endCallback = () => {})

* start (number, optional): start position for playback. If left empty the playback starts from the previous paused position.
* endCallback (void, optional): callback function called as soon es the audio playback ends.

### pause(callback: () => void = () => {})

pauses the audio playback.

* callback (void, optional): function called when audio paused

### stop(callback: () => void = () => {})

stops the audio playback.

* callback (void, optional): function called when audio stopped

### destroy()

destroys the player. Call this method when you don't need this instance anymore.



## Types

### TimingRecord

````typescript
{
   eventTriggered: {
      highResolution: number;
      nowMethod: number;
   },
   playbackDuration: PlaybackDuration;
}
````

### AudioStatusEvent

````typescript
{
   status: AudioMechanismStatus;
   message?: string;
   timingRecord: TimingRecord;
}
````

## Development

Open three terminal windows/tabs:

1. Watch files for changes and rebuild automatically: `npm start`.
2. Serve web server for the project: `npm run serve`.
3. Serve web server for protected media: `npm run serve:restricted`.
