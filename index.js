/*global require*/
var
	async = require('async'),
	_ = require('lodash')

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

	/**
	 * Wraps a do task in a way that it will not return an error, but instead an err/result hash
	 * @param task
	 * @returns {Function}
	 */
	var noError = function (task) {
		return function (cb) {
			task(function (err, result) {
				cb(null, {
					error : err,
					result : result
				});
			});
		};
	};

	// Normalize tasks
	_(tasks).forEach(normalizeTask);

	// Get array or hash of augmented tasks to send to .parallel()
	var _tasks = _(tasks).pluck('do').map(noError).value();

	async.parallel(_tasks, function (err, results) {
		// err should always be null as the tasks always return null

		var errors = _(results).pluck('error');
		var results = _(results).pluck('result');

		// If the input tasks was a hash, make the errors and results hashes as well
		if ( tasks.constructor !== Array ) {
			var keys = _.keys(tasks);
			errors = _.zipObject(keys, errors);
			results = _.zipObject(keys, results);
		}

		// If no errors occurred, return the results
		if ( !_.any(errors) ) {
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

