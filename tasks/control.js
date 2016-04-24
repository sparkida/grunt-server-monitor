/**
 * grunt-server-monitor
 * https://github.com/sparkida/grunt-server-monitor
 *
 * Copyright (c) 2015 Nicholas Riley
 * Licensed under the MIT license.
 */

'use strict';

const path = require('path');
const Worker = require(path.join(__dirname, 'lib', 'worker'));
const lockFile = path.join(__dirname, '.lock');
const fs = require('fs');
const net = require('net');
const stdin = process.stdin;
const tty = require('tty');
const readline = require('readline');

var control;
var grunt;
//master worker; initializes server
var monitor;
//worker process; spawns server from options
var worker;
var rl;

if (tty.isatty(stdin)) {
    //console.log('capturing', tty.isatty(stdin), process.pid);
    process.on('exit', () => {
        try {
            fs.unlinkSync(Control.prototype.lockFile);
        } catch (e) {
        }
        try {
            fs.unlinkSync(Worker.prototype.lockFile);
        } catch (e) {
        }
    });
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });
    rl.on('line', (key) => {
        if (key === 'r') {
            try {
                control.connect();
            } catch(e) {
            }
        }
    });
}

process.on('SIGCONT', () => {
    //console.log('resuming', tty.isatty(stdin), process.pid);
    if (rl) {
        //console.log('calling rl');
        rl.resume();
    }
});

class Control {

    constructor(gruntInstance) {
        control = this;
        control.grunt = grunt = gruntInstance;
        grunt.registerMultiTask('monitor', 'Reloads NodeJS server on file changes. The end.', control.initialize);
    }

    static start(gruntInstance) {
        return new Control(gruntInstance);
    }

    initialize() {
        //console.log('initializing');
        control.config = this;
        control.done = control.config.async();
        //console.log('control lock config:', control.lockConfig);
        var options = control.config.options({
            script: 'index.js',
            nodes: 1,
            logsPerConnect: 1,
            ignoreLogs: 0,
            timeout: 0,
            environmentVariables: '',
            nodeArgs: '',
            scriptArgs: '',
            nodeExecutable: ''
        });
        options.script = path.resolve(options.script);
        control.options = options;
        control.connect();
    }

    connect() {
        try {
            control.lockConfig = JSON.parse(fs.readFileSync(lockFile));
        } catch (e) {
            control.lockConfig = {port: 0};
        }
        //console.log('connecting');
        var client = null;
        if (!control.lockConfig.port) {
            control.createServer();
        } else {
            control.client = client = net.connect(control.lockConfig.port);
            client.on('error', (err) => {
                console.log('error:', control.lockConfig.port, err);
                try {
                    fs.unlinkSync(control.lockFile);
                } catch (e) {
                }
                control.lockConfig.port = 0;
                control.createServer();
            });
            client.on('connect', (connection) => {
                //console.log('connected to:', control.lockConfig.port);
                //console.log('requesting restart...'.cyan);
                if (control.done) {
                    control.done();
                }
            });
        }
    }

    restartWorker() {
        worker.clearTimer();
        if (worker.connected) {
            worker.server.on('exit', () => {
                //console.log('server killed'.cyan);
                worker.startServer();
            });
            worker.server.kill();
        } else {
            worker.startServer();
        }
    }

    createServer() {
        monitor = net.createServer((socket) => {
            //console.log('socket in', process.pid);
            console.log('Restarting Server...'.cyan);
            //console.log('child connected:', worker.connected);
            control.restartWorker();
        }).on('error', (err) => {
            // handle errors here
            throw err;
        });
        // grab a random port.
        monitor.listen(() => {
            var port = monitor.address().port;
            control.lockConfig = {port: port};
            fs.writeFileSync(control.lockFile, JSON.stringify(control.lockConfig));
            //console.log('opened server on %j', port);
            control.load();
        });
        control.monitor = monitor;
    }

    load() {
        //console.log('loading');
        control.worker = worker = new Worker(control.options, control.done);
        //console.log('config:'.red, worker.lockConfig);
        //connect or spawn
        if (worker.lockConfig) {
            //console.log('should restart pid:', process.pid);
            worker.restart();
        } else {
            //console.log('starting worker pid:', process.pid);
            worker.startServer();
        }
    }
}

Control.prototype.lockFile = lockFile;

process.on('uncaughtException', function (err) {
    console.log('**Uncaught Exception**');
    console.log(err.stack.red);
    try {
        var data = fs.readFileSync(lockFile);
        data = JSON.parse(data);
        process.kill(data.pid, 'SIGTERM');
    } catch (e) {
    }
    setTimeout(() => {
        process.exit();
    }, 250);
});

module.exports = Control.start;
