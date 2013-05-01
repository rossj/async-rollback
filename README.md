#async-rollback

A plugin for [caolan's async module](https://github.com/caolan/async) that adds
additional async methods with improved integrity. For example, `async.parallel`
normally executes the callback immediately if any task returns an error, but this
is not always desired. `async-rollback` contains a `parallelRollback` method which
can undo parallel tasks that succeeded if one of the tasks fails.

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
