var http = require('http');
var server = http.createServer();
server.on('listening', function () {
    console.log('Server listening on 8080');
    console.log(process.env, process.argv);
});
server.on('connection', function (socket) {
    server.socket = socket;
    socket.write(JSON.stringify([process.env, process.argv]) + '\r\n');
});
server.listen(8080);
