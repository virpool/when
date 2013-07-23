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
			 * Lazily maps the values in the iterator.
			 * @param (function} mapper
			 * @returns {promise} iteratorPromise containing mapped values
			 */
			map: function(mapper) {
				return this.constructor(this.then(function(it) {
					return map(it, mapper);
				}));
			},
			/**
			 * consumes all values in the iterator, and reduces them
			 * using the supplied reducer.  If the iterator is infinite,
			 * the returned promise will never fulfill, but may reject
			 * if it encounters an error.
			 * @param {function} reducer
			 * @param {*} initial starting value
			 * @returns {promise} promise for the eventual reduce result
			 */
			reduce: function(reducer, initial) {
				return this.then(function(it) {
					return reduceNext(reducer, it, initial, it.next());
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
		 * Reduce an iterator whose values might be promises
		 * @param {function} reducer
		 * @param {{next: function}} iterator
		 * @param {*} result
		 * @param {{done: boolean, value: *}} next
		 * @returns {promise};
		 */
		function reduceNext(reducer, iterator, result, next) {
			return basePromise(next).then(function(next) {
				if(next.done) {
					return result;
				}

				return basePromise(result).then(function(result) {
					return basePromise(next.value).then(function(x) {
						return reduceNext(reducer, iterator,
							reducer(result, x), iterator.next());
					});
				});
			});
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
