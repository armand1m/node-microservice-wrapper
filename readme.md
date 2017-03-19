# node-microservice-wrapper [![Build Status](https://travis-ci.org/armand1m/node-microservice-wrapper.svg?branch=master)](https://travis-ci.org/armand1m/node-microservice-wrapper)

> A node.js microservice server wrapper

This module is a wrapper for a microservice implementation.

You can do your webserver implementation using whatever framework you do want, use this module to wrap your server, and then start it using the wrapper instance.

When started, it will automatically subscribe your webserver to a consul instance. It will use the `microservice-info` module to fetch information about your webserver to send to the consul server.

## Install

```
$ npm install --save microservice-wrapper
```

## Usage

Lets say you have a `service.js` and an `index.js` file, and you want to build your microservice using Express.

 - `service.js`:
```js
const Info = require('microservice-info')
const express = require('express')
const app = express()

app.get(`/${Info.name}/health`, (req, res) => {
  res.send('{ "status": "health" }')
})

module.exports = {
  start(port) {
    return new Promise((resolve, reject) => {
      let instance = app.listen(port, err => {
        if (err) {
          return reject(err)
        }

        return resolve(instance)
      })
    })
  },
  stop(instance) {
    return new Promise((resolve, reject) => {
      instance.close(() => {
        resolve()
      })
    })
  }
}

```

 - `index.js`
```js
const MicroserviceWrapper = require('microservice-wrapper')
const service = require('./service')

new MicroserviceWrapper(service).start()
```

## License

MIT © [Armando Magalhães](http://armand1m.herokuapp.com)
