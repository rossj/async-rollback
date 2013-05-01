/*global require, process*/
/*global describe, it*/
var should = require('should'),
	_ = require('lodash'),
	async = require('async');

// Include the async-rollback plugin
require('../index.js');

var sampleTask = function (err, value, delay) {
	return function (cb) {
		setTimeout(function () {
			cb(err, value);
		}, delay);
	};
};

var compareAsyncMethods = function (method1, tasks1, method2, tasks2, cb) {
	async[method1](tasks1, function (err1, results1) {
		async[method2](tasks2, function (err2, results2) {
			if ( !err1 )
				should.not.exist(err2);
			else
				err1.should.eql(err2);

			if ( !results1 )
				should.not.exist(results2);
			else
				results1.should.eql(results2);

			cb();
		});
	});
};

var successTasksHash = {
	'one' : sampleTask(null, 1, 30),
	'two' : sampleTask(null, 2, 20),
	'three' : sampleTask(null, 3, 10)
};

var failTasksHash = {
	'one' : sampleTask(null, 1, 30),
	'two' : sampleTask(2, null, 20),
	'three' : sampleTask(null, 3, 10)
};

var successTasksArray = _.values(successTasksHash);
var failTasksArray = _.values(failTasksHash);

describe('async-rollback', function () {
	describe('parallelAll', function () {
		it('should work without a final callback', function (cb) {
			var a;
			async.parallelAll([
				function(cb) {
					setTimeout(function () {
						a = 1;
						cb();
					}, 20);
				}
			]);

			// Wait for the tasks to complete and then check the value
			setTimeout(function () {
				should.exist(a);
				a.should.eql(1);
				cb();
			}, 25);
		});
		describe('when given an array of tasks', function () {
			it('should behave as .parallel() when all tasks succeed', function (cb) {
				compareAsyncMethods('parallel', successTasksArray, 'parallelAll', successTasksArray, cb);
			});
			it('should return the error parameter as an array (corresponding to the input tasks) when a task fails', function (cb) {
				async.parallelAll(failTasksArray, function (errors, results) {
					should.exist(errors);
					should.exist(results);

					errors.should.be.an.instanceOf(Array);
					results.should.be.an.instanceOf(Array);

					errors.should.eql([null, 2, null]);
					results.should.eql([1, null, 3]);
					cb();
				});
			});
		});
		describe('when given a hash of tasks', function () {
			it('should behave as .parallel() when all tasks succeed', function (cb) {
				compareAsyncMethods('parallel', successTasksHash, 'parallelAll', successTasksHash, cb);
			});
			it('should return the error parameter as a hash (corresponding to the input tasks) when a task fails', function (cb) {
				async.parallelAll(failTasksHash, function (errors, results) {
					should.exist(errors);
					should.exist(results);

					errors.should.eql({'one' : null, 'two' : 2, 'three' : null});
					results.should.eql({'one' : 1, 'two' : null, 'three' : 3});
					cb();
				});
			});
		});
	});
	describe('parallelRollback', function () {
		var shouldntRun = function () {
			// Assert an impossibility to make sure this doesn't run
			true.should.eql(false);
		};

		describe('when given an array of plain tasks', function () {
			it('should behave as .parallelAll() when all tasks succeed', function (cb) {
				compareAsyncMethods('parallelAll', successTasksArray, 'parallelRollback', successTasksArray, cb);
			});
			it('should behave as .parallelAll() when a task fails', function (cb) {
				compareAsyncMethods('parallelAll', failTasksArray, 'parallelRollback', failTasksArray, cb);
			});
		});
		describe('when given a hash of of plain tasks', function () {
			it('should behave as .parallelAll() when all tasks succeed', function (cb) {
				compareAsyncMethods('parallelAll', successTasksHash, 'parallelRollback', successTasksHash, cb);
			});
			it('should behave as .parallelAll() when a task fails', function (cb) {
				compareAsyncMethods('parallelAll', failTasksHash, 'parallelRollback', failTasksHash, cb);
			});
		});
		describe('when given an array of tasks with rollbacks', function () {
			it('should behave as .parallelAll() when all tasks succeed', function (cb) {
				var tasks = [
					{
						'do' : successTasksArray[0],
						'undo' : shouldntRun
					},
					{
						'do' : successTasksArray[1],
						'undo' : shouldntRun
					},
					{
						'do' : successTasksArray[2],
						'undo' : shouldntRun
					},
				];
				compareAsyncMethods('parallelAll', successTasksArray, 'parallelRollback', tasks, cb);
			});
			it('should behave as .parallelAll() when a task fails, except it should call the undo functions', function (cb) {
				var undoValues = [];

				var shouldRun = function (result, cb) {
					undoValues.push(result);
					process.nextTick(cb);
				};

				var tasks = [
					{
						'do' : failTasksArray[0],
						'undo' : shouldRun
					},
					{
						'do' : failTasksArray[1],
						'undo' : shouldntRun
					},
					{
						'do' : failTasksArray[2],
						'undo' : shouldRun
					},
				];
				compareAsyncMethods('parallelAll', failTasksArray, 'parallelRollback', tasks, function () {
					// Ensure the undo methods executed
					undoValues.should.include(1);
					undoValues.should.include(3);
					cb();
				});
			});
		});
		describe('when given a hash of tasks with rollbacks', function () {
			it('should behave as .parallelAll() when all tasks succeed', function (cb) {
				var tasks = {
					'one' : {
						'do' : successTasksArray[0],
						'undo' : shouldntRun
					},
					'two' : {
						'do' : successTasksArray[1],
						'undo' : shouldntRun
					},
					'three' : {
						'do' : successTasksArray[2],
						'undo' : shouldntRun
					}
				};
				compareAsyncMethods('parallelAll', successTasksHash, 'parallelRollback', tasks, cb);
			});
			it('should behave as .parallelAll() when a task fails, except it should call the undo functions', function (cb) {
				var undoValues = [];

				var shouldRun = function (result, cb) {
					undoValues.push(result);
					process.nextTick(cb);
				};

				var tasks = {
					'one' : {
						'do' : failTasksArray[0],
						'undo' : shouldRun
					},
					'two' : {
						'do' : failTasksArray[1],
						'undo' : shouldntRun
					},
					'three' : {
						'do' : failTasksArray[2],
						'undo' : shouldRun
					}
				};
				compareAsyncMethods('parallelAll', failTasksHash, 'parallelRollback', tasks, function () {
					// Ensure the undo methods executed
					undoValues.should.include(1);
					undoValues.should.include(3);
					cb();
				});
			});
		});
	});
});
