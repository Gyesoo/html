const Person = nane => {
    this.name = name;
};

console.log(Person.hasOwnProperty('prototype'));

console.log(Person.prototype);

const obj = {
    foo() {}
};

console.log(obj.hasOwnProperty('prototype'));

console.log(obj.foo.prototype);

console.log(Person.__proto__ === obj.__proto__);