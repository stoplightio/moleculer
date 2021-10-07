"use strict";

const ServiceBroker = require("../src/service-broker");
const CSVReporter = require("../src/metrics/reporters").CSV;
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "dev-metrics", // + process.pid,
	logger: {
		type: "Console",
		options: {
			formatter: "short"
		}
	},

	transporter: "TCP",
	metrics: {
		enabled: true,
		reporter: [
			{
				type: "Console",
				options: {
					onlyChanges: false,
					//interval: 1000,
					includes: ["moleculer.event.received.*", "os.memory.*"]
					//excludes: ["moleculer.transit.publish.total", "moleculer.transit.receive.total"]
				}
			},
			/*{
				type: "Event",
				options: {
					onlyChanges: false,
					eventName: "$metrics.state",
					includes: "moleculer.request.**",
					excludes: ["moleculer.request.error.**", "moleculer.request.fallback.**"]
				}
			},*/
			/*new CSVReporter({
				folder: "./dev/trash/csv-metrics",
				includes: "moleculer.request.time",
				//excludes: ["moleculer.request.error.**", "moleculer.request.fallback.**"]
				//types: "histogram",
				mode: "label",
				//delimiter: ";",
				//rowDelimiter: "\r\n",

				//rowFormatter(data) {
				//	data[0] = new Date(data[0]).toISOString();
				//	return data;
				//}
			}),*/
			/*{
				type: "Prometheus",
				options: {
					//includes: ["moleculer.transit.**"]
				}
			},*/
			/*{
				type: "StatsD",
				options: {
					host: "localhost",
					metricNamePrefix: "statsd.",
					includes: "moleculer.**",
				}
			},*/
			{
				type: "Datadog",
				options: {
					includes: "moleculer.**"
				}
			}
		]
		//defaultQuantiles: [0.1, 0.5, 0.9]
	}
	//logLevel: "debug",
	//logObjectPrinter: o => util.inspect(o, { depth: 4, colors: true, breakLength: 50 }), // `breakLength: 50` activates multi-line object
});

broker.createService({
	name: "greeter",
	actions: {
		async hello(ctx) {
			await this.Promise.delay(Math.random() * 100);
			ctx.emit("something.happened", { a: 5 });
			return "Hello Metrics";
		}
	}
});

broker.createService({
	name: "event-handler",
	events: {
		"$metrics.state"(payload) {
			this.broker.logger.info("Metrics event received! Size:", payload.length);
			this.broker.logger.info(util.inspect(payload, { depth: 4, colors: true }));
		},

		async "something.happened"(ctx) {
			this.logger.info("Event received");
			await this.Promise.delay(Math.random() * 500);
		}
	}
});

broker.start().then(() => {
	broker.repl();

	let c = 20;
	const timer = setInterval(() => {
		broker
			.call("greeter.hello")
			.then(res => broker.logger.info("OK"))
			.catch(err => broker.logger.error(err));
		c--;
		if (c <= 0) clearInterval(timer);
	}, 1000);
});
