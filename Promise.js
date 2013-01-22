/**
 * Promise
 * @author: brian
 */
(function(define) {
define(function() {

	var slice, objectCreate, undef;

	Promise.reject = reject;
	Promise.coerce = coerce;
	Promise.map = map;
	Promise.isPromise = isPromise;

	/**
	 * Trusted Promise constructor.  A Promise created from this constructor is
	 * a trusted when.js promise.  Any other duck-typed promise is considered
	 * untrusted.
	 * @constructor
	 * @param {function} [init]
	 * @name Promise
	 */
	function Promise(init) {
		var promise, handlers, progressHandlers,
			_then, _progress, _resolve;

		promise = this;
		promise.then = then;

		handlers = [];
		progressHandlers = [];

		/**
		 * Pre-resolution then() that adds the supplied callback, errback, and progback
		 * functions to the registered listeners
		 * @private
		 *
		 * @param {function?} [onFulfilled] resolution handler
		 * @param {function?} [onRejected] rejection handler
		 * @param {function?} [onProgress] progress handler
		 */
		_then = function(onFulfilled, onRejected, onProgress) {
			return new Promise(function(resolve) {
				var progressHandler = typeof onProgress === 'function'
					? function(update) {
					try {
						// Allow progress handler to transform progress event
						resolve.progress(onProgress(update));
					} catch(e) {
						// Use caught value as progress
						resolve.progress(e);
					}
				}
					: function(update) { resolve.progress(update); };

				handlers.push(function(promise) {
					promise.then(onFulfilled, onRejected)
						.then(resolve, function(e) { return resolve(reject(e)); }, progressHandler);
				});

				progressHandlers.push(progressHandler);
			});
		};

		/**
		 * Issue a progress event, notifying all progress listeners
		 * @private
		 * @param {*} update progress event payload to pass to all listeners
		 */
		_progress = function(update) {
			processQueue(progressHandlers, update);
			return update;
		};

		/**
		 * Transition from pre-resolution state to post-resolution state, notifying
		 * all listeners of the resolution or rejection
		 * @private
		 * @param {*} value the value of this deferred
		 */
		_resolve = function(value) {
			// Replace _then with one that directly notifies with the result.
			_then = value.then;
			// Replace _resolve so that this Deferred can only be resolved once
			_resolve = coerce;
			// Make _progress a noop, to disallow progress for the resolved promise.
			_progress = identity;

			// Notify handlers
			processQueue(handlers, value);

			// Free progressHandlers array since we'll never issue progress events
			progressHandlers = handlers = undef;

			return value;
		};

		promiseResolve.progress = promiseProgress;

		try {
			init(promiseResolve);
		} catch(e) {
			promiseReject(e);
		}

		/**
		 * Wrapper to allow _then to be replaced safely
		 * @param {function?} [onFulfilled] resolution handler
		 * @param {function?} [onRejected] rejection handler
		 * @param {function?} [onProgress] progress handler
		 * @return {Promise} new promise
		 */
		function then(onFulfilled, onRejected, onProgress) {
			// TODO: Promises/A+ check typeof onFulfilled, onRejected, onProgress
			return _then(onFulfilled, onRejected, onProgress);
		}

		/**
		 * Wrapper to allow _resolve to be replaced
		 */
		function promiseResolve(val) {
			return _resolve(coerce(val));
		}

		/**
		 * Wrapper to allow _reject to be replaced
		 */
		function promiseReject(err) {
			return promiseResolve(coerce(err).then(rejected));
		}

		/**
		 * Wrapper to allow _progress to be replaced
		 */
		function promiseProgress(update) {
			return _progress(update);
		}
	}

	Promise.prototype = {
		/**
		 * Register a callback that will be called when a promise is
		 * fulfilled or rejected.  Optionally also register a progress handler.
		 * Shortcut for .then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress)
		 * @param {function?} [onFulfilledOrRejected]
		 * @param {function?} [onProgress]
		 * @return {Promise}
		 */
		always: function(onFulfilledOrRejected, onProgress) {
			return this.then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress);
		},

		/**
		 * Register a rejection handler.  Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @return {Promise}
		 */
		otherwise: function(onRejected) {
			return this.then(undef, onRejected);
		},

		/**
		 * Shortcut for .then(function() { return value; })
		 * @param  {*} value
		 * @return {Promise} a promise that:
		 *  - is fulfilled if value is not a promise, or
		 *  - if value is a promise, will fulfill with its value, or reject
		 *    with its reason.
		 */
		'yield': function(value) {
			return this.then(function() {
				return value;
			});
		},

		/**
		 * Assumes that this promise will fulfill with an array, and arranges
		 * for the onFulfilled to be called with the array as its argument list
		 * i.e. onFulfilled.apply(undefined, array).
		 * @param {function} onFulfilled function to receive spread arguments
		 * @return {Promise}
		 */
		spread: function(onFulfilled) {
			return this.then(function(array) {
				// array may contain promises, so resolve its contents.
				return map(array, identity).then(function(array) {
					return onFulfilled.apply(undef, array);
				});
			});
		}
	};

	/**
	 * Returns promiseOrValue if promiseOrValue is a {@link Promise}, a new Promise if
	 * promiseOrValue is a foreign promise, or a new, already-fulfilled {@link Promise}
	 * whose value is promiseOrValue if promiseOrValue is an immediate value.
	 *
	 * @param {*} promiseOrValue
	 * @returns Guaranteed to return a trusted Promise.  If promiseOrValue is a when.js {@link Promise}
	 *   returns promiseOrValue, otherwise, returns a new, already-resolved, when.js {@link Promise}
	 *   whose resolution value is:
	 *   * the resolution value of promiseOrValue if it's a foreign promise, or
	 *   * promiseOrValue if it's a value
	 */
	function coerce(promiseOrValue) {
		var promise;

		if(promiseOrValue instanceof Promise) {
			// It's a when.js promise, so we trust it
			promise = promiseOrValue;

		} else {
			// It's not a when.js promise. See if it's a foreign promise or a value.
			if(isPromise(promiseOrValue)) {
				// It's a thenable, but we don't know where it came from, so don't trust
				// its implementation entirely.  Introduce a trusted middleman when.js promise
				promise = new Promise(function(resolve) {
					// IMPORTANT: This is the only place when.js should ever call
					// .then() on an untrusted promise. Don't expose the return
					// value to the untrusted promise
					promiseOrValue.then(
						function(value)  { resolve(value); },
						function(reason) { resolve(reject(reason)); },
						function(update) { resolve.progress(update); }
					);
				});

			} else {
				// It's a value, not a promise.  Create a resolved promise for it.
				promise = fulfilled(promiseOrValue);
			}
		}

		return promise;
	}

	/**
	 * Returns a rejected promise for the supplied promiseOrValue.  The returned
	 * promise will be rejected with:
	 * - promiseOrValue, if it is a value, or
	 * - if promiseOrValue is a promise
	 *   - promiseOrValue's value after it is fulfilled
	 *   - promiseOrValue's reason after it is rejected
	 * @param {*} promiseOrValue the rejected value of the returned {@link Promise}
	 * @return {Promise} rejected {@link Promise}
	 */
	function reject(promiseOrValue) {
		return coerce(promiseOrValue).then(rejected);
	}

	/**
	 * Traditional map function, similar to `Array.prototype.map()`, but allows
	 * input to contain {@link Promise}s and/or values, and mapFunc may return
	 * either a value or a {@link Promise}
	 *
	 * @param {Array|Promise} promise array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function} mapFunc mapping function mapFunc(value) which may return
	 *      either a {@link Promise} or value
	 * @returns {Promise} a {@link Promise} that will resolve to an array containing
	 *      the mapped output values.
	 */
	function map(promise, mapFunc) {
		return coerce(promise).then(function(array) {

			return new Promise(mapArray);

			function mapArray(resolve) {
				var results, toResolve, len, resolver, i;

				// Since we know the resulting length, we can preallocate the results
				// array to avoid array expansions.
				toResolve = len = array.length >>> 0;

				results = [];

				if(!toResolve) {
					resolve(results);
				} else {
					resolver = function resolveOne(item, i) {
						coerce(item).then(mapFunc).then(function(mapped) {
							results[i] = mapped;

							if(!--toResolve) {
								resolve(results);
							}
						}, function(e) { resolve(reject(e)); });
					};

					// Since mapFunc may be async, get all invocations of it into flight
					for(i = 0; i < len; i++) {
						if(i in array) {
							resolver(array[i], i);
						} else {
							--toResolve;
						}
					}

				}

			}

		});
	}

	/**
	 * Determines if promiseOrValue is a promise or not.  Uses the feature
	 * test from http://wiki.commonjs.org/wiki/Promises/A to determine if
	 * promiseOrValue is a promise.
	 *
	 * @param {*} promiseOrValue anything
	 * @returns {boolean} true if promiseOrValue is a {@link Promise}
	 */
	function isPromise(promiseOrValue) {
		return promiseOrValue && typeof promiseOrValue.then === 'function';
	}

	/**
	 * Create an already-resolved promise for the supplied value
	 * @private
	 *
	 * @param {*} value
	 * @return {Promise} fulfilled promise
	 */
	function fulfilled(value) {
		var p = objectCreate(Promise.prototype);

		p.then = function(onFulfilled) {
			try {
				return coerce(typeof onFulfilled == 'function' ? onFulfilled(value) : value);
			} catch(e) {
				return reject(e);
			}
		};

		return p;
	}

	/**
	 * Create an already-rejected {@link Promise} with the supplied
	 * rejection reason.
	 * @private
	 *
	 * @param {*} reason
	 * @return {Promise} rejected promise
	 */
	function rejected(reason) {
		var p = objectCreate(Promise.prototype);

		p.then = function(_, onRejected) {
			try {
				return coerce(typeof onRejected == 'function' ? onRejected(reason) : rejected(reason));
			} catch(e) {
				return reject(e);
			}
		};

		return p;
	}

	//
	// Utility functions
	//

	/**
	 * Apply all functions in queue to value
	 * @param {Array} queue array of functions to execute
	 * @param {*} value argument passed to each function
	 */
	function processQueue(queue, value) {
		var handler, i = 0;

		while (handler = queue[i++]) {
			handler(value);
		}
	}

	function identity(x) {
		return x;
	}

	slice = [].slice;

	objectCreate = Object.create ||
		function(obj) {
			function F() {}
			F.prototype = obj;
			return new F();
		};

	return Promise;

});
}(typeof define == 'function' && define.amd
	? define
	: function (factory) { typeof exports === 'object'
		? (module.exports = factory())
		: (this.when_Promise = factory());
	}
	// Boilerplate for AMD, Node, and browser global
));