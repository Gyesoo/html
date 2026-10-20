function foo() { console.log('foo') };
foo();

(function () { console.log('bar') }());
//bar();