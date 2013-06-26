/**
 * makeScheduler
 * @author: brian
 */
(function(define, global) {
define(function() {
	/*global setImmediate,process,vertx*/

	var setTimer = require('./timer').set;

	//
	// Shared handler queue processing
	//
	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for
	// next-tick conflation.

	// Prefer setImmediate, cascade to node, vertx and finally setTimeout
	var nextTick = typeof setImmediate === 'function' ? setImmediate.bind(global)
		: typeof process === 'object' && process.nextTick ? process.nextTick
		: typeof vertx === 'object' ? vertx.runOnLoop // vert.x
			: function(task) { setTimer(task, 0); }; // fallback

	return function() {
		var handlerQueue = [];

		/**
		 * Enqueue a task. If the queue is not currently scheduled to be
		 * drained, schedule it.
		 * @param {function} task
		 */
		return function enqueue(task) {
			if(handlerQueue.push(task) === 1) {
				nextTick(drainQueue);
			}
		};

		/**
		 * Drain the handler queue entirely, being careful to allow the
		 * queue to be extended while it is being processed, and to continue
		 * processing until it is truly empty.
		 */
		function drainQueue() {
			var task, i = 0;

			while(task = handlerQueue[i++]) {
				task();
			}

			handlerQueue = [];
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }, this));
