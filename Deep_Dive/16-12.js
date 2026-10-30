const person = { name: 'Lee' };

console.log(Object.isFrozen(person));

Object.freeze(person);

console.log(Object.isFrozen(person));

console.log(Object.getOwnPropertyDescriptors(person));

person.age = 20;
console.log(person);

delete person.name;
console.log(person);

person.name = 'Kim';
console.log(person);

Object.defineProperty(person, 'name', { configurable: true });