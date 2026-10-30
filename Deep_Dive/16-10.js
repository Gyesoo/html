const person = { name: 'Lee'};

console.log(Object.isExtensible(person));

Object.preventExtensions(person);

console.log(Object.isExtensible(person));

person.age = 20;
console.log(person);

delete person.name;
console.log(person);
Object.defineProperty(person, 'age', { value: 20 });