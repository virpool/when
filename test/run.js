(function (buster, define) {
	'use strict';

	define('when/test/run', ['curl/_privileged', 'domReady!'], function (curl) {

		var modules = [], moduleId;

		for (moduleId in curl.cache) {
			if (moduleId.indexOf('-test') > 0) {
				modules.push(moduleId);
			}
		}

		buster.testRunner.timeout = 5000;
		define('when/test/run-faux', modules, function () {
			buster.run();
		});

	});

}(
	this.buster || require('buster'),
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));
