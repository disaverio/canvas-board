var board6, board7, board8, board9, board10, board11, board12, board13;
requirejs(["canvasBoard"], function(CanvasBoard) {
    new CanvasBoard({
        canvasId: "ex1",
        canvasWidth: 510,
        canvasHeight: 400,
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
        position: "www10/ggwww1w6/g1gwgwwg5/1gggggww5/4gwgg5/4gwwgw4/2g2gww5/5gw6/5ggw5/4gwgg5/4gwwgw4/1gggggww5/ggwww1w6",
        borderColor: "#f2b06d",
        coords: false
    });
    new CanvasBoard({
        canvasId: "ex5",
        canvasSize: 510,
        borderColor: "#EFEFEF",
        labelsColor: "#000",
        highlighterColor: "#000",
        position: "1c1c1c1c/c1c1c1c1/1c1c1c1c/8/8/d1d1d1d1/1d1d1d1d/d1d1d1d1"
    });
    board6 = new CanvasBoard({
        canvasId: "ex6",
        canvasSize: 510,
        borderColor: "#EFEFEF",
        labelsColor: "#000"
    });
    board7 = new CanvasBoard({
        canvasId: "ex7",
        canvasSize: 510,
        goGame: true,
        blocksInARow: 13,
        animationOfPieces: false,
        actionsOnPieces: false,
        lightSquaresColor: "#f2b06d",
        position: "www10/ggwww1w6/g1gwgwwg5/1gggggww5/4gwgg5/4gwwgw4/2g2gww5/5gw6/5ggw5/4gwgg5/4gwwgw4/1gggggww5/ggwww1w6",
        borderColor: "#f2b06d",
        coords: false
    });
    board8 = new CanvasBoard({
        canvasId: "ex8",
        canvasSize: 510,
        borderColor: "#EFEFEF",
        labelsColor: "#000",
        highlighterColor: "#000",
        position: "1c1c1c1c/c1c1c1c1/1c1c1c1c/8/8/d1d1d1d1/1d1d1d1d/d1d1d1d1"
    });
    board9 = new CanvasBoard({
        canvasId: "ex9",
        canvasSize: 510,
        highlighterColor: "#000"
    });
});
function tryFunction(f) {
    switch (f) {
        case "rotate":
            board6.rotate(parseInt(document.getElementById("input6").value));
            break;
        case "setRotation":
            board7.setRotation(parseInt(document.getElementById("input7").value));
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
    }
}