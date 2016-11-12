/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Andrea Di Saverio
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

/**
 * @constructor
 * @param {object} configuration {
 *  canvasId,           // id of canvas html element                        | string            | mandatory
 *  canvasSize,         // dimension in px to which the canvas will be set  | integer           | optional - default: min value between width and height of html element
 *  border,             // dimension in px of board border                  | integer           | optional - default: 3.5% of canvas size. set 0 to remove border
 *  notation,           // specify if board has blocks labels or not        | boolean           | optional - default: true. if there is no border this parameter is ignored
 *  blocksInARow,       // number of blocks in a row                        | integer           | optional - default: 8
 *  type,               // 'linesGrid' or 'blocksGrid'                      | string literal    | optional - default: 'blocksGrid'. if 'linesGrid' then 'lightSquaresColor' is used as background color
 *  lightSquaresColor,  // color of light squares                           | string            | optional - default: "#EFEFEF"
 *  darkSquaresColor,   // color of dark squares                            | string            | optional - default: "#ABABAB". ignored if type is 'linesGrid'
 *  linesColor          // color of lines if type is 'linesGrid'            | string            | optional - default: "#000"
 *  borderColor,        // color of border                                  | string            | optional - default: "#222"
 *  shadowColor         // color of border shadow                           | string            | optional - default: "#000"
 *  labelsColor,        // color of border labels                           | string            | optional - default: "#DDD"
 *  highlighterColor,   // color to highlight elements                      | string            | optional - default: "lightgreen"
 *  flipDuration,       // duration of flipping in millisecs                | integer           | optional - default: 500
 *  squeezeScaleFactor, // rescaling factor of board for flip animation     | number in [0,1]   | optional - default: 0.7
 *  animationOfPieces,  // specify if pieces movement is animated           | boolean           | optional - default: true
 *  piecesFolder,       // relative (to html page) path to pieces images    | string            | optional - default: "./img"
 *  actionsOnPieces,    // specify if enable mouse interaction with pieces  | boolean           | optional - default: true
 *  blocksBorder,       // dimension in px of blocks border                 | integer or 'auto' | optional - default: 0, no border between blocks. 'auto' set border to 3% of block size
 *  goGame,             // specify if board has to be optimized for go game | boolean           | optional - default: false. board is not optimized for go
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
     *   this.stage
     *     |--borderContainer
     *     |    |--border
     *     |    |--labelsContainer     -> added to this.containers.labels
     *     |--boardContainer
     *          |--background           // exists only if there is space between block
     *          |--blockHighlighter     // exists only during piece pressmove event
     *          |--blocksContainer
     *          |--piecesContainer     -> added to this.containers.pieces
     */

    var board = this;

    if (!configuration || !configuration.canvasId)
        throw new Error("CanvasBoard: configuration object and canvasId property are mandatory.");

    this.canvas = document.getElementById(configuration.canvasId);


    this.configuration = setConfiguration(configuration);

    var borderSize, shadowSize, blockSize, allBlocksSize, paddingSize, blocksBorderSize;

    borderSize = shadowSize = this.configuration.border == undefined ? Math.floor(this.configuration.canvasSize * 0.035) : // default board border size is 3.5% of canvas size
                              this.configuration.border == 0         ? 0
                                                                     : this.configuration.border;
    this.configuration.border = borderSize;

    var sizeBorderBetweenBlocks = 0;
    if (this.configuration.blocksBorder != 0) {
        if (this.configuration.blocksBorder == 'auto') {
            var availableSizeForBordersAndBlocks = this.configuration.canvasSize - (borderSize + shadowSize) * 2;
            var unitOfSpace = availableSizeForBordersAndBlocks / (100 * this.configuration.blocksInARow + 3 * (this.configuration.blocksInARow - 1)); // default block border size is 3% of block size
            blockSize = Math.floor(unitOfSpace * 100);
            var availableSizeForBorders = availableSizeForBordersAndBlocks - blockSize * this.configuration.blocksInARow;
            blocksBorderSize = Math.floor(availableSizeForBorders / (this.configuration.blocksInARow - 1));
        } else {
            blocksBorderSize = configuration.blocksBorder;
            blockSize = Math.floor((this.configuration.canvasSize - (borderSize + shadowSize) * 2 - blocksBorderSize * (this.configuration.blocksInARow - 1)) / this.configuration.blocksInARow);
        }
        sizeBorderBetweenBlocks = blocksBorderSize;
    } else {
        blockSize = Math.floor((this.configuration.canvasSize - (borderSize + shadowSize) * 2) / this.configuration.blocksInARow);
        blocksBorderSize = configuration.blocksBorder || blockSize * 0.03; // block border size is 3% of block size // in this case border is used only to enlighten an active block, not for lines in board
    }

    allBlocksSize = blockSize * this.configuration.blocksInARow + sizeBorderBetweenBlocks * (this.configuration.blocksInARow - 1);
    paddingSize = (this.configuration.canvasSize - allBlocksSize - (borderSize + shadowSize) * 2) / 2;

    this.canvas = document.getElementById(this.configuration.canvasId);
    this.canvas.height = this.canvas.width = this.configuration.canvasSize;

    this.stage = new createjs.Stage(this.canvas);
    this.stage.scaleX = this.stage.scaleY = this.stage.scale = 1;
    this.stage.regX = this.stage.regY = this.configuration.canvasSize / 2;
    this.stage.x = this.stage.y = this.configuration.canvasSize / 2;
    this.stage.enableMouseOver(40);
    this.stage.mouseMoveOutside = true;
    this.stage.rotation = 0;

    this.blockSize = blockSize;
    this.blockBorderSize = blocksBorderSize;
    this.sizeBorderBetweenBlocks = sizeBorderBetweenBlocks;
    this.containers = {
        // labels: undefined,
        // pieces: undefined
    };
    this.piecesBitmaps = {};

    if (this.configuration.border) {
        var borderContainer = new createjs.Container();

        var border = new createjs.Shape();
        border.graphics
            .beginStroke(this.configuration.borderColor)
            .setStrokeStyle(borderSize)
            .drawRect(borderSize/2 + shadowSize + paddingSize, borderSize/2 + shadowSize + paddingSize, allBlocksSize + borderSize, allBlocksSize + borderSize);
        border.shadow = new createjs.Shadow(this.configuration.shadowColor, 0, 0, 15);

        borderContainer.addChild(border);

        if (this.configuration.notation) {
            this.containers.labels = new createjs.Container();
            var labelSize = Math.min(Math.floor(borderSize * 0.6), this.blockSize);
            addLabelsToContainer(this.containers.labels, labelSize, "V");
            addLabelsToContainer(this.containers.labels, labelSize, "H");

            borderContainer.addChild(this.containers.labels);
        }
        this.stage.addChild(borderContainer);
    }
    
    var boardContainer = new createjs.Container();
    boardContainer.regX = boardContainer.regY = allBlocksSize / 2;
    boardContainer.x = boardContainer.y = this.configuration.canvasSize / 2;
    boardContainer.scaleX = boardContainer.scaleY = boardContainer.scale = 1;
    boardContainer.name = "boardContainer";

    if (sizeBorderBetweenBlocks > 0) {
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
        block.x = columnOfBlock * (blockSize + sizeBorderBetweenBlocks) + blockSize / 2;
        block.y = (this.configuration.blocksInARow - rowOfBlock - 1) * (blockSize + sizeBorderBetweenBlocks) + blockSize / 2; // the coord y==0 is at the top, but row 0 is at the bottom
        block.regY = block.regX = blockSize / 2;

        if (board.configuration.type == 'linesGrid') {
            drawBlockLines(block, blockSize, blocksBorderSize, this.configuration.linesColor, this.configuration.blocksInARow, columnOfBlock, rowOfBlock, this.configuration.goGame);
        }

        blocksContainer.addChild(block);
    }
    boardContainer.addChild(blocksContainer);

    this.containers.pieces = new createjs.Container();
    boardContainer.addChild(this.containers.pieces);

    this.stage.addChild(boardContainer);

    var tickHandler = (function() {

        var flipDuration = board.configuration.flipDuration,

            squeezedBoard = false,
            turnsBoard = false,
            enlargeBoard = false,

            squeezeFirstTick = true,
            enlargeFirstTick = false,
            turnsFirstTick = false,

            rescalationConfiguration = board.configuration.squeezeScaleFactor,

            rescalationExecutionTime = flipDuration * 0.2, // 20% of animation time is for rescaling (one time for squeezing, one time for enlarging: 40% tot)
            rescalationTargetScale, // scale dimension after rescalation
            rescalationAmount, // dimension of rescalation (initialScale - rescalationTargetScale)
            rescalationMultiplier, rescalationCurrentValue, previousScale,

            turnsExecutionTime = flipDuration * 0.6,
            turnsTargetRotation, // inclination after rotation
            turnsAmount, // degrees of rotation
            turnsMultiplier, turnsCurrentValue, turnsPreviousValue,

            elementMultiplier, elementTargetRotation, // vars for elements rotation

            boardStartingSection = 0,
            boardDestinationSection = 0,

            animationOfPieces = board.configuration.animationOfPieces;

        return (function(event) {

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
                        rescalationTargetScale = rescalationConfiguration;
                    }

                    if (enlargeFirstTick) {
                        rescalationTargetScale = previousScale / this.stage.scaleX; // TODO oppure settare uguale a dim max se board storta
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
                            delete this.rotationDegrees; // next step condition
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

                        elementTargetRotation = ((elementRotation % 360) + 360) % 360; // for negative numbers

                        for (var element in this.containers) {
                            if (this.containers.hasOwnProperty(element)) {
                                for (var i = 0; i < this.containers[element].getNumChildren(); i++) {
                                    this.containers[element].getChildAt(i).elementPreviousRotation = this.containers[element].getChildAt(i).rotation;
                                }
                            }
                        }

                        turnsFirstTick = false; // condition to stop initialization
                    }

                    var amountForThisStep = (event.delta * turnsMultiplier) % 360;
                    turnsCurrentValue += Math.abs(amountForThisStep);
                    this.stage.rotation = this.stage.rotation += amountForThisStep;

                    for (var element in this.containers) {
                        if (this.containers.hasOwnProperty(element)) {
                            for (var i = 0; i < this.containers[element].getNumChildren(); i++) {
                                amountForThisStep = event.delta * elementMultiplier;
                                this.containers[element].getChildAt(i).rotation += amountForThisStep;
                            }
                        }
                    }

                    if (turnsCurrentValue >= Math.abs(turnsAmount)) { // stop rotation

                        // set exact value
                        this.stage.rotation = turnsTargetRotation;

                        for (var element in this.containers) {
                            if (this.containers.hasOwnProperty(element)) {
                                for (var i = 0; i < this.containers[element].getNumChildren(); i++) {
                                    this.containers[element].getChildAt(i).rotation = (this.containers[element].getChildAt(i).elementPreviousRotation + elementTargetRotation) % 360;
                                    delete this.containers[element].getChildAt(i).elementPreviousRotation;
                                }
                            }
                        }

                        enlargeBoard = true; // next step condition
                        enlargeFirstTick = true; // condition for restart
                        boardStartingSection = 0; // condition for restart
                        boardDestinationSection = 0; // condition for restart
                        turnsBoard = false; // stop turning condition
                    }
                }

                this.update = true;
            }

            if (this.listOfMovements) { // if there is a property with a list of movements then move pieces
                for (var i = this.listOfMovements.length-1; i >= 0; i--) {
                    var move = this.listOfMovements[i];

                    var distX = (move.destFile * (this.blockSize + this.sizeBorderBetweenBlocks) + this.blockSize / 2 - move.piece.x);
                    var distY = ((this.configuration.blocksInARow - move.destRank - 1) * (this.blockSize + this.sizeBorderBetweenBlocks) + this.blockSize / 2 - move.piece.y);

                    if (animationOfPieces) {
                        if (move.piece.file != undefined || move.piece.rank != undefined) {
                            move.piece.file = undefined;
                            move.piece.rank = undefined;
                        }
                        this.listOfMovements[i].piece.x += distX * 0.2;
                        this.listOfMovements[i].piece.y += distY * 0.2;
                    }

                    if (!animationOfPieces || (Math.abs(distY) <= 1 && Math.abs(distX) <= 1)) {
                        move.piece.y = (this.configuration.blocksInARow - move.destRank - 1) * (this.blockSize + this.sizeBorderBetweenBlocks) + this.blockSize / 2;
                        move.piece.x = move.destFile * (this.blockSize + this.sizeBorderBetweenBlocks) + this.blockSize / 2;
                        move.piece.file = move.destFile;
                        move.piece.rank = move.destRank;

                        this.listOfMovements.splice(i, 1);
                    }
                }

                if (this.listOfMovements.length == 0) {
                    delete this.listOfMovements;
                }

                this.update = true;
            }

        }).bind(board);
    })();

    createjs.Ticker.addEventListener("tick", tickHandler);

    createjs.Ticker.setFPS(40);

    this.update = true;

    function setConfiguration(configuration) {
        return {
            canvasId            : configuration.canvasId,
            canvasSize          : configuration.canvasSize                          || (this.canvas.width < this.canvas.height ? this.canvas.width : this.canvas.height),
            border              : configuration.border,
            notation            : configuration.notation !== false,
            blocksInARow        : configuration.blocksInARow                        || 8,
            type                : configuration.type === 'linesGrid' ? 'linesGrid'   : 'blocksGrid',
            lightSquaresColor   : configuration.lightSquaresColor                   || "#EFEFEF",
            darkSquaresColor    : configuration.darkSquaresColor                    || "#ABABAB",
            linesColor          : configuration.linesColor                          || "#000",
            borderColor         : configuration.borderColor                         || "#222",
            shadowColor         : configuration.shadowColor                         || "#000",
            labelsColor         : configuration.labelsColor                         || "#DDD",
            highlighterColor    : configuration.highlighterColor                    || "lightgreen",
            flipDuration        : configuration.flipDuration                        || 500,
            squeezeScaleFactor  : configuration.squeezeScaleFactor                  || 0.7,
            animationOfPieces   : configuration.animationOfPieces !== false,
            piecesFolder        : configuration.piecesFolder                        || "./img",
            actionsOnPieces     : configuration.actionsOnPieces !== false,
            blocksBorder        : configuration.blocksBorder                        || 0,
            goGame              : configuration.goGame === true,
            chessGame           : configuration.chessGame
        }
    }

    function addLabelsToContainer(container, labelSize, orientation) {

        var labelsArray = [];

        var charsInLabel = Math.ceil(Math.log(board.configuration.blocksInARow+1) / Math.log(10));
        var fontSize = labelSize / charsInLabel;

        if (orientation == "V") {


            for (var i = board.configuration.blocksInARow; i>0; i--) {
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
                for (var j=charsInLabel; j>0; j--) {
                    label += alphabet.charAt(Math.floor((i%Math.pow(alphabet.length, j))/Math.pow(alphabet.length, j-1)));
                }
                labelsArray.push(label);
            }
        }

        for (var i = 0; i < board.configuration.blocksInARow; i++) {

            var label = new createjs.Text(labelsArray[i], fontSize + "px sans", board.configuration.labelsColor);
            label.regX = label.getBounds().width / 2;
            label.regY = label.getMeasuredLineHeight() / 2;

            var fixedCoord = borderSize / 2 + shadowSize + paddingSize;
            var floatingCoord = borderSize + i * (blockSize + sizeBorderBetweenBlocks) + blockSize / 2 + shadowSize + paddingSize;

            label.x = orientation == "H" ? floatingCoord : fixedCoord;
            label.y = orientation == "H" ? fixedCoord    : floatingCoord;

            var otherSideCoord = borderSize / 2 + allBlocksSize + borderSize + shadowSize + paddingSize;

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

    function drawBlockLines(block, blockSize, blockBorderSize, lineColor, blocksInARow, columnOfBlock, rowOfBlock, goGame) {

        var blockGraphic = block.graphics;

        blockGraphic.beginStroke(lineColor)
            .setStrokeStyle(blockBorderSize);

        if (columnOfBlock !== 0) {
            blockGraphic
                .moveTo(blockSize/2, blockSize/2)
                .lineTo(0, blockSize/2)
        }
        if (columnOfBlock != blocksInARow - 1) {
            blockGraphic
                .moveTo(blockSize/2, blockSize/2)
                .lineTo(blockSize, blockSize/2)
        }
        if (rowOfBlock !== 0) {
            blockGraphic
                .moveTo(blockSize/2, blockSize/2)
                .lineTo(blockSize/2, blockSize)
        }
        if (rowOfBlock != blocksInARow - 1) {
            blockGraphic
                .moveTo(blockSize/2, blockSize/2)
                .lineTo(blockSize/2, 0)
        }

        if (goGame) {
            if (blocksInARow % 2 !== 0 && columnOfBlock == Math.floor(blocksInARow/2) && rowOfBlock == Math.floor(blocksInARow/2)) {
                drawCircle();
            }
            if (blocksInARow >= 9 && blocksInARow < 13) {
                if (((columnOfBlock == 2) || (blocksInARow - columnOfBlock == 3)) && ((rowOfBlock == 2) || (blocksInARow - rowOfBlock == 3))) {
                    drawCircle();
                }
            }
            if (blocksInARow >= 13) {
                if (((columnOfBlock == 3) || (blocksInARow - columnOfBlock == 4)) && ((rowOfBlock == 3) || (blocksInARow - rowOfBlock == 4))) {
                    drawCircle();
                }
            }
            if (blocksInARow == 19) {
                if (((columnOfBlock == 3 || (blocksInARow - columnOfBlock == 4)) && rowOfBlock == Math.floor(blocksInARow/2)) || ((rowOfBlock == 3 || (blocksInARow - rowOfBlock == 4)) && columnOfBlock == Math.floor(blocksInARow/2))) {
                    drawCircle();
                }
            }
        }

        function drawCircle() {
            blockGraphic
                .moveTo(blockSize/2, blockSize/2)
                .beginFill(lineColor)
                .drawCircle(blockSize/2, blockSize/2, blockBorderSize*2.5);
        }
    }
}

CanvasBoard.prototype.rotate = function (degrees) {
    this.rotationDegrees = degrees || 180;
};

CanvasBoard.prototype.setRotation = function (degrees) {

    this.stage.rotation = ((degrees % 360) + 360) % 360; // to make destination in [0, 360]

    var elementRotation = Math.floor(((this.stage.rotation + 45) % 360) / 90) * -90;

    for (var element in this.containers) {
        if (this.containers.hasOwnProperty(element)) {
            for (var i = 0; i < this.containers[element].getNumChildren(); i++) {
                this.containers[element].getChildAt(i).rotation = (elementRotation) % 360;
            }
        }
    }

    this.update = true;
};

CanvasBoard.prototype.scale = function (scaleFactor) {
    this.canvas.width = this.canvas.height = this.configuration.canvasSize * scaleFactor;

    this.stage.scaleX = this.stage.scaleY = this.stage.scale = scaleFactor;
    this.stage.x = this.stage.y = this.configuration.canvasSize * scaleFactor / 2;
    this.stage.update();
};

CanvasBoard.prototype.setPosition = function  (position) {

    var currentBoard = [];
    for (var i = 0; i < this.configuration.blocksInARow; i++) {
        currentBoard.push([]);
    }

    for (var i = 0; i < this.containers.pieces.getNumChildren(); i++) {
        var piece = this.containers.pieces.getChildAt(i);
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
                newBoard[temp][7-i] = rows[i][j];
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
                for (var z = 0; z < this.containers.pieces.getNumChildren(); z++) {
                    var piece = this.containers.pieces.getChildAt(z);
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
    if (this.listOfMovements) { // if a piece is yet moving to the destination it preserves its movement
        for (var i = 0; i < this.configuration.blocksInARow; i++) { // file (column)
            for (var j = 0; j < this.configuration.blocksInARow; j++) { // rank (row)
                if (newBoard[i][j]) {
                    for (var z = 0; z < this.listOfMovements.length; z++) {
                        var move = this.listOfMovements[z];
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
                for (var z = 0; z < this.containers.pieces.getNumChildren(); z++) {
                    var piece = this.containers.pieces.getChildAt(z);
                    if (newBoard[i][j] == piece.label && assignedPieces.indexOf(piece) == -1) { // if true actualPiece is a candidate to reach (i,j) position
                        var distance = Math.pow((piece.file - i), 2) + Math.pow((piece.rank - j), 2);
                        for (var k = z + 1; k < this.containers.pieces.getNumChildren(); k++) {
                            var alternativePiece = this.containers.pieces.getChildAt(k);
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

                                if(alternativeDistance && alternativeDistance < distance) {
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

    for (var i = this.containers.pieces.getNumChildren() - 1; i >= 0; i--) {
        var piece = this.containers.pieces.getChildAt(i);
        if (assignedPieces.indexOf(piece) == -1) {
            this.containers.pieces.removeChildAt(i);
        }
    }

    if (listOfMovements.length > 0)
        this.listOfMovements = listOfMovements;

    for (var i = 0; i < this.configuration.blocksInARow; i++) { // file (column)
        for (var j = 0; j < this.configuration.blocksInARow; j++) { // rank (row)
            if (newBoard[i][j]) {
                createPiece.call(this, newBoard[i][j], i, j);
            }
        }
    }

    function createPiece(pieceLabel, file, rank) {
        if (!(this.piecesBitmaps[pieceLabel] && this.piecesBitmaps[pieceLabel].loaded)) {
            if (!this.piecesBitmaps[pieceLabel]) {
                this.piecesBitmaps[pieceLabel] = new Image();
                this.piecesBitmaps[pieceLabel].src = this.configuration.piecesFolder + "/" + pieceLabel + ".png";
                this.piecesBitmaps[pieceLabel].callbacks = [];
                this.piecesBitmaps[pieceLabel].onload = (function (e) {
                    e.target.loaded = true;
                    for (var i = 0; i < e.target.callbacks.length; i++) {
                        createPiece.call(this, e.target.callbacks[i].par1, e.target.callbacks[i].par2, e.target.callbacks[i].par3);
                        //e.target.callbacks[i].f.call(this, e.target.callbacks[i].par1, e.target.callbacks[i].par2, e.target.callbacks[i].par3);
                    }
                    this.update = true;
                }).bind(this);
            }
            this.piecesBitmaps[pieceLabel].callbacks.push({
                //f: createPiece,
                par1: pieceLabel,
                par2: file,
                par3: rank
            });
            return;
        }
        var bitmap = new createjs.Bitmap(this.piecesBitmaps[pieceLabel]);
        bitmap.color = pieceLabel == pieceLabel.toUpperCase() ? "W" : "B";
        bitmap.rank = rank;
        bitmap.file = file;
        bitmap.label = pieceLabel;
        bitmap.regX = bitmap.regY = this.piecesBitmaps[pieceLabel].width / 2;
        bitmap.scaleX = bitmap.scaleY = bitmap.scale = (this.blockSize * 0.9) / this.piecesBitmaps[pieceLabel].width;
        bitmap.x = this.configuration.canvasSize / 2; // file * this.blockSize + this.blockSize / 2;
        bitmap.y = this.configuration.canvasSize / 2; // (this.configuration.blocksInARow - rank - 1) * this.blockSize + this.blockSize / 2;

        if (this.configuration.actionsOnPieces) {

            bitmap.cursor = "pointer";
            bitmap.hitArea = new createjs.Shape();
            bitmap.hitArea.graphics.beginFill("#000")
                .drawRect(0, 0, this.piecesBitmaps[pieceLabel].width, this.piecesBitmaps[pieceLabel].height);


            bitmap.addEventListener("rollover", (function (evt) {
                var piece = evt.target;
                piece.scaleX = piece.scaleY = piece.scale * 1.25;
                piece.shadow = new createjs.Shadow(this.configuration.shadowColor, 3, 3, 5);
                this.update = true;
            }).bind(this));

            bitmap.addEventListener("rollout", (function (evt) {
                var piece = evt.target;
                piece.scaleX = piece.scaleY = piece.scale;
                piece.shadow = null;
                this.update = true;
            }).bind(this));

            bitmap.addEventListener("mousedown", (function (evt) {
                var piece = evt.target;
                var boardContainer = this.stage.getChildByName("boardContainer");
                var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                this.containers.pieces.removeChild(piece);
                this.containers.pieces.addChild(piece);

                piece.startPosition = {
                    x: piece.x,
                    y: piece.y
                };

                piece.x = pt.x;
                piece.y = pt.y;

                this.update = true;
            }).bind(this));

            bitmap.addEventListener("pressmove", (function (evt) {
                var piece = evt.target;
                var boardContainer = this.stage.getChildByName("boardContainer");
                var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                var file = Math.floor((pt.x + (this.sizeBorderBetweenBlocks/2)) / (this.blockSize + this.sizeBorderBetweenBlocks));
                var rank = (this.configuration.blocksInARow - Math.floor((pt.y + (this.sizeBorderBetweenBlocks/2)) / (this.blockSize + this.sizeBorderBetweenBlocks)) - 1);

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
                                    (this.blockSize + this.sizeBorderBetweenBlocks) * (piece.currentSquare % this.configuration.blocksInARow) + this.blockSize / 2,
                                    (this.blockSize + this.sizeBorderBetweenBlocks) * (this.configuration.blocksInARow - Math.floor(piece.currentSquare / this.configuration.blocksInARow) - 1) + this.blockSize / 2,
                                    this.blockBorderSize*2.5);

                            blockHighlighter.name = "blockHighlighter";
                        } else {
                            var blockHighlighter = new createjs.Shape();
                            blockHighlighter.graphics.beginStroke(this.configuration.highlighterColor)
                                .setStrokeStyle(this.blockBorderSize)
                                .drawRect(
                                    (this.blockSize + this.sizeBorderBetweenBlocks) * (piece.currentSquare % this.configuration.blocksInARow) + this.blockBorderSize / 2,
                                    (this.blockSize + this.sizeBorderBetweenBlocks) * (this.configuration.blocksInARow - Math.floor(piece.currentSquare / this.configuration.blocksInARow) - 1) + this.blockBorderSize / 2,
                                    this.blockSize - this.blockBorderSize,
                                    this.blockSize - this.blockBorderSize);
                            blockHighlighter.name = "blockHighlighter";
                        }

                        if (this.sizeBorderBetweenBlocks > 0)
                            boardContainer.addChildAt(blockHighlighter, 2);
                        else
                            boardContainer.addChildAt(blockHighlighter, 1);
                    }
                }

                this.update = true;
            }).bind(this));

            bitmap.addEventListener("pressup", (function (evt) {
                var piece = evt.target;
                var boardContainer = this.stage.getChildByName("boardContainer");
                var pt = boardContainer.globalToLocal(evt.stageX, evt.stageY);

                var file = Math.floor(pt.x / (this.blockSize + this.sizeBorderBetweenBlocks));
                var rank = (this.configuration.blocksInARow - Math.floor(pt.y / (this.blockSize + this.sizeBorderBetweenBlocks)) - 1);

                boardContainer.removeChild(boardContainer.getChildByName("blockHighlighter"));

                var currentSquare = undefined;
                if (file >= 0 && file < this.configuration.blocksInARow && rank >= 0 && rank < this.configuration.blocksInARow)
                    currentSquare = file + this.configuration.blocksInARow * rank;

                if (!currentSquare) {
                    piece.x = piece.startPosition.x;
                    piece.y = piece.startPosition.y;
                } else {
                    var sourceFile = Math.floor(piece.startPosition.x / this.blockSize);
                    var sourceRank = this.configuration.blocksInARow - Math.floor(piece.startPosition.y / this.blockSize) - 1;
                    if (this.move(sourceFile, sourceRank, file, rank)) {
                        piece.x = file * (this.blockSize + this.sizeBorderBetweenBlocks) + this.blockSize / 2;
                        piece.y = (this.configuration.blocksInARow - rank - 1) * (this.blockSize + this.sizeBorderBetweenBlocks) + this.blockSize / 2;
                    } else {
                        piece.x = piece.startPosition.x;
                        piece.y = piece.startPosition.y;
                    }
                }

                this.update = true;
            }).bind(this));
        }

        this.containers.pieces.addChild(bitmap);

        if (!this.listOfMovements)
            this.listOfMovements = [];

        this.listOfMovements.push({
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

    for (var i = 0; i < this.containers.pieces.getNumChildren(); i++) {
        var piece = this.containers.pieces.getChildAt(i);
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

CanvasBoard.prototype.move = function(sourceFile, sourceRank, destFile, destRank) {
    return true;
};

CanvasBoard.prototype.setPieceAtPosition = function(piece, position) {

};

CanvasBoard.prototype.getPieceAtPosition = function(piece, position) {

};