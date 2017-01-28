requirejs.config({
    paths: {
        createjs: 'https://code.createjs.com/easeljs-0.8.2.min',
        CanvasBoard: '../src/canvas-board'
    },
    shim: {
        createjs: { exports: 'createjs' }
    }
});