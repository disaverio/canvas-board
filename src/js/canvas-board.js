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
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd                   ? define(factory) :
            global.CanvasBoard = factory();
})(this, function() {

    // private members
    var _stage, _canvas, _blockSize, _highlighterSize, _gridLinesSize, _blocksMargin,
        _update = false,
        _rotationDegrees = 0,
        _listOfMovements = [],
        _containersToRotate = [],
        _piecesBox = {},
        _setPositionCallbacks = [];


    /**
     * @constructor
     * @param {object} configuration {
     *  canvasId,           // id of canvas html element                        | string            | mandatory
     *  canvasSize,         // dimension in px to which the canvas will be set  | integer           | optional - default: min value between width and height of html element
     *  border,             // dimension in px of board border                  | integer           | optional - default: 3.5% of canvas size. set 0 to remove border
     *  notation,           // specify if board has blocks labels or not        | boolean           | optional - default: true. if there is no border this parameter is ignored
     *  blocksInARow,       // number of blocks in a row                        | integer           | optional - default: 8
     *  type,               // 'linesGrid' or 'blocksGrid'                      | string literal    | optional - default: 'blocksGrid'. if 'linesGrid' then 'lightSquaresColor' is used as background color
     *  gridLinesSize,      // dimension in px of lines for 'linesGrid' type    | integer           | optional - default: 3% of block size. ignored if type != 'linesGrid'
     *  lightSquaresColor,  // color of light squares                           | string            | optional - default: "#EFEFEF"
     *  darkSquaresColor,   // color of dark squares                            | string            | optional - default: "#ABABAB". ignored if type is 'linesGrid'
     *  linesColor,         // color of lines if type is 'linesGrid'            | string            | optional - default: "#000"
     *  borderColor,        // color of border                                  | string            | optional - default: "#222"
     *  shadowColor,        // color of border shadow                           | string            | optional - default: "#000"
     *  labelsColor,        // color of border labels                           | string            | optional - default: "#DDD"
     *  highlighterColor,   // color to highlight elements                      | string            | optional - default: "lightgreen"
     *  flipDuration,       // duration of flipping in millisecs                | integer           | optional - default: 500
     *  squeezeScaleFactor, // rescaling factor of board for flip animation     | number in [0,1]   | optional - default: 0.7
     *  animationOfPieces,  // specify if pieces movement is animated           | boolean           | optional - default: true
     *  piecesFolder,       // relative (to html page) path to pieces images    | string            | optional - default: "./img"
     *  actionsOnPieces,    // specify if enable mouse interaction with pieces  | boolean           | optional - default: true
     *  blocksMargin,       // dimension in px of margin between blocks         | integer or 'auto' | optional - default: 0, no margin between blocks. 'auto' set margin to 3% of block size
     *  goGame,             // specify if board has to be optimized for go game | boolean           | optional - default: false. if true type is automatically set to 'linesGrid'
     *  chessGame {         // to define chess peculiar properties              | object            | optional - default: undefined. board is not optimized for chess
     *      pawnLabel,      // label of pawn, used in filename of piece         | string            | mandatory if chess object is defined. ignored otherwise
     *      bishopLabel,    // label of bishop, used in filename of piece       | string            | mandatory if chess object is defined. ignored otherwise
     *      rookLabel       // label of rook, used in filename of piece         | string            | mandatory if chess object is defined. ignored otherwise
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

        var board = this;

        if (!configuration || !configuration.canvasId)
            throw new Error("CanvasBoard: configuration object and canvasId property are mandatory.");

        _canvas = document.getElementById(configuration.canvasId);

        this.configuration = setConfiguration(configuration);

        var borderSize, shadowSize, blockSize, allBlocksSize, boardPaddingSize, highlighterBlockBorderSize;

        borderSize = shadowSize = this.configuration.border === undefined ? Math.floor(this.configuration.canvasSize * 0.035) // default board border size is 3.5% of canvas size
                                                                          : this.configuration.border;
        this.configuration.border = borderSize;

        var sizeMarginBetweenBlocks = 0;
        if (this.configuration.blocksMargin != 0) {
            if (this.configuration.blocksMargin == 'auto') {
                var availableSizeForBordersAndBlocks = this.configuration.canvasSize - (borderSize + shadowSize) * 2;
                var unitOfSpace = availableSizeForBordersAndBlocks / (100 * this.configuration.blocksInARow + 3 * (this.configuration.blocksInARow - 1)); // default block border size is 3% of block size
                blockSize = Math.floor(unitOfSpace * 100);
                var availableSizeForBorders = availableSizeForBordersAndBlocks - blockSize * this.configuration.blocksInARow;
                sizeMarginBetweenBlocks = Math.floor(availableSizeForBorders / (this.configuration.blocksInARow - 1));
            } else {
                sizeMarginBetweenBlocks = configuration.blocksMargin;
                blockSize = Math.floor((this.configuration.canvasSize - (borderSize + shadowSize) * 2 - sizeMarginBetweenBlocks * (this.configuration.blocksInARow - 1)) / this.configuration.blocksInARow);
            }
        } else {
            blockSize = Math.floor((this.configuration.canvasSize - (borderSize + shadowSize) * 2) / this.configuration.blocksInARow);
        }

        highlighterBlockBorderSize = blockSize * 0.03; // block border size is 3% of block size // in this case border is used only to enlighten an active block, not for lines in board
        allBlocksSize = blockSize * this.configuration.blocksInARow + sizeMarginBetweenBlocks * (this.configuration.blocksInARow - 1);
        boardPaddingSize = (this.configuration.canvasSize - allBlocksSize - (borderSize + shadowSize) * 2) / 2;

        _canvas = document.getElementById(this.configuration.canvasId);
        _canvas.height = _canvas.width = this.configuration.canvasSize;

        _stage = new createjs.Stage(_canvas);
        _stage.scaleX = _stage.scaleY = _stage.scale = 1;
        _stage.regX = _stage.regY = this.configuration.canvasSize / 2;
        _stage.x = _stage.y = this.configuration.canvasSize / 2;
        _stage.enableMouseOver(40);
        _stage.mouseMoveOutside = true;
        _stage.rotation = 0;

        _blockSize = blockSize;
        _highlighterSize = highlighterBlockBorderSize;
        _gridLinesSize = blockSize * 0.03;
        _blocksMargin = sizeMarginBetweenBlocks;

        if (this.configuration.border) {
            var borderContainer = new createjs.Container();

            var border = new createjs.Shape();
            border.graphics
                .beginStroke(this.configuration.borderColor)
                .setStrokeStyle(borderSize)
                .drawRect(borderSize / 2 + shadowSize + boardPaddingSize, borderSize / 2 + shadowSize + boardPaddingSize, allBlocksSize + borderSize, allBlocksSize + borderSize);
            border.shadow = new createjs.Shadow(this.configuration.shadowColor, 0, 0, 15);

            borderContainer.addChild(border);

            if (this.configuration.notation) {
                var labelsContainer = new createjs.Container();
                var labelSize = Math.min(Math.floor(borderSize * 0.6), _blockSize);
                addLabelsToContainer(labelsContainer, labelSize, "V");
                addLabelsToContainer(labelsContainer, labelSize, "H");
                _containersToRotate.push(labelsContainer);

                borderContainer.addChild(labelsContainer);
            }
            _stage.addChild(borderContainer);
        }

        var boardContainer = new createjs.Container();
        boardContainer.regX = boardContainer.regY = allBlocksSize / 2;
        boardContainer.x = boardContainer.y = this.configuration.canvasSize / 2;
        boardContainer.scaleX = boardContainer.scaleY = boardContainer.scale = 1;
        boardContainer.name = "boardContainer";

        if (sizeMarginBetweenBlocks > 0) {
            var background = new createjs.Shape();
            background.graphics.beginFill(this.configuration.borderColor).drawRect(0, 0, allBlocksSize, allBlocksSize);
            boardContainer.addChild(background);
        }

        var blocksContainer = new createjs.Container();
        for (var i = 0; i < Math.pow(this.configuration.blocksInARow, 2); i++) {
            var rowOfBlock = Math.floor(i / this.configuration.blocksInARow);
            var columnOfBlock = i % this.configuration.blocksInARow;

            var block = new createjs.Shape();
            block.graphics.beginFill(getBlockColour(columnOfBlock, rowOfBlock)).drawRect(0, 0, blockSize, blockSize);
            block.x = columnOfBlock * (blockSize + sizeMarginBetweenBlocks) + blockSize / 2;
            block.y = (this.configuration.blocksInARow - rowOfBlock - 1) * (blockSize + sizeMarginBetweenBlocks) + blockSize / 2; // the coord y==0 is at the top, but row 0 is at the bottom
            block.regY = block.regX = blockSize / 2;

            if (this.configuration.type == 'linesGrid') {
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

        var tickHandler = ((function () {

            var flipDuration = this.configuration.flipDuration,

                squeezedBoard = false,
                turnsBoard = false,
                enlargeBoard = false,

                squeezeFirstTick = true,
                enlargeFirstTick = false,
                turnsFirstTick = false,

                rescalationConfiguration = this.configuration.squeezeScaleFactor,

                rescalationExecutionTime = flipDuration * 0.2, // 20% of animation time is for rescaling (one time for squeezing, one time for enlarging: 40% tot)
                rescalationTargetScale, // scale dimension after rescalation
                rescalationAmount, // dimension of rescalation (initialScale - rescalationTargetScale)
                rescalationMultiplier, rescalationCurrentValue, previousScale,

                turnsExecutionTime = flipDuration * 0.6,
                turnsTargetRotation, // inclination after rotation
                turnsAmount, // degrees of rotation
                turnsMultiplier, turnsCurrentValue, turnsPreviousValue,

                elementTurnsAmount, elementMultiplier, // vars for elements rotation

                boardStartingSection = 0,
                boardDestinationSection = 0,

                animationOfPieces = this.configuration.animationOfPieces;

            return (function (event) {

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
                            elementRotation += parseInt(turnsAmount / 360) * -360; // rotation of element is incremented of a complete cycle for each complete cycle of board rotation

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

                        var distX = (move.destFile * (_blockSize + _blocksMargin) + _blockSize / 2 - move.piece.x);
                        var distY = ((this.configuration.blocksInARow - move.destRank - 1) * (_blockSize + _blocksMargin) + _blockSize / 2 - move.piece.y);

                        if (animationOfPieces) {
                            if (move.piece.file != undefined || move.piece.rank != undefined) {
                                move.piece.file = undefined;
                                move.piece.rank = undefined;
                            }
                            _listOfMovements[i].piece.x += distX * 0.2;
                            _listOfMovements[i].piece.y += distY * 0.2;
                        }

                        if (!animationOfPieces || (Math.abs(distY) <= 1 && Math.abs(distX) <= 1)) {
                            move.piece.y = (this.configuration.blocksInARow - move.destRank - 1) * (_blockSize + _blocksMargin) + _blockSize / 2;
                            move.piece.x = move.destFile * (_blockSize + _blocksMargin) + _blockSize / 2;
                            move.piece.file = move.destFile;
                            move.piece.rank = move.destRank;

                            _listOfMovements.splice(i, 1);
                        }
                    }

                    _update = true;

                    if (_setPositionCallbacks.length > 0) { // if there is a request for a new position while movements are not completed
                        var currentListOfMovements = _listOfMovements;
                        _listOfMovements = []; // we stop current movements
                        this.setPosition(_setPositionCallbacks.shift(), currentListOfMovements); // and submit new request
                    }
                }

            }).bind(this);
        }).bind(this))();

        createjs.Ticker.addEventListener("tick", tickHandler);

        createjs.Ticker.setFPS(40);

        _update = true;

        function setConfiguration(configuration) {
            return {
                canvasId            : configuration.canvasId,
                canvasSize          : configuration.canvasSize          || (_canvas.width < _canvas.height ? _canvas.width : _canvas.height),
                border              : configuration.border,
                notation            : configuration.notation !== false,
                blocksInARow        : configuration.blocksInARow        || 8,
                type                : configuration.type === 'linesGrid' ? 'linesGrid' :
                    configuration.goGame === true      ? 'linesGrid' :
                        'blocksGrid',
                gridLinesSize       : configuration.gridLinesSize,
                lightSquaresColor   : configuration.lightSquaresColor   || "#EFEFEF",
                darkSquaresColor    : configuration.darkSquaresColor    || "#ABABAB",
                linesColor          : configuration.linesColor          || "#000",
                borderColor         : configuration.borderColor         || "#222",
                shadowColor         : configuration.shadowColor         || "#000",
                labelsColor         : configuration.labelsColor         || "#DDD",
                highlighterColor    : configuration.highlighterColor    || "lightgreen",
                flipDuration        : configuration.flipDuration === undefined ? 500 : configuration.flipDuration,
                squeezeScaleFactor  : configuration.squeezeScaleFactor  || 0.7,
                animationOfPieces   : configuration.animationOfPieces !== false,
                piecesFolder        : configuration.piecesFolder        || "./img",
                actionsOnPieces     : configuration.actionsOnPieces !== false,
                blocksMargin        : configuration.blocksMargin        || 0,
                goGame              : configuration.goGame === true,
                chessGame           : configuration.chessGame
            }
        }

        function addLabelsToContainer(container, labelSize, orientation) {

            var labelsArray = [];

            var charsInLabel = Math.ceil(Math.log(board.configuration.blocksInARow + 1) / Math.log(10));
            var fontSize = labelSize / charsInLabel;

            if (orientation == "V") {
                for (var i = board.configuration.blocksInARow; i > 0; i--) {
                    labelsArray.push(i);
                }
            } else {
                var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                var charsInLabel = Math.ceil(Math.log(board.configuration.blocksInARow) / Math.log(alphabet.length));
                if (charsInLabel == 0) { // workaround for blockInARow == 1
                    charsInLabel++;
                }
                for (var i = 0; i < board.configuration.blocksInARow; i++) {
                    var label = "";
                    for (var j = charsInLabel; j > 0; j--) {
                        label += alphabet.charAt(Math.floor((i % Math.pow(alphabet.length, j)) / Math.pow(alphabet.length, j - 1)));
                    }
                    labelsArray.push(label);
                }
            }

            for (var i = 0; i < board.configuration.blocksInARow; i++) {

                var label = new createjs.Text(labelsArray[i], fontSize + "px sans", board.configuration.labelsColor);
                label.regX = label.getBounds().width / 2;
                label.regY = label.getMeasuredLineHeight() / 2;

                var fixedCoord = borderSize / 2 + shadowSize + boardPaddingSize;
                var floatingCoord = borderSize + i * (blockSize + sizeMarginBetweenBlocks) + blockSize / 2 + shadowSize + boardPaddingSize;

                label.x = orientation == "H" ? floatingCoord : fixedCoord;
                label.y = orientation == "H" ? fixedCoord : floatingCoord;

                var otherSideCoord = borderSize / 2 + allBlocksSize + borderSize + shadowSize + boardPaddingSize;

                var clonedLabel = label.clone();
                orientation == "H" ? clonedLabel.y = otherSideCoord :
                    clonedLabel.x = otherSideCoord;

                container.addChild(label);
                container.addChild(clonedLabel);
            }
        }

        function getBlockColour(columnIndex, rowIndex) {
            var backColor;
            if (board.configuration.type == 'linesGrid') {
                backColor = board.configuration.lightSquaresColor;
            } else {
                if (rowIndex % 2)
                    backColor = (columnIndex % 2 ? board.configuration.darkSquaresColor : board.configuration.lightSquaresColor);
                else
                    backColor = (columnIndex % 2 ? board.configuration.lightSquaresColor : board.configuration.darkSquaresColor);
            }
            return backColor;
        }

        function drawBlockLines(block, columnOfBlock, rowOfBlock) {

            var blockGraphic = block.graphics;

            blockGraphic.beginStroke(board.configuration.linesColor)
                .setStrokeStyle(_gridLinesSize);

            if (columnOfBlock !== 0) {
                blockGraphic
                    .moveTo(_blockSize / 2, _blockSize / 2)
                    .lineTo(0, _blockSize / 2)
            }
            if (columnOfBlock != board.configuration.blocksInARow - 1) {
                blockGraphic
                    .moveTo(_blockSize / 2, _blockSize / 2)
                    .lineTo(_blockSize, _blockSize / 2)
            }
            if (rowOfBlock !== 0) {
                blockGraphic
                    .moveTo(_blockSize / 2, _blockSize / 2)
                    .lineTo(_blockSize / 2, _blockSize)
            }
            if (rowOfBlock != board.configuration.blocksInARow - 1) {
                blockGraphic
                    .moveTo(_blockSize / 2, _blockSize / 2)
                    .lineTo(_blockSize / 2, 0)
            }

            if (board.configuration.goGame) {
                if (board.configuration.blocksInARow % 2 !== 0 && columnOfBlock == Math.floor(board.configuration.blocksInARow / 2) && rowOfBlock == Math.floor(board.configuration.blocksInARow / 2)) {
                    drawCircle();
                }
                if (board.configuration.blocksInARow >= 9 && board.configuration.blocksInARow < 13) {
                    if (((columnOfBlock == 2) || (board.configuration.blocksInARow - columnOfBlock == 3)) && ((rowOfBlock == 2) || (board.configuration.blocksInARow - rowOfBlock == 3))) {
                        drawCircle();
                    }
                }
                if (board.configuration.blocksInARow >= 13) {
                    if (((columnOfBlock == 3) || (board.configuration.blocksInARow - columnOfBlock == 4)) && ((rowOfBlock == 3) || (board.configuration.blocksInARow - rowOfBlock == 4))) {
                        drawCircle();
                    }
                }
                if (board.configuration.blocksInARow == 19) {
                    if (((columnOfBlock == 3 || (board.configuration.blocksInARow - columnOfBlock == 4)) && rowOfBlock == Math.floor(board.configuration.blocksInARow / 2)) || ((rowOfBlock == 3 || (board.configuration.blocksInARow - rowOfBlock == 4)) && columnOfBlock == Math.floor(board.configuration.blocksInARow / 2))) {
                        drawCircle();
                    }
                }
            }

            function drawCircle() {
                blockGraphic
                    .moveTo(_blockSize / 2, _blockSize / 2)
                    .beginFill(board.configuration.linesColor)
                    .drawCircle(_blockSize / 2, _blockSize / 2, _gridLinesSize * 2.5);
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
        _canvas.width = _canvas.height = this.configuration.canvasSize * scaleFactor;

        _stage.scaleX = _stage.scaleY = _stage.scale = scaleFactor;
        _stage.x = _stage.y = this.configuration.canvasSize * scaleFactor / 2;
        _update = true;
    };

    CanvasBoard.prototype.setPosition = function (position) {

        if (_listOfMovements.length > 0) { // to avoid race conditions we have to wait termination of current cycle of movements
            _setPositionCallbacks.push(position);
            return;
        }

        var currentListOfMovements = arguments[1]; // if setPosition is invoked as callback by movements handler then has two parameters

        var currentBoard = [];
        for (var i = 0; i < this.configuration.blocksInARow; i++) {
            currentBoard.push([]);
        }

        for (var i = 0; i < this.piecesOnBoard.getNumChildren(); i++) {
            var piece = this.piecesOnBoard.getChildAt(i);
            if (piece.rank != undefined && piece.file != undefined)
                currentBoard[piece.file][piece.rank] = piece.label;
        }

        var newBoard = [];
        for (var i = 0; i < this.configuration.blocksInARow; i++) {
            newBoard.push([]);
        }

        var rows = position.split("/");

        for (var i = 0; i < this.configuration.blocksInARow; i++) {
            var temp = 0;
            for (var j = 0; j < rows[i].length; j++) {
                if (isNaN(rows[i][j])) {
                    newBoard[temp][7 - i] = rows[i][j];
                    temp++;
                } else {
                    temp += parseInt(rows[i][j], 10);
                }
            }
        }

        var assignedPieces = [];
        var listOfMovements = [];

        // find pieces that yet are in the correct position
        for (var i = 0; i < this.configuration.blocksInARow; i++) { // file (column)
            for (var j = 0; j < this.configuration.blocksInARow; j++) { // rank (row)
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
            for (var i = 0; i < this.configuration.blocksInARow; i++) { // file (column)
                for (var j = 0; j < this.configuration.blocksInARow; j++) { // rank (row)
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
        for (var i = 0; i < this.configuration.blocksInARow; i++) { // file (column)
            for (var j = 0; j < this.configuration.blocksInARow; j++) { // rank (row)
                if (newBoard[i][j]) {
                    for (var z = 0; z < this.piecesOnBoard.getNumChildren(); z++) {
                        var piece = this.piecesOnBoard.getChildAt(z);
                        if (newBoard[i][j] == piece.label && assignedPieces.indexOf(piece) == -1) { // if true actualPiece is a candidate to reach (i,j) position
                            var distance = Math.pow((piece.file - i), 2) + Math.pow((piece.rank - j), 2);
                            for (var k = z + 1; k < this.piecesOnBoard.getNumChildren(); k++) {
                                var alternativePiece = this.piecesOnBoard.getChildAt(k);
                                if (newBoard[i][j] == alternativePiece.label && assignedPieces.indexOf(alternativePiece) == -1) { // search for a piece for a more consistent movement
                                    var alternativeDistance = 0;
                                    if (this.configuration.chessGame) {
                                        if (alternativePiece.label.toUpperCase() == this.configuration.chessGame.bishopLabel.toUpperCase()) {
                                            if (((alternativePiece.rank + alternativePiece.file) % 2 == (i + j) % 2) && ((piece.rank + piece.file) % 2 != (i + j) % 2))
                                                piece = alternativePiece;
                                            else if ((((alternativePiece.rank + alternativePiece.file) % 2 != (i + j) % 2) && ((piece.rank + piece.file) % 2 != (i + j) % 2)) || (((alternativePiece.rank + alternativePiece.file) % 2 == (i + j) % 2) && ((piece.rank + piece.file) % 2 == (i + j) % 2)))
                                                alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                        } else if (alternativePiece.label.toUpperCase() == this.configuration.chessGame.rookLabel.toUpperCase()) {
                                            if ((alternativePiece.file == i || alternativePiece.rank == j) && !(piece.file == i || piece.rank == j))
                                                piece = alternativePiece;
                                            else
                                                alternativeDistance = Math.pow((alternativePiece.file - i), 2) + Math.pow((alternativePiece.rank - j), 2);
                                        } else if (alternativePiece.label.toUpperCase() == this.configuration.chessGame.pawnLabel.toUpperCase()) {
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

        for (var i = this.piecesOnBoard.getNumChildren() - 1; i >= 0; i--) {
            var piece = this.piecesOnBoard.getChildAt(i);
            if (assignedPieces.indexOf(piece) == -1) {
                this.piecesOnBoard.removeChildAt(i);
            }
        }

        if (listOfMovements.length == 0) {
            _update = true;
        } else {
            _listOfMovements = listOfMovements;
        }

        for (var i = 0; i < this.configuration.blocksInARow; i++) { // file (column)
            for (var j = 0; j < this.configuration.blocksInARow; j++) { // rank (row)
                if (newBoard[i][j]) {
                    createPiece.call(this, newBoard[i][j], i, j);
                }
            }
        }

        function createPiece(pieceLabel, file, rank) {
            if (!(_piecesBox[pieceLabel] && _piecesBox[pieceLabel].loaded)) {
                if (!_piecesBox[pieceLabel]) {
                    _piecesBox[pieceLabel] = new Image();
                    _piecesBox[pieceLabel].src = this.configuration.piecesFolder + "/" + pieceLabel + ".png";
                    _piecesBox[pieceLabel].callbacks = [];
                    _piecesBox[pieceLabel].onload = (function (e) {
                        e.target.loaded = true;
                        for (var i = 0; i < e.target.callbacks.length; i++) {
                            createPiece.call(this, e.target.callbacks[i].par1, e.target.callbacks[i].par2, e.target.callbacks[i].par3);
                            //e.target.callbacks[i].f.call(this, e.target.callbacks[i].par1, e.target.callbacks[i].par2, e.target.callbacks[i].par3);
                        }
                        _update = true;
                    }).bind(this);
                }
                _piecesBox[pieceLabel].callbacks.push({
                    //f: createPiece,
                    par1: pieceLabel,
                    par2: file,
                    par3: rank
                });
                return;
            }
            var bitmap = new createjs.Bitmap(_piecesBox[pieceLabel]);
            bitmap.color = pieceLabel == pieceLabel.toUpperCase() ? "W" : "B";
            bitmap.label = pieceLabel;
            bitmap.regX = bitmap.regY = _piecesBox[pieceLabel].width / 2;
            bitmap.scaleX = bitmap.scaleY = bitmap.scale = (_blockSize * 0.9) / _piecesBox[pieceLabel].width;
            bitmap.x = (_blockSize * this.configuration.blocksInARow + _blocksMargin * (this.configuration.blocksInARow - 1)) / 2; // this.configuration.canvasSize / 2; // file * _blockSize + _blockSize / 2;
            bitmap.y = (_blockSize * this.configuration.blocksInARow + _blocksMargin * (this.configuration.blocksInARow - 1)) / 2; // this.configuration.canvasSize / 2; // (this.configuration.blocksInARow - rank - 1) * _blockSize + _blockSize / 2;

            var boardSection = Math.floor(((_stage.rotation + 45) % 360) / 90);
            bitmap.rotation = boardSection * -90;

            if (this.configuration.actionsOnPieces) {

                bitmap.cursor = "pointer";
                bitmap.hitArea = new createjs.Shape();
                bitmap.hitArea.graphics.beginFill("#000")
                    .drawRect(0, 0, _piecesBox[pieceLabel].width, _piecesBox[pieceLabel].height);


                bitmap.addEventListener("rollover", (function (evt) {
                    var piece = evt.target;
                    piece.scaleX = piece.scaleY = piece.scale * 1.25;
                    piece.shadow = new createjs.Shadow(this.configuration.shadowColor, 3, 3, 5);
                    _update = true;
                }).bind(this));

                bitmap.addEventListener("rollout", (function (evt) {
                    var piece = evt.target;
                    piece.scaleX = piece.scaleY = piece.scale;
                    piece.shadow = null;
                    _update = true;
                }).bind(this));

                bitmap.addEventListener("mousedown", (function (evt) {
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

                bitmap.addEventListener("pressmove", (function (evt) {
                    var piece = evt.target;
                    var boardContainer = _stage.getChildByName("boardContainer");
                    var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                    var file = Math.floor((pt.x + (_blocksMargin / 2)) / (_blockSize + _blocksMargin));
                    var rank = (this.configuration.blocksInARow - Math.floor((pt.y + (_blocksMargin / 2)) / (_blockSize + _blocksMargin)) - 1);

                    piece.x = pt.x;
                    piece.y = pt.y;

                    var currentSquare = undefined;
                    if (file >= 0 && file < this.configuration.blocksInARow && rank >= 0 && rank < this.configuration.blocksInARow)
                        currentSquare = file + this.configuration.blocksInARow * rank;

                    if (currentSquare != piece.currentSquare) {
                        boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));
                        piece.currentSquare = currentSquare;
                        if (currentSquare != undefined) {
                            if (this.configuration.type == 'linesGrid') {
                                var blockHighlighter = new createjs.Shape();
                                blockHighlighter.alpha = 0.8;
                                blockHighlighter.graphics
                                    .beginFill(this.configuration.highlighterColor)
                                    .drawCircle(
                                        (_blockSize + _blocksMargin) * (piece.currentSquare % this.configuration.blocksInARow) + _blockSize / 2,
                                        (_blockSize + _blocksMargin) * (this.configuration.blocksInARow - Math.floor(piece.currentSquare / this.configuration.blocksInARow) - 1) + _blockSize / 2,
                                        _highlighterSize * 2.5);

                                blockHighlighter.name = "blockHighlighter";
                            } else {
                                var blockHighlighter = new createjs.Shape();
                                blockHighlighter.graphics.beginStroke(this.configuration.highlighterColor)
                                    .setStrokeStyle(_highlighterSize)
                                    .drawRect(
                                        (_blockSize + _blocksMargin) * (piece.currentSquare % this.configuration.blocksInARow) + _highlighterSize / 2,
                                        (_blockSize + _blocksMargin) * (this.configuration.blocksInARow - Math.floor(piece.currentSquare / this.configuration.blocksInARow) - 1) + _highlighterSize / 2,
                                        _blockSize - _highlighterSize,
                                        _blockSize - _highlighterSize);
                                blockHighlighter.name = "blockHighlighter";
                            }

                            if (_blocksMargin > 0)
                                boardContainer.addChildAt(blockHighlighter, 2);
                            else
                                boardContainer.addChildAt(blockHighlighter, 1);
                        }
                    }

                    _update = true;
                }).bind(this));

                bitmap.addEventListener("pressup", (function (evt) {
                    var piece = evt.target;
                    var boardContainer = _stage.getChildByName("boardContainer");
                    var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                    var file = Math.floor(pt.x / (_blockSize + _blocksMargin));
                    var rank = (this.configuration.blocksInARow - Math.floor(pt.y / (_blockSize + _blocksMargin)) - 1);

                    boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));

                    var currentSquare = undefined;
                    if (file >= 0 && file < this.configuration.blocksInARow && rank >= 0 && rank < this.configuration.blocksInARow)
                        currentSquare = file + this.configuration.blocksInARow * rank;

                    if (!currentSquare) {
                        piece.x = piece.startPosition.x;
                        piece.y = piece.startPosition.y;
                    } else {
                        var sourceFile = Math.floor(piece.startPosition.x / _blockSize);
                        var sourceRank = this.configuration.blocksInARow - Math.floor(piece.startPosition.y / _blockSize) - 1;
                        if (this.move(sourceFile, sourceRank, file, rank)) {
                            piece.x = file * (_blockSize + _blocksMargin) + _blockSize / 2;
                            piece.y = (this.configuration.blocksInARow - rank - 1) * (_blockSize + _blocksMargin) + _blockSize / 2;
                        } else {
                            piece.x = piece.startPosition.x;
                            piece.y = piece.startPosition.y;
                        }
                    }

                    _update = true;
                }).bind(this));
            }

            this.piecesOnBoard.addChild(bitmap);

            _listOfMovements.push({
                piece: bitmap,
                destFile: file,
                destRank: rank
            })
        }
    };

    CanvasBoard.prototype.getPosition = function () {
        var currentBoard = [];

        for (var i = 0; i < this.configuration.blocksInARow; i++) {
            currentBoard.push([]);
        }

        for (var i = 0; i < this.piecesOnBoard.getNumChildren(); i++) {
            var piece = this.piecesOnBoard.getChildAt(i);
            if (piece.rank != undefined && piece.file != undefined)
                currentBoard[piece.file][piece.rank] = piece.label;
        }

        var fen = '';

        for (var i = 0; i < this.configuration.blocksInARow; i++) {
            if (i != 0)
                fen += '/';
            var temp = 0;
            for (var j = 0; j < this.configuration.blocksInARow; j++) {
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

    CanvasBoard.prototype.move = function (sourceFile, sourceRank, destFile, destRank) {
        return true;
    };

    CanvasBoard.prototype.setPieceAtPosition = function (piece, position) { // position label, like "H7"
        var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        var charsInLabel = Math.ceil(Math.log(this.configuration.blocksInARow) / Math.log(alphabet.length));
        var fileLabel = position.substr(0, charsInLabel);
        var rankLabel = position.substr(charsInLabel);

        var file = 0;
        for (var i = 0; i < charsInLabel; i++) {
            file += (alphabet.indexOf(fileLabel.charAt(i)) % (alphabet.length / 2)) * Math.pow(alphabet.length, charsInLabel - (i + 1));
        }
        var rank = rankLabel - 1;

        piece.y = (this.configuration.blocksInARow - rank - 1) * (_blockSize + _blocksMargin) + _blockSize / 2;
        piece.x = file * (_blockSize + _blocksMargin) + _blockSize / 2;

        piece.file = file;
        piece.rank = rank;
    };

    CanvasBoard.prototype.getPieceAtPosition = function (position) {
        var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        var charsInLabel = Math.ceil(Math.log(this.configuration.blocksInARow) / Math.log(alphabet.length));
        var fileLabel = position.substr(0, charsInLabel);
        var rankLabel = position.substr(charsInLabel);

        var file = 0;
        for (var i = 0; i < charsInLabel; i++) {
            file += (alphabet.indexOf(fileLabel.charAt(i)) % (alphabet.length / 2)) * Math.pow(alphabet.length, charsInLabel - (i + 1));
        }
        var rank = rankLabel - 1;
    };

    return CanvasBoard;
});