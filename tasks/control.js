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

var control;
var grunt;
//master worker; initializes server
var monitor;
//worker process; spawns server from options
var worker;
//child worker; communicates with master
var client;

class Client {
    constructor(socket) {
        client = this;   
        client.socket = socket;
        client.socket.on('connect', (connection) => {
            //console.log('connected to:', control.lockConfig.port);
            console.log('requesting restart...'.cyan);
            control.done();
        });
    }

}


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
        console.log('initializing');
        control.config = this;
        control.done = control.config.async();
        try {
            control.lockConfig = JSON.parse(fs.readFileSync(lockFile));
        } catch (e) {
            control.lockConfig = {port: 0};
        }
        console.log('control lock config:', control.lockConfig);
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
        console.log('connecting');
        var client = null;
        if (!control.lockConfig.port) {
            control.createServer();
        } else {
            client = net.connect(control.lockConfig.port);
            client.on('error', (err) => {
                console.log('error:', control.lockConfig.port, err);
                fs.unlinkSync(control.lockFile);
                control.lockConfig.port = 0;
                control.createServer();
            });
            control.client = new Client(client);
        }
    }

    createServer() {
        monitor = net.createServer((socket) => {
            console.log('socket in', process.pid);
            console.log('restarting server');
            console.log('child connected:', worker.connected);
            worker.clearTimer();
            if (worker.connected) {
                worker.server.on('exit', () => {
                    console.log('server killed'.cyan);
                    worker.startServer();
                });
                worker.server.kill();
            } else {
                worker.startServer();
            }
        }).on('error', (err) => {
            // handle errors here
            throw err;
        });
        // grab a random port.
        monitor.listen(() => {
            var port = monitor.address().port;
            control.lockConfig = {port: port};
            fs.writeFileSync(control.lockFile, JSON.stringify(control.lockConfig));
            console.log('opened server on %j', port);
            control.load();
        });
        control.monitor = monitor;
    }

    load() {
        console.log('loading');
        control.worker = worker = new Worker(control.options, control.done);
        console.log('config:'.red, worker.lockConfig);
        //connect or spawn
        if (worker.lockConfig) {
            console.log('should restart pid:', process.pid);
            worker.restart();
        } else {
            console.log('starting worker pid:', process.pid);
            worker.startServer();
        }
    }

    spawn() {
        
    }
}

Control.prototype.lockFile = lockFile;

process.on('uncaughtException', function (err) {
    console.log('*****');
    console.log(err.stack.red);
});

module.exports = Control.start;
