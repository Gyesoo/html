const obj = {};
const parent = { x: 1 };

obj.__proto__;
console.log(obj.__proto__);

obj.__proto__ = parent;
console.log(obj.__proto__);

console.log(obj.x);