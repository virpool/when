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
		get: function(property) {
			return this.constructor(this.then(function(object) {
				return object[property];
			}));
		},
		set: function(property, value) {
			return this.constructor(this.then(function(object) {
				object[property] = value;
				return object;
			}));
		},
		delete: function(property) {
			return this.constructor(this.then(function(object) {
				delete object[property];
				return object;
			}));
		},
		invoke: function(methodName) {
			var args = Array.prototype.slice.call(arguments, 1);
			return this.constructor(this.then(function(object) {
				return object[methodName].apply(object, args);
			}));
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
