const obj = {};
const parent = { x: 1 };

Object.getPrototypeOf(obj);
Object.getPrototypeOf(parent);

Object.setPrototypeOf(obj, parent);

console.log(obj.x);