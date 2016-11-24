module.exports = function(grunt) {

    // 1. All configuration goes here 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            dist: {
                src: [
                    'src/js/*.js'
                ],
                dest: 'dist/js/canvas-board.concat.js'
            }
        },

        uglify: {
            build: {
                src: 'src/js/canvas-board.js',
                dest: 'dist/js/canvas-board.min.js'
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['uglify']);

};