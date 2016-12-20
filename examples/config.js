requirejs.config({
    paths: {
        createjs: 'https://code.createjs.com/easeljs-0.8.2.min',
        canvasBoard: '../src/js/canvas-board'
    },
    shim: {
        createjs: { exports: 'createjs' }
    }
});