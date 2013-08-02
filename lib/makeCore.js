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

		return makePromiseType(Promise);

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
			var self, value, handlers = [];

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

			/**
			 * Register handlers for this promise.
			 * @param [onFulfilled] {Function} fulfillment handler
			 * @param [onRejected] {Function} rejection handler
			 * @param [onProgress] {Function} progress handler
			 * @return {PromiseType} new Promise
			 */
			function then(/*onFulfilled, onRejected, onProgress*/) {
				var args = arguments;

				return pending(PromiseType, function(resolve, reject, notify) {

					_message('when', args, resolve, reject, notify);

				}, status && status.observed());
			}

			function inspect() {
				return value ? value.inspect() : toPendingState();
			}

			function _message(type, args, resolve, fallback) {
				handlers ? handlers.push(run) : schedule(function() { run(value); });

				function run(p) {
					p._message(type, args, resolve, fallback);
				}
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

//				if (status) {
//					value._message('when', [
//						function ()  { status.fulfilled(); },
//						function (r) { status.rejected(r); }
//					]);
//				}
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
			function promiseNotify(/*update*/) {
//				if(handlers) {
//					scheduleHandlers(handlers, progressing(update));
//				}
			}
		}

		function fulfilled(value) {
			return near({
				when: function(onResult) {
					return typeof onResult === 'function' ? onResult(value) : value;
				},
				get: function(property) {
					return value[property];
				},
				set: function(property, val) {
					return value[property] = val;
				}
			}, function() {
				return toFulfilledState(value);
			});
		}

		function rejected(error) {
			return near({
				when: function(_, onError) {
					if(typeof onError === 'function') {
						return onError(error);
					} else {
						throw error;
					}
				}
			}, function() {
				return toRejectedState(error);
			});
		}

		function near(target, inspect) {
			var self = new Promise();

			self._message = function(type, args, resolve, fallback) {
				try {
					var result = target[type].apply(target, args);
					resolve(result);
				} catch(e) {
					fallback(e);
				}
			};

			self.inspect = inspect;

			return self;
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
