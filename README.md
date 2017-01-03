# canvas-board.js
canvas-board.js is a Javascript library to create a general purpose NxM board in a canvas with support to pieces moving,
pieces positioning, pieces interaction, board rotation, board resizing and animations.

It exposes API and hooks for integration with some game logic, move validator or GUI.

Implementation adopts [EaselJS 0.8.2](http://www.createjs.com/easeljs) 2D graphic library as dependency.

## Examples

See [examples page](http://canvas-board.andreads.it)!

## Installation

Direct include:

```html
<script src="https://code.createjs.com/easeljs-0.8.2.min.js"></script>
<script src="canvas-board.min.js"></script>
```

With AMD loader (e.g. [RequireJS](http://requirejs.org/)):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.2/require.min.js"></script>
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
    blocksInAColumn,    // number of blocks in a column                     | integer           | optional - default: blocksInARow if is set, 8 otherwise
    canvasWidth,        // width in px to which the canvas will be set      | integer           | optional - default: canvasHeight if is set, width of html canvas element otherwise. ignored if canvasSize is set
    canvasHeight,       // height in px to which the canvas will be set     | integer           | optional - default: canvasWidth if is set, height of html canvas element otherwise. ignored if canvasSize is set
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
    marginColor,        // color of margin between blocks                   | string            | optional - default: "#222", ignored if blocksMargin == 0 or not set
    coords,             // specify if board has blocks coords labels        | boolean           | optional - default: true. if there is no border this parameter is ignored
    rotationDuration,   // duration of flipping in millisecs                | integer           | optional - default: 500
    squeezeScaleFactor, // rescaling factor of board for flip animation     | number in [0,1]   | optional - default: 0.7
    animationOfPieces,  // specify if pieces movement is animated           | boolean           | optional - default: true
    actionsOnPieces,    // specify if enabled mouse interaction with pieces | boolean           | optional - default: true
    piecesFolder,       // relative (to html page) path to pieces images    | string            | optional - default: "./img"
    piecesFiles: {      // to define pieces filenames if != pieceLabel      | object            | optional - default: piece filename corresponds to pieceLabel
        key: value,     // key is piaceLabel, value is filename without ext | strings pair      | optional - set a key/value pair for each piece with label different from filename
        ...             //
    },                  //
    position,           // starting position in FEN-like notation           | string            | optional - default: no pieces on board
    goGame,             // specify if board has to be optimized for go game | boolean           | optional - default: false. if true then type is automatically set to 'linesGrid'
    hooks: {            // object with functions hooks                      | object            | optional - default: no hooks
        isValidMove,    // function executed on .move() invocation. if returns true then .move() is executed, otherwise no.
                        // signature: function isValidMove({String} positionFrom, {String} positionTo, {Object} pieceFrom, {Array} piecesTo)
                        //                                                  | function          | optional - default: undefined, .move() is executed
        preMove,        // function executed on .move() invocation, right after eventual .isValidMove() execution (if true is returned) and before .move() execution.
                        // signature: function preMove({String} positionFrom, {String} positionTo, {Object} pieceFrom, {Array} piecesTo)
                        //                                                  | function          | optional - default: undefined. nothing is executed
        postMove        // function executed on .move() invocation, right after .move() execution
                        // signature: function postMove({?} returnedFromPreMove, {Boolean} returnedFromMove, {String} positionFrom, {String} positionTo, {Object} pieceFrom, {Array} piecesTo)
                        //                                                  | function          | optional - default: undefined. nothing is executed
    },                  //
    chessGame: {        // to define properties for chess optimization      | object            | optional - default: undefined. board is not optimized for chess
        pawnLabel,      // label of pawn, used in filename of piece         | string            | optional - default: no movement optimization for pawn
        bishopLabel,    // label of bishop, used in filename of piece       | string            | optional - default: no movement optimization for bishop
        rookLabel       // label of rook, used in filename of piece         | string            | optional - default: no movement optimization for rook
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

-> [example](http://canvas-board.andreads.it/#constructor)

### .rotate([degrees])
Rotate the board of _degrees_ degrees from current position, with animation.  

**Parameters:** (degrees: integer) - Optional, default: 180  
**Returns:** void

-> [example](http://canvas-board.andreads.it/#rotate)

### .setRotation([degrees])
Set rotation of board to _degrees_ degrees, without animation.

**Parameters:** (degrees: integer) - Optional, default: 0  
**Returns:** void

-> [example](http://canvas-board.andreads.it/#setRotation)

### .scale(scaleFactor)
Rescale board, and canvas, to value passed as parameter. _scaleFactor_ is a mandatory number.

**Parameters:** (scaleFactor: number > 0) - Mandatory  
**Returns:** void

-> [example](http://canvas-board.andreads.it/#scale)

### .setPosition([position])
Set pieces on board according to position passed as parameter. _position_ is an optional string in [FEN](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)-like notation (coherent to current board dimensions): if no value is passed then board is cleaned.
Each char of string indicates label of a piece. Only labels of one char are accepted.

**Parameters:** (position: string) - Optional, default: nothing, clear the board  
**Returns:** void
 
 -> [example](http://canvas-board.andreads.it/#setPosition)
 
### .getPosition()
Returns current position of board, in [FEN](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)-like notation.

**Parameters:** void  
**Returns:** string

-> [example](http://canvas-board.andreads.it/#getPosition)

### .move(startingSquare, endingSquare)
Move a piece from _startingSquare_ square to _endingSquare_ square. _startingSquare_ and _endingSquare_ parameters are strings in the form of board coords, e.g. like "H7".

**Parameters:** (startingSquare: string, endingSquare: string) - Mandatory  
**Returns:** boolean. true if move occurred, false otherwise

### .move(piece, endingSquare)
Move _piece_ piece to _endingSquare_ square. _piece_ is an instance of an existing piece and _endingSquare_ is a string in the form of board coords, e.g. like "H7".

**Parameters:** (piece: object, endingSquare: string) - Mandatory  
**Returns:** boolean. true if move occurred, false otherwise

### .move(movesList)
Like above, but with a list of moves for simultaneous multiple moves as parameter.
Each move is defined as an array of two strings as above. E.g. .move(["H3", "G3"], [piece, "F7"], ...)

**Parameters:** (movesList: Array) - Mandatory  
**Returns:** boolean. true if at least one move of list occurred, false otherwise
 
### .setPieceAtPosition(piece, endingSquare)
Move _piece_ piece to _endingSquare_ square. _piece_ parameter is an instance of a piece (e.g. retrieved by _getPieceAtPosition()_ function) and _endingSquare_ parameter is a string in the form of board coords, e.g. like "H7.

**Parameters:** (piece: object, endingSquare: string) - Mandatory  
**Returns:** boolean. true if placement occurred, false otherwise

### .setPieceAtPosition(movesList)
Like above, but with a list of moves for simultaneous multiple moves.
Each move is defined as an array of two elements as in the previous case.

**Parameters:** (movesList: Array) - Mandatory  
**Returns:** boolean. true if at least one placement of list occurred, false otherwise

### .getPieceAtPosition(position)
Returns piece(s) on requested position. Input parameter is a position in the form of coords, e.g. like 'E7'

**Parameters:** (position: string) - Mandatory  
**Returns:**
- array, of pieces on _position_  
- object, instance of piece on _position_
- undefined, if no piece is on _position_

### .removePieceFromPosition(position)
Remove piece(s) from _position_. Input parameter is a position in the form of coords, e.g. like 'E7'

**Parameters:** (position: string) - Mandatory  
**Returns:** boolean. true if pieces(s) are removed, false otherwise

### .getNewPiece(pieceLabel)
Async function to instantiate a new piece. _pieceLabel_ parameter is label of requested piece.

**Parameters:** (pieceLabel: string) - Mandatory  
**Returns:** object, i.e. a promise

Example of use:

```js
myBoard.getNewPiece("p")
    .then(function(requestedPiece) {
         // do stuff with requestedPiece
    })
    .catch(function(errorGettingPiece) {
         // error handling
    });
```

.then() chaining and .catch() chaining is supported