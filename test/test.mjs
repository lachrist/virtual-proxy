import { virtualizeHandler } from "../lib/index.mjs";
import { ok as assert } from "node:assert";

/**
 * @type {(
 *   ... values: any[]
 * ) => boolean}
 */
const equalAll = (...values) => {
  if (values.length === 0) {
    return true;
  }
  const value = values[0];
  const { length } = values;
  for (let index = 1; index < length; index++) {
    if (value !== values[index]) {
      return false;
    }
  }
  return true;
};

/**
 * @type {(
 *   ... values: any[][]
 * ) => boolean}
 */
const equalAllArray = (...arrays) => {
  if (arrays.length === 0) {
    return true;
  }
  const array = arrays[0];
  const { length } = arrays;
  for (let index = 1; index < length; index++) {
    if (!equalArray(array, arrays[index])) {
      return false;
    }
  }
  return true;
};

/**
 * @type {(
 *   ... descriptors: (PropertyDescriptor | undefined)[]
 * ) => boolean}
 */
const equalAllDescriptor = (...descriptors) => {
  if (descriptors.length === 0) {
    return true;
  }
  const descriptor = descriptors[0];
  const { length } = descriptors;
  for (let index = 1; index < length; index++) {
    if (!equalDescriptor(descriptor, descriptors[index])) {
      return false;
    }
  }
  return true;
};

/**
 * @type {(
 *   descriptor1: PropertyDescriptor | undefined,
 *   descriptor2: PropertyDescriptor | undefined,
 * ) => boolean}
 */
const equalDescriptor = (descriptor1, descriptor2) => {
  if (descriptor1 === undefined || descriptor2 === undefined) {
    return descriptor1 === undefined && descriptor2 === undefined;
  }
  if (descriptor1.enumerable !== descriptor2.enumerable) {
    return false;
  }
  if (descriptor1.configurable !== descriptor2.configurable) {
    return false;
  }
  if (Object.hasOwn(descriptor1, "value")) {
    if (Object.hasOwn(descriptor2, "value")) {
      return (
        descriptor1.value === descriptor2.value &&
        descriptor1.writable === descriptor2.writable
      );
    } else {
      return false;
    }
  } else {
    if (Object.hasOwn(descriptor2, "value")) {
      return false;
    } else {
      return (
        descriptor1.get === descriptor2.get &&
        descriptor1.set === descriptor2.set
      );
    }
  }
};

/**
 * @type {(
 *   array1: any[],
 *   array2: any[],
 * ) => boolean}
 */
const equalArray = (array1, array2) => {
  const length1 = array1.length;
  const length2 = array2.length;
  if (length1 !== length2) {
    return false;
  }
  for (let index = 0; index < length1; index++) {
    if (array1[index] !== array2[index]) {
      return false;
    }
  }
  return true;
};

/////////////
// calling //
/////////////
{
  const proxy = new Proxy(
    /** @type {(this: string, ...input: number[]) => number} */ (
      () => {
        throw new Error("unreachable");
      }
    ),
    virtualizeHandler(
      /** @type {(this: string, ...input: number[]) => number} */ (
        function (...input) {
          assert(new.target === undefined);
          assert(this === "this");
          assert(equalArray(input, [123, 456]));
          return 789;
        }
      ),
      {},
    ),
  );
  assert(Reflect.apply(proxy, "this", [123, 456]) === 789);
}
{
  const new_target = class {};
  const proxy = new Proxy(
    /** @type {new (...input: number[]) => { inner: number }} */ (
      class {
        constructor() {
          throw new Error("unreachable");
        }
      }
    ),
    virtualizeHandler(
      /** @type {new (... input: number[]) => { inner: number }} */ (
        class {
          /**
           * @param {...number} input
           */
          constructor(...input) {
            assert(new.target === new_target);
            assert(equalArray(input, [123, 456]));
            return { inner: 789 };
          }
        }
      ),
      {},
    ),
  );
  assert(Reflect.construct(proxy, [123, 456], new_target).inner === 789);
}

///////////////
// extension //
///////////////

{
  const target = { foo: null, bar: null };
  const proxy = new Proxy(
    { bar: null, qux: null },
    virtualizeHandler(target, {}),
  );
  assert(
    equalAllArray(
      ["foo", "bar"],
      Reflect.ownKeys(proxy),
      Reflect.ownKeys(target),
    ),
  );
  assert(
    equalAll(true, Reflect.isExtensible(proxy), Reflect.isExtensible(target)),
  );
  assert(Reflect.preventExtensions(proxy) === true);
  assert(
    equalAll(false, Reflect.isExtensible(proxy), Reflect.isExtensible(target)),
  );
  assert(
    equalAllArray(
      ["foo", "bar"],
      Reflect.ownKeys(proxy),
      Reflect.ownKeys(target),
    ),
  );
}

{
  const target = Object.preventExtensions({
    foo: null,
    bar: null,
  });
  const proxy = new Proxy(
    { bar: null, qux: null },
    virtualizeHandler(target, {}),
  );
  assert(
    equalAll(false, Reflect.isExtensible(proxy), Reflect.isExtensible(target)),
  );
  assert(
    equalAllArray(
      ["foo", "bar"],
      Reflect.ownKeys(proxy),
      Reflect.ownKeys(target),
    ),
  );
}

///////////////
// prototype //
///////////////

