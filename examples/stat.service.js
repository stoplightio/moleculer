"use strict";

const defaultsDeep = require("lodash/defaultsDeep");

/**
 *
 *
 * @class StatRequestStore
 */
class StatRequestStore {
	/**
	 * Creates an instance of StatRequestStore.
	 *
	 * @param {any} name
	 * @param {any} bucketCount
	 *
	 * @memberof StatRequestStore
	 */
	constructor(name, bucketCount) {
		this.name = name;
		this.dirty = false;
		this.count = 0;
		this.errors = {};

		this.maxBucketCount = bucketCount;
		this.timeBuckets = [];
		this.cycle();

		this.stat = null;
	}

	/**
	 *
	 *
	 * @param {any} latency
	 * @param {any} errCode
	 *
	 * @memberof StatRequestStore
	 */
	append(latency, errCode) {
		this.dirty = true;
		this.cycleCount++;
		this.count++;
		if (errCode) this.errors[errCode] = (this.errors[errCode] || 0) + 1;

		if (latency != null) this.lastTimeBucket.times.push(latency);
	}

	/**
	 *
	 *
	 *
	 * @memberof StatRequestStore
	 */
	cycle() {
		this.lastTimeBucket = {
			time: Date.now(),
			times: [],
			rps: null
		};
		this.timeBuckets.push(this.lastTimeBucket);

		if (this.timeBuckets.length > this.maxBucketCount) this.timeBuckets.shift();

		this.firstBucketTime = this.timeBuckets[0].time;

		this.dirty = true;
		this.calculate();
	}

	/**
	 *
	 *
	 * @returns
	 *
	 * @memberof StatRequestStore
	 */
	calculateRps() {
		const now = Date.now();
		let totalCount = 0;
		let values = [];
		this.timeBuckets.forEach((bucket, i) => {
			totalCount = totalCount + bucket.times.length;
			if (bucket.rps == null && i < this.timeBuckets.length - 1) {
				const endTime = this.timeBuckets[i + 1].time; // Next bucket start time
				bucket.rps = bucket.times.length / ((endTime - bucket.time) / 1000);
			}
			if (bucket.rps != null) values.push(bucket.rps);
		});

		let current;
		if (now - this.firstBucketTime > 0)
			current = totalCount / ((now - this.firstBucketTime) / 1000);

		return {
			current,
			values
		};
	}

	/**
	 *
	 *
	 * @returns
	 *
	 * @memberof StatRequestStore
	 */
	calculate() {
		if (this.dirty || !this.stat) {
			let stat = {
				count: this.count,
				errors: Object.assign({}, this.errors),
				rps: this.calculateRps()
			};

			const times = this.timeBuckets.reduce((a, b) => a.concat(b.times), []);
			if (times.length > 0) {
				// Calculate latencies
				times.sort((a, b) => a - b);

				stat.latency = {
					mean: times.reduce((a, b) => a + b, 0) / times.length,
					median: times[Math.ceil(0.5 * times.length) - 1],
					"90th": times[Math.ceil(0.9 * times.length) - 1],
					"95th": times[Math.ceil(0.95 * times.length) - 1],
					"99th": times[Math.ceil(0.99 * times.length) - 1],
					"99.5th": times[Math.ceil(0.995 * times.length) - 1]
				};
			}

			this.stat = stat;
			this.dirty = false;
		} else {
			// Calculate req/sec
			/* istanbul ignore next */
			this.stat.rps = this.calculateRps();
		}
		return this.stat;
	}

	/**
	 *
	 *
	 * @returns
	 *
	 * @memberof StatRequestStore
	 */
	snapshot() {
		if (!this.stat) return this.calculate();

		return this.stat;
	}
}

/**
 *
 *
 * @class RequestStatistics
 */
class RequestStatistics {
	/**
	 * Creates an instance of RequestStatistics.
	 *
	 * @param {any} options
	 *
	 * @memberof RequestStatistics
	 */
	constructor(options) {
		this.options = defaultsDeep({}, options, {
			cycleTime: 5 * 1000,
			bucketCount: 12
		});

		this.total = new StatRequestStore("total", this.options.bucketCount);
		this.actions = new Map();

		this.cycleTimer = setInterval(() => {
			this.cycle();
		}, this.options.cycleTime);

		this.cycleTimer.unref();
	}

	/**
	 *
	 *
	 * @param {any} actionName
	 * @param {any} latency
	 * @param {any} errCode
	 *
	 * @memberof RequestStatistics
	 */
	append(actionName, latency, errCode) {
		this.total.append(latency, errCode);

		if (actionName) {
			if (!this.actions.has(actionName))
				this.actions.set(
					actionName,
					new StatRequestStore(actionName, this.options.bucketCount)
				);
			this.actions.get(actionName).append(latency, errCode);
		}
	}

	/**
	 *
	 *
	 *
	 * @memberof RequestStatistics
	 */
	cycle() {
		this.total.cycle();
		this.actions.forEach(item => item.cycle());
	}

	/**
	 *
	 *
	 * @returns
	 *
	 * @memberof RequestStatistics
	 */
	snapshot() {
		let snapshot = {
			total: this.total.snapshot(),
			actions: {}
		};

		this.actions.forEach((item, name) => (snapshot.actions[name] = item.snapshot()));

		return snapshot;
	}
}

module.exports = {
	name: "stat",
	actions: {
		snapshot(ctx) {
			return this.snapshot(ctx.params);
		}
	},
	events: {
		"metrics.trace.span.finish"(payload) {
			if (payload.error)
				this.requests.append(
					payload.action.name,
					payload.duration,
					payload.error.code || 500
				);
			else this.requests.append(payload.action.name, payload.duration);
		}
	},

	methods: {
		snapshot(opts) {
			return {
				requests: this.requests.snapshot(opts)
			};
		}
	},

	created() {
		this.requests = new RequestStatistics(defaultsDeep({}, this.broker.options));
	}
};
