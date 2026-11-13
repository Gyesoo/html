const obj = {};
const parent = { x: 1 };

obj.__proto__;

obj.__proto__ = parent;

console.log(obj.x);
console.log(parent.x);