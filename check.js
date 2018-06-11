
const symbol_foo = Symbol("foo");
const symbol_bar = Symbol("bar");
const symbol_qux = Symbol("qux");
const symbol_tuc = Symbol("tuc");

const assert = (check) => {
  if (!check) {
    throw new Error("Assertion failure");
  }
  exports.counter++;
};

const common = (virtual) => {
  console.log("Checking property-related operations...");
  assert(Reflect.defineProperty(virtual, symbol_foo, {value:123,configurable:true}));
  const keys1 = Reflect.ownKeys(virtual);
  assert(Array.isArray(keys1))
  assert(Array.prototype.every.call(keys1, (element) => typeof element === "string" || typeof element === "symbol"))
  assert(Array.prototype.includes.call(keys1, symbol_foo));
  const descriptor1 = Reflect.getOwnPropertyDescriptor(virtual, symbol_foo);
  assert(descriptor1 && descriptor1.configurable && descriptor1.value === 123);
  assert(Reflect.deleteProperty(virtual, symbol_foo));
  const keys2 = Reflect.ownKeys(virtual);
  assert(!Array.prototype.includes.call(keys2, symbol_foo));
  assert(Reflect.defineProperty(virtual, symbol_foo, {value:123}));
  assert(!Reflect.deleteProperty(virtual, symbol_foo));
  console.log("Checking prototype-related operations...");
  const prototype = {};
  assert(Reflect.setPrototypeOf(virtual, prototype));
  assert(Reflect.getPrototypeOf(virtual) === prototype);
  console.log("Checking derived prototype-related operations...");
  assert(Reflect.has(virtual, symbol_foo));
  assert(Reflect.get(virtual, symbol_foo, virtual) === 123);
  assert(!Reflect.set(virtual, symbol_foo, 456, virtual));
  assert(Reflect.get(virtual, symbol_foo, virtual) === 123);
  assert(!Reflect.has(virtual, symbol_bar));
  assert(Reflect.get(virtual, symbol_bar, virtual) === undefined);
  prototype[symbol_bar] = 456;
  assert(Reflect.has(virtual, symbol_bar));
  assert(Reflect.get(virtual, symbol_bar, virtual) === 456);
  let value1;
  Object.defineProperty(prototype, symbol_qux, {
    get: function () {
      assert(this === virtual);
      return 789;
    },
    set: function (value) {
      assert(this === virtual);
      value1 = value;
      return true;
    }
  });
  assert(Reflect.get(virtual, symbol_qux, virtual) === 789);
  assert(Reflect.set(virtual, symbol_qux, 789, virtual));
  assert(value1 === 789);
  let value2;
  Reflect.defineProperty(virtual, symbol_qux, {
    get: function () {
      assert(this === virtual);
      return 666;
    },
    set: function (value) {
      assert(this === virtual);
      value2 = value;
      return true;
    },
    enumerable: true,
    configurable: true
  });
  assert(Reflect.get(virtual, symbol_qux, virtual) === 666);
  assert(Reflect.set(virtual, symbol_qux, 666, virtual))
  assert(value2 === 666);
  console.log("Checking extensibility-related operations...");
  Reflect.defineProperty(virtual, symbol_tuc, {value:null, configurable:true});
  assert(Reflect.isExtensible(virtual));
  assert(Reflect.preventExtensions(virtual));
  assert(!Reflect.isExtensible(virtual));
  assert(Reflect.preventExtensions(virtual));
  assert(Reflect.deleteProperty(virtual, symbol_tuc));
  assert(Reflect.getOwnPropertyDescriptor(virtual, symbol_tuc) === undefined);
  assert(!Reflect.defineProperty(virtual, symbol_tuc, {value:123}));
  assert(!Reflect.set(virtual, symbol_tuc, 123, virtual));
  assert(Reflect.getOwnPropertyDescriptor(virtual, symbol_tuc) === undefined);
  assert(!Reflect.ownKeys(virtual).includes(symbol_tuc));
};

exports.object = (virtual) => {
  console.log("Checking object-specific operations...");
  assert(typeof virtual === "object");
  let error1;
  try {
    Reflect.apply(virtual, undefined, []);
  } catch (error) {
    error1 = error;
  }
  assert(error1);
  let error2;
  try {
    Reflect.construct(virtual, []);
  } catch (error) {
    error2 = error;
  }
  assert(error2);
  common(virtual);
};

exports.array = (virtual) => {
  console.log("Checking array-specific operations...");
  assert(Array.isArray(virtual));
  assert(typeof virtual === "object");
  const descriptor = Reflect.getOwnPropertyDescriptor(virtual, "length");
  assert(descriptor && typeof descriptor.value === "number" && descriptor.enumerable === false && descriptor.configurable === false);
  let error1;
  try {
    Reflect.apply(virtual, undefined, []);
  } catch (error) {
    error1 = error;
  }
  assert(error1);
  let error2;
  try {
    Reflect.construct(virtual, []);
  } catch (error) {
    error2 = error;
  }
  assert(error2);
  common(virtual);
};

exports.function = (virtual) => {
  console.log("Checking function-specific operations...");
  assert(typeof virtual === "function");
  const descriptor = Reflect.getOwnPropertyDescriptor(virtual, "prototype");
  assert(descriptor && "value" in descriptor && descriptor.enumerable === false && descriptor.configurable === false)
  Function.prototype.toString.call(virtual);
  Reflect.apply(virtual, undefined, []);
  Reflect.construct(virtual, []);
  common(virtual);
};

exports.arrow = (virtual) => {
  console.log("Checking arrow-specific operations...");
  assert(typeof virtual === "function");
  Function.prototype.toString.call(virtual);
  Reflect.apply(virtual, undefined, []);
  let error2;
  try {
    Reflect.construct(virtual, []);
  } catch (error) {
    error2 = error;
  }
  assert(error2);
  common(virtual);
};

exports.counter = 0;
