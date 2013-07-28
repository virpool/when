/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function() {

	var iteratorDone, iteratorDoneError;

	iteratorDone = { done: true };
	iteratorDoneError = new Error('iterator finished');

	return {
		/**
		 * Lazily maps all values in the iterator.
		 * @param {function} mapper
		 * @returns {promise} iteratorPromise containing mapped values
		 */
		map: function(mapper) {
			var valueType = this.valueType;
			return this.then(function(iterator) {
				return map(valueType, mapper, iterator);
			});
		},
		/**
		 * Lazily filters all values in the iterator
		 * @param {function} condition
		 * @returns {promise} iteratorPromise containing only values
		 *  for which condition returns true
		 */
		filter: function(condition) {
			var valueType = this.valueType;
			return this.then(function(iterator) {
				return {
					next: function() {
						return filterNext(valueType, condition, iterator);
					}
				};
			});
		},

		/**
		 * @param {number} n number of items to take
		 * @returns {promise} iteratorPromise containing at most the
		 *  first n items
		 */
		take: function(n) {
			return this.takeWhile(function() {
				return (n -= 1) > 0;
			});
		},

		/**
		 * @param {function} condition
		 * @returns {promise} iteratorPromise containing all items
		 *  before the first item where condition(item) is truthy
		 */
		takeUntil: function(condition) {
			return this.takeWhile(function(x) {
				return !condition(x);
			});
		},

		/**
		 * @param {function} condition
		 * @returns {promise} iteratorPromise containing all items
		 *  before the first item where condition(item) is falsy
		 */
		takeWhile: function(condition) {
			var valueType = this.valueType;
			return this.then(function(iterator) {
				return takeIterator(valueType, condition, iterator);
			});
		},

		/**
		 * @param {number} n number of items to take
		 * @returns {promise} iteratorPromise containing all items
		 *  except the first n
		 */
		drop: function(n) {
			return this.dropWhile(function() {
				return (n -= 1) > 0;
			});
		},

		/**
		 * @param {function} condition
		 * @returns {promise} iteratorPromise containing all items
		 *  starting with (inclusive) the first item where
		 *  condition(item) is truthy
		 */
		dropUntil: function(condition) {
			var found;
			return this.filter(function(x) {
				return found || (found = condition(x));
			});
		},

		/**
		 * @param {function} condition
		 * @returns {promise} iteratorPromise containing all items
		 *  after the first item where condition(item) is falsy
		 */
		dropWhile: function(condition) {
			return this.dropUntil(function(x) {
				return !condition(x);
			});
		},

		/**
		 * Consumes all values in the iterator, and reduces them
		 * using the supplied reducer.  If the iterator is infinite,
		 * the returned promise will never fulfill, but may reject
		 * if it encounters an error.
		 * @param {function} reducer
		 * @param {*} initial starting value
		 * @returns {promise} promise for the eventual reduce result
		 */
		reduce: function(reducer, initial) {
			var valueType = this.valueType;
			// TODO: Allow passing in result promise type hint
			return this.then(function(iterator) {
				return reduceNext(valueType, reducer, initial, iterator);
			});
		},

		/**
		 * Consumes all values in the iterator, passing each to f for
		 * processing. Values are dispatched to f in iterator order, but
		 * f's return value is always ignored, and thus it cannot control
		 * parallelism.  This is intentional.
		 * To signal a failure, f must throw. If f returns a rejected
		 * promise, it will be ignored.
		 * To control parallelism, use when/guard to guard f.
		 * @param {function} f function to process each iterator value
		 * @returns {Promise} promise that fulfills with undefined once
		 * all iterations have been dispatched, or rejects with the
		 * associated reason if f fails
		 */
		forEach: function(f) {
			var valueType = this.valueType;
			// Intentionally throw away the result by yielding undefined
			return this.then(function(iterator) {
				return dispatchNext(valueType, f, iterator);
			}).yield();
		}
	};

	/**
	 * Create a new iterator containing transformed values formed by
	 * applying the mapper function to items from the input iterator
	 * @param {{next: function}} iterator
	 * @param {function} mapper
	 * @returns {{next: function}}
	 */
	function map(valueType, mapper, iterator) {
		return {
			next: function () {
				return valueType(iterator.next()).then(function (next) {
					return next.done ? next : {
						done: false,
						value: valueType(next.value).then(mapper)
					};
				});
			}
		};
	}

	/**
	 * Finds the next item in the iterator for which condition
	 *  returns truthy
	 * @param {function} condition
	 * @param {{next: function}}iterator
	 * @returns {promise} promise for next item in iterator for which
	 *  condition returns truthy
	 */
	function filterNext(valueType, condition, iterator) {
		return valueType(iterator.next()).then(function(next) {
			if(next.done) {
				return next;
			}

			return valueType(next.value).then(function(value) {
				if(condition(value)) {
					return next;
				}

				return filterNext(valueType, condition, iterator);
			});
		});
	}

	/**
	 * Reduce an iterator whose values might be promises
	 * @param {function} reducer
	 * @param {{next: function}} iterator
	 * @param {*} result
	 * @param {{done: boolean, value: *}} next
	 * @returns {promise};
	 */
	function reduceNext(valueType, reducer, result, iterator) {
		return valueType(iterator.next()).then(function(next) {
			if(next.done) {
				return result;
			}

			return valueType(result).then(function(result) {
				return valueType(next.value).then(function(x) {
					return reduceNext(valueType, reducer, reducer(result, x), iterator);
				});
			});
		});
	}

	function dispatchNext(valueType, f, iterator) {
		return valueType(iterator.next()).then(function(next) {
			if(!next.done) {
				return valueType(next.value).then(function(x) {
					// TODO: What if f returns a rejected promise?
					f(x);
					return dispatchNext(valueType, f, iterator);
				});
			}
		});
	}

	function takeIterator(createPromise, condition, iterator) {
		var done;

		return {
			next: function() {
				// Short circuit if we've previously signaled done
				if(done) {
					return createPromise.reject(iteratorDoneError);
				}
				return createPromise(iterator.next()).then(function(next) {
					if(next.done) {
						done = iteratorDone;
						return next;
					}

					return createPromise(next.value).then(function(value) {
						if(condition(value)) {
							return next;
						}

						return done = iteratorDone;
					});
				});
			}
		};
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
