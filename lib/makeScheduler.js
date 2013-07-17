/**
 * makeScheduler
 * @author: brian
 */
(function(define, global) {
define(function(require) {

	var setTimer = require('./timer').set;

	//
	// Shared handler queue processing
	//
	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for
	// next-tick conflation.

	return function() {
		/*global setImmediate,MessageChannel,process,vertx*/
		var handlerQueue, nextTick;

		handlerQueue = [];

		// Prefer setImmediate, cascade to node, vertx and finally setTimeout
		if (typeof setImmediate === 'function') {
			nextTick = setImmediate.bind(global);
		} else if(typeof MessageChannel !== 'undefined') {
			var channel = new MessageChannel();
			channel.port1.onmessage = drainQueue;
			nextTick = function() { channel.port2.postMessage(0); };
		} else if (typeof process === 'object' && process.nextTick) {
			nextTick = process.nextTick;
		} else if (typeof vertx === 'object') {
			nextTick = vertx.runOnLoop;
		} else {
			nextTick = function(t) { setTimer(t, 0); };
		}

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
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }, this));
