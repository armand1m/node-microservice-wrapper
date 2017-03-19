import test from 'ava';
import sinon, {stub} from 'sinon';
import {expect} from 'chai';

import ServiceWrapper from '.';

class ServiceMock {
	constructor() {
		this.start = sinon.stub().resolves();
		this.stop = sinon.stub().resolves();
	}
}

class ConsulClientMock {
	constructor() {
		this.register = sinon.stub().resolves();
		this.deregister = sinon.stub().resolves();
	}
}

class ServiceErrorMock {
	constructor() {
		this.start = sinon.stub().rejects();
		this.stop = sinon.stub().rejects();
	}
}

class ConsulClientErrorMock {
	constructor() {
		this.register = sinon.stub().rejects();
		this.deregister = sinon.stub().rejects();
	}
}

class ServiceWrapperFactory {
	static create() {
		return new ServiceWrapper(new ServiceMock(), new ConsulClientMock());
	}

	static createBrokenService() {
		let serviceMock = new ServiceErrorMock();
		let consulClientMock = new ConsulClientErrorMock();

		return new ServiceWrapper(serviceMock, consulClientMock);
	}

	static createBrokenConsul() {
		let serviceMock = new ServiceMock();
		let consulClientMock = new ConsulClientErrorMock();

		return new ServiceWrapper(serviceMock, consulClientMock);
	}

	static createWithConsul() {
		return new ServiceWrapper(new ServiceMock());
	}
}

test.before(() => {
	process.env.SERVICE_NAME = 'test';
	process.env.SERVICE_PORT = '80';
	process.env.CONSUL_HOST = 'consul';
	process.env.CONSUL_PORT = '8500';
	process.env.PREFIXES = '/test';

	stub(process, 'exit');
	stub(process, 'on');
	stub(console, 'log');
	stub(console, 'error');
});

test.beforeEach(t => {
	t.context.serviceWrapper = ServiceWrapperFactory.create();
});

test.afterEach.always(() => {
	process.exit.reset();
	process.on.reset();
});

test('ServiceWrapper is a class', t => {
	t.is(typeof ServiceWrapper, 'function');
});

test('Create a ServiceWrapper instance', t => {
	expect(t.context.serviceWrapper).to.be.instanceOf(ServiceWrapper);
});

test('ServiceWrapper methods', t => {
	var {serviceWrapper} = t.context;

	t.is(typeof serviceWrapper.start, 'function', 'serviceWrapper.start is not a function');
	t.is(typeof serviceWrapper.terminate, 'function', 'serviceWrapper.terminate is not a function');
	t.is(typeof serviceWrapper.register, 'function', 'serviceWrapper.register is not a function');
	t.is(typeof serviceWrapper.deregister, 'function', 'serviceWrapper.deregister is not a function');
	t.is(typeof serviceWrapper.quit, 'function', 'serviceWrapper.quit is not a function');
	t.is(typeof serviceWrapper.kill, 'function', 'serviceWrapper.kill is not a function');
	t.is(typeof serviceWrapper.setTerminationHandlers, 'function', 'serviceWrapper.setTerminationHandlers is not a function');
});

test('ServiceWrapper instance uses service and consul client passed in constructor', t => {
	let serviceMock = new ServiceMock();
	let consulClientMock = new ConsulClientMock();
	let serviceWrapper = new ServiceWrapper(serviceMock, consulClientMock);

	t.is(serviceWrapper.service, serviceMock);
	t.is(serviceWrapper.consulClient, consulClientMock);
	t.is(serviceWrapper.instance, null);
});

test('Calls service.start when calling start()', async t => {
	var {serviceWrapper} = t.context;

	t.is(serviceWrapper.service.start.called, false);

	await serviceWrapper.start();

	t.is(serviceWrapper.service.start.called, true);
});

test('Calls service.setTerminationHandlers when calling start()', async t => {
	var {serviceWrapper} = t.context;

	stub(serviceWrapper, 'setTerminationHandlers');

	t.is(serviceWrapper.setTerminationHandlers.called, false);

	await serviceWrapper.start();

	t.is(serviceWrapper.setTerminationHandlers.called, true);

	serviceWrapper.setTerminationHandlers.restore();
});

test('Calls consulClient.register when calling start()', async t => {
	var {serviceWrapper} = t.context;

	t.is(serviceWrapper.consulClient.register.called, false);

	await serviceWrapper.start();

	t.is(serviceWrapper.consulClient.register.called, true);
});

test('Calls service.stop when calling terminate()', async t => {
	var {serviceWrapper} = t.context;

	t.is(serviceWrapper.service.stop.called, false);

	await serviceWrapper.terminate();

	t.is(serviceWrapper.service.stop.called, true);
});

test('Calls process.exit when calling terminate()', async t => {
	var {serviceWrapper} = t.context;

	t.is(process.exit.called, false);

	await serviceWrapper.terminate();

	t.is(process.exit.called, true);
});

test('Calls consulClient.deregister when calling terminate()', async t => {
	var {serviceWrapper} = t.context;

	t.is(serviceWrapper.consulClient.deregister.called, false);

	await serviceWrapper.terminate();

	t.is(serviceWrapper.consulClient.deregister.called, true);
});

test('Calls process.exit when calling quit()', t => {
	var {serviceWrapper} = t.context;

	t.is(process.exit.called, false);

	serviceWrapper.quit();

	t.is(process.exit.called, true);
});

test('Calls process.exit when calling kill()', t => {
	var {serviceWrapper} = t.context;

	t.is(process.exit.called, false);

	serviceWrapper.kill();

	t.is(process.exit.called, true);
});

test('Set termination handlers for service shutdown.', t => {
	var {serviceWrapper} = t.context;

	t.is(process.on.called, false);

	serviceWrapper.setTerminationHandlers();

	t.is(process.on.called, true);
});

test('Kills application when service.start throws error on start()', async t => {
	let serviceWrapper = ServiceWrapperFactory.createBrokenService();

	t.is(process.exit.called, false);

	try {
		await serviceWrapper.start();
	} catch (err) {
		t.is(process.exit.called, true);
	}
});

test('Kills application when consul.register throws error on start()', async t => {
	let serviceWrapper = ServiceWrapperFactory.createBrokenConsul();

	t.is(process.exit.called, false);

	try {
		await serviceWrapper.start();
	} catch (err) {
		t.is(process.exit.called, true);
	}
});

test('Kill application when consul.deregister throws error on terminate()', async t => {
	let serviceWrapper = ServiceWrapperFactory.createBrokenConsul();

	t.is(process.exit.called, false);

	try {
		await serviceWrapper.terminate();
	} catch (err) {
		t.is(process.exit.called, true);
	}
});

test('Kill application when service.stop throws error on terminate()', async t => {
	let serviceWrapper = ServiceWrapperFactory.createBrokenService();

	t.is(process.exit.called, false);

	try {
		await serviceWrapper.terminate();
	} catch (err) {
		t.is(process.exit.called, true);
	}
});

test('Start using consul agent service module without consul instance', async t => {
	let serviceWrapper = ServiceWrapperFactory.createWithConsul();

	t.is(process.exit.called, false);

	try {
		await serviceWrapper.start();
	} catch (err) {
		t.is(process.exit.called, true);
	}
});

test('Terminate using consul agent service module without consul instance', async t => {
	let serviceWrapper = ServiceWrapperFactory.createWithConsul();

	t.is(process.exit.called, false);

	try {
		await serviceWrapper.terminate();
	} catch (err) {
		t.is(process.exit.called, true);
	}
});
