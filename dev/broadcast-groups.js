"use strict";

const ServiceBroker = require("../src/service-broker");

// Create broker #1
const broker1 = new ServiceBroker({
	nodeID: "node-1",
	transporter: "NATS",
	logger: console,
	disableBalancer: true,
	registry: {
		//preferLocal: false
	}
});

broker1.createService({
	name: "payment",
	events: {
		"user.created"() {
			this.logger.info(this.broker.nodeID, " - PAYMENT: Event received!");
		}
	}
});

broker1.createService({
	name: "other",
	events: {
		"user.created": {
			group: "payment",
			handler() {
				this.logger.info(this.broker.nodeID, " - OTHER: Event received!");
			}
		}
	}
});

broker1.createService({
	name: "mail",
	events: {
		"user.created": {
			handler() {
				this.logger.info(this.broker.nodeID, " - MAIL: Event received!");
			}
		}
	}
});

// Create broker #2
const broker2 = new ServiceBroker({
	nodeID: "node-2",
	transporter: "NATS",
	logger: console,
	disableBalancer: true,
	registry: {
		//preferLocal: false
	}
});

broker2.createService({
	name: "payment",
	events: {
		"user.created"() {
			this.logger.info(this.broker.nodeID, " - PAYMENT: Event received!");
		}
	}
});

broker2.createService({
	name: "other",
	events: {
		"user.created": {
			group: "payment",
			handler() {
				this.logger.info(this.broker.nodeID, " - OTHER: Event received!");
			}
		}
	}
});

broker2.createService({
	name: "mail",
	events: {
		"user.created": {
			handler() {
				this.logger.info(this.broker.nodeID, " - MAIL: Event received!");
			}
		}
	}
});

broker1.Promise.all([broker1.start(), broker2.start()])
	.delay(1000)
	.then(() => {
		setInterval(() => {
			broker1.logger.info("-------------------------");
			broker1.broadcast("user.created", "data");
			//broker1.broadcast("user.created", "data", ["payment"]);
			//broker1.broadcast("user.created", "data", ["mail", "payment"]);
			//broker1.emit("user.created", "data");
			//broker1.emit("user.created", "data", ["mail"]);
		}, 2000);
	});
