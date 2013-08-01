(function(buster, define) {

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = { name: 'sentinel' };

function testScheduler(t) {
	setTimeout(t, 0);
}

define('when/lib/makeCore-test', function (require) {

	var makeCore;

	makeCore = require('when/lib/makeCore');

	buster.testCase('when/lib/makeCore', {
		'should have core API': function() {
			var core = makeCore({ scheduler: testScheduler });

			assert.isFunction(core);
			assert.isFunction(core.reject);
			assert.isFunction(core.extend);

			assert.isFunction(core.toPendingState);
			assert.isFunction(core.toFulfilledState);
			assert.isFunction(core.toRejectedState);
		},

		promises: {
			'should have then': function() {
				var core = makeCore({ scheduler: testScheduler });

				assert.isFunction(core(sentinel).then);
			},

			'should have ownType': function() {
				var core = makeCore({ scheduler: testScheduler });

				assert.isFunction(core(sentinel).ownType);
			},

			'should have valueType': function() {
				var core = makeCore({ scheduler: testScheduler });

				assert.isFunction(core(sentinel).valueType);
			}
		},

		extend: {
			'should create extended promise API': function() {
				var extended;

				extended = makeCore({ scheduler: testScheduler }).extend({
					addedMethod: function() {}
				});

				assert.isFunction(extended(sentinel).addedMethod);
				assert.isFunction(extended(sentinel).then);
			},

			'should inherit API': function() {
				var extended;

				extended = makeCore({ scheduler: testScheduler })
					.extend({ addedMethod1: function() {} })
					.extend({ addedMethod2: function() {} });

				assert.isFunction(extended(sentinel).addedMethod1);
				assert.isFunction(extended(sentinel).addedMethod2);
			},

			'should share scheduler': function() {
				var scheduler, core, extended;

				scheduler = this.spy(testScheduler);

				core = makeCore({ scheduler: scheduler });
				extended = core.extend();

				return extended(sentinel).then(function() {
					assert.called(scheduler);
				});
			}
		},

		scheduler: {
			'should be required': function() {
				assert.exception(makeCore);
			},

			'should use supplied scheduler': function() {
				var scheduler, core;

				scheduler = this.spy(testScheduler);

				core = makeCore({ scheduler: scheduler });

				return core(sentinel).then(function() {
					assert.called(scheduler);
				});
			},

			'should allow synchronous scheduler': function() {
				var scheduler, core, x;

				scheduler = this.spy(function(t) { t(); });

				core = makeCore({ scheduler: scheduler });

				core(sentinel).then(function() {
					assert.called(scheduler);
					refute.defined(x);
				});

				x = sentinel;
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
