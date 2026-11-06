const obj = {};
const parent = { x: 1 };

Object.getPrototypeOf(obj);

Object.setPrototypeOf(obj, parent);

console.log(obj.x);