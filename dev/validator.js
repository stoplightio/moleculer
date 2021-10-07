const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	validator: {
		type: "Fastest",
		options: {
			paramName: "myParams",
			messages: {
				required: "Missing field!"
			}
		}
	}
});

broker.createService({
	name: "greeter",
	actions: {
		welcome: {
			myParams: {
				name: "string"
			},
			handler(ctx) {
				return `Hello ${ctx.params.name}`;
			}
		}
	}
});

broker
	.start()
	.then(() => broker.repl())
	.then(() => broker.call("greeter.welcome"))
	.then(res => broker.logger.info("Result:", res))
	.catch(err => broker.logger.error(err));
