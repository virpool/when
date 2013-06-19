/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */
(function(define) {
define(function(require) {

	var array, hasStackTraces, generateStackTrace;

	array = require('./array');

	(function() {
		var ANON, fnRE, maxStackSize;

		ANON = '{anonymous}';
		fnRE = /function\s*([\w\-$]+)?\s*\(/i;
		maxStackSize = 10;

		try {
			throw new Error();
		} catch (e) {
			hasStackTraces = !!e.stack;

			if(hasStackTraces) {
				generateStackTrace = function(reason) {
					try {
						throw new Error(reason && reason.message || reason);
					} catch (e) {
						return e;
					}
				};
			} else {
				// arguments.caller-based stack synthesis derived
				// from http://stacktracejs.com
				generateStackTrace = function(reason) {
					/*jshint noarg:false*/
					var curr, stack, fn, args;

					curr = arguments.callee.caller;
					stack = [];

					while (curr && stack.length < maxStackSize) {
						fn = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
						args = normalizeArgs(curr['arguments']);
						stack.push(fn + '(' + args.join(', ') + ')');
						curr = curr.caller;
					}
					return { stack: stack, message: reason && reason.message || reason };
				};

				function normalizeArgs(args) {
					if(!args) {
						return [];
					}

					var result, i, len, x;
					result = [];
					for(i = 0, len = args.length; i < len; i++) {
						x = args[i];
						if(typeof x === 'function') {
							result.push((x.name ? x.name : ANON) + '(...)');
						} else {
							try {
								result.push(JSON.stringify(x));
							} catch(e) {
								result.push(x);
							}
						}
					}

					return result;
				}
			}
		}
	}());

	return function createAggregator(reporter) {
		var promises;

		reset();

		return publish({ publish: publish });

		function promisePending(promise, parent) {
			var stackHolder, rec;

			stackHolder = generateStackTrace();

			rec = {
				promise: promise,
				timestamp: +(new Date()),
				createdAt: stackHolder
			};

			array.some(promises, function(p) {
				if(p.promise === parent) {
					rec.parent = p;
					return true;
				}
			});

			promises.push(rec);
		}

		function promiseFulfilled(promise) {
			removeFromList(promises, promise);
			report();
		}

		function unhandledRejection(promise, reason) {
			var stackHolder;

			stackHolder = generateStackTrace(reason);

			array.some(promises, function(rec) {
				if(promise === rec.promise) {
					rec.reason = reason;
					rec.rejectedAt = stackHolder;
					return true;
				}
			});

			report();
		}

		function promiseObserved(promise) {
			removeFromList(promises, promise);
		}

		function report() {
			return reporter(promises);
		}

		function reset() {
			promises = [];
		}

		function publish(target) {
			target.reportUnhandled = report;
			target.resetUnhandled = reset;
			target.promiseObserved = promiseObserved;
			target.promisePending = promisePending;
			target.promiseFulfilled = promiseFulfilled;
			target.unhandledRejection = unhandledRejection;
			return target;
		}
	};

	function removeFromList(list, promise) {
		array.some(list, function(rec, i) {
			if(rec.promise === promise) {
				list.splice(i, 1);
				return true;
			}
		});
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
