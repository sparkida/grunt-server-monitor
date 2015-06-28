grunt-server-monitor
--------------------

A far superior server monitor, uses `grunt-contrib-watch` to trigger server reloads up to 3-4 times faster than Nodemon or Supervisor. Ideal for development environments.

`Grunt-server-monitor` works with concurrent processes more effectively by relying on `grunt-contrib-watch` to load a client which tells the monitor to reboot the server.

Options
-------
- **script** 
    - the script which loads your server or bootstraps your package
    - defaults to `index.js`
- **timeout** 
    - the script which loads your server or bootstraps your package
    - defaults to 0 (none)
- **logsPerConnect** 
    - the number of logs which must occur to determine a connection has been made to the server
    - the server monitor will distinguish between error logs and regular logs, error logs are ignored in this count
    - defaults to 1
- **nodes** 
    - the amount of different node servers that the `script` will be running
    - defaults to 1

Info
----
**The monitor expects the server you use to log something once the `listening` event is called. I.E. "Server connected on port 8080"**

Use with 
- [grunt-concurrent](https://www.npmjs.com/package/grunt-concurrent) 
- [grunt-contrib-watch](https://www.npmjs.com/package/grunt-contrib-watch).


Typical Settings
----------------

```javascript
grunt.initConfig({
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
    },
    monitor: {
        default: {
            options: {
                script: 'app.js',
				timeout: 2,
                logsPerConnect: 1,
				nodes: 1
            }
        }
    }
});

grunt.loadNpmTasks('grunt-concurrent');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-server-monitor');

grunt.registerTask('default', ['concurrent']);
```

