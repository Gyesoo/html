var x = 'global';

function foo() {
    console.log(x);
    var x = 'local';
}

foo();
console.log(x);