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

    // private members
    var _stage, _canvas, _configuration,
        _update = false,
        _rotationDegrees = 0,
        _listOfMovements = [],
        _containersToRotate = [],
        _piecesBox = {},
        _hooks = {},
        _alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    /*
     * Lightweight Q-like reimplementation from scratch of Promises.
     * Chaining supported.
     */
    var customQ = {
        defer: function() {
            return {
                promise: {
                    id: "lQ",
                    status: 0, // 0: running - 1: resolved - 2: rejected
                    value: undefined,
                    successorDeferred: [],
                    then: function(f) {
                        var innerDeferred = customQ.defer();
                        innerDeferred.type = "THEN";
                        var functionContainer = function(value) {
                            try {
                                var res = f(value);
                                if (res && res.id ==="lQ") {
                                    res.then(function(response) {
                                        innerDeferred.resolve(response);
                                    }).catch(function(error) {
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
                    catch: function(f) {
                        var innerDeferred = customQ.defer();
                        innerDeferred.type = "CATCH";
                        var functionContainer = function(value) {
                            try {
                                var res = f(value);
                                if (res && res.id ==="lQ") {
                                    res.then(function(response) {
                                        innerDeferred.resolve(response);
                                    }).catch(function(error) {
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
                    finally: function(f) {
                        this.successorDeferred.push(f);
                    }
                },
                resolve: function(result) {
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
                reject: function(error) {
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
                exec: function(status, response) {
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

    var loadingPieces = {};

    function _getNumberOfCharsInHorizontalBoardLabels() {

        var charsInLabel = Math.ceil(Math.log(_configuration.blocksInARow) / Math.log(_alphabet.length));
        if (charsInLabel == 0) { // workaround for blockInARow == 1
            charsInLabel++;
        }

        return charsInLabel;
    }

    function _getNumberOfCharsInVerticalBoardLabels() {

        var charsInLabel = Math.ceil(Math.log(_configuration.blocksInAColumn) / Math.log(10));
        if (charsInLabel == 0) { // workaround for blockInARow == 1
            charsInLabel++;
        }

        return charsInLabel;
    }

    function _getFileRankFromPositionLabel(positionLabel) {

        var charsInHorizontalLabel = _getNumberOfCharsInHorizontalBoardLabels();
        var fileLabel = positionLabel.substr(0, charsInHorizontalLabel);
        var rankLabel = positionLabel.substr(charsInHorizontalLabel);

        var file = 0;
        for (var i = 0; i < charsInHorizontalLabel; i++) {
            file += _alphabet.indexOf(fileLabel.charAt(i)) * Math.pow(_alphabet.length, charsInHorizontalLabel-(i+1));
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
            label += _alphabet.charAt(Math.floor((file % Math.pow(_alphabet.length, j)) / Math.pow(_alphabet.length, j - 1)));
        }

        label += (rank+1);

        return label;
    }

    function _getXYCoordsFromFileRank(file, rank) {
        var xCoord = file * (_configuration.blockSize + _configuration.marginBetweenBlocksSize) + _configuration.blockSize / 2;
        var yCoord = (_configuration.blocksInAColumn - rank - 1) * (_configuration.blockSize + _configuration.marginBetweenBlocksSize) + _configuration.blockSize / 2; // the coord y==0 is at the top, but row 0 is at the bottom

        return {
            x: xCoord,
            y: yCoord
        };
    }

    function _getFileRankFromXYCoords(x, y) {
        var file = Math.floor((x + (_configuration.marginBetweenBlocksSize / 2)) / (_configuration.blockSize + _configuration.marginBetweenBlocksSize));
        var rank = (_configuration.blocksInAColumn - Math.floor((y + (_configuration.marginBetweenBlocksSize / 2)) / (_configuration.blockSize + _configuration.marginBetweenBlocksSize)) - 1);

        return {
            file: file,
            rank: rank
        };
    }

    function _getXYCoordsFromPositionLabel(positionLabel) {
        var numericPosition = _getFileRankFromPositionLabel(positionLabel);
        return _getXYCoordsFromFileRank(numericPosition.file, numericPosition.rank);
    }

    function _getPositionLabelFromXYCoords(x, y) {
        var numericPosition = _getFileRankFromXYCoords(x, y);
        return _getPositionLabelFromFileRank(numericPosition.file, numericPosition.rank);
    }

    function _isArray(object) {
        if (Array.isArray)
            return Array.isArray(object);

        return typeof object !== 'undefined' && object && object.constructor === Array;
    }

    function _isObject(object) {
        return object !== null && typeof object === typeof {};
    }

    function _createPiece(pieceLabel) {

        var deferred = customQ.defer();

        if (!_piecesBox[pieceLabel]) {
            if (!loadingPieces[pieceLabel]) {

                var pieceImage = new Image();
                pieceImage.src = _configuration.piecesFolder + "/" + pieceLabel + ".png";

                pieceImage.onload = function (e) {

                    var loadedPiece = e.target;
                    _piecesBox[pieceLabel] = loadedPiece;

                    loadingPieces[pieceLabel].deferreds.forEach(function(deferred) {
                        deferred.resolve(loadedPiece);
                    });

                    delete loadingPieces[pieceLabel];
                };

                pieceImage.onerror = function (e) {

                    loadingPieces[pieceLabel].deferreds.forEach(function(deferred) {
                        deferred.reject("Error loading piece "+pieceLabel);
                    });

                    delete loadingPieces[pieceLabel];
                };

                loadingPieces[pieceLabel] = {
                    piece: pieceImage,
                    deferreds: []
                };
            }

            loadingPieces[pieceLabel].deferreds.push(deferred);
            return deferred.promise;
        }

        deferred.resolve(_piecesBox[pieceLabel]);
        return deferred.promise;
    }

    /**
     * @constructor
     * @param {Object} configuration {
     *  canvasId,           // id of canvas html element                        | string            | mandatory
     *
     *  type,               // 'linesGrid' or 'blocksGrid'                      | string literal    | optional - default: 'blocksGrid'. if 'linesGrid' then 'lightSquaresColor' is used as background color
     *  blocksInARow,       // number of blocks in a row                        | integer           | optional - default: blocksInAColumn if is set, 8 otherwise
     *  blocksInAColumn     // number of blocks in a column                     | integer           | optional - default: blocksInARow if is set, 8 otherwise
     *
     *  canvasWidth         // width in px to which the canvas will be set      | integer           | optional - default: canvasHeight if is set, width of html canvas element otherwise. ignored if canvasSize is set
     *  canvasHeight        // height in px to which the canvas will be set     | integer           | optional - default: canvasWidth if is set, height of html canvas element otherwise. ignored if canvasSize is set
     *  canvasSize,         // dimension in px to which the canvas will be set  | integer           | optional - no default: see canvasWidth and canvasHeight
     *  borderSize,         // dimension in px of board border                  | integer           | optional - default: 3.5% of min(canvasWidth, canvasHeight). set to 0 to remove border
     *  blocksMargin,       // dimension in px of margin between blocks         | integer or 'auto' | optional - default: 0, no margin between blocks. 'auto' set margin to ~3% (rounded) of block size.
     *  gridLinesSize,      // dimension in px of lines for 'linesGrid' type    | integer           | optional - default: 3% of block size. ignored if type != 'linesGrid'
     *
     *  lightSquaresColor,  // color of light squares                           | string            | optional - default: "#EFEFEF"
     *  darkSquaresColor,   // color of dark squares                            | string            | optional - default: "#ABABAB". ignored if type is 'linesGrid'
     *  linesColor,         // color of lines if type is 'linesGrid'            | string            | optional - default: "#000"
     *  borderColor,        // color of board border                            | string            | optional - default: "#222"
     *  shadowColor,        // color of border shadow                           | string            | optional - default: "#000"
     *  labelsColor,        // color of border labels                           | string            | optional - default: "#DDD"
     *  highlighterColor,   // color to highlight elements                      | string            | optional - default: "lightgreen"
     *  marginColor,        // color of margin between blocks                   | string            | optional - default: "#222", ignored if type != 'linesGrid'
     *
     *  coords,             // specify if board has blocks coords labels        | boolean           | optional - default: true. if there is no border this parameter is ignored
     *
     *  rotationDuration,   // duration of flipping in millisecs                | integer           | optional - default: 500
     *  squeezeScaleFactor, // rescaling factor of board for flip animation     | number in [0,1]   | optional - default: 0.7
     *  animationOfPieces,  // specify if pieces movement is animated           | boolean           | optional - default: true
     *  actionsOnPieces,    // specify if enabled mouse interaction with pieces | boolean           | optional - default: true
     *
     *  piecesFolder,       // relative (to html page) path to pieces images    | string            | optional - default: "./img"
     *
     *  goGame,             // specify if board has to be optimized for go game | boolean           | optional - default: false. if true type is automatically set to 'linesGrid'
     *  chessGame: {        // to define properties for chess optimization      | object            | optional - default: undefined. board is not optimized for chess
     *      pawnLabel,      // label of pawn, used in filename of piece         | string            | mandatory if chess object is defined. ignored otherwise
     *      bishopLabel,    // label of bishop, used in filename of piece       | string            | mandatory if chess object is defined. ignored otherwise
     *      rookLabel       // label of rook, used in filename of piece         | string            | mandatory if chess object is defined. ignored otherwise
     *  }
-     *  piecesBox: {
     *      position,       // 't','b','r','l', or combination: 'tr','tpb'...   | string            | optional - default: 'r'
     *      pieces,         // string with list of labels of pieces in the box  | string            | optional - no default: empty box
     *      replace         // if true a piece taken from box is replaced       | boolean           | optional - default: true
     *  }
     * }
     */
    function CanvasBoard(configuration) {

        /*
         * Elements stack:
         *   _stage
         *     |--borderContainer
         *     |    |--border
         *     |    |--labelsContainer     -> added to _containersToRotate
         *     |--boardContainer
         *          |--background           // exists only if there is space between block
         *          |--blockHighlighter     // exists only during piece pressmove event
         *          |--blocksContainer
         *          |--piecesContainer     -> added to _containersToRotate
         */

        if (!configuration || !configuration.canvasId)
            throw new Error("CanvasBoard: configuration object and canvasId property are mandatory.");

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
        boardContainer.x = _configuration.canvasWidth  / 2;
        boardContainer.y = _configuration.canvasHeight / 2;
        boardContainer.scaleX = boardContainer.scaleY = boardContainer.scale = 1;
        boardContainer.name = "boardContainer";

        if (_configuration.marginBetweenBlocksSize > 0) {

            var blocksBorder = new createjs.Shape();
            var blocksBorderGraphic = blocksBorder.graphics;

            //blocksBorderGraphic.drawRect(0, 0, _configuration.allBlocksWidth, _configuration.allBlocksHeight);
            blocksBorderGraphic.beginStroke(_configuration.marginColor)
                .setStrokeStyle(_configuration.marginBetweenBlocksSize);

            for (var i=0; i<_configuration.blocksInARow-1; i++) {
                blocksBorderGraphic
                    .moveTo(_configuration.blockSize + _configuration.marginBetweenBlocksSize/2 + (_configuration.blockSize+_configuration.marginBetweenBlocksSize)*i, 0)
                    .lineTo(_configuration.blockSize + _configuration.marginBetweenBlocksSize/2 + (_configuration.blockSize+_configuration.marginBetweenBlocksSize)*i, _configuration.allBlocksHeight);
            }
            for (var i=0; i<_configuration.blocksInAColumn-1; i++) {
                blocksBorderGraphic
                    .moveTo(0, _configuration.blockSize + _configuration.marginBetweenBlocksSize/2 + (_configuration.blockSize+_configuration.marginBetweenBlocksSize)*i)
                    .lineTo(_configuration.allBlocksWidth, _configuration.blockSize + _configuration.marginBetweenBlocksSize/2 + (_configuration.blockSize+_configuration.marginBetweenBlocksSize)*i);
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

            if (_configuration.type == 'linesGrid') {
                drawBlockLines(block, columnOfBlock, rowOfBlock);
            }

            blocksContainer.addChild(block);
        }
        boardContainer.addChild(blocksContainer);

        var piecesContainer = new createjs.Container();
        _containersToRotate.push(piecesContainer);
        this.piecesOnBoard = piecesContainer;
        boardContainer.addChild(this.piecesOnBoard);

        _stage.addChild(boardContainer);

        var tickHandler = (function () {

            var rotationDuration = _configuration.rotationDuration,

                squeezedBoard = false,
                turnsBoard = false,
                enlargeBoard = false,

                squeezeFirstTick = true,
                enlargeFirstTick = false,
                turnsFirstTick = false,

                rescalationConfiguration = _configuration.squeezeScaleFactor,

                rescalationExecutionTime = rotationDuration * 0.2, // 20% of animation time is for rescaling (one time for squeezing, one time for enlarging: 40% tot)
                rescalationTargetScale, // scale dimension after rescalation
                rescalationAmount, // dimension of rescalation (initialScale - rescalationTargetScale)
                rescalationMultiplier, rescalationCurrentValue, previousScale,

                turnsExecutionTime = rotationDuration * 0.6,
                turnsTargetRotation, // inclination after rotation
                turnsAmount, // degrees of rotation
                turnsMultiplier, turnsCurrentValue, turnsPreviousValue,

                elementTurnsAmount, elementMultiplier, // vars for elements rotation

                boardStartingSection = 0,
                boardDestinationSection = 0,

                animationOfPieces = _configuration.animationOfPieces;

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
                            rescalationTargetScale = rescalationConfiguration;
                        }

                        if (enlargeFirstTick) {
                            rescalationTargetScale = previousScale / _stage.scaleX; // TODO oppure settare uguale a dim max se board storta
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
                            var amountForThisStep = (event.delta * turnsMultiplier)%360;

                            turnsCurrentValue += Math.abs(amountForThisStep);
                            _stage.rotation = _stage.rotation += amountForThisStep;

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

                        if (animationOfPieces) {
                            if (move.piece.file != undefined || move.piece.rank != undefined) {
                                move.piece.file = undefined;
                                move.piece.rank = undefined;
                            }
                            _listOfMovements[i].piece.x += distX * 0.2;
                            _listOfMovements[i].piece.y += distY * 0.2;
                        }

                        if (!animationOfPieces || (Math.abs(distY) <= 1 && Math.abs(distX) <= 1)) {
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
        })();

        createjs.Ticker.addEventListener("tick", tickHandler);

        createjs.Ticker.setFPS(40);

        _update = true;

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

            if (configuration.blocksMargin != 0) {
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
                canvasId                    : configuration.canvasId,
                canvasWidth                 : canvasWidth,
                canvasHeight                : canvasHeight,
                canvasSize                  : configuration.canvasSize,
                shadowSize                  : shadowSize,
                borderSize                  : borderSize,
                blockSize                   : blockSize,
                marginBetweenBlocksSize     : marginBetweenBlocksSize,
                highlighterSize             : blockSize * 0.03,
                allBlocksWidth              : allBlocksWidth,
                allBlocksHeight             : allBlocksHeight,
                boardPaddingWidthSize       : (canvasWidth - allBlocksWidth - (borderSize + shadowSize) * 2) / 2,
                boardPaddingHeightSize      : (canvasHeight - allBlocksHeight - (borderSize + shadowSize) * 2) / 2,
                gridLinesSize               : configuration.gridLinesSize || blockSize * 0.03,
                blocksInARow                : blocksInARow,
                blocksInAColumn             : blocksInAColumn,
                coords                      : configuration.coords !== false,
                type                        : configuration.type === 'linesGrid' ? 'linesGrid' : configuration.goGame === true ? 'linesGrid' : 'blocksGrid',
                lightSquaresColor           : configuration.lightSquaresColor   || "#EFEFEF",
                darkSquaresColor            : configuration.darkSquaresColor    || "#ABABAB",
                linesColor                  : configuration.linesColor          || "#000",
                borderColor                 : configuration.borderColor         || "#222",
                shadowColor                 : configuration.shadowColor         || "#000",
                labelsColor                 : configuration.labelsColor         || "#DDD",
                highlighterColor            : configuration.highlighterColor    || "lightgreen",
                marginColor                 : configuration.marginColor         || "#222",
                rotationDuration            : configuration.rotationDuration === undefined ? 500 : configuration.rotationDuration,
                squeezeScaleFactor          : configuration.squeezeScaleFactor  || 0.7,
                animationOfPieces           : configuration.animationOfPieces !== false,
                piecesFolder                : configuration.piecesFolder        || "./img",
                actionsOnPieces             : configuration.actionsOnPieces !== false,
                blocksMargin                : configuration.blocksMargin        || 0,
                goGame                      : configuration.goGame === true,
                chessGame                   : configuration.chessGame
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
                        label += _alphabet.charAt(Math.floor((i % Math.pow(_alphabet.length, j)) / Math.pow(_alphabet.length, j - 1)));
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

        function drawBlockLines(block, columnOfBlock, rowOfBlock) { // TODO controllare cosa succede con 19 blocchi, e semmai estendere per > 19

            var blockGraphic = block.graphics;

            blockGraphic.beginStroke(_configuration.linesColor)
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
                if (_configuration.blocksInARow == 19) {
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
    }

    CanvasBoard.prototype.rotate = function (degrees) {
        _rotationDegrees = degrees || 180;
    };

    CanvasBoard.prototype.setRotation = function (degrees) {

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

    CanvasBoard.prototype.scale = function (scaleFactor) {
        _canvas.width = _configuration.canvasWidth * scaleFactor;
        _canvas.height = _configuration.canvasHeight * scaleFactor;

        _stage.scaleX = _stage.scaleY = _stage.scale = scaleFactor;
        _stage.x = _configuration.canvasWidth * scaleFactor / 2;
        _stage.y = _configuration.canvasHeight * scaleFactor / 2;
        _update = true;
    };

    CanvasBoard.prototype.setPosition = function (positionString) {
        /*
         * gets positionString in FEN notation as input and sets board
         * a char in position string is also the name of image file of piece
         */

        var currentListOfMovements;
        if (_listOfMovements.length > 0) {
            currentListOfMovements = _listOfMovements;
            _listOfMovements = [];
        }

        // create object with state of current board
        var currentBoard = [];
        for (var i = 0; i < _configuration.blocksInARow; i++) { // add an array for each column
            currentBoard.push([]);
        }
        for (var i = 0; i < this.piecesOnBoard.getNumChildren(); i++) {
            var piece = this.piecesOnBoard.getChildAt(i);
            if (piece.rank != undefined && piece.file != undefined)
                currentBoard[piece.file][piece.rank] = piece.label;
        }

        // create object with state of board with new position
        var rows = positionString.split("/");
        var newBoard = [];
        for (var i = 0; i < _configuration.blocksInARow; i++) { // add an array for each column
            newBoard.push([]);
        }
        for (var i = 0; i < _configuration.blocksInAColumn; i++) { // for each row
            var temp = 0;
            for (var j = 0; j < rows[i].length; ) {
                if (isNaN(rows[i][j])) {
                    newBoard[temp][_configuration.blocksInAColumn -1 - i] = rows[i][j];
                    temp++;
                    j++;
                } else {
                    for (var z=1; z+j<rows[i].length; z++) { // calc chars length of number
                        if (isNaN(rows[i][j+z]))
                            break;
                    }
                    var lengthOfNumber = z;
                    var number = rows[i].substr(j, lengthOfNumber);
                    temp += parseInt(number, 10);
                    j += lengthOfNumber;
                }
            }
        }
        console.log(newBoard)

        // temp vars for computation
        var assignedPieces = [];
        var listOfMovements = [];

        // find pieces that yet are in the correct position
        for (var i = 0; i < _configuration.blocksInARow; i++) { // file (column)
            for (var j = 0; j < _configuration.blocksInAColumn; j++) { // rank (row)
                if (currentBoard[i][j] && newBoard[i][j] && currentBoard[i][j] == newBoard[i][j]) {
                    for (var z = 0; z < this.piecesOnBoard.getNumChildren(); z++) {
                        var piece = this.piecesOnBoard.getChildAt(z);
                        if (piece.file == i && piece.rank == j) {
                            newBoard[i][j] = undefined;
                            assignedPieces.push(piece);
                            break;
                        }
                    }
                }
            }
        }

        // find pieces that are moving to the correct position
        if (currentListOfMovements) { // if a piece is yet moving to the destination it preserves its movement
            for (var i = 0; i < _configuration.blocksInARow; i++) { // file (column)
                for (var j = 0; j < _configuration.blocksInAColumn; j++) { // rank (row)
                    if (newBoard[i][j]) {
                        for (var z = 0; z < currentListOfMovements.length; z++) {
                            var move = currentListOfMovements[z];
                            if (move.piece.label == newBoard[i][j] && move.destFile == i && move.destRank == j) {
                                newBoard[i][j] = undefined;
                                assignedPieces.push(move.piece);
                                listOfMovements.push(move);
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
                    for (var z = 0; z < this.piecesOnBoard.getNumChildren(); z++) {
                        var piece = this.piecesOnBoard.getChildAt(z);
                        if (newBoard[i][j] == piece.label && assignedPieces.indexOf(piece) == -1) { // if true actualPiece is a candidate to reach (i,j) position
                            var distance = Math.pow((piece.file - i), 2) + Math.pow((piece.rank - j), 2);
                            for (var k = z + 1; k < this.piecesOnBoard.getNumChildren(); k++) {
                                var alternativePiece = this.piecesOnBoard.getChildAt(k);
                                if (newBoard[i][j] == alternativePiece.label && assignedPieces.indexOf(alternativePiece) == -1) { // search for a piece for a more consistent movement
                                    var alternativeDistance = 0;
                                    if (_configuration.chessGame) {
                                        if (alternativePiece.label.toUpperCase() == _configuration.chessGame.bishopLabel.toUpperCase()) {
                                            if (((alternativePiece.rank + alternativePiece.file) % 2 == (i + j) % 2) && ((piece.rank + piece.file) % 2 != (i + j) % 2))
                                                piece = alternativePiece;
                                            else if ((((alternativePiece.rank + alternativePiece.file) % 2 != (i + j) % 2) && ((piece.rank + piece.file) % 2 != (i + j) % 2)) || (((alternativePiece.rank + alternativePiece.file) % 2 == (i + j) % 2) && ((piece.rank + piece.file) % 2 == (i + j) % 2)))
                                                alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                        } else if (alternativePiece.label.toUpperCase() == _configuration.chessGame.rookLabel.toUpperCase()) {
                                            if ((alternativePiece.file == i || alternativePiece.rank == j) && !(piece.file == i || piece.rank == j))
                                                piece = alternativePiece;
                                            else
                                                alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                        } else if (alternativePiece.label.toUpperCase() == _configuration.chessGame.pawnLabel.toUpperCase()) {
                                            if (alternativePiece.file == i && piece.file != i)
                                                piece = alternativePiece;
                                            else if ((alternativePiece.file == i && piece.file == i) || (alternativePiece.file != i && piece.file != i))
                                                alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                        } else
                                            alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                    } else
                                        alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);

                                    if (alternativeDistance && alternativeDistance < distance) {
                                        distance = alternativeDistance;
                                        piece = alternativePiece;
                                    }
                                }
                            }
                            newBoard[i][j] = undefined;
                            assignedPieces.push(piece);
                            listOfMovements.push({
                                piece: piece,
                                destFile: i,
                                destRank: j
                            });
                            break;
                        }
                    }
                }
            }
        }

        // remove pieces that have no position
        for (var i = this.piecesOnBoard.getNumChildren() - 1; i >= 0; i--) {
            var piece = this.piecesOnBoard.getChildAt(i);
            if (assignedPieces.indexOf(piece) == -1) {
                this.piecesOnBoard.removeChildAt(i);
            }
        }

        // start movements
        if (listOfMovements.length == 0) {
            _update = true;
        } else {
            _listOfMovements = listOfMovements;
        }

        // add missing pieces
        for (var i = 0; i < _configuration.blocksInARow; i++) { // file (column)
            for (var j = 0; j < _configuration.blocksInAColumn; j++) { // rank (row)
                if (newBoard[i][j]) {
                    //createPiece.call(this, newBoard[i][j], i, j);
                    var promise = this.getNewPiece(newBoard[i][j]);
                    promise.then(
                        (function(file, rank) {
                            return (function (piece) {
                                piece.x = _configuration.allBlocksWidth / 2;
                                piece.y = _configuration.allBlocksHeight / 2;
                                this.setPieceAtPosition(piece, _getPositionLabelFromFileRank(file, rank));
                            }).bind(this)
                        }).call(this, i, j)
                    ).catch(function(error) {
                        console.log(error);
                    });
                }
            }
        }
    };

    CanvasBoard.prototype.getPosition = function () {
        /*
         * returns board position in FEN-like notation
         */

        var currentBoard = [];

        for (var i = 0; i < _configuration.blocksInARow; i++) { // add an array for each column
            currentBoard.push([]);
        }

        for (var i = 0; i < this.piecesOnBoard.getNumChildren(); i++) {
            var piece = this.piecesOnBoard.getChildAt(i);
            if (piece.rank != undefined && piece.file != undefined)
                currentBoard[piece.file][piece.rank] = piece.label;
        }
        console.log(currentBoard)

        var fen = '';

        for (var i = _configuration.blocksInAColumn-1; i >=0; i--) {
            if (i != _configuration.blocksInAColumn-1)
                fen += '/';
            var temp = 0;
            for (var j = 0; j < _configuration.blocksInARow; j++) {
                if (currentBoard[j][i]) {
                    if (temp > 0) {
                        fen += temp;
                        temp = 0;
                    }
                    fen += currentBoard[j][i];
                } else {
                    temp++;
                }
            }
            if (temp > 0)
                fen += temp;
        }

        return fen;
    };

    CanvasBoard.prototype.move = function (/* arguments: see comment */) {
        /*
         * Possible inputs:
         *   1. ("H3", "G3") // couple of position labels for single move
         *   2. (["H3", "G3"], ["A4", "F7"], .....) // list of arrays of two elements for multiple moves simultaneously
         */

        if (arguments.length == 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'string') { // method overload
            return this.move([arguments[0], arguments[1]]);
        }

        var movements = Array.prototype.slice.call(arguments);

        var movementsArrayWithPiece = [];
        movements.forEach((function(movement) {
            var piecesAtPosition = this.getPieceAtPosition(movement[0]);
            if (_isArray(piecesAtPosition)) { // multiple pieces on the same position
                piecesAtPosition.forEach(function(piece) {
                    movementsArrayWithPiece.push([piece, movement[1]]);
                });
            } else {
                movementsArrayWithPiece.push([piecesAtPosition, movement[1]]);
            }

        }).bind(this));

        this.setPieceAtPosition.apply(this, movementsArrayWithPiece);
    };

    CanvasBoard.prototype.setPieceAtPosition = function (/* arguments: see comment */) {
        /*
         * Possible inputs:
         *   1. (piece, "H7") // instance of piece and position label of destination
         *   2. ([piece1, "H7"], [piece2, "G3"], .....) // list of arrays of two elements (as above) for multiple moves simultaneously
         */

        if (arguments.length == 2 && _piecesBox[arguments[0].label] && typeof arguments[1] === 'string') { // method overload
            return this.setPieceAtPosition([arguments[0], arguments[1]]);
        }

        var movements = Array.prototype.slice.call(arguments);

        var movementsList = [];

        movements.forEach((function(movement) {
            var piece = movement[0];
            var position = movement[1];

            if (!piece)
                return false;

            var numericPosition = _getFileRankFromPositionLabel(position);

            var file = numericPosition.file;
            var rank = numericPosition.rank;

            if (!this.piecesOnBoard.contains(piece)) {
                if (!piece.x || !piece.y) { // a new piece (with no x,y coords) is immediately placed in the position without movement
                    var xyCoords = _getXYCoordsFromFileRank(file, rank);
                    piece.x = xyCoords.x;
                    piece.y = xyCoords.y;
                }
                this.piecesOnBoard.addChild(piece);
            }

            var yetMoving = false;
            for (var i=0; i<_listOfMovements.length; i++) {
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

        }).bind(this));

        _listOfMovements = _listOfMovements.concat(movementsList);

        return true;
    };

    CanvasBoard.prototype.getPieceAtPosition = function (position) {
        /*
         * returns  - array of pieces on position passed as parameter
         *          - or single piece if there is only one piece on position
         */

        var numericPosition = _getFileRankFromPositionLabel(position);

        var file = numericPosition.file;
        var rank = numericPosition.rank;

        var piecesOnPosition = [];

        for (var i = 0; i < this.piecesOnBoard.getNumChildren(); i++) {
            var piece = this.piecesOnBoard.getChildAt(i);
            if (piece.file == file && piece.rank == rank) {
                piecesOnPosition.push(piece);
            }
        }

        return piecesOnPosition.length == 1 ? piecesOnPosition[0] : piecesOnPosition;
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

        var promise = _createPiece(pieceLabel);

        promise.then((function(piece) {

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
                    var piece = evt.target;
                    piece.scaleX = piece.scaleY = piece.scale * 1.25;
                    piece.shadow = new createjs.Shadow(_configuration.shadowColor, 3, 3, 5);
                    _update = true;
                }).bind(this));

                piece.addEventListener("rollout", (function (evt) {
                    var piece = evt.target;
                    piece.scaleX = piece.scaleY = piece.scale;
                    piece.shadow = null;
                    _update = true;
                }).bind(this));

                piece.addEventListener("mousedown", (function (evt) {
                    var piece = evt.target;
                    var boardContainer = _stage.getChildByName("boardContainer");
                    var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                    this.piecesOnBoard.removeChild(piece);
                    this.piecesOnBoard.addChild(piece);

                    piece.startPosition = {
                        x: piece.x,
                        y: piece.y
                    };

                    piece.x = pt.x;
                    piece.y = pt.y;

                    _update = true;
                }).bind(this));

                piece.addEventListener("pressmove", (function (evt) {
                    var piece = evt.target;
                    var boardContainer = _stage.getChildByName("boardContainer");
                    var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                    var numericPosition = _getFileRankFromXYCoords(pt.x, pt.y);

                    var file = numericPosition.file;
                    var rank = numericPosition.rank;

                    piece.x = pt.x;
                    piece.y = pt.y;

                    var currentSquare = undefined;
                    if (file >= 0 && file < _configuration.blocksInARow && rank >= 0 && rank < _configuration.blocksInAColumn)
                        currentSquare = file + _configuration.blocksInARow * rank;

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

                            if (_configuration.marginBetweenBlocksSize > 0)
                                boardContainer.addChildAt(blockHighlighter, 2);
                            else
                                boardContainer.addChildAt(blockHighlighter, 1);
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
                    if (file >= 0 && file < _configuration.blocksInARow && rank >= 0 && rank < _configuration.blocksInAColumn)
                        currentSquare = file + _configuration.blocksInARow * rank;

                    if (!currentSquare) {
                        piece.x = piece.startPosition.x;
                        piece.y = piece.startPosition.y;
                    } else {
                        var sourcePosition = _getPositionLabelFromFileRank(piece.file, piece.rank);
                        var destPosition = _getPositionLabelFromFileRank(file, rank);
                        if (_hooks.tryMove) {
                            if (_hooks.tryMove(sourcePosition, destPosition, piece)) { // TODO recuperare array di pezzi alla destinazione e passarli al hook come quarto parametro
                                this.setPieceAtPosition(piece, destPosition);
                            } else {
                                piece.x = piece.startPosition.x;
                                piece.y = piece.startPosition.y;
                            }
                        } else {
                            this.setPieceAtPosition(piece, destPosition);
                        }
                    }

                    _update = true;
                }).bind(this));
            }

            deferred.resolve(piece);

        }).bind(this)).catch(function(error) {
            deferred.reject(error);
        });

        return deferred.promise;
    };

    return CanvasBoard;
});