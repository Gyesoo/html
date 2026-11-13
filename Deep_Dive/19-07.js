const person = { name: 'Lee' };

//console.log(person.hasOwnproperty('__proto__'));
console.log(Object.prototype.hasOwnProperty('__proto__'));

console.log(Object.getOwnPropertyDescriptor(Object.prototype, '__proto__'));

console.log({}.__proto__ === Object.prototype);