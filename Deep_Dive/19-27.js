function Person(name) {
    this.name = name;
}

const me = new Person('Lee');

console.log(me.constructor === Person);
console.log(me.hasOwnProperty('name'));

Object.getPrototypeOf(me) === Person.prototype;
Object.getPrototypeOf(me) === Object.prototype;
//Object.getPrototypeOf(me) === Function.constructor;