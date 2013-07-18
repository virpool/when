/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function() {

	return {
		call: function(thisArg) {
			return this.apply(thisArg, Array.prototype.slice.call(arguments, 1));
		},
		apply: function(thisArg, args) {
			return this.map(function(f) {
				return f.apply(thisArg, args);
			});
		},
		bind: function(/*, ...args*/) {
			var args = arguments;
			return this.constructor(this.then(function(f) {
				return f.bind.apply(f, args);
			}));
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
