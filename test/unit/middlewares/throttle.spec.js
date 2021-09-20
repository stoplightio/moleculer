const ServiceBroker = require("../../../src/service-broker");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").Throttle;
const lolex = require("@sinonjs/fake-timers");

describe("Test ThrottleMiddleware", () => {
	const broker = new ServiceBroker({ logger: false });
	const handler = jest.fn();
	const service = { fullName: "posts" };
	const event = {
		name: "user.created",
		handler,
		service
	};
	const endpoint = {
		event,
		node: {
			id: broker.nodeID
		}
	};

	const mw = Middleware(broker);

	it("should register hooks", () => {
		expect(mw.localEvent).toBeInstanceOf(Function);
	});

	describe("Test localEvent", () => {
		let clock;

		beforeAll(() => (clock = lolex.install({ now: 100000 })));
		afterAll(() => clock.uninstall());

		it("should not wrap handler if throttle is not set", () => {
			const newActionHandler = mw.localEvent.call(broker, handler, event);
			expect(newActionHandler).toBe(handler);

			event.throttle = 0;
			const newEventHandler = mw.localEvent.call(broker, handler, event);
			expect(newEventHandler).toBe(handler);
		});

		it("should wrap handler if throttle is defined", () => {
			event.throttle = 5000;

			const newHandler = mw.localEvent.call(broker, handler, event);
			expect(newHandler).not.toBe(handler);
		});

		it("should invoke when event not received in 5 seconds", () => {
			event.throttle = 5000;
			event.handler.mockClear();

			const ctx = Context.create(broker, endpoint);
			const newHandler = mw.localEvent.call(broker, handler, event);

			expect(event.handler).toBeCalledTimes(0);

			newHandler(ctx);
			expect(event.handler).toBeCalledTimes(1);

			clock.tick(1000);
			newHandler(ctx);
			expect(event.handler).toBeCalledTimes(1);

			clock.tick(2000);
			newHandler(ctx);
			expect(event.handler).toBeCalledTimes(1);

			clock.tick(2000);
			newHandler(ctx);
			expect(event.handler).toBeCalledTimes(2);

			clock.tick(2000);
			newHandler(ctx);
			expect(event.handler).toBeCalledTimes(2);

			clock.tick(3000);
			newHandler(ctx);
			expect(event.handler).toBeCalledTimes(3);
		});
	});
});
