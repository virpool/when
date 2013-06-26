/** @license MIT License (c) copyright 2011-2013 original author or authors */

(function(define) { 'use strict';
define(function () {

	var bind, fcall;

	bind = Function.prototype.bind;
	fcall = bind.bind(bind.call)(bind.call);

	/**
	 * Makes a new promise core using the supplied options.  The core can
	 * be used to create promise types
	 * @param {object} options
	 * @param {function} options.scheduler function to use to schedule promise handlers
	 * @param {object?} options.monitor promise monitor
	 * @param {function} monitor.promisePending
	 * @param {function} monitor.promiseObserved
	 * @param {function} monitor.promiseFulfilled
	 * @param {function} monitor.unhandledRejection
	 * @return {function} a function that makes promise APIs
	 */
	return function makeCore(options) {

		var schedule, monitor, undef;

		schedule = options.scheduler;
		monitor = options.monitor || {};

		return makePromiseType(Promise);

		function makePromiseType(Base, api) {

			function PromiseType() {}

			PromiseType.prototype = extend(Base.prototype, Object(api) === api ? api : {});

			lift.reject = reject;
			lift.promise = newPromise;
			lift.extend = makePromiseType.bind(undef, PromiseType);

			return lift;

			function lift(value) {
				return pending(PromiseType, function(resolve) {
					resolve(value);
				});
			}

			function reject(reason) {
				return pending(PromiseType, function(_, reject) {
					reject(reason);
				});
			}

			function newPromise(resolver) {
				return pending(PromiseType, resolver);
			}
		}

		/**
		 * Trusted Promise constructor.  A Promise created from this constructor is
		 * a trusted when.js promise.  Any other duck-typed promise is considered
		 * untrusted.
		 * @constructor
		 * @name Promise
		 */
		function Promise() {}

		/**
		 * Creates a new promise, linked to parent, whose fate is determined
		 * by resolver.
		 * @private
		 * @param {function} PromiseType promise constructor
		 * @param {function} resolver function(resolve, reject, notify)
		 * @param {Promise?} parent promise from which the new promise is begotten
		 * @returns {PromiseType} promise whose fate is determine by resolver
		 * @private
		 */
		function pending(PromiseType, resolver, parent) {
			var self, value, observed, handlers = [];

			self = new PromiseType();
			self.then = then;
			self.inspect = inspect;

			if(monitor.promisePending) {
				monitor.promisePending(self, parent);
			}

			// Call the provider resolver to seal the promise's fate
			try {
				resolver(promiseResolve, promiseReject, promiseNotify);
			} catch(e) {
				promiseReject(e);
			}

			// Return the promise
			return self;

			/**
			 * Register handlers for this promise.
			 * @param [onFulfilled] {Function} fulfillment handler
			 * @param [onRejected] {Function} rejection handler
			 * @param [onProgress] {Function} progress handler
			 * @return {PromiseType} new Promise
			 */
			function then(onFulfilled, onRejected, onProgress) {
				var next = pending(PromiseType, function(resolve, reject, notify) {
					// if not resolved, push onto handlers, otherwise execute asap
					// but not in the current stack
					handlers ? handlers.push(run) : schedule(function() { run(value); });

					function run(p) {
						p.then(onFulfilled, onRejected, onProgress)
							.then(resolve, reject, notify);
					}

				}, self);

				if (!observed && monitor.promiseObserved) {
					observed = true;
					monitor.promiseObserved(self);
				}

				return next;
			}

			function inspect() {
				return value ? value.inspect() : toPendingState();
			}

			/**
			 * Transition from pre-resolution state to post-resolution state, notifying
			 * all listeners of the ultimate fulfillment or rejection
			 * @param {*|Promise} val resolution value
			 */
			function promiseResolve(val) {
				if(!handlers) {
					return;
				}

				value = coerce(val);
				scheduleHandlers(handlers, value);
				handlers = undef;

				if (!observed && monitor.unhandledRejection) {
					value.then(
						function () { monitor.promiseFulfilled(self); },
						function (r) { monitor.unhandledRejection(self, r); }
					);
				}
			}

			/**
			 * Reject this promise with the supplied reason, which will be used verbatim.
			 * @param {*} reason reason for the rejection
			 */
			function promiseReject(reason) {
				promiseResolve(rejected(reason));
			}

			/**
			 * Issue a progress event, notifying all progress listeners
			 * @param {*} update progress event payload to pass to all listeners
			 */
			function promiseNotify(update) {
				if(handlers) {
					scheduleHandlers(handlers, progressing(update));
				}
			}
		}

		/**
		 * Coerces x to a trusted Promise
		 *
		 * @private
		 * @param {*} x thing to coerce
		 * @returns {*} Guaranteed to return a trusted Promise.  If x
		 *   is trusted, returns x, otherwise, returns a new, trusted, already-resolved
		 *   Promise whose resolution value is:
		 *   * the resolution value of x if it's a foreign promise, or
		 *   * x if it's a value
		 */
		function coerce(x) {
			if(x instanceof Promise) {
				return x;
			}

			if (!(x === Object(x) && 'then' in x)) {
				return fulfilled(x);
			}

			return pending(Promise, function(resolve, reject, notify) {
				schedule(function() {
					try {
						// We must check and assimilate in the same tick, but not the
						// current tick, careful only to access promiseOrValue.then once.
						var untrustedThen = x.then;

						if(typeof untrustedThen === 'function') {
							fcall(untrustedThen, x, resolve, reject, notify);
						} else {
							// It's a value, create a fulfilled wrapper
							resolve(fulfilled(x));
						}

					} catch(e) {
						// Something went wrong, reject
						reject(e);
					}
				});
			});
		}

		/**
		 * Create an already-fulfilled promise for the supplied value
		 * @private
		 * @param {*} value
		 * @return {Promise} fulfilled promise
		 */
		function fulfilled(value) {
			var self = new Promise();

			self.then = function (onFulfilled) {
				try {
					return typeof onFulfilled == 'function'
						? coerce(onFulfilled(value)) : self;
				} catch (e) {
					return rejected(e);
				}
			};

			self.inspect = function() {
				return toFulfilledState(value);
			};

			return self;
		}

		/**
		 * Create an already-rejected promise with the supplied rejection reason.
		 * @private
		 * @param {*} reason
		 * @return {Promise} rejected promise
		 */
		function rejected(reason) {
			var self = new Promise();

			self.then = function (_, onRejected) {
				try {
					return typeof onRejected == 'function'
						? coerce(onRejected(reason)) : self;
				} catch (e) {
					return rejected(e);
				}
			};

			self.inspect = function() {
				return toRejectedState(reason);
			};

			return self;
		}

		/**
		 * Create a progress promise with the supplied update.
		 * @private
		 * @param {*} update
		 * @return {Promise} progress promise
		 */
		function progressing(update) {
			var self = new Promise();

			self.then = function (_, __, onProgress) {
				try {
					return typeof onProgress == 'function'
						? progressing(onProgress(update)) : self;
				} catch (e) {
					return progressing(e);
				}
			};

			self.inspect = function() {
				return toFulfilledState(update);
			};

			return self;
		}

		/**
		 * Schedule a task that will process a list of handlers
		 * in the next queue drain run.
		 * @private
		 * @param {Array} handlers queue of handlers to execute
		 * @param {*} value passed as the only arg to each handler
		 */
		function scheduleHandlers(handlers, value) {
			schedule(function() {
				var handler, i = 0;
				while (handler = handlers[i++]) {
					handler(value);
				}
			});
		}
	};

	// Snapshot states

	/**
	 * Creates a fulfilled state snapshot
	 * @private
	 * @param {*} x any value
	 * @returns {{state:'fulfilled',value:*}}
	 */
	function toFulfilledState(x) {
		return { state: 'fulfilled', value: x };
	}

	/**
	 * Creates a rejected state snapshot
	 * @private
	 * @param {*} x any reason
	 * @returns {{state:'rejected',reason:*}}
	 */
	function toRejectedState(x) {
		return { state: 'rejected', reason: x };
	}

	/**
	 * Creates a pending state snapshot
	 * @private
	 * @returns {{state:'pending'}}
	 */
	function toPendingState() {
		return { state: 'pending' };
	}

	/**
	 * Extends from the supplied base object to create a new object
	 * and mixes in functions from the supplied properties
	 * @param {object} base object from which to beget
	 * @param {object} properties properties to mix in
	 * @returns {object}
	 */
	function extend(base, properties) {
		return Object.keys(properties).reduce(function (proto, key) {
			if (typeof properties[key] === 'function') {
				proto[key] = properties[key];
			}
			return proto;
		}, Object.create(base));
	}



});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(); });