{
  const prototype1 = {};
  const prototype2 = {};
  const target = { __proto__: prototype1 };
  const proxy = new Proxy({ __proto__: null }, virtualizeHandler(target, {}));
  // initial
  assert(
    equalAll(
      prototype1,
      Reflect.getPrototypeOf(target),
      Reflect.getPrototypeOf(target),
    ),
  );
  assert(
    equalAll(true, Reflect.isExtensible(target), Reflect.isExtensible(proxy)),
  );
  // setPrototypeOf (extensible)
  assert(Reflect.setPrototypeOf(proxy, prototype2) === true);
  assert(
    equalAll(
      prototype2,
      Reflect.getPrototypeOf(proxy),
      Reflect.getPrototypeOf(target),
    ),
  );
  // preventExtensions
  assert(Reflect.preventExtensions(proxy) === true);
  assert(
    equalAll(false, Reflect.isExtensible(proxy), Reflect.isExtensible(target)),
  );
  // setPrototypeOf (non-extensible)
  assert(Reflect.setPrototypeOf(proxy, prototype1) === false);
  assert(
    equalAll(
      prototype2,
      Reflect.getPrototypeOf(proxy),
      Reflect.getPrototypeOf(target),
    ),
  );
}

//////////////
// property //
//////////////

{
  const key = "foo";
  const value = 123;
  for (const configurable of [true, false]) {
    for (const writable of [true, false]) {
      for (const enumerable of [true, false]) {
        const target = { __proto__: null };
        const proxy = new Proxy({}, virtualizeHandler(target, {}));
        let descriptor = {
          value,
          writable,
          enumerable,
          configurable,
        };
        // initial //
        assert(
          equalAll(
            undefined,
            Reflect.getOwnPropertyDescriptor(proxy, key),
            Reflect.getOwnPropertyDescriptor(target, key),
          ),
        );
        assert(
          equalAllArray([], Reflect.ownKeys(proxy), Reflect.ownKeys(target)),
        );
        // defineProperty //
        assert(Reflect.defineProperty(proxy, key, descriptor) === true);
        assert(
          equalAllDescriptor(
            descriptor,
            Reflect.getOwnPropertyDescriptor(proxy, key),
            Reflect.getOwnPropertyDescriptor(target, key),
          ),
        );
        assert(
          equalAllArray([key], Reflect.ownKeys(proxy), Reflect.ownKeys(target)),
        );
        // defineProperty (toggle enumerable)
        {
          const toggle_descriptor = {
            ...descriptor,
            enumerable: !enumerable,
          };
          const success = configurable;
          assert(
            Reflect.defineProperty(proxy, key, toggle_descriptor) === success,
          );
          assert(
            equalAllDescriptor(
              success ? toggle_descriptor : descriptor,
              Reflect.getOwnPropertyDescriptor(proxy, key),
              Reflect.getOwnPropertyDescriptor(target, key),
            ),
          );
          descriptor = success ? toggle_descriptor : descriptor;
        }
        // defineProperty (toggle writable)
        {
          const toggle_descriptor = {
            ...descriptor,
            writable: !writable,
          };
          const success = configurable || writable;
          assert(
            Reflect.defineProperty(proxy, key, toggle_descriptor) === success,
          );
          assert(
            equalAllDescriptor(
              success ? toggle_descriptor : descriptor,
              Reflect.getOwnPropertyDescriptor(proxy, key),
              Reflect.getOwnPropertyDescriptor(target, key),
            ),
          );
          descriptor = success ? toggle_descriptor : descriptor;
        }
        // deleteProperty //
        {
          const success = configurable;
          assert(Reflect.deleteProperty(proxy, key) === success);
          assert(
            equalAllDescriptor(
              success ? undefined : descriptor,
              Reflect.getOwnPropertyDescriptor(proxy, key),
              Reflect.getOwnPropertyDescriptor(target, key),
            ),
          );
          assert(
            equalAllArray(
              success ? [] : [key],
              Reflect.ownKeys(proxy),
              Reflect.ownKeys(target),
            ),
          );
        }
      }
    }
  }
}

//////////////////////
// derived-property //
//////////////////////

{
  const key = "foo";
  const receiver = {};
  const target = { [key]: 123 };
  const proxy = new Proxy({}, virtualizeHandler(target, {}));
  assert(equalAll(true, Reflect.has(proxy, key), Reflect.has(target, key)));
  assert(
    equalAll(
      123,
      Reflect.get(proxy, key, receiver),
      Reflect.get(target, key, receiver),
    ),
  );
  assert(Reflect.set(proxy, key, 456) === true);
  assert(
    equalAll(
      456,
      Reflect.get(proxy, key, receiver),
      Reflect.get(target, key, receiver),
    ),
  );
}

{
  const key = "foo";
  const receiver = { [key]: 123 };
  const target = {
    get [key]() {
      assert(this === receiver);
      return this[key];
    },
    set [key](value) {
      assert(this === receiver);
      this[key] = value;
    },
  };
  const proxy = new Proxy({}, virtualizeHandler(target, {}));
  assert(equalAll(true, Reflect.has(proxy, key), Reflect.has(target, key)));
  assert(
    equalAll(
      123,
      receiver[key],
      Reflect.get(proxy, key, receiver),
      Reflect.get(target, key, receiver),
    ),
  );
  assert(Reflect.set(proxy, key, 456, receiver) === true);
  assert(
    equalAll(
      456,
      receiver[key],
      Reflect.get(proxy, key, receiver),
      Reflect.get(target, key, receiver),
    ),
  );
}
