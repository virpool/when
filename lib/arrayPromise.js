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

	// TODO: port any, some. Consider: join

	var bind, uncurryThis, uncurryThisApply, arrayProto,
		slice, filter, concat, forEach, map, reduce, reduceRight, undef;

	arrayProto = [];
	bind = Function.prototype.bind;
	uncurryThis = bind.bind(bind.call);
	uncurryThisApply = bind.bind(bind.apply);
	slice = uncurryThis(arrayProto.slice);
	map = uncurryThis(arrayProto.map);
	filter = uncurryThis(arrayProto.filter);
	concat = uncurryThisApply(arrayProto.concat);
	forEach = uncurryThis(arrayProto.forEach);
	reduce = uncurryThisApply(arrayProto.reduce);
	reduceRight = uncurryThisApply(arrayProto.reduceRight);

	/**
	 * promise<array>
	 */
	return {
		/**
		 * Returns a promise that will fulfill only after all items in the
		 * array have fulfilled.  The fulfillment value will be an Array
		 * of non-promises.  If any item rejects, the returned promise will
		 * be rejected with that rejection reason.
		 * @returns {promise<array>}
		 */
		all: function() {
			var valueType = this.valueType;
			return this.then(function(array) {
				return valueType.promise(resolveAll);

				function resolveAll(resolve, reject, notify) {
					var results, toResolve;

					results = [];
					if(!(array.length >>> 0)) {
						resolve(results);
						return;
					}

					toResolve = 0;

					forEach(array, function resolveOne(item, i) {
						toResolve++;
						valueType(item).then(function(item) {
							results[i] = item;

							if(!--toResolve) {
								resolve(results);
							}
						}, reject, notify);
					});
				}
			});
		},

		/**
		 * Returns a promise that will fulfill with an array of status
		 * objects describing the outcome of each item in the array.  The
		 * returned promise will only reject if this array promise was
		 * created from a rejected promise for an array.  That is:
		 *
		 * var p = when.array(rejectedPromiseForArray).settle();
		 *
		 * p will be a rejected promise.
		 *
		 * @returns {promise<array>}
		 */
		settle: function() {
			var valueType = this.valueType;

			return this.then(resolveSettle).all();

			function resolveSettle(array) {
				return array.map(function(x) {
					return valueType(x).then(
						valueType.toFulfilledState,
						valueType.toRejectedState
					);
				});
			}
		},

		/**
		 * Arranges for the onFulfilled to be called with the array as its argument list
		 * i.e. onFulfilled.apply(undefined, array).
		 * @param {function} f function to receive argument list
		 * @return {promise} a promise for the result of calling f
		 */
		spread: function(f) {
			return this.all().then(function(array) {
				return f.apply(undef, array);
			});
		},

		/**
		 * Transform each item in the array, like Array.prototype.map
		 * @param {function} f mapping function to apply to each item
		 * @returns {promise<array>} arrayPromise for a new array whose contents are the
		 *  result of apply f to each item
		 */
		map: function(f) {
			var valueType = this.valueType;

			return this.then(resolveMap);

			function resolveMap(array) {
				return map(array, function(x) {
					return valueType(x).then(f);
				});
			}
		},

		/**
		 * Reduce the eventual array, like Array.prototype.reduce
		 * @param {function} reduceFunc reducing function
		 * @returns {promise} promise for the reduced value
		 */
		reduce: function(reduceFunc /*, initialValue */) {
			var valueType, args;

			valueType = this.valueType;
			args = slice(arguments);

			return this.then(resolveReduce);

			// TODO: Allow passing in result promise type hint
			// rather than relying on valueType here
			function resolveReduce(array) {
				args[0] = makeReducer(reduceFunc, array.length, valueType);
				return reduce(array, args);
			}
		},

		/**
		 * Reduce the eventual array from the right, like
		 * Array.prototype.reduceRight
		 * @param {function} reduceFunc reducing function
		 * @returns {promise} promise for the reduced value
		 */
		reduceRight: function(reduceFunc /*, initialValue */) {
			var valueType, args;

			valueType = this.valueType;
			args = slice(arguments);

			return this.then(resolveReduce);

			// TODO: Allow passing in result promise type hint
			// rather than relying on valueType here
			function resolveReduce(array) {
				args[0] = makeReducer(reduceFunc, array.length, valueType);
				return reduceRight(array, args);
			}
		},

		/**
		 * Filter the eventual array to a new array containing only items
		 * that match the supplied predicate, like Array.prototype.filter
		 * @param {function} predicate
		 * @returns {promise<Array>} promise for the filtered array
		 */
		filter: function(predicate) {
			return this.all().then(function(contents) {
				return contents.filter(predicate);
			});
		},

		/**
		 * Append another array (or arrays) to the tail of this array, like
		 * Array.prototype.concat
		 * @returns {promise<array>} promise for the concatenated array
		 */
		concat: function(/* ...tails */) {
			var args = this.ownType(arguments);

			return this.then(function(head) {
				return args.all().then(function(tails) {
					return concat(head, tails);
				});
			});
		},

		/**
		 * Slice a range from the array, like Array.prototype.slice
		 * @param {number} start
		 * @param {number?} end
		 * @returns {promise<array>} promise for the sub-array
		 */
		slice: function(start, end) {
			return this.then(function(arr) {
				return slice(arr, start, end);
			});
		},

		/**
		 * Consume each item in the array and process it, like Array.prototype.forEach.
		 * The returned promise will fulfill with `undefined` if each item in
		 * the array fulfills and is processed successfully by the provided callback.
		 * It will reject if any item in the array rejects, or if the callback
		 * throws.
		 * NOTE: The return value of f *is always ignored*, including if f returns
		 * a rejected promise.
		 * @param {function} f function to consume and process each item
		 * @returns {promise} a promise that fulfills with `undefined`, or
		 *  rejects if any item in the array is a rejection, or if f throws.
		 */
		forEach: function(f) {
			return this.all().then(function(array) {
				array.forEach(f);
			});
		}
	};

	/**
	 * Make a promise-aware reduce function from a synchronous one.
	 * @param {function} reduceFunc synchronous reduce function
	 * @param {number} total number of items being reduced
	 * @param {function} resultType promise type constructor for the reduce result type.
	 * @returns {function} promise-aware reduce function
	 */
	function makeReducer(reduceFunc, total, resultType) {
		return function (current, val, i) {
			return resultType(current).then(function (c) {
				return resultType(val).then(function (value) {
					return reduceFunc(c, value, i, total);
				});
			});
		};
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
