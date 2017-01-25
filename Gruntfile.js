module.exports = function(grunt) {

    // 1. All configuration goes here 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            dist: {
                src: [
                    'src/*.js'
                ],
                dest: 'dist/canvas-board.concat.js'
            }
        },

        uglify: {
            build: {
                src: 'src/canvas-board.js',
                dest: 'dist/canvas-board.min.js'
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['uglify']);

};