const person = { name: 'Lee' };

console.log(person.hasOwnProperty('__proto__'));
console.log(Object.hasOwnProperty('__proto__'));
console.log(Object.prototype.hasOwnProperty('__proto__'));

console.log(Object.getOwnPropertyDescriptor(Object.prototype, '__proto__'));

console.log({}.__proto__ === Object.prototype);
console.log({}.__proto__ === Object.prototype.__proto__);