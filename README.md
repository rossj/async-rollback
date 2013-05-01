#async-rollback

A plugin for [caolan's async module](https://github.com/caolan/async) that adds
additional async methods with improved integrity. For example, `async.parallel`
normally executes the callback immediately if any task returns an error, but this
is not always desired. `async-rollback` contains a `parallelRollback` method which
can undo parallel tasks that succeeded if one of the tasks fails.

## Installation

To install using npm:

    npm install async-rollback

To use, simply `require('async-rollback')` near the beginning of your node code.
It augments the normal `async` module so must only be required one time.


## Documentation
### Control Flow

* [parallelAll](#parallelAll)
* [parallelRollback](#parallelRollback)

## Control Flow

<a name="parallelAll" />
### parallelAll(tasks, [callback])

Run an array of functions in parallel, without waiting until the previous
function has completed. If any of the functions pass an error to its
callback, the error is cached until all tasks complete. Once the tasks have
completed, the results are passed to the final callback as an array. If any
functions passed errors, the main callbacks error argument will be an array,
corresponding to the input functions.

It is also possible to use an object instead of an array. Each property will be
run as a function and the results will be passed to the final callback as an object
instead of an array. If any tasks result in an error, the final callbacks error
argument will also be an object.


__Arguments__

* tasks - An array or object containing functions to run, each function is passed 
  a callback(err, result) it must call on completion with an error (which can
  be null) and an optional result value.
* callback(errs, results) - An optional callback to run once all the functions
  have completed. This function gets a results array (or object) containing all 
  the result arguments passed to the task callbacks. It also receives an error
  array (or object) if any errors occurred (null otherwise).

__Example__

```js
async.parallelAll([
    function(callback){
        setTimeout(function(){
            callback(null, 'one');
        }, 200);
    },
    function(callback){
        setTimeout(function(){
            callback('error2');
        }, 100);
    }
],
// optional callback
function(errs, results){
    // errs = [null, 'error2']
    // results = ['one', null]
    if (errs)
        console.log('Errors occurred');
});


// an example using an object instead of an array
async.parallel({
    one: function(callback){
        setTimeout(function(){
            callback(null, 1);
        }, 200);
    },
    two: function(callback){
        setTimeout(function(){
            callback(2, null);
        }, 100);
    }
},
function(errs, results) {
    // errs = {one: null, two: 2}
    // results = {one: 1, two: null}
    if (errs)
        console.log('Errors occurred');
});
```
---------------------------------------
<a name="parallelRollback" />
### parallelRollback(tasks, [callback])

Similar to `parallel` and `parallelAll`, except each task may have an `undo`
property that is executed if that task succeeds while others fail. This function
works with the typical arrays and objects of tasks (and behaves the same as
`parallelAll` in this case), but accepts a new array (or object) format of
`do` / `undo` functions. If any task (or tasks) fail, the `undo` function of any
non-failing task will automatically be called. The final callback is executed
with an array (or object) of results (and possibly errors) after all tasks
and potential `undo` functions have been called.

__Arguments__

* tasks - An array or object of `do` / `undo` tasks to run. Each `do` function is passed 
  a callback(err, result) it must call on completion with an error (which can
  be null) and an optional result value. The `undo` function may be called if the task
  succeeds while others fail. The `undo` function is passed the value of the `do` function,
  along with a callback(err) it must call on completion.
* callback(errs, results) - An optional callback to run once all the functions
  have completed. This function gets a results array (or object) containing all 
  the result arguments passed to the task callbacks. It also receives an error
  array (or object) if any errors occurred (null otherwise).

__Example__

```js
async.parallelRollback([
    {
        do : function(callback) {
            uploadImage('image1.png', callback);
        },
        undo : function(result, callback) {
            deleteImage(result, callback);
        }
    },
    {
        do : function(callback) {
            uploadImage('image2.png', callback);
        },
        undo : function(result, callback) {
            deleteImage(result, callback);
        }
    }
],
// optional callback
function(errs, results){
    // With a typical .parallel() call, if one of the uploads failed then the other image would be left
    // uploaded. By using .parallelRollback(), either both images or no images will get uploaded.
    // For example, if the uploading of image2 fails, then the undo method of the first task will be called.
    if (errs)
        console.log('Errors occurred');
});


// an example using an object instead of an array
async.parallel({
    image1 : {
        do : function(callback) {
            uploadImage('image1.png', callback);
        },
        undo : function(result, callback) {
            deleteImage(result, callback);
        }
    },
    image2 : {
        do : function(callback) {
            uploadImage('image2.png', callback);
        },
        undo : function(result, callback) {
            deleteImage(result, callback);
        }
    }
},
function(errs, results) {
    if (errs)
        console.log('Errors occurred');
});
```
