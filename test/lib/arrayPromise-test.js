(function(buster, define) {

var assert, refute, fail, sentinel, slice;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = { name: 'sentinel' };

function assertFulfilled(s, value) {
	assert.equals(s.state, 'fulfilled');
	assert.same(s.value, value);
}

function assertRejected(s, reason) {
	assert.equals(s.state, 'rejected');
	assert.same(s.reason, reason);
}

function mapper(val) {
	return val * 2;
}

function plus(sum, val) {
	return sum + val;
}

slice = Array.prototype.slice;

define('when/lib/arrayPromise-test', function (require) {

	var when, delay;

	when = require('when');
	delay = require('when/delay');

	function deferredMapper(val) {
		return when(mapper(val));
	}

	buster.testCase('when/lib/arrayPromise', {
		all: {
			'should fulfill empty array with empty array': function() {
				return when.array([]).all()
					.then(function(result) {
						assert.equals(result, []);
					});
			},

			'should fulfill with array values': function() {
				var input = [1, 2, 3];
				return when.array(input).all()
					.then(function(result) {
						assert.equals(result, input);
					});
			},

			'should fulfill with sparse array': function() {
				var input = [, 1, , 2, , 3];
				return when.array(input).all()
					.then(function(result) {
						assert.equals(result, input);
					});
			},

			'should fulfill with promised array values': function() {
				var input = [when(1), when(2), 3];
				return when.array(input).all()
					.then(function(result) {
						assert.equals(result, [1, 2, 3]);
					});
			},

			'should reject if input contains a rejected promise': function() {
				var input = [when(1), when.reject(sentinel), 3];
				return when.array(input).all()
					.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
			},

			'should fulfill promise for array values': function() {
				var input = when([when(1), when(2), 3]);
				return when.array(input).all()
					.then(function(result) {
						assert.equals(result, [1, 2, 3]);
					});
			},

			'should reject if promise for array contains a rejected promise': function() {
				var input = when([when(1), when.reject(sentinel), 3]);
				return when.array(input).all()
					.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
			},

			'should reject if promise for array rejects': function() {
				var input = when.reject(sentinel);
				return when.array(input).all()
					.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
			},

			'should fulfill with empty array when input promise fulfills with non-array': function() {
				return when.array(1).all()
					.then(
						function(result) {
							assert.equals(result, []);
						}
					);
			}
		},

		settle: {
			'should settle empty input array': function() {
				return when.array([]).settle().then(function(settled) {
					assert.equals(settled, []);
				});
			},

			'should reject if input promise rejects': function() {
				return when.all(when.reject(sentinel)).settle().then(
					fail,
					function(reason) {
						assert.same(reason, sentinel);
					}
				);
			},

			'should settle values': function() {
				var array = [0, 1, sentinel];
				return when.array(array).settle().then(function(settled) {
					assertFulfilled(settled[0], 0);
					assertFulfilled(settled[1], 1);
					assertFulfilled(settled[2], sentinel);
				});
			},

			'should settle promises': function() {
				var array = [0, when.resolve(sentinel), when.reject(sentinel)];
				return when.array(array).settle().then(function(settled) {
					assertFulfilled(settled[0], 0);
					assertFulfilled(settled[1], sentinel);
					assertRejected(settled[2], sentinel);
				});

			},

			'returned promise should fulfill only after all inputs settle': function() {
				var array, p1, p2, resolve, reject;

				p1 = when.promise(function(r) { resolve = r; });
				p2 = when.promise(function(_, r) { reject = r; });

				array = [0, p1, p2];

				setTimeout(function() { resolve(sentinel); }, 0);
				setTimeout(function() { reject(sentinel); }, 0);

				return when.array(array).settle().then(function(settled) {
					assertFulfilled(settled[0], 0);
					assertFulfilled(settled[1], sentinel);
					assertRejected(settled[2], sentinel);
				});
			}
		},

		spread: {
			'should apply onFulfilled with array as argument list': function() {
				var expected = [1, 2, 3];
				return when.array(expected).spread(function() {
					assert.equals(slice.call(arguments), expected);
				});
			},

			'should resolve array contents': function() {
				var expected = [when.resolve(1), 2, when.resolve(3)];
				return when.array(expected).spread(function() {
					assert.equals(slice.call(arguments), [1, 2, 3]);
				});
			},

			'should reject if any item in array rejects': function() {
				var expected = [when.resolve(1), 2, when.reject(3)];
				return when.array(expected).spread(fail)
					.then(
						fail,
						function() {
							assert(true);
						}
				);
			},

			'when input is a promise': {
				'should apply onFulfilled with array as argument list': function() {
					var expected = [1, 2, 3];
					return when.array(when.resolve(expected)).spread(function() {
						assert.equals(slice.call(arguments), expected);
					});
				},

				'should resolve array contents': function() {
					var expected = [when.resolve(1), 2, when.resolve(3)];
					return when.array(when.resolve(expected)).spread(function() {
						assert.equals(slice.call(arguments), [1, 2, 3]);
					});
				},

				'should reject if input is a rejected promise': function() {
					var expected = when.reject([1, 2, 3]);
					return when.array(expected).spread(fail)
						.then(
							fail,
							function() {
								assert(true);
							}
					);
				}
			}
		},

		'map': {
			'should map input without resolving fully': function() {
				var input = [when(1), 2, when(3)];
				return when.array(input).map(mapper).then(
					function(results) {
						assert.isFunction(results[0].then);
						assert.isFunction(results[1].then);
						assert.isFunction(results[2].then);
					},
					fail
				);
			},

			'should map input values array': function() {
				var input = [1, 2, 3];
				return when.array(input).map(mapper).all().then(
					function(results) {
						assert.equals(results, [2,4,6]);
					},
					fail
				);
			},

			'should map input array': function() {
				var input = [1, when(2), 3];
				return when.array(input).map(mapper).all().then(
					function(results) {
						assert.equals(results, [2,4,6]);
					},
					fail
				);
			},

			'should map input when mapper returns a promise': function() {
				var input = [1,2,3];
				return when.array(input).map(deferredMapper).all().then(
					function(results) {
						assert.equals(results, [2,4,6]);
					},
					fail
				);
			},

			'should map input promises when mapper returns a promise': function() {
				var input = [when(1),when(2),when(3)];
				return when.array(input).map(mapper).all().then(
					function(results) {
						assert.equals(results, [2,4,6]);
					},
					fail
				);
			},

			'should accept a promise for an array': function() {
				return when.array(when([1, when(2), 3])).map(mapper).all().then(
					function(result) {
						assert.equals(result, [2,4,6]);
					},
					fail
				);
			},

			'should accept an array promise subtype': function() {
				return when.array(when.array([1, when(2), 3])).map(mapper).all().then(
					function(result) {
						assert.equals(result, [2,4,6]);
					},
					fail
				);
			},

			'should resolve to empty array when input promise does not resolve to an array': function() {
				return when.array(when(123)).map(mapper).then(
					function(result) {
						assert.equals(result, []);
					},
					fail
				);
			},

			'should reject when input contains rejection': function() {
				var input = [when(1), when.reject(2), 3];
				return when.array(input).map(mapper).all().then(
					fail,
					function(result) {
						assert.equals(result, 2);
					}
				);
			},

			'should reject when input is rejected': function() {
				return when.array(when.reject(sentinel)).map(mapper).all().then(
					fail,
					function(e) {
						assert.same(e, sentinel);
					}
				);
			},

			'//should propagate progress': function() {
				var input = [1, 2, 3];

				return when.array(input).map(function(x) {
					var d = when.defer();
					d.notify(x);
					setTimeout(d.resolve.bind(d, x), 0);
					return d.promise;
				}).then(null, null,
					function(update) {
						assert.equals(update, input.shift());
					}
				);
			}
		},

		reduce: {
			'should reduce values without initial value': function() {
				return when.array([1,when(2),3]).reduce(plus).then(
					function(result) {
						assert.equals(result, 6);
					},
					fail
				);
			},

			'should reduce values with initial value': function() {
				return when.array([1,when(2),3]).reduce(plus, 1).then(
					function(result) {
						assert.equals(result, 7);
					},
					fail
				);
			},

			'should reduce values with initial promise': function() {
				return when.array([1,when(2),3]).reduce(plus, when(1)).then(
					function(result) {
						assert.equals(result, 7);
					},
					fail
				);
			},

			'should reduce empty input with initial value': function() {
				return when.array([]).reduce(plus, 1).then(
					function(result) {
						assert.equals(result, 1);
					},
					fail
				);
			},

			'should reduce empty input with initial promise': function() {
				return when.array([]).reduce(plus, when(1)).then(
					function(result) {
						assert.equals(result, 1);
					},
					fail
				);
			},

			'should allow sparse array input without initial': function() {
				return when.array([ , , 1, , 1, 1]).reduce(plus).then(
					function(result) {
						assert.equals(result, 3);
					},
					fail
				);
			},

			'should allow sparse array input with initial': function() {
				return when.array([ , , 1, , 1, 1]).reduce(plus, 1).then(
					function(result) {
						assert.equals(result, 4);
					},
					fail
				);
			},

			'should reduce from left to right': function() {
				return when.array([when(1), 2, when(3)]).reduce(plus, '').then(
					function(result) {
						assert.equals(result, '123');
					},
					fail
				);
			},

			'should accept a promise for an array': function() {
				return when.array(when([1, 2, 3])).reduce(plus, 0).then(
					function(result) {
						assert.equals(result, 6);
					},
					fail
				);
			},

			'should resolve to initialValue when input promise does not resolve to an array': function() {
				return when.array(when(123)).reduce(plus, sentinel).then(
					function(result) {
						assert.equals(result, sentinel);
					},
					fail
				);
			},

			'should provide correct basis value': function() {
				function insertIntoArray(arr, val, i) {
					arr[i] = val;
					return arr;
				}

				return when.array([when(1), 2, when(3)])
					.reduce(insertIntoArray, []).then(
						function(result) {
							assert.equals(result, [1,2,3]);
						},
						fail
					);
			},

			'should reject when input contains rejection': function() {
				var input = [1, when.reject(2), when(3)];
				return when.array(input).reduce(plus, when(1)).then(
					fail,
					function(result) {
						assert.equals(result, 2);
					}
				);
			},

			'should reject if input is a rejected promise': function() {
				return when.array(when.reject([1,2,3])).reduce(plus).then(
					fail,
					assert.defined
				);
			},

			'should reject with TypeError when input is empty and no initial value provided': function() {
				return when.array([]).reduce(plus).then(
					fail,
					function(e) {
						assert(e instanceof TypeError);
					}
				);
			}
		},

		reduceRight: {
			'should reduce values without initial value': function() {
				return when.array([1,when(2),3]).reduceRight(plus).then(
					function(result) {
						assert.equals(result, 6);
					},
					fail
				);
			},

			'should reduce values with initial value': function() {
				return when.array([1,when(2),3]).reduceRight(plus, 1).then(
					function(result) {
						assert.equals(result, 7);
					},
					fail
				);
			},

			'should reduce values with initial promise': function() {
				return when.array([1,when(2),3]).reduceRight(plus, when(1)).then(
					function(result) {
						assert.equals(result, 7);
					},
					fail
				);
			},

			'should reduce empty input with initial value': function() {
				return when.array([]).reduceRight(plus, 1).then(
					function(result) {
						assert.equals(result, 1);
					},
					fail
				);
			},

			'should reduce empty input with initial promise': function() {
				return when.array([]).reduceRight(plus, when(1)).then(
					function(result) {
						assert.equals(result, 1);
					},
					fail
				);
			},

			'should allow sparse array input without initial': function() {
				return when.array([ , , 1, , 1, 1]).reduceRight(plus).then(
					function(result) {
						assert.equals(result, 3);
					},
					fail
				);
			},

			'should allow sparse array input with initial': function() {
				return when.array([ , , 1, , 1, 1]).reduceRight(plus, 1).then(
					function(result) {
						assert.equals(result, 4);
					},
					fail
				);
			},

			'should reduce from right to left': function() {
				return when.array([when(1), 2, when(3)]).reduceRight(plus, '').then(
					function(result) {
						assert.equals(result, '321');
					},
					fail
				);
			},

			'should accept a promise for an array': function() {
				return when.array(when([1, 2, 3])).reduceRight(plus, 0).then(
					function(result) {
						assert.equals(result, 6);
					},
					fail
				);
			},

			'should resolve to initialValue when input promise does not resolve to an array': function() {
				return when.array(when(123)).reduceRight(plus, sentinel).then(
					function(result) {
						assert.equals(result, sentinel);
					},
					fail
				);
			},

			'should provide correct basis value': function() {
				function insertIntoArray(arr, val, i) {
					arr[i] = val;
					return arr;
				}

				return when.array([when(1), 2, when(3)])
					.reduceRight(insertIntoArray, []).then(
					function(result) {
						assert.equals(result, [1,2,3]);
					},
					fail
				);
			},

			'should reject when input contains rejection': function() {
				var input = [1, when.reject(2), when(3)];
				return when.array(input).reduceRight(plus, when(1)).then(
					fail,
					function(result) {
						assert.equals(result, 2);
					}
				);
			},

			'should reject if input is a rejected promise': function() {
				return when.array(when.reject(sentinel)).reduceRight(plus).then(
					fail,
					function(e) {
						assert.same(e, sentinel);
					}
				);
			},

			'should reject with TypeError when input is empty and no initial value provided': function() {
				return when.array([]).reduceRight(plus).then(
					fail,
					function(e) {
						assert(e instanceof TypeError);
					}
				);
			}

		},

		'filter': {
			'should filter items': function() {
				function odd(x) { return x % 2; }

				return when.array([1, 2, 3, 4]).filter(odd).all().then(function(array) {
					assert.equals(array, [1, 3]);
				});
			},

			'should filter promises': function() {
				function odd(x) { return x % 2; }

				var array = [1, 2, 3, 4].map(when);

				return when.array(array).filter(odd).all().then(function(array) {
					assert.equals(array, [1, 3]);
				});
			},

			'should reject if array contains rejections': function() {
				return when.array([1, when.reject(sentinel), 3]).filter(function(){})
					.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
			},

			'should reject if input is a rejected promise': function() {
				return when.array(when.reject(sentinel)).filter(function(){})
					.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
			},

			'should reject if filter function throws': function() {
				return when.array([1, 2, 3]).filter(function() { throw sentinel; })
					.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
			}
		},

		'concat': {
			'should append array': function() {
				return when.array([1, when(2), 3])
					.concat([4, when(5), 6])
					.all()
					.then(function(array) {
						assert.equals(array, [1,2,3,4,5,6]);
					});
			},

			'should append multiple arrays': function() {
				return when.array([1, when(2), 3])
					.concat([4], [when(5),6])
					.all()
					.then(function(array) {
						assert.equals(array, [1,2,3,4,5,6]);
					});
			},

			'should append array promise': function() {
				return when.array([1, when(2), 3])
					.concat(when.array([4, when(5), 6]))
					.all()
					.then(function(array) {
						assert.equals(array, [1,2,3,4,5,6]);
					});
			},

			'should append multiple array promises': function() {
				return when.array([1, when(2), 3])
					.concat(when.array([4]), when.array([when(5),6]))
					.all()
					.then(function(array) {
						assert.equals(array, [1,2,3,4,5,6]);
					});
			},

			'should append elements': function() {
				return when.array([1, when(2), 3])
					.concat(4, when(5), [6], when([7]), when.array([8]))
					.all()
					.then(function(array) {
						assert.equals(array, [1,2,3,4,5,6,7,8]);
					});
			},

			'should not wait for element promises': function() {
				return when.array([1, when(2), when.reject(3)])
					.concat([4, when(5), when.reject(6)])
					.then(function(array) {
						assert.isNumber(array[0]);
						assert.isFunction(array[1].then);
						assert.isFunction(array[2].then);
						assert.isNumber(array[3]);
						assert.isFunction(array[4].then);
						assert.isFunction(array[5].then);
					});

			},

			'should not wait for element promises of promised arrays': function() {
				return when.array([1, when(2), when.reject(3)])
					.concat(when([4, when(5), when.reject(6)]))
					.then(function(array) {
						assert.isNumber(array[0]);
						assert.isFunction(array[1].then);
						assert.isFunction(array[2].then);
						assert.isNumber(array[3]);
						assert.isFunction(array[4].then);
						assert.isFunction(array[5].then);
					});
			},

			'should reject if input is a rejection': function() {
				return when.array(when.reject(sentinel)).concat([1, 2, 3])
					.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
			},

			'should reject if appended item is a rejection': function() {
				return when.array([]).concat([1,2,3], when.reject(sentinel))
					.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
			}
		},

		'slice': {
			'should create sub-array': function() {
				var input = [1,2,3,4];
				return when.array(input).slice(1, 2).then(function(array) {
					assert.equals(array, input.slice(1, 2));
				});
			},

			'should create tail when passed a single arg': function() {
				var input = [1,2,3,4];
				return when.array(input).slice(1).then(function(array) {
					assert.equals(array, input.slice(1));
				});
			},

			'should create copy when passed no args': function() {
				var input = [1,2,3,4];
				return when.array(input).slice().then(function(array) {
					assert.equals(array, input);
					refute.same(array, input);
				});
			},

			'should allow negative start': function() {
				var input = [1,2,3,4];
				return when.array(input).slice(-1).then(function(array) {
					assert.equals(array, input.slice(-1));
				});
			},

			'should allow negative end': function() {
				var input = [1,2,3,4];
				return when.array(input).slice(0, -1).then(function(array) {
					assert.equals(array, input.slice(0, -1));
				});
			},

			'should allow negative start and end': function() {
				var input = [1,2,3,4];
				return when.array(input).slice(-2, -1).then(function(array) {
					assert.equals(array, input.slice(-2, -1));
				});
			},

			'should allow start/end beyond array bounds': function() {
				var input = [1,2,3,4];
				return when.array(input).slice(0, 10).then(function(array) {
					assert.equals(array, input.slice(0, 10));
				});
			},

			'should not wait for element promises': function() {
				return when.array([1, when(2), when.reject(3)])
					.slice()
					.then(function(array) {
						assert.isNumber(array[0]);
						assert.isFunction(array[1].then);
						assert.isFunction(array[2].then);
					});

			},

			'should reject if input is a rejection': function() {
				return when.array(when.reject(sentinel)).concat([1, 2, 3])
					.then(
					fail,
					function(e) {
						assert.same(e, sentinel);
					}
				);
			}
		},

		'forEach': {
			'should fulfill with undefined': function() {
				return when.array([1,2,3]).forEach(function(x) {
					return x;
				}).then(function(result) {
					refute.defined(result);
				});
			},

			'should ignore returned rejections': function() {
				return when.array([1,2,3]).forEach(function() {
					return when.reject();
				}).then(function(result) {
					refute.defined(result);
				});
			},

			'should reject if lambda throws': function() {
				return when.array([1,2,3]).forEach(function() {
					throw sentinel;
				}).then(
					fail,
					function(e) {
						assert.same(e, sentinel);
					}
				);
			},

			'should reject if input contains rejections': function() {
				return when.array([1,2,when.reject(sentinel)]).forEach(function(x) {
					return x;
				}).then(
					fail,
					function(e) {
						assert.same(e, sentinel);
					}
				);
			},

			'should visit all items': function() {
				var input, result;

				input = [1,2,3];
				result = [];

				return when.array(input).forEach(function(x) {
					result.push(x);
				}).then(function() {
					assert.equals(result, input);
				});
			}
		}
	});

});

}(
	this.buster || require('buster'),
	typeof define === 'function' && define.amd ? define : function (id, factory) {
		var packageName = id.split(/[\/\-\.]/)[0], pathToRoot = id.replace(/[^\/]+/g, '..');
		pathToRoot = pathToRoot.length > 2 ? pathToRoot.substr(3) : pathToRoot;
		factory(function (moduleId) {
			return require(moduleId.indexOf(packageName) === 0 ? pathToRoot + moduleId.substr(packageName.length) : moduleId);
		});
	}
	// Boilerplate for AMD and Node
));
