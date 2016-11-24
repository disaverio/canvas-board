# canvas-board.js
canvas-board.js is a Javascript library to create a general purpose NxM board in a canvas with support to pieces moving,
pieces positioning, pieces interaction, board rotation, board resizing and animations.

It exposes API and hooks for integration with some game logic, move validator or GUI.

Implementation adopts [EaselJS 0.8.2](http://www.createjs.com/easeljs) 2D graphic library as dependency.

## Installation

Direct include:

```html
<script src="https://code.createjs.com/easeljs-0.8.2.min.js"></script>
<script src="canvas-board.min.js"></script>
```

With AMD loader (e.g. [RequireJS](http://requirejs.org/)):

```html
<script src="require.js"></script>
<script>
    requirejs.config({
        paths: {
            createjs: 'https://code.createjs.com/easeljs-0.8.2.min',
            canvasBoard: 'canvas-board.min'
        },
        shim: {
            createjs: { exports: 'createjs' }
        }
    });
</script>
```

## How to use

Constructor accepts a configuration object parameter with only one mandatory attribute: 'canvasId'.
(examples will use [RequireJS](http://requirejs.org/))

```js
requirejs(["canvasBoard"], function(CanvasBoard){
    new CanvasBoard({
        canvasId: "myCanvas"
    });
});
```

Configuration object with all attributes, types, and default values:

```js
{
    canvasId,           // id of canvas html element                        | string            | mandatory
    type,               // 'linesGrid' or 'blocksGrid'                      | string literal    | optional - default: 'blocksGrid'. if 'linesGrid' then 'lightSquaresColor' is used as background color
    blocksInARow,       // number of blocks in a row                        | integer           | optional - default: blocksInAColumn if is set, 8 otherwise
    blocksInAColumn     // number of blocks in a column                     | integer           | optional - default: blocksInARow if is set, 8 otherwise
    canvasWidth         // width in px to which the canvas will be set      | integer           | optional - default: canvasHeight if is set, width of html canvas element otherwise. ignored if canvasSize is set
    canvasHeight        // height in px to which the canvas will be set     | integer           | optional - default: canvasWidth if is set, height of html canvas element otherwise. ignored if canvasSize is set
    canvasSize,         // dimension in px to which the canvas will be set  | integer           | optional - no default: see canvasWidth and canvasHeight
    borderSize,         // dimension in px of board border                  | integer           | optional - default: 3.5% of min(canvasWidth, canvasHeight). set to 0 to remove border
    blocksMargin,       // dimension in px of margin between blocks         | integer or 'auto' | optional - default: 0, no margin between blocks. 'auto' set margin to ~3% (rounded) of block size.
    gridLinesSize,      // dimension in px of lines for 'linesGrid' type    | integer           | optional - default: 3% of block size. ignored if type != 'linesGrid'
    lightSquaresColor,  // color of light squares                           | string            | optional - default: "#EFEFEF"
    darkSquaresColor,   // color of dark squares                            | string            | optional - default: "#ABABAB". ignored if type is 'linesGrid'
    linesColor,         // color of lines if type is 'linesGrid'            | string            | optional - default: "#000"
    borderColor,        // color of board border                            | string            | optional - default: "#222"
    shadowColor,        // color of border shadow                           | string            | optional - default: "#000"
    labelsColor,        // color of border labels                           | string            | optional - default: "#DDD"
    highlighterColor,   // color to highlight elements                      | string            | optional - default: "lightgreen"
    marginColor,        // color of margin between blocks                   | string            | optional - default: "#222", ignored if type != 'linesGrid'
    coords,             // specify if board has blocks coords labels        | boolean           | optional - default: true. if there is no border this parameter is ignored
    rotationDuration,   // duration of flipping in millisecs                | integer           | optional - default: 500
    squeezeScaleFactor, // rescaling factor of board for flip animation     | number in [0,1]   | optional - default: 0.7
    animationOfPieces,  // specify if pieces movement is animated           | boolean           | optional - default: true
    actionsOnPieces,    // specify if enabled mouse interaction with pieces | boolean           | optional - default: true
    piecesFolder,       // relative (to html page) path of pieces images    | string            | optional - default: "./img"
    goGame,             // specify if board has to be optimized for go game | boolean           | optional - default: false. if true type is automatically set to 'linesGrid'
    chessGame: {        // to define properties for chess optimization      | object            | optional - default: undefined. board is not optimized for chess
        pawnLabel,      // label of pawn, used in filename of piece         | string            | mandatory if chess object is defined. ignored otherwise
        bishopLabel,    // label of bishop, used in filename of piece       | string            | mandatory if chess object is defined. ignored otherwise
        rookLabel       // label of rook, used in filename of piece         | string            | mandatory if chess object is defined. ignored otherwise
    }
}
```

Special parameters:

- **goGame** : boolean. If true board is designed as a [go](https://en.wikipedia.org/wiki/Go_(game)) board
- **chessGame** : object. Has three parameter that describe the labels of pawn, bishop, and rook (to improve movements)

Pieces:

Label of piece corresponds to filename of piece image. **Important:** board supports only .pgn extension, and names (therefore label) of one char.

## API

### Constructor: CanvasBoard(configuration)
See above