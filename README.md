# grunt-server-monitor v3.0.0

**Reloads NodeJS server on file changes. The end.**

- **V3 uses ES6:** You'll need NodeJS v5.x or use ***"--harmony"*** flags with grunt

- **Tip:** Use "r" to manually restart the server once it is running. (you'll have to press "enter")

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
					ignoreLogs: 0,
                    logsPerConnect: 1,
                    nodes: 1,
                    environmentVariables: '', //ie 'ENVIRONMENT=production',
                    nodeArgs: '', //ie '--harmony --debug'
                    scriptArgs: ''
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

#### options.ignoreLogs
Type: `Int`
Default value: `0`

Optionally ignore this number of logs at start. (In case your script outputs general startup info)

#### options.nodes
Type: `Int`
Default value: `1`

The amount of different node servers that the `script` will be running.

#### options.environmentVariables
Type: `String`
Default value: `''`

Environment specific settings to be passed to NodeJS on the command line.

#### options.nodeArgs
Type: `String`
Default value: `''`

Arguments to be sent to NodeJS on the command line.

#### options.scriptArgs
Type: `String`
Default value: `''`

Arguments to be passed to the script at `options.script`.



### Arguments and Environment Variables

The options `environmentVariables`, `nodeArgs`, `scriptArgs` are assembled into a command with the `script` option similar to

```bash
$ [environmentVariables] node [nodeArgs] [script] [scriptArgs]
```

Allowing you to have full control:
**The following options...**
```js
var options: {
    script: 'app.js',
    timeout: 2,
	ignoreLogs: 0,
    logsPerConnect: 1,
    nodes: 1,
    environmentVariables: 'ENVIRONMENT=dev',
    nodeArgs: '--harmony --debug',
    scriptArgs: '-f foo'
};
```

**...will create the following command**

```bash
$ ENVIRONMENT=dev node --harmony --debug app.js -f "foo"
```


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
- v3.0.0 - completely rebuilt, more effiicient signaling, error handling, and can restart with "r"
- v0.2.2 - added options to give full control over script at startup
- v0.2.0 - stable
