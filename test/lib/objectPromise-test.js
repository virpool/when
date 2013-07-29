(function(buster, define) {

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = { name: 'sentinel' };

define('when/lib/objectPromise-test', function (require) {

	var when;

	when = require('when');

	buster.testCase('when/lib/objectPromise', {
		get: {
			'should fulfill property value': function() {
				return when.object({ value: sentinel })
					.get('value')
					.then(function(value) {
						assert.same(value, sentinel);
					});
			},

			'should fulfill with undefined for missing property': function() {
				return when.object({})
					.get('value')
					.then(function(value) {
						refute.defined(value);
					});
			},

			'should reject if property is a rejected promise': function() {
				return when.object({ value: when.reject(sentinel) })
					.get('value')
					.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
				);
			}
		},

		set: {
			'should set property value': function() {
				return when.object({})
					.set('value', sentinel)
					.then(function(object) {
						assert.same(object.value, sentinel);
					});
			},

			'should fulfill with target object': function() {
				var object = {};
				return when.object(object)
					.set('value', sentinel)
					.then(function(result) {
						assert.same(result, object);
					});

			}
		},

		'delete': {
			'should delete property': function() {
				return when.object({ value: sentinel })
					.delete('value')
					.then(function(object) {
						refute('value' in object);
					});

			},

			'should fulfill with target object': function() {
				return when.object(sentinel)
					.delete('value')
					.then(function(object) {
						assert.same(object, sentinel);
					});
			}
		},

		invoke: {
			'should invoke target method': function() {
				var spy = this.spy();
				return when.object({ method: spy })
					.invoke('method')
					.then(function() {
						assert.calledOnce(spy);
					});
			},

			'should pass arguments to target method': function() {
				var spy = this.spy();
				return when.object({ method: spy })
					.invoke('method', sentinel, 123)
					.then(function() {
						assert.calledOnceWith(spy, sentinel, 123);
					});
			},

			'should fulfill with target method result': function() {
				var stub = this.stub().returns(sentinel);
				return when.object({ method: stub })
					.invoke('method', 123, 'abc')
					.then(function(result) {
						assert.same(result, sentinel);
					});
			},

			'should reject': {
				'with thrown exception if target method throws': function() {
					var stub = this.stub().throws(sentinel);
					return when.object({ method: stub })
						.invoke('method')
						.then(
							fail,
							function(e) {
								assert.same(e, sentinel);
							}
						);
				},

				'with reason if target method returns a rejection': function() {
					var stub = this.stub().returns(when.reject(sentinel));
					return when.object({ method: stub })
						.invoke('method')
						.then(
						fail,
						function(e) {
							assert.same(e, sentinel);
						}
					);
				},

				'with thrown exception if method doesn\'t exist': function() {
					return when.object({})
						.invoke('nonExistentMethod')
						.then(
						fail,
						function(e) {
							assert.defined(e);
						}
					);
				},

				'with thrown exception if method isn\'t callable': function() {
					return when.object({ notCallable: 123 })
						.invoke('notCallable')
						.then(
						fail,
						function(e) {
							assert.defined(e);
						}
					);
				}

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
