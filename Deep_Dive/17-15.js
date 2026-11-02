function foo() {}
const bar = function () {};

const baz = {
    x: function () {}
};

new foo();
new bar();
new baz.x();

const arrow = () => {};

new arrow();

const obj = {
    x() {}
};

new obj();