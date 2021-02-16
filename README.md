# Precision Player

A Javascript/Typescript media player with focus on high precision.

## Installation

### Loading via script tag

1. Download the precision_player.min.js file to your project.
2. Add to the `head` tag :

   ````html
   <script type="text/javascript" src="path/precision_player.js"></script>
   ````
3. Now you can use it like that:
    ````javascript
   // initialize object with WebAudio (other is "HTMLAudio"
   var pPlayer = new PrecisionPlayer("WebAudio");
   pPlayer.statuschange.addEventListener(function(event){
     console.log(event);
   });
   
   // wait till audio file was loaded and then call a function
   pPlayer.statuschange.afterNextValidEvent(function(a) {
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
   
### Audio States
The audio states reported by the Precision Player are:

* **INITIALIZED**: the audio mechanism was initialized.
* **READY**: the audio mechanism is ready to start playing.
* **RESUMING**: the audio context needs to be resumed (AudioContext only).
* **PLAYING**: the audio playback started.
* **PAUSED**: the audio playback was paused.
* **STOPPED**: the audio playback was stopped by an interaction.
* **ENDED**: the end of the audio file was reached.
* **FAILED**: the audio playback failed.
   
### Options
You can give the <code>PrecisionPlayer()</code> constructor a JSON object as second parameter. The following table shows the supported options separated by points according to their hierarchy.

Aa example, the path `timestamps.highResolution` represents the JSON structure:
````js
{
   timestamps: {
      highResolution: true
   }
}
````

The following options are supported: 

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
         The audio file should be downloaded completely before decoding.
      </td>
   </tr>
</tbody>
</table>

## Developement

Simply call `npm start`.
