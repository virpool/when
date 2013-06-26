/**
 * timers
 * @author: brian
 */
(function(define) {
define(function() {
	/*global vertx,setTimeout,clearTimeout*/

	var setTimer, cancelTimer;

	if(typeof vertx === 'object') {
		setTimer = function (f, ms) { return vertx.setTimer(ms, f); };
		cancelTimer = vertx.cancelTimer;
	} else {
		setTimer = setTimeout;
		cancelTimer = clearTimeout;
	}

	return {
		set: setTimer,
		cancel: cancelTimer
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
