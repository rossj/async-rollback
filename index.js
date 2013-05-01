/*global require*/
var
	async = require('async'),
	_ = require('lodash')

/**
 * Wraps a do task in a way that it will not return an error, but instead an err/result hash
 * @param task
 * @returns {function}
 */
var noError = function (task) {
	return function (cb) {
		task(function (err, result) {
			cb(null, {
				'error' : err,
				'result' : result
			});
		});
	};
};

/**
 * Similar to async.parallel, except the callback is not immediately called if a task returns an error. Instead,
 * errors are cached until all tasks complete. If no tasks generate errors, the callback's error parameter will be null.
 * Otherwise, the error parameter will be an array or hash, depending on the task input type. Even if errors occur,
 * the callback will still receive an array / hash of results for the successful tasks.
 * @param {Array.<function>|Object.<string, function>} tasks an array
 * @param {function} callback
 */
async.parallelAll = function (tasks, callback) {
	// Get array of augmented tasks to send to .parallel()
	var _tasks = _.map(tasks, noError);

	async.parallel(_tasks, function (err, results) {
		// err should always be null as the tasks always return null

		var errors = _.pluck(results, 'error');
		var results = _.pluck(results, 'result');

		// If the input tasks was a hash, make the errors and results hashes as well
		if ( tasks.constructor !== Array ) {
			var keys = _.keys(tasks);
			errors = _.zipObject(keys, errors);
			results = _.zipObject(keys, results);
		}
		callback(_.some(errors) ? errors : null, results);
	});
};

/**
 * Similar to async.parallel, except that each task can have an optional undo method, which will be called if that
 * task succeeds but others fail.
 * @param tasks
 * @param callback
 */
async.parallelRollback = function (tasks, callback) {
	/**
	 * Ensures that all tasks are plain objects with do & undo properties.
	 * @param task
	 * @param key
	 * @param array
	 */
	var normalizeTask = function (task, key, array) {
		array[key] = typeof task === 'function' ? {
			do : task,
			undo : null
		} : task;
	};

	// Normalize tasks
	_(tasks).forEach(normalizeTask);

	// Get array or hash of augmented tasks to send to .parallelAll()
	var _tasks = _.pluck(tasks, 'do');
	if (tasks.constructor !== Array) {
		_tasks = _.zipObject(_.keys(tasks), _tasks);
	}

	async.parallelAll(_tasks, function (errors, results) {
		// If no errors occurred, return the results
		if ( !errors ) {
			callback(null, results);
			return;
		}

		// Errors occured, call undo methods on non-erroring tasks
		var undoTasks = [];
		_.each(errors, function (error, key) {
			// Don't call undo on errored tasks, as they did not complete
			if ( error ) return;

			undoTasks.push(noError(function (cb) {
				tasks[key].undo(results[key], cb);
			}));
		});

		async.parallel(undoTasks, function () {
			callback(errors, results);
		});
	});
};

