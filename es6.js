/** @license MIT License (c) copyright 2011-2013 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function (require) {

	var makePromise = require('./lib/makePromise');
	var Scheduler = require('./lib/scheduler');

	var Promise = makePromise({
		scheduler: Scheduler.createDefault()
	});

	/*global window,global,self*/
	if (typeof window !== "undefined") {
		window.Promise = Promise;
	} else if (typeof global !== "undefined") {
		global.Promise = Promise;
	} else if (typeof self !== "undefined") {
		self.Promise = Promise;
	}

	return Promise;

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });
