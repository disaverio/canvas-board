/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 Andrea Di Saverio
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

"use strict";

(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require("createjs")) :
    typeof define === 'function' && define.amd                   ? define(["createjs"], factory) :
                                                                   global.CanvasBoard = factory(global.createjs);
})(this, function(createjs, undefined) {

    if (!createjs) {
        throw new Error("Fatal error: createjs not imported.");
    }

    var H_BOARD_LABELS_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";   // alphabet for labels on horizontal board border. numeric digits are used on vertical border
    var PIECE_ZOOM_FACTOR = 1.25;

    /*
     * Lightweight Q-like reimplementation of Promises basic functionalities.
     * Chaining supported.
     */
    var customQ = {
        defer: function () {
            return {
                promise: {
                    id: "lQ",
                    status: 0, // 0: running - 1: resolved - 2: rejected
                    value: undefined,
                    successorDeferred: [],
                    then: function (f) {
                        var innerDeferred = customQ.defer();
                        innerDeferred.type = "THEN";
                        var functionContainer = function (value) {
                            try {
                                var res = f(value);
                                if (res && res.id === "lQ") {
                                    res.then(function (response) {
                                        innerDeferred.resolve(response);
                                    }).catch(function (error) {
                                        innerDeferred.reject(error);
                                    });
                                } else {
                                    innerDeferred.resolve(res);
                                }
                            } catch (error) {
                                innerDeferred.reject(error);
                            }
                        };

                        if (this.status == 0) {
                            innerDeferred.f = functionContainer;
                            this.successorDeferred.push(innerDeferred);
                        } else if (this.status == 1) {
                            functionContainer(this.value);
                        }

                        return innerDeferred.promise;
                    },
                    catch: function (f) {
                        var innerDeferred = customQ.defer();
                        innerDeferred.type = "CATCH";
                        var functionContainer = function (value) {
                            try {
                                var res = f(value);
                                if (res && res.id === "lQ") {
                                    res.then(function (response) {
                                        innerDeferred.resolve(response);
                                    }).catch(function (error) {
                                        innerDeferred.reject(error);
                                    });
                                } else {
                                    innerDeferred.resolve(res);
                                }
                            } catch (error) {
                                innerDeferred.reject(error);
                            }
                        };

                        if (this.status == 0) {
                            innerDeferred.f = functionContainer;
                            this.successorDeferred.push(innerDeferred);
                        } else if (this.status == 2) {
                            functionContainer(this.value);
                        }

                        return innerDeferred.promise;
                    },
                    finally: function (f) {
                        this.successorDeferred.push(f);
                    }
                },
                resolve: function (result) {
                    this.promise.status = 1;
                    this.promise.value = result;
                    while (this.promise.successorDeferred.length > 0) {
                        var currentDeferred = this.promise.successorDeferred.splice(0, 1)[0];
                        if (currentDeferred.exec) {
                            currentDeferred.exec(this.promise.status, result);
                        } else {
                            currentDeferred(result);
                        }
                    }
                },
                reject: function (error) {
                    this.promise.status = 2;
                    this.promise.value = error;
                    while (this.promise.successorDeferred.length > 0) {
                        var currentDeferred = this.promise.successorDeferred.splice(0, 1)[0];
                        if (currentDeferred.exec) {
                            currentDeferred.exec(this.promise.status, error);
                        } else {
                            currentDeferred(error);
                        }
                    }
                },
                exec: function (status, response) {
                    if (status == 1 && this.type == "THEN" || status == 2 && this.type == "CATCH") {
                        this.f(response);
                    } else {
                        while (this.promise.successorDeferred.length > 0) {
                            this.promise.successorDeferred.splice(0, 1)[0].exec(status, response);
                        }
                    }
                }
            };
        }
    };

    /**
     * @constructor
     * @param {Object} configuration {
     *  canvasId,           // id of canvas html element                        | string            | mandatory
     *  type,               // 'linesGrid' or 'blocksGrid'                      | string literal    | optional - default: 'blocksGrid'. if 'linesGrid' then 'lightSquaresColor' is used as background color
     *  blocksInARow,       // number of blocks in a row                        | integer           | optional - default: blocksInAColumn if is set, 8 otherwise
     *  blocksInAColumn,    // number of blocks in a column                     | integer           | optional - default: blocksInARow if is set, 8 otherwise
     *  canvasWidth,        // width in px to which the canvas will be set      | integer           | optional - default: canvasHeight if is set, width of html canvas element otherwise. ignored if canvasSize is set
     *  canvasHeight,       // height in px to which the canvas will be set     | integer           | optional - default: canvasWidth if is set, height of html canvas element otherwise. ignored if canvasSize is set
     *  canvasSize,         // dimension in px to which the canvas will be set  | integer           | optional - no default: see canvasWidth and canvasHeight
     *  borderSize,         // dimension in px of board border                  | integer           | optional - default: 3.5% of min(canvasWidth, canvasHeight). set to 0 to remove border
     *  blocksMargin,       // dimension in px of margin between blocks         | integer or 'auto' | optional - default: 0, no margin between blocks. 'auto' set margin to ~3% (rounded) of block size.
     *  gridLinesSize,      // dimension in px of lines for 'linesGrid' type    | integer           | optional - default: 3% of block size. ignored if type != 'linesGrid'
     *  lightSquaresColor,  // color of light squares                           | string            | optional - default: "#EFEFEF"
     *  darkSquaresColor,   // color of dark squares                            | string            | optional - default: "#ABABAB". ignored if type is 'linesGrid'
     *  linesColor,         // color of lines if type is 'linesGrid'            | string            | optional - default: "#000"
     *  borderColor,        // color of board border                            | string            | optional - default: "#222"
     *  shadowColor,        // color of border shadow                           | string            | optional - default: "#000"
     *  labelsColor,        // color of border labels                           | string            | optional - default: "#DDD"
     *  highlighterColor,   // color to highlight elements                      | string            | optional - default: "lightgreen"
     *  marginColor,        // color of margin between blocks                   | string            | optional - default: "#222", ignored if blocksMargin == 0 or not set
     *  coords,             // specify if board has blocks coords labels        | boolean           | optional - default: true. if there is no border this parameter is ignored
     *  rotationDuration,   // duration of flipping in millisecs                | integer           | optional - default: 500
     *  squeezeScaleFactor, // rescaling factor of board for flip animation     | number in [0,1]   | optional - default: 0.7
     *  animationOfPieces,  // specify if pieces movement is animated           | boolean           | optional - default: true
     *  actionsOnPieces,    // specify if enabled mouse interaction with pieces | boolean           | optional - default: true
     *  piecesFolder,       // relative (to html page) path to pieces images    | string            | optional - default: "./img"
     *  piecesFiles: {      // to define pieces filenames if != pieceLabel      | object            | optional - default: piece filename corresponds to pieceLabel
     *      key: value,     // key is piaceLabel, value is filename without ext | strings pair      | optional - set a key/value pair for each piece with label different from filename
     *      ...             //                                                  |                   |
     *  },                  //                                                  |                   |
     *  position,           // starting position in FEN-like notation           | string            | optional - default: no pieces on board
     *  goGame,             // specify if board has to be optimized for go game | boolean           | optional - default: false. if true then type is automatically set to 'linesGrid'
     *  hooks: {            // object with functions hooks                      | object            | optional - default: no hooks
     *      isValidMove,    //                                                  | function          | optional - no default: isValidMove is not executed
     *                      // function executed on .move() invocation. if returns true, or if is not defined, then .move() is executed, otherwise no
     *                      // signature: function isValidMove({String} positionFrom, {String} positionTo, {Object} pieceFrom, {Array} piecesTo)
     *      preMove,        //                                                  | function          | optional - no default: preMove is not executed
     *                      // function executed on .move() invocation, right after eventual .isValidMove() execution (if true is returned) and before .move() execution
     *                      // signature: function preMove({String} positionFrom, {String} positionTo, {Object} pieceFrom, {Array} piecesTo)
     *      postMove        //                                                  | function          | optional - no default: postMove is not executed
     *                      // function executed on .move() invocation, right after .move() execution.
     *                      // signature: function postMove({String} positionFrom, {String} positionTo, {Object} pieceFrom, {Array} piecesTo, {?} returnedFromPreMove, {Boolean} returnedFromMove)
     *  },                  //                                                  |                   |
     *  chessGame: {        // to define properties for chess optimization      | object            | optional - no default: board is not optimized for chess
     *      pawnLabel,      // label of pawn, used in filename of piece         | string            | optional - no default: no movement optimization for pawn
     *      bishopLabel,    // label of bishop, used in filename of piece       | string            | optional - no default: no movement optimization for bishop
     *      rookLabel       // label of rook, used in filename of piece         | string            | optional - no default: no movement optimization for rook
     *  }
     * }
     */
    function CanvasBoard(configuration) {

        this.utils = {

            _getNumberOfChars: (function(numberOfElements, numberOfSymbols) {
                return Math.ceil(Math.log(numberOfElements) / Math.log(numberOfSymbols));
            }).bind(this),

            getNumberOfCharsInHorizontalBoardLabels: (function() { //SI
                return this.utils._getNumberOfChars(this.configuration.blocksInARow, H_BOARD_LABELS_ALPHABET.length) || 1;
            }).bind(this),

            getNumberOfCharsInVerticalBoardLabels: (function() { //SI
                return this.utils._getNumberOfChars(this.configuration.blocksInAColumn, 10) || 1;
            }).bind(this),

            getFileRankFromPositionLabel: (function(positionLabel) {//SI

                var charsInHorizontalLabel = this.utils.getNumberOfCharsInHorizontalBoardLabels();
                var fileLabel = positionLabel.substr(0, charsInHorizontalLabel);
                var rankLabel = positionLabel.substr(charsInHorizontalLabel);

                var file = 0;
                for (var i = 0; i < charsInHorizontalLabel; i++) {
                    file += H_BOARD_LABELS_ALPHABET.indexOf(fileLabel.charAt(i)) * Math.pow(H_BOARD_LABELS_ALPHABET.length, charsInHorizontalLabel - (i + 1));
                }
                var rank = rankLabel - 1;

                return {
                    file: file,
                    rank: rank
                };
            }).bind(this),

            getPositionLabelFromFileRank: (function(file, rank) {//SI

                var charsInLabel = this.utils.getNumberOfCharsInHorizontalBoardLabels();
                var label = "";
                for (var j = charsInLabel; j > 0; j--) {
                    label += H_BOARD_LABELS_ALPHABET.charAt(Math.floor((file % Math.pow(H_BOARD_LABELS_ALPHABET.length, j)) / Math.pow(H_BOARD_LABELS_ALPHABET.length, j - 1)));
                }

                label += (rank + 1);

                return label;
            }).bind(this),

            getXYCoordsFromFileRank: (function(file, rank) {//SI
                return {
                    x: file * (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) + this.configuration.blockSize / 2,
                    y: (this.configuration.blocksInAColumn - rank - 1) * (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) + this.configuration.blockSize / 2 // the coord y==0 is at the top, but row 0 is at the bottom
                };
            }).bind(this),

            getFileRankFromXYCoords: (function(x, y) {//SI
                return {
                    file: Math.floor((x + (this.configuration.marginBetweenBlocksSize / 2)) / (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize)),
                    rank: this.configuration.blocksInAColumn - Math.floor((y + (this.configuration.marginBetweenBlocksSize / 2)) / (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize)) - 1
                };
            }).bind(this),

            isPositionLabel: (function(string) {//SI
                /*
                 * check if passed param is a valid position label
                 */

                if (typeof string !== 'string') {
                    return false;
                }

                var charsInHorizontalLabel = this.utils.getNumberOfCharsInHorizontalBoardLabels();

                var fileLabel = string.substr(0, charsInHorizontalLabel);
                var file = 0;
                for (var i = 0; i < charsInHorizontalLabel; i++) {
                    var charIndex = H_BOARD_LABELS_ALPHABET.indexOf(fileLabel.charAt(i));
                    if (charIndex < 0) {
                        return false;
                    }
                    file += charIndex * Math.pow(H_BOARD_LABELS_ALPHABET.length, charsInHorizontalLabel - (i + 1));
                }
                if (file >= this.configuration.blocksInARow) {
                    return false;
                }

                var rankLabel = string.substr(charsInHorizontalLabel);
                if (!Number.isInteger(parseInt(rankLabel, 10)) || parseInt(rankLabel, 10) < 1 || parseInt(rankLabel, 10) > this.configuration.blocksInAColumn) {
                    return false;
                }

                return true;
            }).bind(this),

            isArray: (function(object) {
                if (Array.isArray)
                    return Array.isArray(object);

                return typeof object !== 'undefined' && object && object.constructor === Array;
            }).bind(this),

            isPiece: (function(object) {//SI
                if (typeof object === 'object' && object.label && this.piecesBox[object.label]) {
                    return true;
                } else {
                    return false;
                }
            }).bind(this),

            getCurrentBoard: (function() {//SI
                /*
                 * returns: NxM matrix where N is number of columns and M number of rows. Each element of matrix is an array of pieces on that position.
                 *          If a position has no pieces the corresponding element is undefined.
                 */

                var currentBoard = [];
                for (var i = 0; i < this.configuration.blocksInARow; i++) { // add an array for each column
                    var col = [];
                    for (var j = 0; j < this.configuration.blocksInAColumn; j++) { // add an undefined element for each row of column
                        col.push(undefined);
                    }
                    currentBoard.push(col);
                }
                for (var i = 0; i < this.piecesContainer.getNumChildren(); i++) {
                    var piece = this.piecesContainer.getChildAt(i);
                    if (piece.rank != undefined && piece.file != undefined) {
                        if (!currentBoard[piece.file][piece.rank]) {
                            currentBoard[piece.file][piece.rank] = [];
                        }
                        currentBoard[piece.file][piece.rank].push(piece.label);
                    }
                }

                return currentBoard;
            }).bind(this),

            getFenFromBoard: (function(board) {
                /*
                 * input: NxM matrix where N is number of columns and M number of rows. Each element of matrix is an array of pieces on that position.
                 *        If a position has no pieces the corresponding element can be undefined or can be an empty array.
                 * output: fen-like string that describes position.
                 */

                if (!this.utils.isArray(board)) {
                    throw new Error("getFenFromBoard: invalid input parameter");
                }

                var numberOfColumns = board.length;
                var numberOfRows;
                for(var i = 0; i < numberOfColumns; i++) {
                    if (!this.utils.isArray(board[i])) {
                        throw new Error("getFenFromBoard: invalid input parameter");
                    }
                    if (i == 0) {
                        numberOfRows = board[i].length;
                    } else {
                        if (numberOfRows != board[i].length) {
                            throw new Error("getFenFromBoard: invalid input parameter");
                        }
                    }
                    for(var j = 0; j < numberOfRows; j++) {
                        if (board[i][j] != undefined && !this.utils.isArray(board[i][j])) {
                            throw new Error("getFenFromBoard: invalid input parameter");
                        }
                    }
                }
                if (!numberOfRows) {
                    throw new Error("getFenFromBoard: invalid input parameter");
                }

                var fen = '';
                for (var i = numberOfRows - 1; i >= 0; i--) {
                    if (i != numberOfRows - 1) {
                        fen += '/';
                    }
                    var temp = 0;
                    for (var j = 0; j < numberOfColumns; j++) {
                        if (board[j][i] && board[j][i].length > 0) {
                            if (temp > 0) {
                                fen += temp;
                                temp = 0;
                            }
                            if (board[j][i].length == 1) {
                                fen += board[j][i][0];
                            } else {
                                fen += "[";
                                for (var k = 0; k < board[j][i].length; k++) {
                                    fen += board[j][i][k];
                                }
                                fen += "]";
                            }
                        } else {
                            temp++;
                        }
                    }
                    if (temp > 0) {
                        fen += temp;
                    }
                }

                return fen;
            }).bind(this),

            getBoardFromFen: (function(fenPosition) {
                /*
                 * input: fen-like string that describes position.
                 * output: NxM matrix where N is number of columns and M number of rows. Each element of matrix is an array of pieces on that position.
                 *         If a position has no pieces the corresponding element is undefined.
                 */

                var rows = fenPosition.split("/");

                var numberOfRows = rows.length;
                var numberOfColumns;
                for(var i = 0; i < numberOfRows; i++) {
                    if (i == 0) {
                        numberOfColumns = getRowLength(rows[i]);
                    } else {
                        if (numberOfColumns != getRowLength(rows[i])) {
                            throw new Error("getBoardFromFen: invalid input parameter");
                        }
                    }
                }

                var newBoard = [];
                for (var i = 0; i < numberOfColumns; i++) { // add an array for each column
                    var col = [];
                    for (var j = 0; j < numberOfRows; j++) { // add an undefined element for each row of column
                        col.push(undefined);
                    }
                    newBoard.push(col);
                }
                for (var i = 0; i < numberOfRows; i++) {
                    var temp = 0;
                    for (var j = 0; j < rows[i].length;) {
                        if (isNaN(rows[i][j])) {
                            var piecesOnBlock = [];

                            if (rows[i][j] == "[") {
                                j++;
                                while (rows[i][j] != "]") {
                                    piecesOnBlock.push(rows[i][j]);
                                    j++;
                                }
                                j++;
                            } else {
                                piecesOnBlock.push(rows[i][j]);
                                j++;
                            }

                            newBoard[temp][numberOfRows-i-1] = piecesOnBlock;
                            temp++;
                        } else {
                            for (var z = 1; z + j < rows[i].length; z++) { // calc chars length of number
                                if (isNaN(rows[i][j + z])) {
                                    break;
                                }
                            }
                            var lengthOfNumber = z;
                            var number = rows[i].substr(j, lengthOfNumber);
                            temp += parseInt(number, 10);
                            j += lengthOfNumber;
                        }
                    }
                }

                return newBoard;

                function getRowLength(row) {
                    var length = 0;
                    for (var j = 0; j < row.length;) {
                        if (isNaN(row[j])) {
                            if (row[j] != "[") {
                                j++;
                            } else {
                                var founded = false;
                                for (var z = 1; z + j < row.length; z++) { // get length of string "[....]"
                                    if (row[j + z] == "]") {
                                        founded = true;
                                        break;
                                    }
                                }
                                if (!founded) {
                                    throw new Error("getBoardFromFen: invalid input parameter");
                                }
                                j += z + 1;
                            }
                            length++;
                        } else {
                            for (var z = 1; z + j < row.length; z++) { // calc chars length of number
                                if (isNaN(row[j + z])) {
                                    break;
                                }
                            }
                            var lengthOfNumber = z;
                            var number = row.substr(j, lengthOfNumber);
                            length += parseInt(number, 10);
                            j += lengthOfNumber;
                        }
                    }
                    return length;
                }
            }).bind(this),

            createPiece: (function(pieceLabel) {//SI

                var deferred = customQ.defer();

                if (!this.piecesBox[pieceLabel]) {
                    if (!this.loadingPieces[pieceLabel]) {

                        var pieceImage = new Image();
                        pieceImage.src = this.configuration.piecesFolder + "/" + (this.configuration.piecesFiles[pieceLabel] || pieceLabel) + ".png";

                        pieceImage.onload = (function (e) {

                            var loadedPiece = e.target;
                            this.piecesBox[pieceLabel] = loadedPiece;

                            this.loadingPieces[pieceLabel].deferreds.forEach(function (deferred) {
                                deferred.resolve(loadedPiece);
                            });

                            delete this.loadingPieces[pieceLabel];
                        }).bind(this);

                        pieceImage.onerror = function (e) {

                            this.loadingPieces[pieceLabel].deferreds.forEach(function (deferred) {
                                deferred.reject("Error loading piece " + pieceLabel);
                            });

                            delete this.loadingPieces[pieceLabel];
                        };

                        this.loadingPieces[pieceLabel] = {
                            piece: pieceImage,
                            deferreds: []
                        };
                    }

                    this.loadingPieces[pieceLabel].deferreds.push(deferred);

                } else {
                    deferred.resolve(this.piecesBox[pieceLabel]);
                }

                return deferred.promise;
            }).bind(this)
        };

        // private
        this.stage;
        this.canvas;
        this.configuration;
        this.selectedPiece;                                         // reference to piece selected by a click
        this.piecesContainer;                                       // createjs.Container containing pieces currently on board
        this.loadingPieces = {};                                    // object containing pieces whose image is loading
        this.piecesBox = {};                                        // object containing pieces whose image is yet loaded
        this.update = false;                                        // switcher to update canvas
        this.rotationDegrees = 0;                                   // initial rotation of board
        this.listOfMovements = [];                                  // array containing descriptions of current movements
        this.containersToRotate = [];                               // array with containers whose elements will be rotated in complementary way on board rotation

        // let's go!
        ((function() {

            /*
             * Elements stack:
             *   this.stage
             *     |--borderContainer
             *     |    |--border
             *     |    |--labelsContainer      -> added to this.containersToRotate
             *     |--boardContainer
             *          |--blocksBorder         // exists only if there is space between block
             *          |--blocksContainer
             *          |--blockHighlighter     // exists only during piece pressmove event
             *          |--this.piecesContainer     -> added to this.containersToRotate
             */

            if (!configuration || !configuration.canvasId) {
                throw new Error("CanvasBoard: configuration object and canvasId property are mandatory.");
            }

            this.canvas = document.getElementById(configuration.canvasId);

            this.configuration = setValues(configuration);

            this.canvas.width = this.configuration.canvasWidth;
            this.canvas.height = this.configuration.canvasHeight;

            this.stage = new createjs.Stage(this.canvas);
            this.stage.scaleX = this.stage.scaleY = this.stage.scale = 1;
            this.stage.regX = this.configuration.canvasWidth / 2;
            this.stage.regY = this.configuration.canvasHeight / 2;
            this.stage.x = this.configuration.canvasWidth / 2;
            this.stage.y = this.configuration.canvasHeight / 2;
            this.stage.enableMouseOver(40);
            this.stage.mouseMoveOutside = true;
            this.stage.rotation = 0;

            if (this.configuration.borderSize > 0) {
                var borderContainer = new createjs.Container();

                var border = new createjs.Shape();
                border.graphics
                    .beginStroke(this.configuration.borderColor)
                    .setStrokeStyle(this.configuration.borderSize)
                    .drawRect(this.configuration.borderSize / 2 + this.configuration.shadowSize + this.configuration.boardPaddingWidthSize,
                              this.configuration.borderSize / 2 + this.configuration.shadowSize + this.configuration.boardPaddingHeightSize,
                              this.configuration.allBlocksWidth + this.configuration.borderSize,
                              this.configuration.allBlocksHeight + this.configuration.borderSize);
                border.shadow = new createjs.Shadow(this.configuration.shadowColor, 0, 0, 15);

                borderContainer.addChild(border);

                if (this.configuration.coords) {
                    var labelsContainer = new createjs.Container();
                    var labelSize = Math.min(Math.floor(this.configuration.borderSize * 0.6), this.configuration.blockSize);
                    addLabelsToContainer.call(this, labelsContainer, labelSize, "V");
                    addLabelsToContainer.call(this, labelsContainer, labelSize, "H");
                    this.containersToRotate.push(labelsContainer);

                    borderContainer.addChild(labelsContainer);
                }
                this.stage.addChild(borderContainer);
            }

            var boardContainer = new createjs.Container();
            boardContainer.regX = this.configuration.allBlocksWidth / 2;
            boardContainer.regY = this.configuration.allBlocksHeight / 2;
            boardContainer.x = this.configuration.canvasWidth / 2;
            boardContainer.y = this.configuration.canvasHeight / 2;
            boardContainer.scaleX = boardContainer.scaleY = boardContainer.scale = 1;
            boardContainer.name = "boardContainer";

            if (this.configuration.marginBetweenBlocksSize > 0) {

                var blocksBorder = new createjs.Shape();
                var blocksBorderGraphic = blocksBorder.graphics;

                blocksBorderGraphic
                    .beginStroke(this.configuration.marginColor)
                    .setStrokeStyle(this.configuration.marginBetweenBlocksSize);

                for (var i = 0; i < this.configuration.blocksInARow - 1; i++) {
                    blocksBorderGraphic
                        .moveTo(this.configuration.blockSize + this.configuration.marginBetweenBlocksSize / 2 + (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * i, 0)
                        .lineTo(this.configuration.blockSize + this.configuration.marginBetweenBlocksSize / 2 + (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * i, this.configuration.allBlocksHeight);
                }
                for (var i = 0; i < this.configuration.blocksInAColumn - 1; i++) {
                    blocksBorderGraphic
                        .moveTo(0, this.configuration.blockSize + this.configuration.marginBetweenBlocksSize / 2 + (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * i)
                        .lineTo(this.configuration.allBlocksWidth, this.configuration.blockSize + this.configuration.marginBetweenBlocksSize / 2 + (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * i);
                }

                boardContainer.addChild(blocksBorder);
            }

            var blocksContainer = new createjs.Container();
            for (var i = 0; i < this.configuration.blocksInARow * this.configuration.blocksInAColumn; i++) {
                var columnOfBlock = i % this.configuration.blocksInARow; // file
                var rowOfBlock = Math.floor(i / this.configuration.blocksInARow); // rank

                var block = new createjs.Shape();
                block.graphics.beginFill(getBlockColour.call(this, columnOfBlock, rowOfBlock)).drawRect(0, 0, this.configuration.blockSize, this.configuration.blockSize);

                var xyCoord = this.utils.getXYCoordsFromFileRank(columnOfBlock, rowOfBlock);
                block.x = xyCoord.x;
                block.y = xyCoord.y;
                block.regY = block.regX = this.configuration.blockSize / 2;

                if (this.configuration.actionsOnPieces ) {
                    block.addEventListener("rollover", (function (evt) {
                        if (this.selectedPiece) {
                            boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));
                            var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);
                            if (pt.x < 0) pt.x = 0; // easeljs bug?
                            if (pt.y < 0) pt.y = 0; // easeljs bug?
                            var numericPosition = this.utils.getFileRankFromXYCoords(pt.x, pt.y);
                            var blockHighlighter = new createjs.Shape();
                            blockHighlighter.graphics.beginStroke(this.configuration.highlighterColor)
                                .setStrokeStyle(this.configuration.highlighterSize)
                                .drawRect(
                                    (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * numericPosition.file + this.configuration.highlighterSize / 2,
                                    (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * (this.configuration.blocksInAColumn - numericPosition.rank - 1) + this.configuration.highlighterSize / 2,
                                    this.configuration.blockSize - this.configuration.highlighterSize,
                                    this.configuration.blockSize - this.configuration.highlighterSize);
                            blockHighlighter.name = "blockHighlighter";
                            boardContainer.addChildAt(blockHighlighter, boardContainer.getNumChildren() - 1);
                            this.update = true;
                        }
                    }).bind(this));

                    block.addEventListener("rollout", (function (evt) {
                        if (this.selectedPiece) {
                            boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));
                            this.update = true;
                        }
                    }).bind(this));
                    block.addEventListener("pressup", (function (evt) {
                        if (this.selectedPiece) {
                            boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));
                            var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);
                            var numericPosition = this.utils.getFileRankFromXYCoords(pt.x, pt.y);
                            var destPosition = this.utils.getPositionLabelFromFileRank(numericPosition.file, numericPosition.rank);
                            var moved = this.move(this.selectedPiece, destPosition);
                            if (!moved) {
                                this.selectedPiece.x = this.selectedPiece.startPosition.x;
                                this.selectedPiece.y = this.selectedPiece.startPosition.y;
                            }
                            this.selectedPiece.scaleX = this.selectedPiece.scaleY = this.selectedPiece.scale;
                            this.selectedPiece.shadow = null;
                            this.selectedPiece = undefined;
                            this.update = true;
                        }
                    }).bind(this));
                }

                if (this.configuration.type == 'linesGrid') {
                    drawBlockLines.call(this, block, columnOfBlock, rowOfBlock);
                }

                blocksContainer.addChild(block);
            }
            boardContainer.addChild(blocksContainer);

            this.piecesContainer = new createjs.Container();
            this.containersToRotate.push(this.piecesContainer);
            boardContainer.addChild(this.piecesContainer);

            this.stage.addChild(boardContainer);

            createjs.Ticker.addEventListener("tick", ((function () {

                var
                    // animation semaphores
                    squeezedBoard = false,
                    turnsBoard = false,
                    enlargeBoard = false,
                    squeezeFirstTick = true,
                    enlargeFirstTick = false,
                    turnsFirstTick = false,

                    rescalationExecutionTime = this.configuration.rotationDuration * 0.2, // 20% of animation time is for rescaling (one time for squeezing, one time for enlarging: 40% tot)
                    rescalationTargetScale, // scale dimension after rescalation
                    rescalationAmount, // dimension of rescalation (initialScale - rescalationTargetScale)
                    rescalationMultiplier, rescalationCurrentValue, previousScale,

                    turnsExecutionTime = this.configuration.rotationDuration * 0.6, // 60% of animation time is for rotation
                    turnsTargetRotation, // inclination after rotation
                    turnsAmount, // degrees of rotation
                    turnsMultiplier, turnsCurrentValue, turnsPreviousValue,

                    boardStartingSection, boardDestinationSection, // vars for board rotation
                    elementTurnsAmount, elementMultiplier; // vars for elements rotation

                return (function (event) {

                    if (createjs.Ticker.getPaused()) {
                        return;
                    }

                    if (this.update) {
                        this.update = false;
                        this.stage.update();
                    }

                    if (this.rotationDegrees) { // if there is a property with degrees of rotation then rotate the board

                        if (!squeezedBoard || enlargeBoard) { // do rescalation

                            if (squeezeFirstTick) {
                                rescalationTargetScale = this.configuration.squeezeScaleFactor;
                            }

                            if (enlargeFirstTick) {
                                rescalationTargetScale = previousScale / this.stage.scaleX; // TODO or calc max dim if board exceed canvas size due to rotation angle
                            }

                            if (squeezeFirstTick || enlargeFirstTick) { // initialization of squeezing
                                rescalationCurrentValue = 0;
                                previousScale = this.stage.scaleX;
                                rescalationAmount = this.stage.scaleX * rescalationTargetScale - this.stage.scaleX;
                                rescalationMultiplier = rescalationAmount / rescalationExecutionTime;
                                squeezeFirstTick = false; // condition to stop initialization
                                enlargeFirstTick = false; // condition to stop initialization
                            }

                            if (Math.abs(rescalationCurrentValue) >= Math.abs(rescalationAmount)) { // stop rescalation

                                this.stage.scaleX = this.stage.scaleY = previousScale * rescalationTargetScale; // set exact value

                                if (!squeezedBoard) {
                                    squeezedBoard = true; // stop squeezing condition
                                    turnsBoard = true; // next step condition
                                    turnsFirstTick = true; // next step condition
                                }

                                if (enlargeBoard) {
                                    enlargeBoard = false; // stop enlarging condition
                                    squeezedBoard = false; // next step condition
                                    squeezeFirstTick = true; // next step condition
                                    this.rotationDegrees = 0; // stop all rotation process
                                }

                            } else { // rescale
                                var amountForThisStep = event.delta * rescalationMultiplier;
                                rescalationCurrentValue += amountForThisStep;
                                this.stage.scaleX = this.stage.scaleY += amountForThisStep;
                            }
                        }

                        if (turnsBoard) {
                            if (turnsFirstTick) {
                                // initialization of turning
                                turnsCurrentValue = 0;
                                turnsPreviousValue = this.stage.rotation;
                                turnsAmount = this.rotationDegrees;
                                turnsTargetRotation = (((turnsAmount + turnsPreviousValue) % 360) + 360) % 360; // to make destination in [0, 360] regardless of dimensions of turnsAmount and turnsPreviousValue
                                turnsMultiplier = turnsAmount / turnsExecutionTime;

                                // initialization of elements turning
                                boardStartingSection = Math.floor(((turnsPreviousValue + 45) % 360) / 90);
                                boardDestinationSection = Math.floor(((turnsTargetRotation + 45) % 360) / 90);

                                var elementRotation = 0;
                                if (turnsAmount > 0) {
                                    elementRotation = ((4 - (boardStartingSection - boardDestinationSection)) % 4) * -90;
                                    if (elementRotation == 0 && turnsAmount >= 90) {
                                        elementRotation = -360;
                                    }
                                } else if (turnsAmount < 0) {
                                    elementRotation = ((4 + (boardStartingSection - boardDestinationSection)) % 4) * 90;
                                    if (elementRotation == 0 && turnsAmount < -90) {
                                        elementRotation = 360;
                                    }
                                }
                                elementRotation += parseInt(turnsAmount / 360, 10) * -360; // rotation of element is incremented of a complete cycle for each complete cycle of board rotation

                                elementMultiplier = elementRotation / turnsExecutionTime;

                                elementTurnsAmount = ((elementRotation % 360) + 360) % 360; // for negative numbers

                                for (var i = 0; i < this.containersToRotate.length; i++) {
                                    var container = this.containersToRotate[i];
                                    for (var j = 0; j < container.getNumChildren(); j++) {
                                        var element = container.getChildAt(j);
                                        element.elementPreviousRotation = element.rotation;
                                    }
                                }

                                turnsFirstTick = false; // condition to stop initialization
                            }

                            if (turnsCurrentValue >= Math.abs(turnsAmount)) { // stop rotation

                                // set exact value
                                this.stage.rotation = turnsTargetRotation;

                                for (var i = 0; i < this.containersToRotate.length; i++) {
                                    var container = this.containersToRotate[i];
                                    for (var j = 0; j < container.getNumChildren(); j++) {
                                        var element = container.getChildAt(j);
                                        element.rotation = (element.elementPreviousRotation + elementTurnsAmount) % 360;
                                        delete element.elementPreviousRotation;
                                    }
                                }

                                enlargeBoard = true; // next step condition
                                enlargeFirstTick = true; // condition for restart
                                boardStartingSection = 0; // condition for restart
                                boardDestinationSection = 0; // condition for restart
                                turnsBoard = false; // stop turning condition
                            } else { // rotate
                                var amountForThisStep = (event.delta * turnsMultiplier) % 360;

                                turnsCurrentValue += Math.abs(amountForThisStep);
                                this.stage.rotation += amountForThisStep;

                                for (var i = 0; i < this.containersToRotate.length; i++) {
                                    var container = this.containersToRotate[i];
                                    for (var j = 0; j < container.getNumChildren(); j++) {
                                        var element = container.getChildAt(j);
                                        amountForThisStep = event.delta * elementMultiplier;
                                        element.rotation += amountForThisStep;
                                    }
                                }
                            }
                        }

                        this.update = true;
                    }

                    if (this.listOfMovements.length > 0) { // if there is a property with a list of movements then move pieces
                        for (var i = this.listOfMovements.length - 1; i >= 0; i--) {
                            var move = this.listOfMovements[i];

                            var xyCoords = this.utils.getXYCoordsFromFileRank(move.destFile, move.destRank);

                            var distX = (xyCoords.x - move.piece.x);
                            var distY = (xyCoords.y - move.piece.y);

                            if (this.configuration.animationOfPieces) {
                                this.listOfMovements[i].piece.x += distX * 0.2;
                                this.listOfMovements[i].piece.y += distY * 0.2;
                            }

                            if (!this.configuration.animationOfPieces || (Math.abs(distY) <= 1 && Math.abs(distX) <= 1)) {
                                move.piece.x = xyCoords.x;
                                move.piece.y = xyCoords.y;

                                this.listOfMovements.splice(i, 1);
                            }
                        }

                        this.update = true;
                    }

                }).bind(this);
            }).bind(this))());
            createjs.Ticker.setFPS(40);

            this.update = true;

            if (this.configuration.position) {
                this.setPosition(this.configuration.position);
            }

            function setValues(configuration) {

                var canvasWidth = configuration.canvasSize || configuration.canvasWidth || configuration.canvasHeight || this.canvas.width;
                var canvasHeight = configuration.canvasSize || configuration.canvasHeight || canvasWidth || this.canvas.height;

                var borderSize;
                if (configuration.borderSize === undefined) {
                    var pivotValue = Math.min(canvasWidth, canvasHeight);
                    borderSize = pivotValue * 0.035;
                } else {
                    borderSize = configuration.borderSize;
                }

                var blocksInARow = configuration.blocksInARow || configuration.blocksInAColumn || 8;
                var blocksInAColumn = configuration.goGame ? blocksInARow : configuration.blocksInAColumn || blocksInARow || 8; // if board is for go game, board is NxN

                var blockSize,
                    shadowSize = borderSize,
                    marginBetweenBlocksSize = 0;

                if (configuration.blocksMargin != 0 && configuration.blocksMargin != undefined) {
                    if (configuration.blocksMargin == 'auto') {
                        var availableWidthForMarginsAndBlocks = canvasWidth - (borderSize + shadowSize) * 2;
                        var unitOfWidthSpaceForBlocks = availableWidthForMarginsAndBlocks / (100 * blocksInARow + 3 * (blocksInARow - 1)); // default block border size is ~3% of block size
                        var availableHeightForMarginsAndBlocks = canvasHeight - (borderSize + shadowSize) * 2;
                        var unitOfHeightSpaceForBlocks = availableHeightForMarginsAndBlocks / (100 * blocksInAColumn + 3 * (blocksInAColumn - 1)); // default block border size is ~3% of block size

                        var unitOfSpaceForBlocks = Math.min(unitOfWidthSpaceForBlocks, unitOfHeightSpaceForBlocks);
                        blockSize = Math.floor(unitOfSpaceForBlocks * 100);

                        var availableWidthForMargins = canvasWidth - (blockSize * blocksInARow) - (borderSize + shadowSize) * 2;
                        var marginWidth = availableWidthForMargins / (blocksInARow - 1);
                        var availableHeightForMargins = canvasHeight - (blockSize * blocksInAColumn) - (borderSize + shadowSize) * 2;
                        var marginHeight = availableHeightForMargins / (blocksInAColumn - 1);

                        marginBetweenBlocksSize = Math.floor(Math.min(marginWidth, marginHeight));
                    } else {
                        marginBetweenBlocksSize = configuration.blocksMargin;
                    }
                }

                var blockWidth = (canvasWidth - (borderSize + shadowSize) * 2 - (marginBetweenBlocksSize * (blocksInARow - 1))) / blocksInARow;
                var blockHeight = (canvasHeight - (borderSize + shadowSize) * 2 - (marginBetweenBlocksSize * (blocksInAColumn - 1))) / blocksInAColumn;

                blockSize = Math.floor(Math.min(blockWidth, blockHeight));

                var allBlocksWidth = blockSize * blocksInARow + marginBetweenBlocksSize * (blocksInARow - 1);
                var allBlocksHeight = blockSize * blocksInAColumn + marginBetweenBlocksSize * (blocksInAColumn - 1);

                return {
                    canvasId:                configuration.canvasId,
                    canvasWidth:             canvasWidth,
                    canvasHeight:            canvasHeight,
                    canvasSize:              configuration.canvasSize,
                    shadowSize:              shadowSize,
                    borderSize:              borderSize,
                    blockSize:               blockSize,
                    marginBetweenBlocksSize: marginBetweenBlocksSize,
                    highlighterSize:         blockSize * 0.03,
                    allBlocksWidth:          allBlocksWidth,
                    allBlocksHeight:         allBlocksHeight,
                    boardPaddingWidthSize:   (canvasWidth - allBlocksWidth - (borderSize + shadowSize) * 2) / 2,
                    boardPaddingHeightSize:  (canvasHeight - allBlocksHeight - (borderSize + shadowSize) * 2) / 2,
                    gridLinesSize:           configuration.gridLinesSize || blockSize * 0.03,
                    blocksInARow:            blocksInARow,
                    blocksInAColumn:         blocksInAColumn,
                    coords:                  configuration.coords !== false,
                    type:                    configuration.type === 'linesGrid' || configuration.goGame === true ? 'linesGrid' : 'blocksGrid',
                    lightSquaresColor:       configuration.lightSquaresColor || "#EFEFEF",
                    darkSquaresColor:        configuration.darkSquaresColor || "#ABABAB",
                    linesColor:              configuration.linesColor || "#000",
                    borderColor:             configuration.borderColor || "#222",
                    shadowColor:             configuration.shadowColor || "#000",
                    labelsColor:             configuration.labelsColor || "#DDD",
                    highlighterColor:        configuration.highlighterColor || "lightgreen",
                    marginColor:             configuration.marginColor || "#222",
                    rotationDuration:        configuration.rotationDuration === undefined ? 500 : configuration.rotationDuration,
                    squeezeScaleFactor:      configuration.squeezeScaleFactor || 0.7,
                    animationOfPieces:       configuration.animationOfPieces !== false,
                    piecesFolder:            configuration.piecesFolder || "./img",
                    piecesFiles:             configuration.piecesFiles || {},
                    actionsOnPieces:         configuration.actionsOnPieces !== false,
                    blocksMargin:            configuration.blocksMargin || 0,
                    goGame:                  configuration.goGame === true,
                    position:                configuration.position,
                    hooks:                   configuration.hooks || {},
                    chessGame:               configuration.chessGame || {}
                }
            }

            function addLabelsToContainer(container, labelSize, orientation) {

                var labelsArray = [];

                var neededCharsForRow = this.utils.getNumberOfCharsInHorizontalBoardLabels();
                var neededCharsForColumn = this.utils.getNumberOfCharsInVerticalBoardLabels();

                var fontSize = labelSize / Math.max(neededCharsForRow, neededCharsForColumn);

                if (orientation == "V") {
                    for (var i = this.configuration.blocksInAColumn; i > 0; i--) {
                        labelsArray.push(i);
                    }
                } else {
                    var charsInLabel = this.utils.getNumberOfCharsInHorizontalBoardLabels();
                    for (var i = 0; i < this.configuration.blocksInARow; i++) {
                        var label = "";
                        for (var j = charsInLabel; j > 0; j--) {
                            label += H_BOARD_LABELS_ALPHABET.charAt(Math.floor((i % Math.pow(H_BOARD_LABELS_ALPHABET.length, j)) / Math.pow(H_BOARD_LABELS_ALPHABET.length, j - 1)));
                        }
                        labelsArray.push(label);
                    }
                }

                var stopCondition = orientation == "H" ? this.configuration.blocksInARow : this.configuration.blocksInAColumn;

                for (var i = 0; i < stopCondition; i++) {

                    var label = new createjs.Text(labelsArray[i], fontSize + "px sans", this.configuration.labelsColor);
                    label.regX = label.getBounds().width / 2;
                    label.regY = label.getMeasuredLineHeight() / 2;

                    var fixedCoord = this.configuration.borderSize / 2 + this.configuration.shadowSize + (orientation == "H" ? this.configuration.boardPaddingHeightSize : this.configuration.boardPaddingWidthSize);
                    var floatingCoord = this.configuration.borderSize + i * (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) + this.configuration.blockSize / 2 + this.configuration.shadowSize + (orientation == "H" ? this.configuration.boardPaddingWidthSize : this.configuration.boardPaddingHeightSize);

                    label.x = orientation == "H" ? floatingCoord : fixedCoord;
                    label.y = orientation == "H" ? fixedCoord : floatingCoord;

                    var otherSideCoord = this.configuration.borderSize / 2 + (orientation == "H" ? this.configuration.allBlocksHeight : this.configuration.allBlocksWidth) + this.configuration.borderSize + this.configuration.shadowSize + (orientation == "H" ? this.configuration.boardPaddingHeightSize : this.configuration.boardPaddingWidthSize);

                    var clonedLabel = label.clone();
                    orientation == "H" ? clonedLabel.y = otherSideCoord : clonedLabel.x = otherSideCoord;

                    container.addChild(label);
                    container.addChild(clonedLabel);
                }
            }

            function getBlockColour(columnIndex, rowIndex) {
                var backColor;
                if (this.configuration.type == 'linesGrid') {
                    backColor = this.configuration.lightSquaresColor;
                } else {
                    if (rowIndex % 2)
                        backColor = (columnIndex % 2 ? this.configuration.darkSquaresColor : this.configuration.lightSquaresColor);
                    else
                        backColor = (columnIndex % 2 ? this.configuration.lightSquaresColor : this.configuration.darkSquaresColor);
                }
                return backColor;
            }

            function drawBlockLines(block, columnOfBlock, rowOfBlock) {

                var blockGraphic = block.graphics;

                blockGraphic
                    .beginStroke(this.configuration.linesColor)
                    .setStrokeStyle(this.configuration.gridLinesSize);

                if (columnOfBlock !== 0) {
                    blockGraphic
                        .moveTo(this.configuration.blockSize / 2, this.configuration.blockSize / 2)
                        .lineTo(0, this.configuration.blockSize / 2)
                }
                if (columnOfBlock != this.configuration.blocksInARow - 1) {
                    blockGraphic
                        .moveTo(this.configuration.blockSize / 2, this.configuration.blockSize / 2)
                        .lineTo(this.configuration.blockSize, this.configuration.blockSize / 2)
                }
                if (rowOfBlock !== 0) {
                    blockGraphic
                        .moveTo(this.configuration.blockSize / 2, this.configuration.blockSize / 2)
                        .lineTo(this.configuration.blockSize / 2, this.configuration.blockSize)
                }
                if (rowOfBlock != this.configuration.blocksInAColumn - 1) {
                    blockGraphic
                        .moveTo(this.configuration.blockSize / 2, this.configuration.blockSize / 2)
                        .lineTo(this.configuration.blockSize / 2, 0)
                }

                if (this.configuration.goGame) {
                    if (this.configuration.blocksInARow % 2 !== 0 && columnOfBlock == Math.floor(this.configuration.blocksInARow / 2) && rowOfBlock == Math.floor(this.configuration.blocksInARow / 2)) {
                        drawCircle.call(this);
                    }
                    if (this.configuration.blocksInARow >= 9 && this.configuration.blocksInARow < 13) {
                        if (((columnOfBlock == 2) || (this.configuration.blocksInARow - columnOfBlock == 3)) && ((rowOfBlock == 2) || (this.configuration.blocksInARow - rowOfBlock == 3))) {
                            drawCircle.call(this);
                        }
                    }
                    if (this.configuration.blocksInARow >= 13) {
                        if (((columnOfBlock == 3) || (this.configuration.blocksInARow - columnOfBlock == 4)) && ((rowOfBlock == 3) || (this.configuration.blocksInARow - rowOfBlock == 4))) {
                            drawCircle.call(this);
                        }
                    }
                    if (this.configuration.blocksInARow >= 19) {
                        if (((columnOfBlock == 3 || (this.configuration.blocksInARow - columnOfBlock == 4)) && rowOfBlock == Math.floor(this.configuration.blocksInARow / 2)) || ((rowOfBlock == 3 || (this.configuration.blocksInARow - rowOfBlock == 4)) && columnOfBlock == Math.floor(this.configuration.blocksInARow / 2))) {
                            drawCircle.call(this);
                        }
                    }
                }

                function drawCircle() {
                    blockGraphic
                        .moveTo(this.configuration.blockSize / 2, this.configuration.blockSize / 2)
                        .beginFill(this.configuration.linesColor)
                        .drawCircle(this.configuration.blockSize / 2, this.configuration.blockSize / 2, this.configuration.gridLinesSize * 2.5);
                }
            }

        }).bind(this))();
    }

    CanvasBoard.prototype.rotate = function (degrees) {

        if (degrees !== undefined && !Number.isInteger(degrees)) {
            throw new Error("rotate: passed value is not an integer.");
        }

        this.rotationDegrees = degrees || 180;
    };

    CanvasBoard.prototype.setRotation = function (degrees) {

        if (degrees !== undefined && !Number.isInteger(degrees)) {
            throw new Error("setRotation: passed value is not an integer.");
        }

        degrees = degrees || 0;

        this.stage.rotation = ((degrees % 360) + 360) % 360; // to make destination in [0, 360]

        var elementRotation = Math.floor(((this.stage.rotation + 45) % 360) / 90) * -90;

        for (var i = 0; i < this.containersToRotate.length; i++) {
            var container = this.containersToRotate[i];
            for (var j = 0; j < container.getNumChildren(); j++) {
                var element = container.getChildAt(j);
                element.rotation = (elementRotation) % 360;
            }
        }

        this.update = true;
    };

    CanvasBoard.prototype.scale = function (scaleFactor) {

        if (scaleFactor === undefined || isNaN(scaleFactor) || scaleFactor < 0) {
            throw new Error("scale: invalid scale parameter.");
        }

        this.canvas.width = this.configuration.canvasWidth * scaleFactor;
        this.canvas.height = this.configuration.canvasHeight * scaleFactor;

        this.stage.scaleX = this.stage.scaleY = this.stage.scale = scaleFactor;
        this.stage.x = this.configuration.canvasWidth * scaleFactor / 2;
        this.stage.y = this.configuration.canvasHeight * scaleFactor / 2;
        this.update = true;
    };

    CanvasBoard.prototype.setPosition = function (position) {
        /*
         * gets position in FEN notation as input and sets board
         * if no parameter is passed then clear the board
         */

        if (position == undefined || position == '') { // clean the board
            position = "";
            for (var i=0; i<this.configuration.blocksInAColumn; i++) {
                if (position.length > 0) {
                    position += "/";
                }
                position += this.configuration.blocksInARow;
            }
        }

        var currentBoard = this.utils.getCurrentBoard();
        var newBoard = this.utils.getBoardFromFen(position);

        if (newBoard.length != this.configuration.blocksInARow || newBoard[0].length != this.configuration.blocksInAColumn) {
            throw new Error("setPosition: invalid input parameter.");
        }

        // temp vars for computation
        var assignedPieces = [];
        var listOfMovements = [];

        // find pieces that yet are in the correct position
        for (var i = 0; i < this.configuration.blocksInARow; i++) { // file (column)
            for (var j = 0; j < this.configuration.blocksInAColumn; j++) { // rank (row)
                if (currentBoard[i][j] && newBoard[i][j]) {
                    for (var z = 0; z < this.piecesContainer.getNumChildren(); z++) {
                        var piece = this.piecesContainer.getChildAt(z);
                        if (piece.file == i && piece.rank == j) {
                            var indexInNewBoard = newBoard[i][j].indexOf(piece.label);
                            if (indexInNewBoard != -1 && currentBoard[i][j].indexOf(piece.label) != -1) {
                                assignedPieces.push(piece);
                                if (newBoard[i][j].length == 1) {
                                    newBoard[i][j] = undefined;
                                    break;
                                } else {
                                    newBoard[i][j].splice(indexInNewBoard, 1);
                                }
                            }
                        }
                    }

                }
            }
        }

        // find pieces on board to move
        for (var i = 0; i < this.configuration.blocksInARow; i++) { // file (column)
            for (var j = 0; j < this.configuration.blocksInAColumn; j++) { // rank (row)
                if (newBoard[i][j]) {
                    for (var z = 0; z < this.piecesContainer.getNumChildren(); z++) {
                        var piece = this.piecesContainer.getChildAt(z);
                        if (assignedPieces.indexOf(piece) == -1) {
                            var indexInNewBoard = newBoard[i][j].indexOf(piece.label);
                            if (indexInNewBoard != -1) { // if true piece is a candidate to reach (i,j) position
                                var distance = Math.pow((piece.file - i), 2) + Math.pow((piece.rank - j), 2);
                                for (var k = z + 1; k < this.piecesContainer.getNumChildren(); k++) {
                                    var alternativePiece = this.piecesContainer.getChildAt(k);
                                    if (newBoard[i][j].indexOf(alternativePiece.label) != -1 && assignedPieces.indexOf(alternativePiece) == -1) { // search for a piece for a more consistent movement
                                        var alternativeDistance = 0;

                                        if (this.configuration.chessGame.bishopLabel && alternativePiece.label.toUpperCase() == this.configuration.chessGame.bishopLabel.toUpperCase()) {
                                            if (((alternativePiece.rank + alternativePiece.file) % 2 == (i + j) % 2) && ((piece.rank + piece.file) % 2 != (i + j) % 2)) { // found a bishop of correct square color, while current selected bishop is on a square with of not correct color
                                                piece = alternativePiece;
                                            } else if ((((alternativePiece.rank + alternativePiece.file) % 2 != (i + j) % 2) && ((piece.rank + piece.file) % 2 != (i + j) % 2)) || (((alternativePiece.rank + alternativePiece.file) % 2 == (i + j) % 2) && ((piece.rank + piece.file) % 2 == (i + j) % 2))) { // both bishops are on squares of same color
                                                alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                            }
                                        } else if (this.configuration.chessGame.rookLabel && alternativePiece.label.toUpperCase() == this.configuration.chessGame.rookLabel.toUpperCase()) {
                                            if ((alternativePiece.file == i || alternativePiece.rank == j) && !(piece.file == i || piece.rank == j)) { // alternative rook has correct file or rank, while current selected rook not
                                                piece = alternativePiece;
                                            } else { // check alternative rook by distance
                                                alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                            }
                                        } else if (this.configuration.chessGame.pawnLabel && alternativePiece.label.toUpperCase() == this.configuration.chessGame.pawnLabel.toUpperCase()) {
                                            if (alternativePiece.file == i && piece.file != i) { // alternative pawn has correct file, while current pawn not
                                                piece = alternativePiece;
                                            } else if ((alternativePiece.file == i && piece.file == i) || (alternativePiece.file != i && piece.file != i)) {
                                                alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                            }
                                        } else {
                                            alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                        }

                                        if (alternativeDistance && alternativeDistance < distance) {
                                            distance = alternativeDistance;
                                            piece = alternativePiece;
                                        }
                                    }
                                }

                                assignedPieces.push(piece);
                                listOfMovements.push([piece, this.utils.getPositionLabelFromFileRank(i, j)]);
                                if (newBoard[i][j].length == 1) {
                                    newBoard[i][j] = undefined;
                                    break;
                                } else {
                                    newBoard[i][j].splice(indexInNewBoard, 1);
                                }
                            }
                        }
                    }
                }
            }
        }

        // remove pieces that have no position
        for (var i = this.piecesContainer.getNumChildren() - 1; i >= 0; i--) {
            var piece = this.piecesContainer.getChildAt(i);
            if (assignedPieces.indexOf(piece) == -1) {
                this.removePiece(piece);
            }
        }

        // add missing pieces
        var xStarting, yStarting;
        if (this.piecesContainer.getNumChildren() == 0 && this.configuration.animationOfPieces) { // if board is empty and animation is active then movements of new position start from center of board
            xStarting = this.configuration.allBlocksWidth / 2;
            yStarting = this.configuration.allBlocksHeight / 2;
        }
        for (var i = 0; i < this.configuration.blocksInARow; i++) { // file (column)
            for (var j = 0; j < this.configuration.blocksInAColumn; j++) { // rank (row)
                if (newBoard[i][j]) {
                    for (var z = 0; z<newBoard[i][j].length; z++) {
                        var promise = this.getNewPiece(newBoard[i][j][z]);
                        promise.then(
                            (function (file, rank, piece) {
                                piece.x = xStarting;
                                piece.y = yStarting;
                                this.setPieceAtPosition(piece, this.utils.getPositionLabelFromFileRank(file, rank));
                            }).bind(this, i, j)
                        ).catch(function (error) {
                            console.log(error);
                        });
                    }
                }
            }
        }

        // set pieces positions
        this.setPieceAtPosition.apply(this, listOfMovements);
    };

    CanvasBoard.prototype.getPosition = function () {
        /*
         * returns board position in FEN-like notation
         */

        return this.utils.getFenFromBoard(this.utils.getCurrentBoard());
    };

    CanvasBoard.prototype.move = function (/* arguments: see comment */) {
        /*
         * Possible inputs:
         *   1. ("H3", "G3") // couple of position labels for single move
         *   2. (piece, "G3") // instance of a piece and position label
         *   3. (["H3", "G3"], [piece, "F7"], .....) // list of arrays of two elements for multiple moves simultaneously
         */

        if (arguments.length == 2 && (this.utils.isPositionLabel(arguments[0]) || this.utils.isPiece(arguments[0])) && this.utils.isPositionLabel(arguments[1])) { // method overload
            return this.move([arguments[0], arguments[1]]);
        }

        var movements = Array.prototype.slice.call(arguments);

        var movementsArrayWithPiece = [];
        movements.forEach((function (movement) {

            if (!movement) {
                return;
            }

            var piecesAtStartingPosition, positionFrom;

            if (this.utils.isPiece(movement[0])) {
                positionFrom = this.utils.getPositionLabelFromFileRank(movement[0].file, movement[0].rank);
                piecesAtStartingPosition = [movement[0]];
            } else if (this.utils.isPositionLabel(movement[0])) {
                positionFrom = movement[0];
                piecesAtStartingPosition = this.getPieceAtPosition(positionFrom);
                if (piecesAtStartingPosition) {
                    if (!this.utils.isArray(piecesAtStartingPosition)) {
                        piecesAtStartingPosition = [piecesAtStartingPosition];
                    }
                } else {
                    return;
                }
            } else {
                return;
            }

            if (!this.utils.isPositionLabel(movement[1])) {
                return;
            }

            var piecesAtDestination = this.getPieceAtPosition(movement[1]);
            if (piecesAtDestination) {
                if (!this.utils.isArray(piecesAtDestination)) {
                    piecesAtDestination = [piecesAtDestination];
                }
            } else {
                piecesAtDestination = [];
            }

            piecesAtStartingPosition.forEach((function (piece) {
                if (this.configuration.hooks.isValidMove) {
                    var isValidMove = this.configuration.hooks.isValidMove.call(this, positionFrom, movement[1], piece, piecesAtDestination);
                    if (isValidMove == true) {
                        movementsArrayWithPiece.push([positionFrom, movement[1], piece, piecesAtDestination]);
                    } else if (isValidMove != false && isValidMove !=  undefined) {
                        throw new Error(".isValidMove: invalid hook function.")
                    }
                } else {
                    movementsArrayWithPiece.push([positionFrom, movement[1], piece, piecesAtDestination]);
                }
            }).bind(this));

        }).bind(this));

        var movementsOccurred = false;

        movementsArrayWithPiece.forEach((function(movement) {

            var preMoveReturned;
            if (this.configuration.hooks.preMove) {
                preMoveReturned = this.configuration.hooks.preMove.call(this, movement[0], movement[1], movement[2], movement[3]); // positionFrom, positionTo, pieceFrom, piecesTo
            }
            this.piecesContainer.removeChild(movement[2]);
            this.piecesContainer.addChild(movement[2]);
            var moved = this.setPieceAtPosition(movement[2], movement[1]);
            if (this.configuration.hooks.postMove) {
                this.configuration.hooks.postMove.call(this, movement[0], movement[1], movement[2], movement[3], preMoveReturned, moved);
            }

            movementsOccurred = moved || movementsOccurred;
        }).bind(this));

        return movementsOccurred;
    };

    CanvasBoard.prototype.setPieceAtPosition = function (/* arguments: see comment */) {
        /*
         * Possible inputs:
         *   1. (piece, "H7") // instance of piece and position label of destination
         *   2. ([piece1, "H7"], [piece2, "G3"], .....) // list of arrays of two elements (as above) for multiple moves simultaneously
         */

        if (arguments.length == 2 && this.utils.isPiece(arguments[0]) && this.utils.isPositionLabel(arguments[1])) { // method overload
            return this.setPieceAtPosition([arguments[0], arguments[1]]);
        }

        var movements = Array.prototype.slice.call(arguments);

        var movementsList = [];

        var thereArePiecesToMove = false;

        movements.forEach((function (movement) {

            if (!this.utils.isPiece(movement[0]) || !this.utils.isPositionLabel(movement[1])) {
                return;
            }

            var piece = movement[0];
            var position = movement[1];

            var numericPosition = this.utils.getFileRankFromPositionLabel(position);
            var file = numericPosition.file;
            var rank = numericPosition.rank;

            if (!this.piecesContainer.contains(piece)) {
                if (!piece.x || !piece.y) { // a new piece (with no x,y coords) is immediately placed in the position without movement
                    var xyCoords = this.utils.getXYCoordsFromFileRank(file, rank);
                    piece.x = xyCoords.x;
                    piece.y = xyCoords.y;
                }
                this.piecesContainer.addChild(piece);
            }

            var yetMoving = false;
            for (var i = 0; i < this.listOfMovements.length; i++) {
                var move = this.listOfMovements[i];
                if (move.piece == piece) {
                    move.destFile = file;
                    move.destRank = rank;
                    yetMoving = true;
                    break;
                }
            }

            if (!yetMoving) {
                movementsList.push({
                    piece: piece,
                    destFile: file,
                    destRank: rank
                });
            }

            piece.file = file;
            piece.rank = rank;

            thereArePiecesToMove = true;

        }).bind(this));

        if (!thereArePiecesToMove) {
            return false;
        } else {
            this.listOfMovements = this.listOfMovements.concat(movementsList);
            return true;
        }
    };

    CanvasBoard.prototype.getPieceAtPosition = function (position) {
        /*
         * returns  - array of pieces on position passed as parameter
         *          - or single piece if there is only one piece on position
         *          - undefined if no piece is in position
         */

        if (!this.utils.isPositionLabel(position)) {
            throw new Error("getPieceAtPosition: invalid position.")
        }

        var numericPosition = this.utils.getFileRankFromPositionLabel(position);

        var file = numericPosition.file;
        var rank = numericPosition.rank;

        var piecesOnPosition = [];

        for (var i = this.piecesContainer.getNumChildren()-1; i >= 0; i--) {
            var piece = this.piecesContainer.getChildAt(i);
            if (piece.file == file && piece.rank == rank) {
                piecesOnPosition.push(piece);
            }
        }

        return piecesOnPosition.length == 0 ? undefined :
            piecesOnPosition.length == 1 ? piecesOnPosition[0] :
                piecesOnPosition;
    };

    CanvasBoard.prototype.removePieceFromPosition = function (position) {
        // remove all pieces from position passed as parameter

        if (!this.utils.isPositionLabel(position)) {
            throw new Error("removePieceFromPosition: invalid position.")
        }

        var pieces = this.getPieceAtPosition(position);

        if (!pieces) {
            return false;
        }

        if (!this.utils.isArray(pieces)) {
            pieces = [pieces];
        }

        pieces.forEach((function (piece) {
            this.piecesContainer.removeChild(piece);
        }).bind(this));

        this.update = true;

        return true;
    };

    CanvasBoard.prototype.removePiece = function (piece) {

        if (!this.utils.isPiece(piece)) {
            throw new Error("removePiece: invalid input parameter.")
        }

        if (this.piecesContainer.contains(piece)) {
            this.piecesContainer.removeChild(piece);
            this.update = true;
            return true;
        }

        return false;
    };

    CanvasBoard.prototype.getNewPiece = function (pieceLabel) { // input: label of piece
        /*
         * async function that returns a promise!
         *
         * Use:
         *  var promise = myBoard.getNewPiece("p");
         *  promise.then(function(requestedPiece) {
         *       // piece handling
         *  }).catch(function(errorGettingPiece) {
         *       // error handling
         *  });
         *
         *  .then() chaining and .catch() chaining is supported
         */

        var deferred = customQ.defer();

        var promise = this.utils.createPiece(pieceLabel);

        promise.then((function (piece) {

            var piece = new createjs.Bitmap(piece);
            piece.label = pieceLabel;
            piece.regX = piece.regY = this.piecesBox[pieceLabel].width / 2;
            piece.scaleX = piece.scaleY = piece.scale = (this.configuration.blockSize * 0.9) / this.piecesBox[pieceLabel].width;

            piece.x = undefined;
            piece.y = undefined;

            var boardSection = Math.floor(((this.stage.rotation + 45) % 360) / 90);
            piece.rotation = boardSection * -90;

            if (this.configuration.actionsOnPieces) {

                piece.cursor = "pointer";
                piece.hitArea = new createjs.Shape();
                piece.hitArea.graphics.beginFill("#000")
                    .drawRect(0, 0, this.piecesBox[pieceLabel].width, this.piecesBox[pieceLabel].height);

                piece.addEventListener("rollover", (function (evt) {
                    if (!this.selectedPiece) {
                        var piece = evt.target;
                        piece.scaleX = piece.scaleY = piece.scale * PIECE_ZOOM_FACTOR;
                        piece.shadow = new createjs.Shadow(this.configuration.shadowColor, 3, 3, 5);
                        this.update = true;
                    } else {
                        this.stage.getChildByName("boardContainer").removeChild(this.stage.getChildByName("boardContainer").getChildByName("blockHighlighter"));
                        var pt = this.stage.getChildByName("boardContainer").globalToLocal(evt.stageX, evt.stageY);
                        var numericPosition = this.utils.getFileRankFromXYCoords(pt.x, pt.y);
                        var blockHighlighter = new createjs.Shape();
                        blockHighlighter.graphics.beginStroke(this.configuration.highlighterColor)
                            .setStrokeStyle(this.configuration.highlighterSize)
                            .drawRect(
                                (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * numericPosition.file + this.configuration.highlighterSize / 2,
                                (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * (this.configuration.blocksInAColumn - numericPosition.rank - 1) + this.configuration.highlighterSize / 2,
                                this.configuration.blockSize - this.configuration.highlighterSize,
                                this.configuration.blockSize - this.configuration.highlighterSize);
                        blockHighlighter.name = "blockHighlighter";
                        this.stage.getChildByName("boardContainer").addChildAt(blockHighlighter, this.stage.getChildByName("boardContainer").getNumChildren() - 1);
                        this.update = true;
                    }
                }).bind(this));

                piece.addEventListener("rollout", (function (evt) {
                    if (!this.selectedPiece) {
                        var piece = evt.target;
                        piece.scaleX = piece.scaleY = piece.scale;
                        piece.shadow = null;
                        this.update = true;
                    } else {
                        this.stage.getChildByName("boardContainer").removeChild(this.stage.getChildByName("boardContainer").getChildByName("blockHighlighter"));
                        this.update = true;
                    }
                }).bind(this));

                piece.addEventListener("mousedown", (function (evt) {
                    var piece = evt.target;

                    for (var i = 0; i < this.listOfMovements.length; i++) {
                        if (this.listOfMovements[i].piece == piece) {
                            this.listOfMovements.splice(i,1);
                            break;
                        }
                    }

                    var xyCoords = {};
                    if (piece.file != undefined && piece.rank != undefined) {
                        xyCoords = this.utils.getXYCoordsFromFileRank(piece.file, piece.rank);
                    }
                    piece.startPosition = {
                        x: xyCoords.x || piece.x,
                        y: xyCoords.y || piece.y
                    };
                    if (!this.selectedPiece) {
                        var boardContainer = this.stage.getChildByName("boardContainer");
                        var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                        this.piecesContainer.removeChild(piece);
                        this.piecesContainer.addChild(piece);

                        piece.x = pt.x;
                        piece.y = pt.y;

                        this.update = true;
                    }
                }).bind(this));

                piece.addEventListener("pressmove", (function (evt) {
                    var piece = evt.target;
                    var boardContainer = this.stage.getChildByName("boardContainer");
                    var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                    if (this.selectedPiece) {
                        boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));
                        this.selectedPiece.scaleX = this.selectedPiece.scaleY = this.selectedPiece.scale;
                        this.selectedPiece.shadow = null;
                        this.selectedPiece = undefined;

                        piece.scaleX = piece.scaleY = piece.scale * PIECE_ZOOM_FACTOR;
                        piece.shadow = new createjs.Shadow(this.configuration.shadowColor, 3, 3, 5);

                        this.piecesContainer.removeChild(piece);
                        this.piecesContainer.addChild(piece);

                        piece.x = pt.x;
                        piece.y = pt.y;

                        this.update = true;
                    }

                    var numericPosition = this.utils.getFileRankFromXYCoords(pt.x, pt.y);

                    var file = numericPosition.file;
                    var rank = numericPosition.rank;

                    piece.x = pt.x;
                    piece.y = pt.y;

                    var currentSquare = undefined;
                    if (file >= 0 && file < this.configuration.blocksInARow && rank >= 0 && rank < this.configuration.blocksInAColumn) {
                        currentSquare = file + this.configuration.blocksInARow * rank;
                    }

                    if (currentSquare != piece.currentSquare) {
                        boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));
                        piece.currentSquare = currentSquare;
                        if (currentSquare != undefined) {
                            if (this.configuration.type == 'linesGrid') { // add an highlighter circle at cross of lines
                                var blockHighlighter = new createjs.Shape();
                                blockHighlighter.alpha = 0.8;
                                blockHighlighter.graphics
                                    .beginFill(this.configuration.highlighterColor)
                                    .drawCircle(
                                        (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * (piece.currentSquare % this.configuration.blocksInARow) + this.configuration.blockSize / 2,
                                        (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * (this.configuration.blocksInAColumn - Math.floor(piece.currentSquare / this.configuration.blocksInARow) - 1) + this.configuration.blockSize / 2,
                                        this.configuration.highlighterSize * 2.5);

                                blockHighlighter.name = "blockHighlighter";
                            } else { // add an highlighter border to block
                                var blockHighlighter = new createjs.Shape();
                                blockHighlighter.graphics.beginStroke(this.configuration.highlighterColor)
                                    .setStrokeStyle(this.configuration.highlighterSize)
                                    .drawRect(
                                        (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * file + this.configuration.highlighterSize / 2,
                                        (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * (this.configuration.blocksInAColumn - rank - 1) + this.configuration.highlighterSize / 2,
                                        this.configuration.blockSize - this.configuration.highlighterSize,
                                        this.configuration.blockSize - this.configuration.highlighterSize);
                                blockHighlighter.name = "blockHighlighter";
                            }

                            boardContainer.addChildAt(blockHighlighter, boardContainer.getNumChildren()-1);
                        }
                    }

                    this.update = true;
                }).bind(this));

                piece.addEventListener("pressup", (function (evt) {
                    var piece = evt.target;
                    var boardContainer = this.stage.getChildByName("boardContainer");
                    var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                    var numericPosition = this.utils.getFileRankFromXYCoords(pt.x, pt.y);

                    var file = numericPosition.file;
                    var rank = numericPosition.rank;

                    boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));

                    var currentSquare = undefined; // block where mouse released
                    if (file >= 0 && file < this.configuration.blocksInARow && rank >= 0 && rank < this.configuration.blocksInAColumn) {
                        currentSquare = file + this.configuration.blocksInARow * rank;
                    }

                    if (currentSquare == undefined) { // release click outside board
                        piece.x = piece.startPosition.x;
                        piece.y = piece.startPosition.y;
                        this.update = true;
                    } else {
                        if (currentSquare != piece.file + this.configuration.blocksInARow * piece.rank) { // released on different block where piece was
                            var destPosition = this.utils.getPositionLabelFromFileRank(file, rank);
                            var moved = this.move(piece, destPosition);

                            if (!moved) {
                                piece.x = piece.startPosition.x;
                                piece.y = piece.startPosition.y;
                                this.update = true;
                            }
                        } else {
                            if (!this.selectedPiece) {
                                this.selectedPiece = piece;
                                var blockHighlighter = new createjs.Shape();
                                blockHighlighter.graphics.beginStroke(this.configuration.highlighterColor)
                                    .setStrokeStyle(this.configuration.highlighterSize)
                                    .drawRect(
                                        (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * file + this.configuration.highlighterSize / 2,
                                        (this.configuration.blockSize + this.configuration.marginBetweenBlocksSize) * (this.configuration.blocksInAColumn - rank - 1) + this.configuration.highlighterSize / 2,
                                        this.configuration.blockSize - this.configuration.highlighterSize,
                                        this.configuration.blockSize - this.configuration.highlighterSize);
                                blockHighlighter.name = "blockHighlighter";
                                boardContainer.addChildAt(blockHighlighter, boardContainer.getNumChildren() - 1);
                            } else {
                                if (piece != this.selectedPiece) {
                                    var destPosition = this.utils.getPositionLabelFromFileRank(file, rank);
                                    var moved = this.move(this.selectedPiece, destPosition);
                                    if (!moved) {
                                        this.selectedPiece.x = this.selectedPiece.startPosition.x;
                                        this.selectedPiece.y = this.selectedPiece.startPosition.y;
                                    }
                                }
                                this.selectedPiece.scaleX = this.selectedPiece.scaleY = this.selectedPiece.scale;
                                this.selectedPiece.shadow = null;
                                this.selectedPiece = undefined;
                            }

                            piece.x = piece.startPosition.x;
                            piece.y = piece.startPosition.y;
                            this.update = true;
                        }
                    }
                }).bind(this));
            }

            deferred.resolve(piece);

        }).bind(this)).catch(function (error) {
            deferred.reject(error);
        });

        return deferred.promise;
    };

    return CanvasBoard;
    
});