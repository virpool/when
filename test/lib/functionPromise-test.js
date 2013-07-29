(function(buster, define) {

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = { name: 'sentinel' };

define('when/lib/functionPromise-test', function (require) {

	var when;

	when = require('when');

	buster.testCase('when/lib/functionPromise', {
		call: {
			'should call function with thisArg': function() {
				return when.function(spy)
					.call(sentinel)
					.then(function(result) {
						assert.same(result, sentinel);
					});

				function spy() {
					return this;
				}
			},

			'should pass arguments to function': function() {
				var spy = this.spy();
				return when.function(spy)
					.call(void 0, sentinel, 123)
					.then(function() {
						assert.calledOnceWith(spy, sentinel, 123);
					});
			},

			'should fulfill with function return value': function() {
				var stub = this.stub().returns(sentinel);
				return when.function(stub)
					.call(void 0, 123, 'abc')
					.then(function(result) {
						assert.same(result, sentinel);
					});
			},

			'should reject': {
				'with thrown exception if function throws': function() {
					var stub = this.stub().throws(sentinel);
					return when.function(stub)
						.call(void 0)
						.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
				},

				'with reason if function returns a rejection': function() {
					var stub = this.stub().returns(when.reject(sentinel));
					return when.function(stub)
						.call(void 0)
						.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
				},

				'with thrown exception if function isn\'t callable': function() {
					return when.function({})
						.call(void 0)
						.then(fail, assert.defined);
				}

			}

		},

		apply: {
			'should call function with thisArg': function() {
				return when.function(spy)
					.apply(sentinel)
					.then(function(result) {
						assert.same(result, sentinel);
					});

				function spy() {
					return this;
				}
			},

			'should pass arguments to function': function() {
				var spy = this.spy();
				return when.function(spy)
					.apply(void 0, [sentinel, 123])
					.then(function() {
						assert.calledOnceWith(spy, sentinel, 123);
					});
			},

			'should fulfill with function return value': function() {
				var stub = this.stub().returns(sentinel);
				return when.function(stub)
					.apply(void 0, [123, 'abc'])
					.then(function(result) {
						assert.same(result, sentinel);
					});
			},

			'should reject': {
				'with thrown exception if function throws': function() {
					var stub = this.stub().throws(sentinel);
					return when.function(stub)
						.apply(void 0)
						.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
				},

				'with reason if function returns a rejection': function() {
					var stub = this.stub().returns(when.reject(sentinel));
					return when.function(stub)
						.apply(void 0)
						.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
				},

				'with thrown exception if function isn\'t callable': function() {
					return when.function({})
						.apply(void 0)
						.then(fail, assert.defined);
				}

			}

		},

		'bind': {
			'should fulfill with bound function': function() {
				return when.function(spy)
					.bind(sentinel)
					.then(function(bound) {
						assert.same(bound(), sentinel);
					});

				function spy() {
					return this;
				}
			},

			'should bind args': function() {
				var spy = this.spy();

				return when.function(spyWrapper)
					.bind(void 0, sentinel, 123)
					.then(function(bound) {
						bound();
						assert.calledOnceWith(spy, sentinel, 123);
					});

				function spyWrapper() {
					return spy.apply(void 0, arguments);
				}
			},

			'should reject if attempting to bind throws an exception': function() {
				return when.function({})
					.bind(void 0)
					.then(fail, assert.defined);
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
