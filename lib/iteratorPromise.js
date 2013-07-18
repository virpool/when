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
			map: function(mapper) {
				return this.constructor(this.then(function(it) {
					return mapPromised(mapper, from(it));
				}));
			},
			reduce: function(reducer, initial) {
				return this.then(function(it) {
					return reducePromised(reducer, initial, from(it));
				});
			}
		});

		function mapPromised(mapper, i) {
			return map(function(x) {
				return basePromise(x).then(mapper);
			}, i);
		}

		function reducePromised(reducer, initial, i) {
			return reduce(function(result, x) {
				return basePromise(result).then(function(result) {
					return basePromise(x).then(function(x) {
						return reducer(result, x);
					});
				});
			}, initial, i);
		}
	};

	function from(it) {
		if(typeof it.iterator === 'function') {
			return it.iterator();
		} else if(typeof it.next === 'function') {
			return it;
		} else if(typeof it.length === 'number') {
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

	function reduce(reducer, initial, iterator) {
		var result, next;

		result = initial;

		while(true) {
			next = iterator.next();

			if(next.done) {
				return result;
			}

			result = reducer(result, next.value);
		}
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
