grunt-server-monitor
--------------------
When things like **nodemon** and **supervisor** can be dreadfully slow and all you want to do is restart your server when files are updated.

`Grunt-server-monitor` works with concurrent processes more effectively by relying on `grunt-contrib-watch` to load a client which tells the monitor to reboot the server.

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
                script: 'app.js'
            }
        }
    }
});
```

