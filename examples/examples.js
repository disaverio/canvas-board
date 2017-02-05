var board6, board7, board8, board9, board10, board11, board12, board13;
requirejs(["CanvasBoard"], function(CanvasBoard) {
    new CanvasBoard({
        canvasId: "ex1",
        canvasWidth: 510,
        canvasHeight: 350,
        blocksInARow: 10,
        blocksInAColumn: 6
    });
    new CanvasBoard({
        canvasId: "ex2",
        canvasSize: 510,
        goGame: true,
        blocksInARow: 19,
        lightSquaresColor: "#f2b06d",
        borderSize: 0
    });
    new CanvasBoard({
        canvasId: "ex3",
        canvasSize: 510,
        blocksInARow: 91,
        blocksMargin: 1,
        marginColor: "#666",
        lightSquaresColor: "#EFEFEF",
        darkSquaresColor: "#EFEFEF",
        borderSize: 0
    });
    new CanvasBoard({
        canvasId: "ex4",
        canvasSize: 510,
        goGame: true,
        blocksInARow: 13,
        animationOfPieces: false,
        actionsOnPieces: false,
        lightSquaresColor: "#f2b06d",
        position: "www10/bbwww1w6/b1bwbwwb5/1bbbbbww5/4bwbb5/4bwwbw4/2b2bww5/5bw6/5bbw5/4bwbb5/4bwwbw4/1bbbbbww5/bbwww1w6",
        borderColor: "#f2b06d",
        coords: false,
        borderSize: 8
    });
    new CanvasBoard({
        canvasId: "ex5",
        canvasSize: 510,
        borderColor: "#EFEFEF",
        labelsColor: "#000",
        highlighterColor: "#000",
        position: "1w1w1w1w/w1w1w1w1/1w1w1w1w/8/8/b1b1b1b1/1b1b1b1b/b1b1b1b1",
        piecesFiles: {
            b: "checkers_black",
            w: "checkers_white"
        }
    });
    board6 = new CanvasBoard({
        canvasId: "ex6",
        canvasSize: 510,
        goGame: true,
        blocksInARow: 19,
        lightSquaresColor: "#f2b06d",
        position: "3w2w1w10/1b3bw2ww1w6/1b1bwb1ww1wwbb5/1bb2bbwb2bww5/4bwb2w1bbb5/4b2wwwwb1bw4/2bbb2bbw2w5w/bbwb5bwwwbb4/wwwb5bbbw5b/wwb1wb4bwbb5/1wwwbb4bwwbw4/wwwbbb1bbbbbww5/4bbbbwww1w6/1b1bwb1ww1wwbb5/2bbb2bbw2w5w/4bwb2w1bbb5/1wwwbb4bwwbw4/1b3bw2ww1w6/2wbbbww3wwb4b",
        borderColor: "#f2b06d",
        coords: false,
        borderSize: 9
    });
    board7 = new CanvasBoard({
        canvasId: "ex7",
        canvasSize: 510,
        borderColor: "#EFEFEF",
        labelsColor: "#000"
    });
    board8 = new CanvasBoard({
        canvasId: "ex8",
        canvasSize: 510,
        borderColor: "#EFEFEF",
        labelsColor: "#000",
        highlighterColor: "#000",
        position: "1w1w1w1w/w1w1w1w1/1w1w1w1w/8/8/b1b1b1b1/1b1b1b1b/b1b1b1b1",
        piecesFiles: {
            b: "checkers_black", w: "checkers_white"
        }
    });
    board9 = new CanvasBoard({
        canvasId: "ex9",
        canvasSize: 510,
        highlighterColor: "#000",
        actionsOnPieces: false,
        piecesFiles: {
            p: "pb", r: "rb", n: "nb", b: "bb", q: "qb", k: "kb", P: "pw", R: "rw", N: "nw", B: "bw", Q: "qw", K: "kw"
        }
    });
    board10 = new CanvasBoard({
        canvasId: "ex10",
        canvasSize: 510,
        highlighterColor: "#000",
        piecesFiles: {
            p: "pb", r: "rb", n: "nb", b: "bb", q: "qb", k: "kb", P: "pw", R: "rw", N: "nw", B: "bw", Q: "qw", K: "kw"
        },
        position: "2rq2k1/5pp1/4b1rp/1pBpP3/2pP1R2/P3QR1P/6PK/8"
    });
    board11 = new CanvasBoard({
        canvasId: "ex11",
        canvasSize: 510,
        goGame: true,
        blocksInARow: 13,
        lightSquaresColor: "#f2b06d",
        position: "www10/bbwww1w6/b1bwbwwb5/1bbbbbww5/4bwbb5/4bwwbw4/2b2bww5/5bw6/5bbw5/4bwbb5/4bwwbw4/1bbbbbww5/bbwww1w6",
        borderColor: "#f2b06d",
        labelsColor: "333",
        borderSize: 27
    });
    board12 = new CanvasBoard({
        canvasId: "ex12",
        canvasSize: 510,
        highlighterColor: "#000",
        piecesFiles: {
            p: "pb", r: "rb", n: "nb", b: "bb", q: "qb", k: "kb", P: "pw", R: "rw", N: "nw", B: "bw", Q: "qw", K: "kw"
        },
        position: "2rq2k1/5pp1/4b1rp/1pBpP3/2pP1R2/P3QR1P/6PK/8"
    });
    new CanvasBoard({
        canvasId: "ex13",
        canvasSize: 510,
        highlighterColor: "#000",
        animationOfPieces: false,
        piecesFiles: {
            p: "pb", r: "rb", n: "nb", b: "bb", q: "qb", k: "kb", P: "pw", R: "rw", N: "nw", B: "bw", Q: "qw", K: "kw"
        },
        position: "2rq2k1/5pp1/4b1rp/1pBpP3/2pP1R2/P3QR1P/6PK/8",
        hooks: {
            isValidMove: isValidMoveCallback,
            preMove: preMoveCallback,
            postMove: postMoveCallback
        }
    });
    function isValidMoveCallback(positionFrom, positionTo, pieceFrom, piecesTo) {
        if (pieceFrom !== undefined && piecesTo.length > 0)
            return true;
    }
    function preMoveCallback(positionFrom, positionTo, pieceFrom, piecesTo) {
        alert("The piece "+ pieceFrom.label +" is going to be moved from "+ positionFrom +" to "+ positionTo +" Piece "+ piecesTo[0].label +" will be removed.");
        return "Hi from preMove function!"
    }
    function postMoveCallback(positionFrom, positionTo, pieceFrom, piecesTo, returnedFromPreMove, returnedFromMove) {
        this.removePieceFromPosition(positionTo);
        console.log("The piece "+ pieceFrom.label +" moved from "+ positionFrom +" to "+ positionTo
            +"\nPiece "+ piecesTo[0].label +" removed."
            +"\nPre-move function returned:\n"+ returnedFromPreMove);
    }
});
function tryFunction(f) {
    switch (f) {
        case "rotate":
            board6.rotate(document.getElementById("input6").value ? parseInt(document.getElementById("input6").value) : undefined);
            break;
        case "setRotation":
            board7.setRotation(document.getElementById("input7").value ? parseInt(document.getElementById("input7").value) : undefined);
            break;
        case "setRotationSlider":
            board7.setRotation(parseInt(document.getElementById("input7slider").value));
            break;
        case "scale":
            board8.scale(parseFloat(document.getElementById("input8").value));
            break;
        case "scaleSlider":
            board8.scale(parseFloat(document.getElementById("input8slider").value));
            break;
        case "setPosition":
            board9.setPosition(document.getElementById("input9").value);
            break;
        case "getPosition":
            alert("Retrieved position:\n\n"+board10.getPosition());
            break;
        case "move":
            board11.move(document.getElementById("fromCol").value+document.getElementById("fromRow").value, document.getElementById("toCol").value+document.getElementById("toRow").value);
            break;
        case "removePieceFromPosition":
            board12.removePieceFromPosition(document.getElementById("fromCol2").value+document.getElementById("fromRow2").value);
            break;
    }
}