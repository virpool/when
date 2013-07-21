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
					return mapPromised(mapper, from(it));
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
					it = from(it);
					return reduceNext(reducer, it, initial, it.next());
				});
			}
		});

		/**
		 * Adapts a synchronous map function to handle promises
		 * @param {function} mapper
		 * @param {{next: function}} iterator
		 * @returns {promise}
		 */
		function mapPromised(mapper, iterator) {
			return map(function(x) {
				return basePromise(x).then(mapper);
			}, iterator);
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
			if(next.done) {
				return result;
			}

			return basePromise(result).then(function(result) {
				return basePromise(next.value).then(function(x) {
					return reduceNext(reducer, iterator,
						reducer(result, x), iterator.next());
				});
			});
		}
	};

	function from(it) {
		if(typeof it.iterator === 'function') {
			return it.iterator();
		}
		if(typeof it.next === 'function') {
			return it;
		}
		if(typeof it.length === 'number') {
			return arrayIterator(it);
		}

		return it;
	}

	function map(mapper, iterator) {
		return wrapIterator(function() {
			var next = iterator.next();

			return next.done
				? next
				: { done: false, value: mapper(next.value) };
		}, iterator);
	}

	function arrayIterator(array) {
		var len, i;

		len = array.length >>> 0;
		i = 0;

		return { next: next, send: next };

		function next() {
			return i < len
				? { done: false, value: array[i++]}
				: { done: true };
		}
	}

	function wrapIterator(next, source) {
		var send = typeof source.send === 'function'
			? source.send.bind(source)
			: next;

		return { send: send, next: next };
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
