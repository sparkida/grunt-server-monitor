# grunt-server-monitor

> Reloads NodeJS server on file changes. The end.

*Meaning, that's its sole purpose, so generally speaking it should be faster than the others by a noticeable amount, especially if you are already using [grunt-contrib-watch](https://github.com/gruntjs/grunt-contrib-watch) and [grunt-concurrent](https://github.com/sindresorhus/grunt-concurrent).*

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-server-monitor --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-server-monitor');
```

## The "monitor" task

### Overview
1. In your project's Gruntfile, add a section named `monitor` to the data object passed into `grunt.initConfig()`.
2. The monitor relies on watch tasks to trigger reloads. Add a `watch:server` target to watch your server files and directories.
3. We need to run a server and a watch process, this requires `grunt-concurrent`. Leaving us with:

#### Typical Setup

```js
module.exports = function (grunt) {
    grunt.initConfig({
        monitor: {
            default: {
                options: {
                    script: 'app.js',
                    timeout: 2,
                    logsPerConnect: 1,
                    nodes: 1
                }
            }
        },
        watch: {
            server: {
                files: ['*.js', 'lib/**/*.js'],
                tasks: ['monitor'],
                options: {
                    spawn: false
                }
            },
        },
        concurrent: {
            default: {
                tasks: ['monitor', 'watch'],
                options: {
                    logConcurrentOutput: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-server-monitor');

    grunt.registerTask('default', ['concurrent']);
};
```

### Options

#### options.script
Type: `String`
Default value: `'index.js'`

The script which loads your server or bootstraps your package.

#### options.timeout
Type: `Int`
Default value: `0 (none)`

Amount of seconds to wait for server to connect before timing out gracefully.

#### options.logsPerConnect
Type: `Int`
Default value: `1`

The number of logs which must occur to determine a connection has been made to the server.

The server monitor will distinguish between error logs and regular logs, error logs are ignored in this count.

#### options.logsPerConnect
Type: `Int`
Default value: `1`

The amount of different node servers that the `script` will be running

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
