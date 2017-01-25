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

    /*
     * Lightweight Q-like reimplementation from scratch of Promises.
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
     *                      // signature: function postMove({?} returnedFromPreMove, {Boolean} returnedFromMove, {String} positionFrom, {String} positionTo, {Object} pieceFrom, {Array} piecesTo)
     *  },                  //                                                  |                   |
     *  chessGame: {        // to define properties for chess optimization      | object            | optional - no default: board is not optimized for chess
     *      pawnLabel,      // label of pawn, used in filename of piece         | string            | optional - no default: no movement optimization for pawn
     *      bishopLabel,    // label of bishop, used in filename of piece       | string            | optional - no default: no movement optimization for bishop
     *      rookLabel       // label of rook, used in filename of piece         | string            | optional - no default: no movement optimization for rook
     *  }
     * }
     */
    return function(configuration) {

        // private
        var _stage, _canvas, _configuration, _selectedPiece,
            _piecesContainer, // createjs.Container containing pieces currently on board
            _loadingPieces = {}, // object containing pieces which image is loading
            _piecesBox = {}, // object containing pieces which image is yet loaded
            _update = false,
            _rotationDegrees = 0,
            _listOfMovements = [],
            _containersToRotate = [],
            _hBoardLabelsAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        function __getNumberOfChars(numberOfElements, numberOfSymbols) {
            return Math.ceil(Math.log(numberOfElements) / Math.log(numberOfSymbols));
        }

        function _getNumberOfCharsInHorizontalBoardLabels() {
            return __getNumberOfChars(_configuration.blocksInARow, _hBoardLabelsAlphabet.length) || 1;
        }

        function _getNumberOfCharsInVerticalBoardLabels() {
            return __getNumberOfChars(_configuration.blocksInAColumn, 10) || 1;
        }

        function _getFileRankFromPositionLabel(positionLabel) {

            var charsInHorizontalLabel = _getNumberOfCharsInHorizontalBoardLabels();
            var fileLabel = positionLabel.substr(0, charsInHorizontalLabel);
            var rankLabel = positionLabel.substr(charsInHorizontalLabel);

            var file = 0;
            for (var i = 0; i < charsInHorizontalLabel; i++) {
                file += _hBoardLabelsAlphabet.indexOf(fileLabel.charAt(i)) * Math.pow(_hBoardLabelsAlphabet.length, charsInHorizontalLabel - (i + 1));
            }
            var rank = rankLabel - 1;

            return {
                file: file,
                rank: rank
            };
        }

        function _getPositionLabelFromFileRank(file, rank) {

            var charsInLabel = _getNumberOfCharsInHorizontalBoardLabels();
            var label = "";
            for (var j = charsInLabel; j > 0; j--) {
                label += _hBoardLabelsAlphabet.charAt(Math.floor((file % Math.pow(_hBoardLabelsAlphabet.length, j)) / Math.pow(_hBoardLabelsAlphabet.length, j - 1)));
            }

            label += (rank + 1);

            return label;
        }

        function _getXYCoordsFromFileRank(file, rank) {
            return {
                x: file * (_configuration.blockSize + _configuration.marginBetweenBlocksSize) + _configuration.blockSize / 2,
                y: (_configuration.blocksInAColumn - rank - 1) * (_configuration.blockSize + _configuration.marginBetweenBlocksSize) + _configuration.blockSize / 2 // the coord y==0 is at the top, but row 0 is at the bottom
            };
        }

        function _getFileRankFromXYCoords(x, y) {
            return {
                file: Math.floor((x + (_configuration.marginBetweenBlocksSize / 2)) / (_configuration.blockSize + _configuration.marginBetweenBlocksSize)),
                rank: _configuration.blocksInAColumn - Math.floor((y + (_configuration.marginBetweenBlocksSize / 2)) / (_configuration.blockSize + _configuration.marginBetweenBlocksSize)) - 1
            };
        }

        function _isPositionLabel(string) {
            /*
             * check if passed param is a valid position label
             */

            if (typeof arguments[0] !== 'string') {
                return false;
            }

            var charsInHorizontalLabel = _getNumberOfCharsInHorizontalBoardLabels();

            var fileLabel = string.substr(0, charsInHorizontalLabel);
            var file = 0;
            for (var i = 0; i < charsInHorizontalLabel; i++) {
                var charIndex = _hBoardLabelsAlphabet.indexOf(fileLabel.charAt(i));
                if (charIndex < 0) {
                    return false;
                }
                file += charIndex * Math.pow(_hBoardLabelsAlphabet.length, charsInHorizontalLabel - (i + 1));
            }
            if (file >= _configuration.blocksInARow) {
                return false;
            }

            var rankLabel = string.substr(charsInHorizontalLabel);
            if (!Number.isInteger(parseInt(rankLabel, 10)) || parseInt(rankLabel, 10) < 1 || parseInt(rankLabel, 10) > _configuration.blocksInAColumn) {
                return false;
            }

            return true;
        }

        function _isArray(object) {
            if (Array.isArray)
                return Array.isArray(object);

            return typeof object !== 'undefined' && object && object.constructor === Array;
        }

        function _isPiece(object) {
            if (typeof object === 'object' && object.label && _piecesBox[object.label]) {
                return true;
            } else {
                return false;
            }
        }

        function _getCurrentBoard() {
            /*
             * returns: NxM matrix where N is number of columns and M number of rows. Each element of matrix is an array of pieces on that position.
             *          If a position has no pieces the corresponding element is undefined.
             */

            var currentBoard = [];
            for (var i = 0; i < _configuration.blocksInARow; i++) { // add an array for each column
                var col = [];
                for (var j = 0; j < _configuration.blocksInAColumn; j++) { // add an undefined element for each row of column
                    col.push(undefined);
                }
                currentBoard.push(col);
            }
            for (var i = 0; i < _piecesContainer.getNumChildren(); i++) {
                var piece = _piecesContainer.getChildAt(i);
                if (piece.rank != undefined && piece.file != undefined) {
                    if (!currentBoard[piece.file][piece.rank]) {
                        currentBoard[piece.file][piece.rank] = [];
                    }
                    currentBoard[piece.file][piece.rank].push(piece.label);
                }
            }

            return currentBoard;
        }

        function _getFenFromBoard(board) {
            /*
             * input: NxM matrix where N is number of columns and M number of rows. Each element of matrix is an array of pieces on that position.
             *        If a position has no pieces the corresponding element can be undefined or can be an empty array.
             * output: fen-like string that describes position.
             */

            if (!_isArray(board)) {
                throw new Error("_getFenFromBoard: invalid input parameter");
            }

            var numberOfColumns = board.length;
            var numberOfRows;
            for(var i = 0; i < numberOfColumns; i++) {
                if (!_isArray(board[i])) {
                    throw new Error("_getFenFromBoard: invalid input parameter");
                }
                if (i == 0) {
                    numberOfRows = board[i].length;
                } else {
                    if (numberOfRows != board[i].length) {
                        throw new Error("_getFenFromBoard: invalid input parameter");
                    }
                }
                for(var j = 0; j < numberOfRows; j++) {
                    if (board[i][j] != undefined && !_isArray(board[i][j])) {
                        throw new Error("_getFenFromBoard: invalid input parameter");
                    }
                }
            }
            if (!numberOfRows) {
                throw new Error("_getFenFromBoard: invalid input parameter");
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
        }

        function _getBoardFromFen(fenPosition) {
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
                        throw new Error("_getBoardFromFen: invalid input parameter");
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
                                throw new Error("_getBoardFromFen: invalid input parameter");
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
        }

        function _createPiece(pieceLabel) {

            var deferred = customQ.defer();

            if (!_piecesBox[pieceLabel]) {
                if (!_loadingPieces[pieceLabel]) {

                    var pieceImage = new Image();
                    pieceImage.src = _configuration.piecesFolder + "/" + (_configuration.piecesFiles[pieceLabel] || pieceLabel) + ".png";

                    pieceImage.onload = function (e) {

                        var loadedPiece = e.target;
                        _piecesBox[pieceLabel] = loadedPiece;

                        _loadingPieces[pieceLabel].deferreds.forEach(function (deferred) {
                            deferred.resolve(loadedPiece);
                        });

                        delete _loadingPieces[pieceLabel];
                    };

                    pieceImage.onerror = function (e) {

                        _loadingPieces[pieceLabel].deferreds.forEach(function (deferred) {
                            deferred.reject("Error loading piece " + pieceLabel);
                        });

                        delete _loadingPieces[pieceLabel];
                    };

                    _loadingPieces[pieceLabel] = {
                        piece: pieceImage,
                        deferreds: []
                    };
                }

                _loadingPieces[pieceLabel].deferreds.push(deferred);

            } else {
                deferred.resolve(_piecesBox[pieceLabel]);
            }

            return deferred.promise;
        }

        this.rotate = function (degrees) {

            if (degrees !== undefined && !Number.isInteger(degrees)) {
                throw new Error("rotate: passed value is not an integer.");
            }

            _rotationDegrees = degrees || 180;
        };

        this.setRotation = function (degrees) {

            if (degrees !== undefined && !Number.isInteger(degrees)) {
                throw new Error("setRotation: passed value is not an integer.");
            }

            degrees = degrees || 0;

            _stage.rotation = ((degrees % 360) + 360) % 360; // to make destination in [0, 360]

            var elementRotation = Math.floor(((_stage.rotation + 45) % 360) / 90) * -90;

            for (var i = 0; i < _containersToRotate.length; i++) {
                var container = _containersToRotate[i];
                for (var j = 0; j < container.getNumChildren(); j++) {
                    var element = container.getChildAt(j);
                    element.rotation = (elementRotation) % 360;
                }
            }

            _update = true;
        };

        this.scale = function (scaleFactor) {

            if (scaleFactor === undefined || isNaN(scaleFactor) || scaleFactor < 0) {
                throw new Error("scale: invalid scale parameter.");
            }

            _canvas.width = _configuration.canvasWidth * scaleFactor;
            _canvas.height = _configuration.canvasHeight * scaleFactor;

            _stage.scaleX = _stage.scaleY = _stage.scale = scaleFactor;
            _stage.x = _configuration.canvasWidth * scaleFactor / 2;
            _stage.y = _configuration.canvasHeight * scaleFactor / 2;
            _update = true;
        };

        this.setPosition = function (position) {
            /*
             * gets position in FEN notation as input and sets board
             * if no parameter is passed then clear the board
             */

            if (!position) { // clean the board
                position = "";
                for (var i=0; i<_configuration.blocksInAColumn; i++) {
                    if (position.length > 0) {
                        position += "/";
                    }
                    position += _configuration.blocksInARow;
                }
            }

            var currentBoard = _getCurrentBoard();
            var newBoard = _getBoardFromFen(position);

            if (newBoard.length != _configuration.blocksInARow || newBoard[0].length != _configuration.blocksInAColumn) {
                throw new Error("setPosition: invalid input parameter.");
            }

            // temp vars for computation
            var assignedPieces = [];
            var listOfMovements = [];

            // find pieces that yet are in the correct position
            for (var i = 0; i < _configuration.blocksInARow; i++) { // file (column)
                for (var j = 0; j < _configuration.blocksInAColumn; j++) { // rank (row)
                    if (currentBoard[i][j] && newBoard[i][j]) {
                        for (var z = 0; z < _piecesContainer.getNumChildren(); z++) {
                            var piece = _piecesContainer.getChildAt(z);
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

            // find pieces that are moving to the correct position
            if (_listOfMovements.length > 0) { // if a piece is yet moving to the destination it preserves its movement
                for (var i = 0; i < _configuration.blocksInARow; i++) { // file (column)
                    for (var j = 0; j < _configuration.blocksInAColumn; j++) { // rank (row)
                        if (newBoard[i][j]) {
                            for (var z = 0; z < _listOfMovements.length; z++) {
                                var move = _listOfMovements[z];
                                if (move.destFile == i && move.destRank == j) {
                                    var indexInNewBoard = newBoard[i][j].indexOf(move.piece.label);
                                    if (indexInNewBoard != -1) {
                                        assignedPieces.push(move.piece);
                                        listOfMovements.push(move);
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
            }

            // find pieces on board to move
            for (var i = 0; i < _configuration.blocksInARow; i++) { // file (column)
                for (var j = 0; j < _configuration.blocksInAColumn; j++) { // rank (row)
                    if (newBoard[i][j]) {
                        for (var z = 0; z < _piecesContainer.getNumChildren(); z++) {
                            var piece = _piecesContainer.getChildAt(z);
                            if (assignedPieces.indexOf(piece) == -1) {
                                var indexInNewBoard = newBoard[i][j].indexOf(piece.label);
                                if (indexInNewBoard != -1) { // if true piece is a candidate to reach (i,j) position
                                    var distance = Math.pow((piece.file - i), 2) + Math.pow((piece.rank - j), 2);
                                    for (var k = z + 1; k < _piecesContainer.getNumChildren(); k++) {
                                        var alternativePiece = _piecesContainer.getChildAt(k);
                                        if (newBoard[i][j].indexOf(alternativePiece.label) != -1 && assignedPieces.indexOf(alternativePiece) == -1) { // search for a piece for a more consistent movement
                                            var alternativeDistance = 0;

                                            if (_configuration.chessGame.bishopLabel && alternativePiece.label.toUpperCase() == _configuration.chessGame.bishopLabel.toUpperCase()) {
                                                if (((alternativePiece.rank + alternativePiece.file) % 2 == (i + j) % 2) && ((piece.rank + piece.file) % 2 != (i + j) % 2)) { // found a bishop of correct square color, while current selected bishop is on a square with of not correct color
                                                    piece = alternativePiece;
                                                } else if ((((alternativePiece.rank + alternativePiece.file) % 2 != (i + j) % 2) && ((piece.rank + piece.file) % 2 != (i + j) % 2)) || (((alternativePiece.rank + alternativePiece.file) % 2 == (i + j) % 2) && ((piece.rank + piece.file) % 2 == (i + j) % 2))) { // both bishops are on squares of same color
                                                    alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                                }
                                            } else if (_configuration.chessGame.rookLabel && alternativePiece.label.toUpperCase() == _configuration.chessGame.rookLabel.toUpperCase()) {
                                                if ((alternativePiece.file == i || alternativePiece.rank == j) && !(piece.file == i || piece.rank == j)) { // alternative rook has correct file or rank, while current selected rook not
                                                    piece = alternativePiece;
                                                } else { // check alternative rook by distance
                                                    alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                                }
                                            } else if (_configuration.chessGame.pawnLabel && alternativePiece.label.toUpperCase() == _configuration.chessGame.pawnLabel.toUpperCase()) {
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
                                    listOfMovements.push({
                                        piece: piece,
                                        destFile: i,
                                        destRank: j
                                    });
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
            for (var i = _piecesContainer.getNumChildren() - 1; i >= 0; i--) {
                var piece = _piecesContainer.getChildAt(i);
                if (assignedPieces.indexOf(piece) == -1) {
                    this.removePiece(piece);
                }
            }

            // add missing pieces
            var xStarting, yStarting;
            if (_piecesContainer.getNumChildren() == 0 && _configuration.animationOfPieces) { // if board is empty and animation is active then movements of new position start from center of board
                xStarting = _configuration.allBlocksWidth / 2;
                yStarting = _configuration.allBlocksHeight / 2;
            }
            for (var i = 0; i < _configuration.blocksInARow; i++) { // file (column)
                for (var j = 0; j < _configuration.blocksInAColumn; j++) { // rank (row)
                    if (newBoard[i][j]) {
                        for (var z = 0; z<newBoard[i][j].length; z++) {
                            var promise = this.getNewPiece(newBoard[i][j][z]);
                            promise.then(
                                (function (file, rank) {
                                    return (function (piece) {
                                        piece.x = xStarting;
                                        piece.y = yStarting;
                                        this.setPieceAtPosition(piece, _getPositionLabelFromFileRank(file, rank));
                                    }).bind(this)
                                }).call(this, i, j)
                            ).catch(function (error) {
                                console.log(error);
                            });
                        }
                    }
                }
            }

            // start movements
            _listOfMovements = _listOfMovements.concat(listOfMovements);
        };

        this.getPosition = function () {
            /*
             * returns board position in FEN-like notation
             */

            return _getFenFromBoard(_getCurrentBoard());
        };

        this.move = function (/* arguments: see comment */) {
            /*
             * Possible inputs:
             *   1. ("H3", "G3") // couple of position labels for single move
             *   2. (piece, "G3") // instance of a piece and position label
             *   3. (["H3", "G3"], [piece, "F7"], .....) // list of arrays of two elements for multiple moves simultaneously
             */

            if (arguments.length == 2 && (_isPositionLabel(arguments[0]) || _isPiece(arguments[0])) && _isPositionLabel(arguments[1])) { // method overload
                return this.move([arguments[0], arguments[1]]);
            }

            var movements = Array.prototype.slice.call(arguments);

            var movementsArrayWithPiece = [];
            movements.forEach((function (movement) {

                var piecesAtStartingPosition, positionFrom;

                if (_isPiece(movement[0])) {
                    positionFrom = _getPositionLabelFromFileRank(movement[0].file, movement[0].rank);
                    piecesAtStartingPosition = [movement[0]];
                } else if (_isPositionLabel(movement[0])) {
                    positionFrom = movement[0];
                    piecesAtStartingPosition = this.getPieceAtPosition(positionFrom);
                    if (piecesAtStartingPosition) {
                        if (!_isArray(piecesAtStartingPosition)) {
                            piecesAtStartingPosition = [piecesAtStartingPosition];
                        }
                    } else {
                        return;
                    }
                } else {
                    return;
                }

                if (!_isPositionLabel(movement[1])) {
                    return;
                }

                var piecesAtDestination = this.getPieceAtPosition(movement[1]);
                if (piecesAtDestination) {
                    if (!_isArray(piecesAtDestination)) {
                        piecesAtDestination = [piecesAtDestination];
                    }
                } else {
                    piecesAtDestination = [];
                }

                piecesAtStartingPosition.forEach(function (piece) {
                    if (_configuration.hooks.isValidMove) {
                        if (_configuration.hooks.isValidMove(positionFrom, movement[1], piece, piecesAtDestination)) {
                            movementsArrayWithPiece.push([positionFrom, movement[1], piece, piecesAtDestination]);
                        }
                    } else {
                        movementsArrayWithPiece.push([positionFrom, movement[1], piece, piecesAtDestination]);
                    }
                });

            }).bind(this));

            var movementsOccurred = false;

            movementsArrayWithPiece.forEach((function(movement) {

                var preMoveReturned;
                if (_configuration.hooks.preMove) {
                    preMoveReturned = _configuration.hooks.preMove(movement[0], movement[1], movement[2], movement[3]);
                }
                _piecesContainer.removeChild(movement[2]);
                _piecesContainer.addChild(movement[2]);
                var moved = this.setPieceAtPosition(movement[2], movement[1]);
                if (_configuration.hooks.postMove) {
                    _configuration.hooks.postMove(preMoveReturned, moved, movement[0], movement[1], movement[2], movement[3]);
                }

                movementsOccurred = moved || movementsOccurred;
            }).bind(this));

            return movementsOccurred;
        };

        this.setPieceAtPosition = function (/* arguments: see comment */) {
            /*
             * Possible inputs:
             *   1. (piece, "H7") // instance of piece and position label of destination
             *   2. ([piece1, "H7"], [piece2, "G3"], .....) // list of arrays of two elements (as above) for multiple moves simultaneously
             */

            if (arguments.length == 2 && _isPiece(arguments[0]) && _isPositionLabel(arguments[1])) { // method overload
                return this.setPieceAtPosition([arguments[0], arguments[1]]);
            }

            var movements = Array.prototype.slice.call(arguments);

            var movementsList = [];

            var thereArePiecesToMove = false;

            movements.forEach((function (movement) {

                if (!_isPiece(movement[0]) || !_isPositionLabel(movement[1])) {
                    return;
                }

                var piece = movement[0];
                var position = movement[1];

                var numericPosition = _getFileRankFromPositionLabel(position);
                var file = numericPosition.file;
                var rank = numericPosition.rank;

                if (!_piecesContainer.contains(piece)) {
                    if (!piece.x || !piece.y) { // a new piece (with no x,y coords) is immediately placed in the position without movement
                        var xyCoords = _getXYCoordsFromFileRank(file, rank);
                        piece.x = xyCoords.x;
                        piece.y = xyCoords.y;
                    }
                    _piecesContainer.addChild(piece);
                }

                var yetMoving = false;
                for (var i = 0; i < _listOfMovements.length; i++) {
                    var move = _listOfMovements[i];
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

                thereArePiecesToMove = true;

            }).bind(this));

            if (!thereArePiecesToMove) {
                return false;
            }

            _listOfMovements = _listOfMovements.concat(movementsList);

            return true;
        };

        this.getPieceAtPosition = function (position) {
            /*
             * returns  - array of pieces on position passed as parameter
             *          - or single piece if there is only one piece on position
             *          - undefined if no piece is in position
             */

            if (!_isPositionLabel(position)) {
                throw new Error("getPieceAtPosition: invalid position.")
            }

            var numericPosition = _getFileRankFromPositionLabel(position);

            var file = numericPosition.file;
            var rank = numericPosition.rank;

            var piecesOnPosition = [];

            for (var i = _piecesContainer.getNumChildren()-1; i >= 0; i--) {
                var piece = _piecesContainer.getChildAt(i);
                if (piece.file == file && piece.rank == rank) {
                    piecesOnPosition.push(piece);
                }
            }

            return piecesOnPosition.length == 0 ? undefined :
                   piecesOnPosition.length == 1 ? piecesOnPosition[0] :
                                                  piecesOnPosition;
        };

        this.removePieceFromPosition = function (position) {
            // remove all pieces from position passed as parameter

            if (!_isPositionLabel(position)) {
                throw new Error("removePieceFromPosition: invalid position.")
            }

            var pieces = this.getPieceAtPosition(position);

            if (!pieces) {
                return false;
            }

            if (!_isArray(pieces)) {
                pieces = [pieces];
            }

            pieces.forEach((function (piece) {
                _piecesContainer.removeChild(piece);
            }).bind(this));

            _update = true;

            return true;
        };

        this.removePiece = function (piece) {

            if (!_isPiece(piece)) {
                throw new Error("removePiece: invalid input parameter.")
            }

            if (_piecesContainer.contains(piece)) {
                _piecesContainer.removeChild(piece);
                _update = true;
                return true;
            }

            return false;
        };

        this.getNewPiece = function (pieceLabel) { // input: label of piece
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

            var promise = _createPiece(pieceLabel);

            promise.then((function (piece) {

                var piece = new createjs.Bitmap(piece);
                piece.label = pieceLabel;
                piece.regX = piece.regY = _piecesBox[pieceLabel].width / 2;
                piece.scaleX = piece.scaleY = piece.scale = (_configuration.blockSize * 0.9) / _piecesBox[pieceLabel].width;

                piece.x = undefined;
                piece.y = undefined;

                var boardSection = Math.floor(((_stage.rotation + 45) % 360) / 90);
                piece.rotation = boardSection * -90;

                if (_configuration.actionsOnPieces) {

                    piece.cursor = "pointer";
                    piece.hitArea = new createjs.Shape();
                    piece.hitArea.graphics.beginFill("#000")
                        .drawRect(0, 0, _piecesBox[pieceLabel].width, _piecesBox[pieceLabel].height);

                    piece.addEventListener("rollover", (function (evt) {
                        if (!_selectedPiece) {
                            var piece = evt.target;
                            piece.scaleX = piece.scaleY = piece.scale * 1.25;
                            piece.shadow = new createjs.Shadow(_configuration.shadowColor, 3, 3, 5);
                            _update = true;
                        } else {
                            _stage.getChildByName("boardContainer").removeChild(_stage.getChildByName("boardContainer").getChildByName("blockHighlighter"));
                            var pt = _stage.getChildByName("boardContainer").globalToLocal(evt.stageX, evt.stageY);
                            var numericPosition = _getFileRankFromXYCoords(pt.x, pt.y);
                            var blockHighlighter = new createjs.Shape();
                            blockHighlighter.graphics.beginStroke(_configuration.highlighterColor)
                                .setStrokeStyle(_configuration.highlighterSize)
                                .drawRect(
                                    (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * numericPosition.file + _configuration.highlighterSize / 2,
                                    (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * (_configuration.blocksInAColumn - numericPosition.rank - 1) + _configuration.highlighterSize / 2,
                                    _configuration.blockSize - _configuration.highlighterSize,
                                    _configuration.blockSize - _configuration.highlighterSize);
                            blockHighlighter.name = "blockHighlighter";
                            _stage.getChildByName("boardContainer").addChildAt(blockHighlighter, _stage.getChildByName("boardContainer").getNumChildren() - 1);
                            _update = true;
                        }
                    }).bind(this));

                    piece.addEventListener("rollout", (function (evt) {
                        if (!_selectedPiece) {
                            var piece = evt.target;
                            piece.scaleX = piece.scaleY = piece.scale;
                            piece.shadow = null;
                            _update = true;
                        } else {
                            _stage.getChildByName("boardContainer").removeChild(_stage.getChildByName("boardContainer").getChildByName("blockHighlighter"));
                            _update = true;
                        }
                    }).bind(this));

                    piece.addEventListener("mousedown", (function (evt) {
                        var piece = evt.target;
                        piece.startPosition = {
                            x: piece.x,
                            y: piece.y
                        };
                        if (!_selectedPiece) {
                            var boardContainer = _stage.getChildByName("boardContainer");
                            var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                            _piecesContainer.removeChild(piece);
                            _piecesContainer.addChild(piece);

                            piece.x = pt.x;
                            piece.y = pt.y;

                            _update = true;
                        }
                    }).bind(this));

                    piece.addEventListener("pressmove", (function (evt) {
                        var piece = evt.target;
                        var boardContainer = _stage.getChildByName("boardContainer");
                        var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                        if (_selectedPiece) {
                            boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));
                            _selectedPiece.scaleX = _selectedPiece.scaleY = _selectedPiece.scale;
                            _selectedPiece.shadow = null;
                            _selectedPiece = undefined;

                            piece.scaleX = piece.scaleY = piece.scale * 1.25;
                            piece.shadow = new createjs.Shadow(_configuration.shadowColor, 3, 3, 5);

                            _piecesContainer.removeChild(piece);
                            _piecesContainer.addChild(piece);

                            piece.x = pt.x;
                            piece.y = pt.y;

                            _update = true;
                        }

                        var numericPosition = _getFileRankFromXYCoords(pt.x, pt.y);

                        var file = numericPosition.file;
                        var rank = numericPosition.rank;

                        piece.x = pt.x;
                        piece.y = pt.y;

                        var currentSquare = undefined;
                        if (file >= 0 && file < _configuration.blocksInARow && rank >= 0 && rank < _configuration.blocksInAColumn) {
                            currentSquare = file + _configuration.blocksInARow * rank;
                        }

                        if (currentSquare != piece.currentSquare) {
                            boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));
                            piece.currentSquare = currentSquare;
                            if (currentSquare != undefined) {
                                if (_configuration.type == 'linesGrid') { // add an highlighter circle at cross of lines
                                    var blockHighlighter = new createjs.Shape();
                                    blockHighlighter.alpha = 0.8;
                                    blockHighlighter.graphics
                                        .beginFill(_configuration.highlighterColor)
                                        .drawCircle(
                                            (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * (piece.currentSquare % _configuration.blocksInARow) + _configuration.blockSize / 2,
                                            (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * (_configuration.blocksInAColumn - Math.floor(piece.currentSquare / _configuration.blocksInARow) - 1) + _configuration.blockSize / 2,
                                            _configuration.highlighterSize * 2.5);

                                    blockHighlighter.name = "blockHighlighter";
                                } else { // add an highlighter border to block
                                    var blockHighlighter = new createjs.Shape();
                                    blockHighlighter.graphics.beginStroke(_configuration.highlighterColor)
                                        .setStrokeStyle(_configuration.highlighterSize)
                                        .drawRect(
                                            (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * file + _configuration.highlighterSize / 2,
                                            (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * (_configuration.blocksInAColumn - rank - 1) + _configuration.highlighterSize / 2,
                                            _configuration.blockSize - _configuration.highlighterSize,
                                            _configuration.blockSize - _configuration.highlighterSize);
                                    blockHighlighter.name = "blockHighlighter";
                                }

                                boardContainer.addChildAt(blockHighlighter, boardContainer.getNumChildren()-1);
                            }
                        }

                        _update = true;
                    }).bind(this));

                    piece.addEventListener("pressup", (function (evt) {
                        var piece = evt.target;
                        var boardContainer = _stage.getChildByName("boardContainer");
                        var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                        var numericPosition = _getFileRankFromXYCoords(pt.x, pt.y);

                        var file = numericPosition.file;
                        var rank = numericPosition.rank;

                        boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));

                        var currentSquare = undefined;
                        if (file >= 0 && file < _configuration.blocksInARow && rank >= 0 && rank < _configuration.blocksInAColumn) {
                            currentSquare = file + _configuration.blocksInARow * rank;
                        }

                        if (currentSquare == undefined) {
                            piece.x = piece.startPosition.x;
                            piece.y = piece.startPosition.y;
                            _update = true;
                        } else {
                            if (currentSquare != piece.file + _configuration.blocksInARow * piece.rank) {
                                var destPosition = _getPositionLabelFromFileRank(file, rank);
                                var moved = this.move(piece, destPosition);

                                if (!moved) {
                                    piece.x = piece.startPosition.x;
                                    piece.y = piece.startPosition.y;
                                    _update = true;
                                }
                            } else {
                                if (!_selectedPiece) {
                                    _selectedPiece = piece;
                                    var blockHighlighter = new createjs.Shape();
                                    blockHighlighter.graphics.beginStroke(_configuration.highlighterColor)
                                        .setStrokeStyle(_configuration.highlighterSize)
                                        .drawRect(
                                            (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * file + _configuration.highlighterSize / 2,
                                            (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * (_configuration.blocksInAColumn - rank - 1) + _configuration.highlighterSize / 2,
                                            _configuration.blockSize - _configuration.highlighterSize,
                                            _configuration.blockSize - _configuration.highlighterSize);
                                    blockHighlighter.name = "blockHighlighter";
                                    boardContainer.addChildAt(blockHighlighter, boardContainer.getNumChildren() - 1);
                                } else {
                                    var destPosition = _getPositionLabelFromFileRank(file, rank);
                                    var moved = this.move(_selectedPiece, destPosition);
                                    if (!moved) {
                                        _selectedPiece.x = _selectedPiece.startPosition.x;
                                        _selectedPiece.y = _selectedPiece.startPosition.y;
                                        _update = true;
                                    }
                                    _selectedPiece.scaleX = _selectedPiece.scaleY = _selectedPiece.scale;
                                    _selectedPiece.shadow = null;
                                    _selectedPiece = undefined;
                                }

                                piece.x = piece.startPosition.x;
                                piece.y = piece.startPosition.y;
                                _update = true;
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

        // let's go!
        ((function() {

            /*
             * Elements stack:
             *   _stage
             *     |--borderContainer
             *     |    |--border
             *     |    |--labelsContainer      -> added to _containersToRotate
             *     |--boardContainer
             *          |--blocksBorder         // exists only if there is space between block
             *          |--blocksContainer
             *          |--blockHighlighter     // exists only during piece pressmove event
             *          |--_piecesContainer     -> added to _containersToRotate
             */

            if (!configuration || !configuration.canvasId) {
                throw new Error("CanvasBoard: configuration object and canvasId property are mandatory.");
            }

            _canvas = document.getElementById(configuration.canvasId);

            _configuration = setValues(configuration);

            _canvas.width = _configuration.canvasWidth;
            _canvas.height = _configuration.canvasHeight;

            _stage = new createjs.Stage(_canvas);
            _stage.scaleX = _stage.scaleY = _stage.scale = 1;
            _stage.regX = _configuration.canvasWidth / 2;
            _stage.regY = _configuration.canvasHeight / 2;
            _stage.x = _configuration.canvasWidth / 2;
            _stage.y = _configuration.canvasHeight / 2;
            _stage.enableMouseOver(40);
            _stage.mouseMoveOutside = true;
            _stage.rotation = 0;

            if (_configuration.borderSize > 0) {
                var borderContainer = new createjs.Container();

                var border = new createjs.Shape();
                border.graphics
                    .beginStroke(_configuration.borderColor)
                    .setStrokeStyle(_configuration.borderSize)
                    .drawRect(_configuration.borderSize / 2 + _configuration.shadowSize + _configuration.boardPaddingWidthSize,
                              _configuration.borderSize / 2 + _configuration.shadowSize + _configuration.boardPaddingHeightSize,
                              _configuration.allBlocksWidth + _configuration.borderSize,
                              _configuration.allBlocksHeight + _configuration.borderSize);
                border.shadow = new createjs.Shadow(_configuration.shadowColor, 0, 0, 15);

                borderContainer.addChild(border);

                if (_configuration.coords) {
                    var labelsContainer = new createjs.Container();
                    var labelSize = Math.min(Math.floor(_configuration.borderSize * 0.6), _configuration.blockSize);
                    addLabelsToContainer(labelsContainer, labelSize, "V");
                    addLabelsToContainer(labelsContainer, labelSize, "H");
                    _containersToRotate.push(labelsContainer);

                    borderContainer.addChild(labelsContainer);
                }
                _stage.addChild(borderContainer);
            }

            var boardContainer = new createjs.Container();
            boardContainer.regX = _configuration.allBlocksWidth / 2;
            boardContainer.regY = _configuration.allBlocksHeight / 2;
            boardContainer.x = _configuration.canvasWidth / 2;
            boardContainer.y = _configuration.canvasHeight / 2;
            boardContainer.scaleX = boardContainer.scaleY = boardContainer.scale = 1;
            boardContainer.name = "boardContainer";

            if (_configuration.marginBetweenBlocksSize > 0) {

                var blocksBorder = new createjs.Shape();
                var blocksBorderGraphic = blocksBorder.graphics;

                blocksBorderGraphic
                    .beginStroke(_configuration.marginColor)
                    .setStrokeStyle(_configuration.marginBetweenBlocksSize);

                for (var i = 0; i < _configuration.blocksInARow - 1; i++) {
                    blocksBorderGraphic
                        .moveTo(_configuration.blockSize + _configuration.marginBetweenBlocksSize / 2 + (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * i, 0)
                        .lineTo(_configuration.blockSize + _configuration.marginBetweenBlocksSize / 2 + (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * i, _configuration.allBlocksHeight);
                }
                for (var i = 0; i < _configuration.blocksInAColumn - 1; i++) {
                    blocksBorderGraphic
                        .moveTo(0, _configuration.blockSize + _configuration.marginBetweenBlocksSize / 2 + (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * i)
                        .lineTo(_configuration.allBlocksWidth, _configuration.blockSize + _configuration.marginBetweenBlocksSize / 2 + (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * i);
                }

                boardContainer.addChild(blocksBorder);
            }

            var blocksContainer = new createjs.Container();
            for (var i = 0; i < _configuration.blocksInARow * _configuration.blocksInAColumn; i++) {
                var columnOfBlock = i % _configuration.blocksInARow; // file
                var rowOfBlock = Math.floor(i / _configuration.blocksInARow); // rank

                var block = new createjs.Shape();
                block.graphics.beginFill(getBlockColour(columnOfBlock, rowOfBlock)).drawRect(0, 0, _configuration.blockSize, _configuration.blockSize);

                var xyCoord = _getXYCoordsFromFileRank(columnOfBlock, rowOfBlock);
                block.x = xyCoord.x;
                block.y = xyCoord.y;
                block.regY = block.regX = _configuration.blockSize / 2;

                if (_configuration.actionsOnPieces ) {
                    block.addEventListener("rollover", (function (evt) {
                        if (_selectedPiece) {
                            boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));
                            var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);
                            var numericPosition = _getFileRankFromXYCoords(pt.x, pt.y);
                            var blockHighlighter = new createjs.Shape();
                            blockHighlighter.graphics.beginStroke(_configuration.highlighterColor)
                                .setStrokeStyle(_configuration.highlighterSize)
                                .drawRect(
                                    (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * numericPosition.file + _configuration.highlighterSize / 2,
                                    (_configuration.blockSize + _configuration.marginBetweenBlocksSize) * (_configuration.blocksInAColumn - numericPosition.rank - 1) + _configuration.highlighterSize / 2,
                                    _configuration.blockSize - _configuration.highlighterSize,
                                    _configuration.blockSize - _configuration.highlighterSize);
                            blockHighlighter.name = "blockHighlighter";
                            boardContainer.addChildAt(blockHighlighter, boardContainer.getNumChildren() - 1);
                            _update = true;
                        }
                    }).bind(this));

                    block.addEventListener("rollout", (function (evt) {
                        if (_selectedPiece) {
                            boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));
                            _update = true;
                        }
                    }).bind(this));
                    block.addEventListener("pressup", (function (evt) {
                        if (_selectedPiece) {
                            boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));
                            var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);
                            var numericPosition = _getFileRankFromXYCoords(pt.x, pt.y);
                            var destPosition = _getPositionLabelFromFileRank(numericPosition.file, numericPosition.rank);
                            var moved = this.move(_selectedPiece, destPosition);
                            if (!moved) {
                                _selectedPiece.x = _selectedPiece.startPosition.x;
                                _selectedPiece.y = _selectedPiece.startPosition.y;
                            }
                            _selectedPiece.scaleX = _selectedPiece.scaleY = _selectedPiece.scale;
                            _selectedPiece.shadow = null;
                            _selectedPiece = undefined;
                            _update = true;
                        }
                    }).bind(this));
                }

                if (_configuration.type == 'linesGrid') {
                    drawBlockLines(block, columnOfBlock, rowOfBlock);
                }

                blocksContainer.addChild(block);
            }
            boardContainer.addChild(blocksContainer);

            _piecesContainer = new createjs.Container();
            _containersToRotate.push(_piecesContainer);
            boardContainer.addChild(_piecesContainer);

            _stage.addChild(boardContainer);

            createjs.Ticker.addEventListener("tick", (function () {

                var
                    // animation semaphores
                    squeezedBoard = false,
                    turnsBoard = false,
                    enlargeBoard = false,
                    squeezeFirstTick = true,
                    enlargeFirstTick = false,
                    turnsFirstTick = false,

                    rescalationExecutionTime = _configuration.rotationDuration * 0.2, // 20% of animation time is for rescaling (one time for squeezing, one time for enlarging: 40% tot)
                    rescalationTargetScale, // scale dimension after rescalation
                    rescalationAmount, // dimension of rescalation (initialScale - rescalationTargetScale)
                    rescalationMultiplier, rescalationCurrentValue, previousScale,

                    turnsExecutionTime = _configuration.rotationDuration * 0.6, // 60% of animation time is for rotation
                    turnsTargetRotation, // inclination after rotation
                    turnsAmount, // degrees of rotation
                    turnsMultiplier, turnsCurrentValue, turnsPreviousValue,

                    boardStartingSection, boardDestinationSection, // vars for board rotation
                    elementTurnsAmount, elementMultiplier; // vars for elements rotation

                return function (event) {

                    if (createjs.Ticker.getPaused()) {
                        return;
                    }

                    if (_update) {
                        _update = false;
                        _stage.update();
                    }

                    if (_rotationDegrees) { // if there is a property with degrees of rotation then rotate the board

                        if (!squeezedBoard || enlargeBoard) { // do rescalation

                            if (squeezeFirstTick) {
                                rescalationTargetScale = _configuration.squeezeScaleFactor;
                            }

                            if (enlargeFirstTick) {
                                rescalationTargetScale = previousScale / _stage.scaleX; // TODO or calc max dim if board exceed canvas size due to rotation angle
                            }

                            if (squeezeFirstTick || enlargeFirstTick) { // initialization of squeezing
                                rescalationCurrentValue = 0;
                                previousScale = _stage.scaleX;
                                rescalationAmount = _stage.scaleX * rescalationTargetScale - _stage.scaleX;
                                rescalationMultiplier = rescalationAmount / rescalationExecutionTime;
                                squeezeFirstTick = false; // condition to stop initialization
                                enlargeFirstTick = false; // condition to stop initialization
                            }

                            if (Math.abs(rescalationCurrentValue) >= Math.abs(rescalationAmount)) { // stop rescalation

                                _stage.scaleX = _stage.scaleY = previousScale * rescalationTargetScale; // set exact value

                                if (!squeezedBoard) {
                                    squeezedBoard = true; // stop squeezing condition
                                    turnsBoard = true; // next step condition
                                    turnsFirstTick = true; // next step condition
                                }

                                if (enlargeBoard) {
                                    enlargeBoard = false; // stop enlarging condition
                                    squeezedBoard = false; // next step condition
                                    squeezeFirstTick = true; // next step condition
                                    _rotationDegrees = 0; // stop all rotation process
                                }

                            } else { // rescale
                                var amountForThisStep = event.delta * rescalationMultiplier;
                                rescalationCurrentValue += amountForThisStep;
                                _stage.scaleX = _stage.scaleY += amountForThisStep;
                            }
                        }

                        if (turnsBoard) {
                            if (turnsFirstTick) {
                                // initialization of turning
                                turnsCurrentValue = 0;
                                turnsPreviousValue = _stage.rotation;
                                turnsAmount = _rotationDegrees;
                                turnsTargetRotation = (((turnsAmount + turnsPreviousValue) % 360) + 360) % 360; // to make destination in [0, 360] regardless of dimensions of turnsAmount and turnsPreviousValue
                                turnsMultiplier = turnsAmount / turnsExecutionTime;

                                // initialization of elements turning
                                boardStartingSection = Math.floor(((turnsPreviousValue + 45) % 360) / 90);
                                boardDestinationSection = Math.floor(((turnsTargetRotation + 45) % 360) / 90);

                                var elementRotation = 0;
                                if (turnsAmount > 0) {
                                    elementRotation = ((4 - (boardStartingSection - boardDestinationSection)) % 4) * -90;
                                    if (elementRotation == 0 && turnsAmount >= 45) {
                                        elementRotation = -360;
                                    }
                                } else if (turnsAmount < 0) {
                                    elementRotation = ((4 + (boardStartingSection - boardDestinationSection)) % 4) * 90;
                                    if (elementRotation == 0 && turnsAmount < -45) {
                                        elementRotation = 360;
                                    }
                                }
                                elementRotation += parseInt(turnsAmount / 360, 10) * -360; // rotation of element is incremented of a complete cycle for each complete cycle of board rotation

                                elementMultiplier = elementRotation / turnsExecutionTime;

                                elementTurnsAmount = ((elementRotation % 360) + 360) % 360; // for negative numbers

                                for (var i = 0; i < _containersToRotate.length; i++) {
                                    var container = _containersToRotate[i];
                                    for (var j = 0; j < container.getNumChildren(); j++) {
                                        var element = container.getChildAt(j);
                                        element.elementPreviousRotation = element.rotation;
                                    }
                                }

                                turnsFirstTick = false; // condition to stop initialization
                            }

                            if (turnsCurrentValue >= Math.abs(turnsAmount)) { // stop rotation

                                // set exact value
                                _stage.rotation = turnsTargetRotation;

                                for (var i = 0; i < _containersToRotate.length; i++) {
                                    var container = _containersToRotate[i];
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
                                _stage.rotation += amountForThisStep;

                                for (var i = 0; i < _containersToRotate.length; i++) {
                                    var container = _containersToRotate[i];
                                    for (var j = 0; j < container.getNumChildren(); j++) {
                                        var element = container.getChildAt(j);
                                        amountForThisStep = event.delta * elementMultiplier;
                                        element.rotation += amountForThisStep;
                                    }
                                }
                            }
                        }

                        _update = true;
                    }

                    if (_listOfMovements.length > 0) { // if there is a property with a list of movements then move pieces
                        for (var i = _listOfMovements.length - 1; i >= 0; i--) {
                            var move = _listOfMovements[i];

                            var xyCoords = _getXYCoordsFromFileRank(move.destFile, move.destRank);

                            var distX = (xyCoords.x - move.piece.x);
                            var distY = (xyCoords.y - move.piece.y);

                            if (_configuration.animationOfPieces) {
                                if (move.piece.file != undefined || move.piece.rank != undefined) {
                                    move.piece.file = undefined;
                                    move.piece.rank = undefined;
                                }
                                _listOfMovements[i].piece.x += distX * 0.2;
                                _listOfMovements[i].piece.y += distY * 0.2;
                            }

                            if (!_configuration.animationOfPieces || (Math.abs(distY) <= 1 && Math.abs(distX) <= 1)) {
                                move.piece.x = xyCoords.x;
                                move.piece.y = xyCoords.y;
                                move.piece.file = move.destFile;
                                move.piece.rank = move.destRank;

                                _listOfMovements.splice(i, 1);
                            }
                        }

                        _update = true;
                    }

                };
            })());
            createjs.Ticker.setFPS(40);

            _update = true;

            if (_configuration.position) {
                this.setPosition(_configuration.position);
            }

            function setValues(configuration) {

                var canvasWidth = configuration.canvasSize || configuration.canvasWidth || configuration.canvasHeight || _canvas.width;
                var canvasHeight = configuration.canvasSize || configuration.canvasHeight || canvasWidth || _canvas.height;

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

                var neededCharsForRow = _getNumberOfCharsInHorizontalBoardLabels();
                var neededCharsForColumn = _getNumberOfCharsInVerticalBoardLabels();

                var fontSize = labelSize / Math.max(neededCharsForRow, neededCharsForColumn);

                if (orientation == "V") {
                    for (var i = _configuration.blocksInAColumn; i > 0; i--) {
                        labelsArray.push(i);
                    }
                } else {
                    var charsInLabel = _getNumberOfCharsInHorizontalBoardLabels();
                    for (var i = 0; i < _configuration.blocksInARow; i++) {
                        var label = "";
                        for (var j = charsInLabel; j > 0; j--) {
                            label += _hBoardLabelsAlphabet.charAt(Math.floor((i % Math.pow(_hBoardLabelsAlphabet.length, j)) / Math.pow(_hBoardLabelsAlphabet.length, j - 1)));
                        }
                        labelsArray.push(label);
                    }
                }

                var stopCondition = orientation == "H" ? _configuration.blocksInARow : _configuration.blocksInAColumn;

                for (var i = 0; i < stopCondition; i++) {

                    var label = new createjs.Text(labelsArray[i], fontSize + "px sans", _configuration.labelsColor);
                    label.regX = label.getBounds().width / 2;
                    label.regY = label.getMeasuredLineHeight() / 2;

                    var fixedCoord = _configuration.borderSize / 2 + _configuration.shadowSize + (orientation == "H" ? _configuration.boardPaddingHeightSize : _configuration.boardPaddingWidthSize);
                    var floatingCoord = _configuration.borderSize + i * (_configuration.blockSize + _configuration.marginBetweenBlocksSize) + _configuration.blockSize / 2 + _configuration.shadowSize + (orientation == "H" ? _configuration.boardPaddingWidthSize : _configuration.boardPaddingHeightSize);

                    label.x = orientation == "H" ? floatingCoord : fixedCoord;
                    label.y = orientation == "H" ? fixedCoord : floatingCoord;

                    var otherSideCoord = _configuration.borderSize / 2 + (orientation == "H" ? _configuration.allBlocksHeight : _configuration.allBlocksWidth) + _configuration.borderSize + _configuration.shadowSize + (orientation == "H" ? _configuration.boardPaddingHeightSize : _configuration.boardPaddingWidthSize);

                    var clonedLabel = label.clone();
                    orientation == "H" ? clonedLabel.y = otherSideCoord : clonedLabel.x = otherSideCoord;

                    container.addChild(label);
                    container.addChild(clonedLabel);
                }
            }

            function getBlockColour(columnIndex, rowIndex) {
                var backColor;
                if (_configuration.type == 'linesGrid') {
                    backColor = _configuration.lightSquaresColor;
                } else {
                    if (rowIndex % 2)
                        backColor = (columnIndex % 2 ? _configuration.darkSquaresColor : _configuration.lightSquaresColor);
                    else
                        backColor = (columnIndex % 2 ? _configuration.lightSquaresColor : _configuration.darkSquaresColor);
                }
                return backColor;
            }

            function drawBlockLines(block, columnOfBlock, rowOfBlock) {

                var blockGraphic = block.graphics;

                blockGraphic
                    .beginStroke(_configuration.linesColor)
                    .setStrokeStyle(_configuration.gridLinesSize);

                if (columnOfBlock !== 0) {
                    blockGraphic
                        .moveTo(_configuration.blockSize / 2, _configuration.blockSize / 2)
                        .lineTo(0, _configuration.blockSize / 2)
                }
                if (columnOfBlock != _configuration.blocksInARow - 1) {
                    blockGraphic
                        .moveTo(_configuration.blockSize / 2, _configuration.blockSize / 2)
                        .lineTo(_configuration.blockSize, _configuration.blockSize / 2)
                }
                if (rowOfBlock !== 0) {
                    blockGraphic
                        .moveTo(_configuration.blockSize / 2, _configuration.blockSize / 2)
                        .lineTo(_configuration.blockSize / 2, _configuration.blockSize)
                }
                if (rowOfBlock != _configuration.blocksInAColumn - 1) {
                    blockGraphic
                        .moveTo(_configuration.blockSize / 2, _configuration.blockSize / 2)
                        .lineTo(_configuration.blockSize / 2, 0)
                }

                if (_configuration.goGame) {
                    if (_configuration.blocksInARow % 2 !== 0 && columnOfBlock == Math.floor(_configuration.blocksInARow / 2) && rowOfBlock == Math.floor(_configuration.blocksInARow / 2)) {
                        drawCircle();
                    }
                    if (_configuration.blocksInARow >= 9 && _configuration.blocksInARow < 13) {
                        if (((columnOfBlock == 2) || (_configuration.blocksInARow - columnOfBlock == 3)) && ((rowOfBlock == 2) || (_configuration.blocksInARow - rowOfBlock == 3))) {
                            drawCircle();
                        }
                    }
                    if (_configuration.blocksInARow >= 13) {
                        if (((columnOfBlock == 3) || (_configuration.blocksInARow - columnOfBlock == 4)) && ((rowOfBlock == 3) || (_configuration.blocksInARow - rowOfBlock == 4))) {
                            drawCircle();
                        }
                    }
                    if (_configuration.blocksInARow >= 19) {
                        if (((columnOfBlock == 3 || (_configuration.blocksInARow - columnOfBlock == 4)) && rowOfBlock == Math.floor(_configuration.blocksInARow / 2)) || ((rowOfBlock == 3 || (_configuration.blocksInARow - rowOfBlock == 4)) && columnOfBlock == Math.floor(_configuration.blocksInARow / 2))) {
                            drawCircle();
                        }
                    }
                }

                function drawCircle() {
                    blockGraphic
                        .moveTo(_configuration.blockSize / 2, _configuration.blockSize / 2)
                        .beginFill(_configuration.linesColor)
                        .drawCircle(_configuration.blockSize / 2, _configuration.blockSize / 2, _configuration.gridLinesSize * 2.5);
                }
            }

        }).bind(this))();
    };
});