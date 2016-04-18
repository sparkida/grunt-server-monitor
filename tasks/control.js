/**
 * grunt-server-monitor
 * https://github.com/sparkida/grunt-server-monitor
 *
 * Copyright (c) 2015 Nicholas Riley
 * Licensed under the MIT license.
 */

'use strict';
var path = require('path'),
    Monitor = require('./lib/monitor'),
    lock = Monitor.LockFile,
    qs = require('querystring'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    reboots = 0,
    options = {},
    servers = {},
    server = null,
    grunt,
    monitor,
    control,
    Control = function (gruntMod) {
        grunt = gruntMod;
        control = this;
        //circular
        monitor = control.monitor = Monitor.open(control);
        grunt.registerMultiTask('monitor', 'Reloads NodeJS server on file changes. The end.', control.load);
    };

//console.log('process:', process.pid);
Control.start = function (gruntInstance) {
    return new Control(gruntInstance);
};
var stdin = process.stdin;
var tty = require('tty');
var lastRestart = 0;
if (tty.isatty(stdin)) {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    var keyListener = function (key) {
            if (key === 'r') {
                fs.readFile(lock, function (err, data) {
                    data = JSON.parse(data);
                    if (data.lastRestart !== lastRestart) {
                        lastRestart = data.lastRestart;
                        //console.log('    restarting server'.green);
                        //monitor is connected...okay to kill
                        process.kill(data.pid, 'SIGCHLD');
                        stdin.once('data', keyListener);
                    } else {
                        console.log('    restart already in progress'.yellow);
                        stdin.once('data', keyListener);
                    }
                });
            } else if (key === '\u001A') {
                stdin.once('data', keyListener);
                process.kill(process.pid, 'SIGSTOP');
            } else if (key === '\u0003') {
                fs.readFile(lock, function (err, data) {
                    data = JSON.parse(data);
                    process.kill(data.pid, 'SIGTERM');
                    setTimeout(function () {
                        process.exit();
                    }, 250);
                });
            } else {
                stdin.once('data', keyListener);
            }

        };
    stdin.once('data', keyListener);
}

process.on('uncaughtException', function (err) {
    console.log(err.stack.red);
});

Control.prototype.load = function () {
    control.config = this;
    control.done = control.config.async();
    server = servers[control.config.target];
    control.monitor = monitor;
    //this fires the next event connected|started
    monitor.load();
    //this is handled by the client
    monitor.once('connected', control.connected);
    //this is handled by the server and fired by the cl
    monitor.once('started', control.start);
};

Control.prototype.error = function () {
    monitor.serverError = true;
    //console.log('error is called', monitor.type);
    monitor.removeListener('restarted', control.restarted);
    control.done();
};

Control.prototype.restarted = function () {
    //console.log('restarted'.green);
    monitor.serverError = false;
    control.done();
};

Control.prototype.reboot = function () {
    //console.log(('rebooting ' + monitor.type).grey, ++reboots);
    monitor.removeListener('kill', control.kill);
    control.start();
};

Control.prototype.connected = function () {
    //console.log('requesting restart'.grey);
    monitor.once('restarted', control.restarted);
    monitor.once('error', control.error);
    //kill the server and restart
    monitor.tellServer('restart');
};


var lastServerRestartPID = 0;
Control.prototype.kill = function () {
    //monitor.removeListener('forcekill', forcekill);
    control.clearEvents();
    if (lastServerRestartPID === server.pid) {
        console.log('skipping');
        return;
    }
    //console.log('killing the server'.grey);
    //console.log('monitor connected: ', monitor.connected, monitor.type);
    //console.log('server pid:', server.pid);
    //console.log('process2:', process.pid);
    //console.log('lastRestartServerPID:', lastServerRestartPID);
    lastServerRestartPID = server.pid;
    server = servers[control.config.target];
    if (monitor.connected) {
        server.once('close', function () {
            monitor.removeListener('reboot', control.reboot);
            console.log('server killed...'.grey);
            control.start();
        });
        server.kill('SIGINT');
    }/* else {
        console.log('restarting server'.green, monitor.type);
        monitor.tellClient('error');
    }*/
};

Control.prototype.clearEvents = function () {
    try {
        process.removeListener('SIGTERM', control.SIGTERM);
    } catch (e) {
    }
    try {
        process.removeListener('SIGCHLD', control.SIGCHLD);
    } catch (e) {
    }
    try {
        monitor.removeListener('reboot', control.reboot);
    } catch (e) {
    }
    try {
        monitor.removeListener('kill', control.kill);
    } catch (e) {
    }
};

Control.prototype.SIGCHLD = function () {
    console.log('restarting server process:'.grey, server.pid);
    control.kill();
};

Control.prototype.SIGTERM = function () {
    console.log('killing server process:'.grey, server.pid);
    control.kill();
    process.exit();
};

Control.prototype.closeServer = function () {
    //monitor.server.lastExitStatus = monitor.connected ? 'success' : 'fail';
    //console.log('server closing '.cyan, monitor.connected, monitor.serverError);
    //console.log('last status', monitor.server.lastExitStatus);
    //there was an error in the client
    if(!monitor.connected) {
        //console.log('error not connected'.red);
        monitor.serverError = true;
        monitor.tellClient('error');
    } else {
        monitor.connected = false;
    }
    //console.log('exiting'.red);
};

Control.prototype.start = function () {
    var fh = {},
        connectData = '',
        logCount = 0,
        timeout = null,
        mark = Date.now(),
		ignored = 0,
        connected = 0;
    fh.stdout = function (buffer) {
        var data = buffer.toString().trim();
		if (ignored < options.ignoreLogs) {
			ignored += 1;
			console.log('[ignored]', data);
			return;
		}
        if (data.search(/error/i) > -1) {
            console.log(data.yellow);
        } else {
            logCount += 1;
            if (logCount % options.logsPerConnect === 0) {
                connected += 1;
                console.log(('Node ' + connected + ' connected: '
                    + ((Date.now() - mark) / 1000) + '(seconds)').cyan);
            }
            //if (options.logsPerConnect > 1 || options.nodes > 1) {
                connectData += data + '\n';
            //}
            if (options.nodes === connected) {
                server.stdout.removeListener('data', fh.stdout);
                console.log(('Server Activated in ' + ((Date.now() - mark) / 1000) + ' seconds by the following output:').green);
                console.log(('------\n' + connectData + '------')
                        .split('\n')
                        .map(function (line) {
                            return line.grey;
                        })
                        .join('\n'));
                console.log('Waiting...');
                if (null !== timeout) {
                    clearTimeout(timeout);
                }
                monitor.connected = true;
                //update last restart time
                fs.readFile(lock, function (err, data) {
                    if (err) {
                        throw err;
                    }
                    data = JSON.parse(data);
                    data.lastRestart = Date.now();
                    fs.writeFile(lock, JSON.stringify(data), function (err) {
                        if (err) {
                            throw err;
                        }
                    });
                });
                if (monitor.serverError) {
                    monitor.serverError = false;
                }
                if (monitor.socket) {
                    monitor.tellClient('restarted');
                }
                server.stdout.on('data', function (buffer) {
                    console.log(buffer.toString().trim().grey);
                });
            }
        }
    };
    fh.stderr = function (buffer) {
        console.log(buffer.toString().trim().yellow);
        //console.log('warning'.yellow);
    };

    //servers[control.target] = requir(options.script);
    options = control.config.options({
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

    var execPath = options.nodeExecutable.length > 0 ? options.nodeExecutable : process.execPath;
    var args = (options.script + ' ' + options.scriptArgs).split(' ');
    var envStr = options.environmentVariables.split(' ').join('&');
    var env = Object.create(process.env);
    var procEnv = qs.parse(envStr);

    Object.keys(procEnv).map(function (key) {
        env[key] = procEnv[key];
    });

    if (options.timeout > 0) {
        timeout = setTimeout(function () {
            console.log('Server timed out'.red);
            server.kill('SIGTERM');
        }, options.timeout * 1000);
    }
    
    console.log('starting server...'.grey);
    server = servers[control.config.target] = spawn(execPath, args, {
        stdio: [ 'pipe', 'pipe', 'pipe' ],
        env: env
    });

    console.log('server started:'.grey, server.pid);

    if (process.listeners('SIGTERM').indexOf(control.SIGTERM) === -1) {
        process.once('SIGTERM', control.SIGTERM);
    }

    if (process.listeners('SIGCHLD').indexOf(control.SIGCHLD) === -1) {
        process.once('SIGCHLD', control.SIGCHLD);
    }

    if (server.listeners('close').indexOf(control.closeServer) === -1) {
        server.once('close', control.closeServer);
    }

    if (monitor.listeners('kill').indexOf(control.kill) === -1) {
        monitor.once('kill', control.kill);
    }

    if (monitor.listeners('reboot').indexOf(control.reboot) === -1) {
        monitor.once('reboot', control.reboot);
    }
    /*
       setInterval(function () {
       console.log(monitor.connected);
       }, 1000);*/
    server.stdout.on('data', fh.stdout);
    server.stderr.on('data', fh.stderr);
    //TODO
    //monitor.on('error', kill);
};

module.exports = Control.start;

