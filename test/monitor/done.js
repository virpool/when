/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function(require) {

	require('../../monitor/console');
	var when = require('../../when');

//	when.resolve(123)
//		.then(function(x) {
//			throw new Error(x);
//		})
//		.done();

	when.promise(function(r, j, p) {
		p(123);
	})
		.then(null, null, fail)
		.done();
//		.done(null, null, fail);

	function ok(x) {
		return x;
	}

	function fail(x) {
		throw new Error(x);
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));


