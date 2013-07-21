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
		/**
		 * Gets the value of a named property on this promise's
		 * fulfillment object.
		 * @param {string} property name of property to get
		 * @returns {promise} promise for the value of the named property
		 */
		get: function(property) {
			return this.constructor(this.then(function(object) {
				return object[property];
			}));
		},
		/**
		 * Sets the named property's value on this promise's
		 * fulfillment object.
		 * @param {string} property name of property to set
		 * @param {*} value
		 * @returns {promise} promise for this promise's fulfillment object
		 */
		set: function(property, value) {
			return this.constructor(this.then(function(object) {
				object[property] = value;
				return object;
			}));
		},
		/**
		 * Deletes a named property from this promise's fulfillment object
		 * @param {string} property name of property to delete
		 * @returns {promise} promise for this promise's fulfillment object
		 */
		delete: function(property) {
			return this.constructor(this.then(function(object) {
				delete object[property];
				return object;
			}));
		},
		/**
		 * Invokes a named method on this promise's fulfillment object.
		 * Arguments to the method may be provided as additional arguments
		 * to invoke, e.g. promise.invoke('doSomething', arg1, arg2);
		 * @param {string} methodName name of method to invoke
		 * @returns {promise} promise for the result of invoking the
		 *  method.
		 */
		invoke: function(methodName /*, ...args*/) {
			var args = Array.prototype.slice.call(arguments, 1);
			return this.constructor(this.then(function(object) {
				return object[methodName].apply(object, args);
			}));
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
