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
   var pPlayer = new PrecisionPlayer("WebAudio");
    pPlayer.statuschange.addEventListener(function(event){
            console.log(event);
        });
        pPlayer.statuschange.afterNextValidEvent(function(a) {
           return a.status === "READY";
        }, function (event) {
            console.log(event);
            setTimeout(function() {
                console.log("start!");
                pPlayer.play();
            }, 5000);
        });
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
   ````json
   {
   /* ... */
   "paths": {
      "@julianpoemp/precision-player": [
      "../precision-player/dist"
      ]
   }
   /* .... */
   ````

### Developement

Simply call `npm start`.
