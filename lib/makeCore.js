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
	 * @param {function} monitor.PromiseStatus
	 * @return {function} a function that makes promise APIs
	 */
	return function makeCore(options) {

		var schedule, monitor, undef;

		schedule = options.scheduler;
		monitor = options.monitor || {};

		function makePromiseType(BaseType, api, valueType) {

			function PromiseType() {}

			PromiseType.prototype = extend(BaseType.prototype,
				Object(api) === api ? api : {});

			Object.defineProperties(PromiseType.prototype, {
				ownType: {
					value: lift
				},
				valueType: {
					value: typeof valueType === 'function' ? valueType : lift
				}
			});

			lift.reject = reject;
			lift.promise = newPromise;
			lift.extend = makePromiseType.bind(undef, PromiseType);

			lift.toPendingState = toPendingState;
			lift.toFulfilledState = toFulfilledState;
			lift.toRejectedState = toRejectedState;

			return lift;

			function lift(value) {
				return newPromise(function(resolve) {
					resolve(value);
				});
			}

			function reject(reason) {
				return newPromise(function(_, reject) {
					reject(reason);
				});
			}

			function newPromise(resolver) {
				return pending(PromiseType, resolver,
					monitor.PromiseStatus && monitor.PromiseStatus());
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
		 * @param {Promise?} status PromiseStatus
		 * @returns {PromiseType} promise whose fate is determine by resolver
		 * @private
		 */
		function pending(PromiseType, resolver, status) {
			var self, value, consumers = [];

			self = new PromiseType();
			self._message = _message;

			self.then = then;
			self.inspect = inspect;

			// Call the provider resolver to seal the promise's fate
			try {
				resolver(promiseResolve, promiseReject, promiseNotify);
			} catch(e) {
				promiseReject(e);
			}

			// Return the promise
			return self;

			function _message(type, args, resolve, notify) {
				consumers ? consumers.push(deliver) : schedule(function() { deliver(value); });

				function deliver(p) {
					p._message(type, args, resolve, notify);
				}
			}

			/**
			 * Returns a snapshot of the promise's state at the instant inspect()
			 * is called. The returned object is not live and will not update as
			 * the promise's state changes.
			 * @returns {{ state:String, value?:*, reason?:* }} status snapshot
			 *  of the promise.
			 */
			function inspect() {
				return value ? value.inspect() : toPendingState();
			}

			/**
			 * Register handlers for this promise.
			 * @param [onFulfilled] {Function} fulfillment handler
			 * @param [onRejected] {Function} rejection handler
			 * @param [onProgress] {Function} progress handler
			 * @return {PromiseType} new Promise
			 */
			function then(onFulfilled, onRejected, onProgress) {
				/*jshint unused:false*/
				var args = arguments;
				return pending(PromiseType, function(resolve, reject, notify) {
					_message('when', args, resolve, notify);
				}, status && status.observed());
			}

			/**
			 * Transition from pre-resolution state to post-resolution state, notifying
			 * all listeners of the ultimate fulfillment or rejection
			 * @param {*|Promise} val resolution value
			 */
			function promiseResolve(val) {
				if(!consumers) {
					return;
				}

				value = coerce(val);
				scheduleConsumers(consumers, value);
				consumers = undef;

				if(status) {
					updateStatus(value, status);
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
				if(consumers) {
					scheduleConsumers(consumers, progressed(update));
				}
			}
		}

		/**
		 * Creates a fulfilled, local promise as a proxy for a value
		 * NOTE: must never be exposed
		 * @param {*} value fulfillment value
		 * @returns {Promise}
		 */
		function fulfilled(value) {
			return near(
				new NearFulfilledProxy(value),
				function() { return toFulfilledState(value); }
			);
		}

		/**
		 * Creates a rejected, local promise with the supplied reason
		 * NOTE: must never be exposed
		 * @param {*} reason rejection reason
		 * @returns {Promise}
		 */
		function rejected(reason) {
			return near(
				new NearRejectedProxy(reason),
				function() { return toRejectedState(reason); }
			);
		}

		/**
		 * Creates a near promise using the provided proxy
		 * NOTE: must never be exposed
		 * @param {object} proxy proxy for the promise's ultimate value or reason
		 * @param {function} inspect function that returns a snapshot of the
		 *  returned near promise's state
		 * @returns {Promise}
		 */
		function near(proxy, inspect) {
			var p = new Promise();

			p._message = function(type, args, resolve) {
				try {
					resolve(proxy[type].apply(proxy, args));
				} catch(e) {
					resolve(rejected(e));
				}
			};

			p.inspect = inspect;

			return p;
		}

		/**
		 * Create a progress promise with the supplied update.
		 * @private
		 * @param {*} update
		 * @return {Promise} progress promise
		 */
		function progressed(update) {
			var p = new Promise();

			p._message = function (type, args, _, notify) {
				var onProgress = args[2];
				try {
					notify(typeof onProgress === 'function' ? onProgress(update) : update);
				} catch(e) {
					notify(e);
				}
			};

			return p;
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

		function NearFulfilledProxy(value) {
			this.value = value;
		}

		NearFulfilledProxy.prototype.when = function(onResult) {
			return typeof onResult === 'function' ? onResult(this.value) : this.value;
		};

		function NearRejectedProxy(reason) {
			this.reason = reason;
		}

		NearRejectedProxy.prototype.when = function(_, onError) {
			if(typeof onError === 'function') {
				return onError(this.reason);
			} else {
				throw this.reason;
			}
		};

		/**
		 * Schedule a task that will process a list of handlers
		 * in the next queue drain run.
		 * @private
		 * @param {Array} handlers queue of handlers to execute
		 * @param {*} value passed as the only arg to each handler
		 */
		function scheduleConsumers(handlers, value) {
			schedule(function() {
				var handler, i = 0;
				while (handler = handlers[i++]) {
					handler(value);
				}
			});
		}

		function updateStatus(value, status) {
			value._message('when', [
				function ()  { status.fulfilled(); },
				function (r) { status.rejected(r); }
			], identity, identity);
		}

		return makePromiseType(Promise);

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

	function identity(x) {
		return x;
	}

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(); });
