/**
 * grunt-server-monitor
 * https://github.com/sparkida/grunt-server-monitor
 *
 * Copyright (c) 2015 Nicholas Riley
 * Licensed under the MIT license.
 */

'use strict';

var net = require('net'),
    fs = require('fs'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter,
    nodePath = process.execPath,
    lock = path.join(__dirname, '.monitor.lock'),
    monitor,
    control,
    Monitor = function (control) {
        monitor = this;
        //circular
        monitor.control = control;
    };

var exit = function () {
        try {
            fs.unlinkSync(lock);
        } catch (noFileErr) {
        }
    };

Monitor.open = function (control) {
    return new Monitor(control);
};

Monitor.prototype = new EventEmitter();

var clients = Monitor.prototype.clients = [];
Monitor.prototype.socket = null;
Monitor.prototype.connected = false;
Monitor.prototype.server = null;

Monitor.prototype.load = function () {
    //console.log('loading the monitor');
    fs.readFile(lock, function (err, data) {
        if (err) {
            console.log('loading the monitor server...'.grey);
            monitor.type = 'host';
            monitor.loadServer();
        } else {
            console.log('connecting to monitor...'.grey);
            monitor.type = 'client';
            try {
                data = JSON.parse(data);
            } catch (errConn) {
                monitor.reset();
                return;
            }
            monitor.connect(data);
        }
    });
};

Monitor.prototype.loadServer = function () {
    //console.log('loadServer');
    monitor.server = net.createServer({allowHalfOpen: false});
    monitor.server.on('listening', monitor.listenHandler);
    monitor.server.on('connection', monitor.hostConnectionHandler);
    monitor.server.listen(0);
    //TODO monitor.server.on('error');
};

Monitor.prototype.listenHandler = function () {
    //console.log('starting monitor service at: '.magenta, monitor.type);
    var address = monitor.server.address();
    fs.writeFile(lock, JSON.stringify({port: address.port}), function (err) {
		if (err) throw err;
        console.log('Monitor server started on port: '.grey + address.port);
		process.once('exit', exit);
        monitor.emit('started');
    });
};

Monitor.prototype.hostConnectionHandler = function (socket) {
    //this is attached to the host controller
    //connect is attached to the client
    //the monitor.type should equal 'host'
    //console.log('client connection received', monitor.type);
    var end = function () {
            //console.log('closing client socket');
            clients.splice(clients.indexOf(socket), 1);
        },
        data = function (buffer) {
            var action = buffer.toString().trim();
            //console.log('processing action: ' + action);
            if (action === 'clearError') {
                console.log('should we clear error state?'.cyan);
            }
            if (action === 'restart') {
                //console.log('monitor.serverError', monitor.serverError);
                //console.log('monitor.connected', monitor.connected);
                if (monitor.serverError) {
                    monitor.emit('reboot');
                } else if (monitor.connected) {
                    monitor.emit('kill');
                } else {
                    var lastClient = clients.shift();
                    lastClient.removeListener('end', end);
                    lastClient.end('error\r\n');
                }
            } else if (action === 'reboot') {
                //console.log('??killing server remotely'.red);
                monitor.emit('reboot');
            } else if (action === 'error') {
                //console.log('error'.red);
                monitor.emit('complete');
            }

        };
    monitor.socket = socket;
    clients.push(socket);
    socket.on('end', end);
    socket.on('data', data);
};

Monitor.prototype.reset = function () {
    //console.log('resetting');
    fs.unlink(lock, function (error) {
        if (error) {
            throw error;
        }
        console.log('reloading');
        monitor.type = 'host';
        monitor.loadServer();
    });
};

Monitor.prototype.connect = function (address) {
    //this is attached to the client controller
    //see server for host controller
    //console.log('opening connection to host', address);
    var client = net.connect(address);
    monitor.client = client;
    client.on('connect', monitor.clientHandler);
    client.on('error', monitor.clientError);
};

Monitor.prototype.tellClient = function (command) {
    try {
        monitor.socket.write(command + '\r\n');
    } catch (noClient) {
        //throw new Error('Unacceptable error on first server load');
    }
};

Monitor.prototype.tellServer = function (command) {
    monitor.client.write(command + '\r\n');
};

Monitor.prototype.clientHandler = function () {
    var client = monitor.client,
        data = function (buffer) {
            var action = buffer.toString().trim();
            //console.log('processing client action:', action);
            if (action === 'clearError') {
                console.log('clearing error state'.cyan);
            } else if (action === 'restarted') {
                monitor.emit('restarted');
            } else if (action === 'error') {
                if (monitor._events.error instanceof Array) {
                    var evts = monitor._events.error,
                        evt = null;
                    while (evts.length > 1) {
                        evt = evts.shift();
                        monitor.removeListener('error', evt);
                    }
                }
                //console.log(monitor.type, monitor.connected, monitor.serverError);
                if (monitor.connected) {
                    //TODO does this ever run now?
                    client.write('clearError\r\n');
                    monitor.emit('restarted');
                } else {
                    monitor.emit('error');
                }
            }
        },
        end = function () {
            clients.splice(clients.indexOf(client), 1);
        };
    clients.push(client);
    client.on('data', data);
    client.on('end', end);
    monitor.emit('connected');
};

Monitor.prototype.clientError = function (err) {
    if (err.code === 'ECONNREFUSED') {
        monitor.reset();
    } else {
        throw err;
    }
};

module.exports = Monitor;

