/*
 * grunt-server-monitor
 * https://github.com/sparkida/grunt-server-monitor
 *
 * Copyright (c) 2015 Nick Riley
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: [
                'Gruntfile.js',
                'tasks/*.js',
                'tasks/**/*.js',
                '<%= nodeunit.tests %>'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        watch: {
            all: {
                files: ['tasks/*.js', 'tasks/**/*.js', './test/*.js'],
                tasks: ['jshint'],
                options: {
                    spawn: false
                }
            }
        },
        monitor: {
            default: {
                options: {
                    script: 'test/app.js',
                    timeout: 2,
                    logsPerConnect: 1,
                    nodes: 1,
                    environmentVariables: 'ENVIRONMENT=dev',
                    nodeArgs: '--harmony',
                    scriptArgs: '-f foo'
                }
            }
        },
        // Configuration to be ran (and then tested).
        // Unit tests.
        nodeunit: {
            tests: ['test/*_test.js']
        }

    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    // By default, lint and run all tests.
    grunt.registerTask('default', ['jshint', 'nodeunit']);

};
