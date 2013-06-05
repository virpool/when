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

	var hasStackTraces;

	try {
		throw new Error();
	} catch (e) {
		hasStackTraces = !!e.stack;
	}

	return function(filterStack, unhandledMsg, reasonMsg) {
		return function format(rec) {
			var cause, formatted;

			formatted = {
				promise: rec.promise,
				reason: rec.reason && rec.reason.toString()
			};

			if(hasStackTraces) {
				cause = rec.reason && rec.reason.stack;
				if(!cause) {
					cause = rec.rejectedAt && rec.rejectedAt.stack;
				}
				var jumps = formatStackJumps(rec);
				formatted.stack = stitch(rec.createdAt.stack, jumps, cause);
			}

			return formatted;
		};

		function formatStackJumps(rec) {
			var parent, jumps;

			jumps = [];
			parent = rec.parent;

			while (parent) {
				jumps.push(formatStackJump(parent));
				parent = parent.parent;
			}

			return jumps;
		}

		function formatStackJump(rec) {
			return filterStack(toArray(rec.createdAt.stack).slice(1));
		}

		function stitch(escaped, jumps, rejected) {
			escaped = filterStack(toArray(escaped).slice(1));
			rejected = filterStack(toArray(rejected));
			return [unhandledMsg]
				.concat(escaped, jumps, reasonMsg, rejected);
		}

		function toArray(stack) {
			return stack.split('\n');
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
