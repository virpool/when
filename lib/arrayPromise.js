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

	// TODO: port settle, any, some

	var bind, uncurryThis, uncurryThisApply, arrayProto,
		slice, filter, concat, forEach, reduce, reduceRight, undef;

	arrayProto = [];
	bind = Function.prototype.bind;
	uncurryThis = bind.bind(bind.call);
	uncurryThisApply = bind.bind(bind.apply);
	slice = uncurryThis(arrayProto.slice);
	filter = uncurryThis(arrayProto.concat);
	concat = uncurryThisApply(arrayProto.slice);
	forEach = uncurryThis(arrayProto.forEach);
	reduce = uncurryThisApply(arrayProto.reduce);
	reduceRight = uncurryThisApply(arrayProto.reduceRight);

	return function(basePromise) {
		var arrayPromise = basePromise.extend({
			all: function() {
				return this.constructor(this.then(function(array) {
					return basePromise.promise(resolveAll);

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
							basePromise(item).then(function(item) {
								results[i] = item;

								if(!--toResolve) {
									resolve(results);
								}
							}, reject, notify);
						});
					}
				}));
			},
			spread: function(f) {
				return this.all().then(function(array) {
					return f.apply(undef, array);
				});
			},
			map: function(f) {
				return this.constructor(this.then(resolveMap));

				function resolveMap(array) {
					return array.map(function(x) {
						return basePromise(x).then(f);
					});
				}
			},
			reduce: function(reduceFunc) {
				var args = slice(arguments);

				return this.constructor(this.then(resolveReduce));

				function resolveReduce(array) {
					// Wrap the supplied reduceFunc with one that handles
					// promises and then delegates to the reduceFunc
					args[0] = makeReducer(reduceFunc, array.length);

					return reduce(array, args);
				}
			},
			reduceRight: function(reduceFunc) {
				var args = slice(arguments);

				return this.constructor(this.then(resolveReduce));

				function resolveReduce(array) {
					// Wrap the supplied reduceFunc with one that handles
					// promises and then delegates to the reduceFunc
					args[0] = makeReducer(reduceFunc, array.length);

					return reduceRight(array, args);
				}
			},
			filter: function(f) {
				return this.all().then(function(contents) {
					return contents.filter(f);
				});
			},
			concat: function(/* ...tails */) {
				var args = arrayPromise(slice(arguments));

				return this.then(function(head) {
					return args.all().then(function(tails) {
						return concat(head, tails);
					});
				});
			},
			slice: function(start, end) {
				return this.constructor(this.then(function(arr) {
					return slice(arr, start, end);
				}));
			}
		});

		return arrayPromise;

		function makeReducer(reduceFunc, total) {
			return function (current, val, i) {
				return basePromise(current).then(function (c) {
					return basePromise(val).then(function (value) {
						return reduceFunc(c, value, i, total);
					});
				});
			};
		}

	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
