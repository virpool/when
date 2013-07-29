(function(buster, define) {

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = { name: 'sentinel' };

define('when/lib/timer-test', function (require) {

	var timer = require('when/lib/timer');

	buster.testCase('when/lib/timer', {
		'should schedule task for reasonable future time': function(done) {
			var start = +(new Date());

			timer.set(function() {
				var end = +(new Date());
				// A 10% epsilon seems good enough
				assert((end - start) > 90);
				done();
			}, 100);
		},

		'should cancel already scheduled task': function(done) {
			var t = timer.set(fail, 100);

			timer.set(function() {
				timer.cancel(t);
				assert(true);
				done();
			}, 10);
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
