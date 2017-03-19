const consul = require('consul');
const Info = require('microservice-info');
const Events = require('microservice-events');

class ServiceWrapper {
	constructor(service, consulClient = consul(Info.consul.configuration).agent.service) {
		this.consulClient = consulClient;
		this.service = service;
		this.instance = null;
	}

	start() {
		let {uri, port} = Info;
		let {onServerRunning, onServiceRegistered} = Events;

		return this.service
      .start(port)
      .then(instance => {
      	this.instance = instance;
      })
      .then(onServerRunning.bind(this, uri))
      .then(this.register.bind(this))
      .then(onServiceRegistered)
      .then(this.setTerminationHandlers.bind(this))
      .catch(this.kill);
	}

	terminate() {
		return this.service
      .stop(this.instance)
      .then(this.deregister.bind(this))
      .then(Events.onServiceUnregistered)
      .then(this.quit)
      .catch(this.kill);
	}

	register() {
		return this.consulClient.register(Info.consul.description);
	}

	deregister() {
		return this.consulClient.deregister(Info.consul.description.name);
	}

	quit() {
		console.log('Service was gracefully terminated.');
		process.exit(0);
	}

	kill(err) {
		console.error(err);
		process.exit(1);

		return err;
	}

	setTerminationHandlers() {
		console.log('Setting termination handlers.');

		let signals = [
			'SIGINT',
			'SIGTERM',
			'SIGUSR2'
		];

		signals.forEach(signal => process.on(signal, this.terminate.bind(this)));
	}
}

module.exports = ServiceWrapper;
