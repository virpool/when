(function(buster, define) {

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = { name: 'sentinel' };

define('when/lib/makeScheduler-test', function (require) {

	var makeScheduler = require('when/lib/makeScheduler');

	buster.testCase('when/lib/makeScheduler', {
		'should schedule async task': function(done) {
			var schedule, x;

			schedule = makeScheduler();

			schedule(function() {
				assert.same(x, sentinel);
				done();
			});

			x = sentinel;
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
