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

	return function(basePromise) {
		return basePromise.extend({
			/**
			 * Lazily maps all values in the iterator.
			 * @param {function} mapper
			 * @returns {promise} iteratorPromise containing mapped values
			 */
			map: function(mapper) {
				return this.constructor(this.then(function(it) {
					return map(it, mapper);
				}));
			},
			/**
			 * Lazily filters all values in the iterator
			 * @param {function} condition
			 * @returns {promise} iteratorPromise containing only values
			 *  for which condition returns true
			 */
			filter: function(condition) {
				return this.constructor(this.then(function(it) {
					return {
						next: function() {
							return filterNext(condition, it);
						}
					};
				}));
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
				// TODO: Allow passing in result promise type hint
				return this.then(function(iterator) {
					return reduceNext(reducer, initial, iterator);
				});
			}
		});

		/**
		 * Create a new iterator containing transformed values formed by
		 * applying the mapper function to items from the input iterator
		 * @param {{next: function}} iterator
		 * @param {function} mapper
		 * @returns {{next: function}}
		 */
		function map(iterator, mapper) {
			return {
				next: function () {
					return basePromise(iterator.next()).then(function (next) {
						return next.done ? next : {
							done: false,
							value: basePromise(next.value).then(mapper)
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
		function filterNext(condition, iterator) {
			return basePromise(iterator.next()).then(function(next) {
				if(next.done) {
					return next;
				}

				return basePromise(next.value).then(function(value) {
					if(condition(value)) {
						return next;
					}

					return filterNext(condition, iterator);
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
		function reduceNext(reducer, result, iterator) {
			return basePromise(iterator.next()).then(function(next) {
				if(next.done) {
					return result;
				}

				return basePromise(result).then(function(result) {
					return basePromise(next.value).then(function(x) {
						return reduceNext(reducer, reducer(result, x), iterator);
					});
				});
			});
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
