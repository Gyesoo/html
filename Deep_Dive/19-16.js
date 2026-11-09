const obj = {};
console.log(obj.constructor === Object);

const add = function (a, b) { return a + b };
console.log(add.constructor === Function);

const arr = [1, 2, 3];
console.log(arr.constructor === Array);

const regexp = /is/ig;
console.log(regexp.constructor === RegExp);