/** @license MIT License (c) copyright 2011-2013 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function (require) {

	var array = require('./lib/array');
	var flow = require('./lib/flow');
	var semigroup = require('./lib/semigroup');
	var foldable = require('./lib/foldable');
	var generate = require('./lib/generate');
	var monad = require('./lib/monad');
	var progress = require('./lib/progress');
	var timed = require('./lib/timed');
	var timer = require('./lib/timer');

	var Promise = require('./es6');

	return [array, flow, semigroup, foldable, generate, monad, progress]
		.reduceRight(function(Promise, feature) {
			return feature(Promise);
		}, timed(timer.set, timer.clear, Promise));

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });
