"use strict";

const { ServiceBroker } = require("../");

const broker = new ServiceBroker({
	//namespace: "streaming",
	nodeID: "node-echo",
	//transporter: "nats://192.168.51.100:4222",
	transporter: "redis://192.168.51.100:6379",
	serializer: "MsgPack",
	logger: console,
	logLevel: "info"
});

broker.createService({
	name: "echo",
	actions: {
		reply(ctx) {
			return ctx.params;
		}
	}
});

broker.start().then(() => broker.repl());
