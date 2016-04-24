/**
 * grunt-server-monitor
 * https://github.com/sparkida/grunt-server-monitor
 *
 * Copyright (c) 2015 Nicholas Riley
 * Licensed under the MIT license.
 */

'use strict';

const childProc = require('child_process');
const spawn = childProc.spawn;
const path = require('path');
const qs = require('querystring');
const fs = require('fs');
const lockFile = path.join(__dirname, '.lock');

var worker;
var server;

class Worker {

    constructor(options, done) {
        worker = this;
        worker.options = options;
        worker.timeout = null;
        worker.connected = false;
        worker.done = done;
        process.once('exit', () => worker.done());
        server = null;
        var parent = null;
        //lookup existing worker and kill process / timeout
        try {
            parent = JSON.parse(fs.readFileSync(lockFile)).ppid;
        } catch (e) {
        }
        console.log('ParentPID: '.red, parent);
        worker.ppid = parent;
        try {
            worker.lockConfig = JSON.parse(fs.readFileSync(lockFile));
        } catch (e) {
            worker.lockConfig = null;
        }
    }

    restart() {
        console.log('restarting');
        try {
            server.kill();
        } catch (e) {
        }
        worker.startServer();
    }

    startServer() {
        console.log('###', worker.timeout);
        worker.clearTimer();
        worker.connected = false;
        var options = worker.options;
        var execPath = options.nodeExecutable.length > 0 ? options.nodeExecutable : process.execPath;
        var args = (options.script + ' ' + options.scriptArgs).split(' ');
        var envStr = options.environmentVariables.split(' ').join('&');
        var env = Object.create(process.env);
        var procEnv = qs.parse(envStr);

        Object.keys(procEnv).map((key) => {
            env[key] = procEnv[key];
        });

        if (options.timeout > 0) {
            worker.timeout = setTimeout(() => {
                if (worker.connected) {
                    console.log('a worker is already connected...clearing timer: ', process.pid);
                    worker.clearTimer();
                    return;
                }
                console.log('Server timed out'.red, process.pid);
                worker.restart();
            }, options.timeout * 1000);
        }
        
        console.log('starting server...'.grey);
        worker.server = server = spawn(execPath, args, {
            stdio: [ 'pipe', 'pipe', 'pipe' ],
            env: env
        });
        /*
        server.once('SIGTERM', () => {
            worker.clearTimer();
            worker.done();
        });
        */
        //process.once('exit', () => server.kill());

        worker.lockConfig = {pid: server.pid, ppid: process.pid};
        fs.writeFileSync(worker.lockFile, JSON.stringify(worker.lockConfig));
        console.log('server started:'.grey, server.pid);
        worker.attachHandlers();
    }

    clearTimer() {
        if (null !== worker.timeout) {
            clearTimeout(worker.timeout);
            worker.timeout = null;
        }
    }

    attachHandlers() {
        console.log('PROCESS:', process.pid);
        var fh = {},
            connectData = '',
            logCount = 0,
            mark = Date.now(),
            ignored = 0,
            connected = 0,
            options = worker.options;
        fh.stdout = (buffer) => {
            var data = buffer.toString();
            console.log(data);
            if (ignored < options.ignoreLogs) {
                ignored += 1;
                console.log('[ignored]', data);
                return;
            }
            logCount += 1;
            if (logCount % options.logsPerConnect === 0) {
                connected += 1;
                console.log(('Node ' + connected + ' connected: '
                    + ((Date.now() - mark) / 1000) + '(seconds)').cyan);
            }
            connectData += data;
            if (options.nodes === connected) {
                server.stdout.removeListener('data', fh.stdout);
                console.log(('Server Activated in ' + ((Date.now() - mark) / 1000) + ' seconds by the following output:').green);
                console.log(('------\n' + connectData + '------')
                        .split('\n')
                        .map((line) => {
                            return line.grey;
                        })
                        .join('\n'));
                console.log('Waiting...');
                worker.clearTimer();
                worker.connected = true;
                server.stdout.on('data', (buffer) => {
                    console.log(buffer.toString().trim().grey);
                });
            }
        };
        fh.stderr = (buffer) => {
            console.log(buffer.toString().trim().yellow);
            //console.log('warning'.yellow);
        };

        server.stdout.on('data', fh.stdout);
        server.stderr.on('data', fh.stderr);
    }

}

Worker.prototype.lockFile = lockFile;

module.exports = Worker;
