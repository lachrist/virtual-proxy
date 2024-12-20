import { virtualizeHandler } from "../lib/index.mjs";
import {
  ok as assert,
  strictEqual as assertEqual,
  deepStrictEqual as assertDeepEqual,
} from "node:assert";

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
          assertEqual(new.target, undefined);
          assertEqual(this, "this");
          assertDeepEqual(input, [123, 456]);
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
            assertEqual(new.target, new_target);
            assertDeepEqual(input, [123, 456]);
            return { inner: 789 };
          }
        }
      ),
      {},
    ),
  );
  assert(Reflect.construct(proxy, [123, 456], new_target).inner === 789);
}

/**
 * @type {{[key in string]: ((object: object) => void) }}
 */
const tests = {
  "extension": (object) => {
    assertEqual(Reflect.isExtensible(object), true);
    assertEqual(Reflect.preventExtensions(object), true);
    assertEqual(Reflect.isExtensible(object), false);
    assertEqual(Reflect.preventExtensions(object), true);
  },
  "extension >> synchronization": (object) => {
    const key = "foo";
    const prototype = {};
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: true,
    };
    assertEqual(Reflect.setPrototypeOf(object, prototype), true);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertEqual(Reflect.preventExtensions(object), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(Reflect.getPrototypeOf(object), prototype);
  },
  "prototype >> extensible": (object) => {
    const prototype = {};
    assertEqual(Reflect.getPrototypeOf(object), null);
    assertEqual(Reflect.setPrototypeOf(object, prototype), true);
    assertEqual(Reflect.getPrototypeOf(object), prototype);
  },
  "prototype >> non-extensible": (object) => {
    assertEqual(Reflect.getPrototypeOf(object), null);
    assertEqual(Reflect.preventExtensions(object), true);
    assertEqual(Reflect.setPrototypeOf(object, {}), false);
    assertEqual(Reflect.getPrototypeOf(object), null);
  },
  "list-key": (object) => {
    const key = "foo";
    assertEqual(
      Reflect.defineProperty(object, key, {
        value: 123,
        writable: true,
        enumerable: true,
        configurable: true,
      }),
      true,
    );
    assertDeepEqual(Reflect.ownKeys(object), [key]);
  },
  "list-key >> non-extensible": (object) => {
    const key = "foo";
    assertEqual(
      Reflect.defineProperty(object, key, {
        value: 123,
        writable: true,
        enumerable: true,
        configurable: true,
      }),
      true,
    );
    assertEqual(Reflect.preventExtensions(object), true);
    assertDeepEqual(Reflect.ownKeys(object), [key]);
  },
  "delete >> success": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: true,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(Reflect.deleteProperty(object, key), true);
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
  },
  "delete >> non-extensible": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: true,
    };
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertEqual(Reflect.preventExtensions(object), true);
    assertEqual(Reflect.deleteProperty(object, key), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
  },
  "delete >> non-configurable": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: false,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(Reflect.deleteProperty(object, key), false);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
  },
  "define": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: true,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
  },
  "define >> non-extensible": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: true,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.preventExtensions(object), true);
    assertEqual(Reflect.defineProperty(object, key, descriptor), false);
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
  },
  "define >> configurable >> toggle flag": (object) => {
    const key = "foo";
    for (const enumerable1 of [true, false]) {
      for (const writable1 of [true, false]) {
        const descriptor1 = {
          value: 123,
          writable: writable1,
          enumerable: enumerable1,
          configurable: true,
        };
        for (const enumerable2 of [true, false]) {
          for (const writable2 of [true, false]) {
            const descriptor2 = {
              value: 123,
              writable: writable2,
              enumerable: enumerable2,
              configurable: true,
            };
            assertEqual(Reflect.defineProperty(object, key, descriptor1), true);
            assertDeepEqual(
              Reflect.getOwnPropertyDescriptor(object, key),
              descriptor1,
            );
            assertEqual(Reflect.defineProperty(object, key, descriptor2), true);
            assertDeepEqual(
              Reflect.getOwnPropertyDescriptor(object, key),
              descriptor2,
            );
          }
        }
      }
    }
  },
  "define >> configurable >> toggle accessor": (object) => {
    const key = "foo";
    /** @type {() => any} */
    const getter = () => null;
    /** @type {(value: any) => void} */
    const setter = (value) => {};
    for (const get1 of [getter, undefined]) {
      for (const set1 of [setter, undefined]) {
        const descriptor1 = {
          get: get1,
          set: set1,
          enumerable: true,
          configurable: true,
        };
        for (const get2 of [getter, undefined]) {
          for (const set2 of [setter, undefined]) {
            const descriptor2 = {
              get: get2,
              set: set2,
              enumerable: true,
              configurable: true,
            };
            assertEqual(
              Reflect.defineProperty(
                object,
                key,
                /** @type {PropertyDescriptor} */ (descriptor1),
              ),
              true,
            );
            assertDeepEqual(
              Reflect.getOwnPropertyDescriptor(object, key),
              descriptor1,
            );
            assertEqual(
              Reflect.defineProperty(
                object,
                key,
                /** @type {PropertyDescriptor} */ (descriptor2),
              ),
              true,
            );
            assertDeepEqual(
              Reflect.getOwnPropertyDescriptor(object, key),
              descriptor2,
            );
          }
        }
      }
    }
  },
  "define >> configurable >> toggle kind": (object) => {
    /** @type {PropertyDescriptor} */
    const descriptor1 = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: true,
    };
    /** @type {PropertyDescriptor} */
    const descriptor2 = {
      get: () => null,
      set: (_value) => {},
      enumerable: true,
      configurable: true,
    };
    assertEqual(Reflect.defineProperty(object, "foo", descriptor1), true);
    assertDeepEqual(
      Reflect.getOwnPropertyDescriptor(object, "foo"),
      descriptor1,
    );
    assertEqual(Reflect.defineProperty(object, "foo", descriptor2), true);
    assertDeepEqual(
      Reflect.getOwnPropertyDescriptor(object, "foo"),
      descriptor2,
    );
    assertEqual(Reflect.defineProperty(object, "foo", descriptor1), true);
    assertDeepEqual(
      Reflect.getOwnPropertyDescriptor(object, "foo"),
      descriptor1,
    );
  },
  "define >> non-configurable >> configurable": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: false,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(
      Reflect.defineProperty(object, key, {
        ...descriptor,
        configurable: true,
      }),
      false,
    );
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
  },
  "define >> non-configurable >> same >> data": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: false,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
  },
  "define >> non-configurable >> same >> accessor": (object) => {
    const key = "foo";
    /** @type {PropertyDescriptor} */
    const descriptor = {
      get: () => null,
      set: (_value) => {},
      enumerable: true,
      configurable: false,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
  },
  "define >> non-configurable >> disable enumerable": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: false,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(
      Reflect.defineProperty(object, key, { ...descriptor, enumerable: false }),
      false,
    );
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
  },
  "define >> non-configurable >> enable enumerable": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: false,
      configurable: false,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(
      Reflect.defineProperty(object, key, { ...descriptor, enumerable: true }),
      false,
    );
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
  },
  "define >> non-configurable >> disable writable": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: false,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(
      Reflect.defineProperty(object, key, { ...descriptor, writable: true }),
      true,
    );
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), {
      ...descriptor,
      writable: true,
    });
  },
  "define >> non-configurable >> enable writable": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: false,
      enumerable: false,
      configurable: false,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(
      Reflect.defineProperty(object, key, { ...descriptor, writable: true }),
      false,
    );
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
  },
  "define >> non-configurable >> to accessor": (object) => {
    const key = "foo";
    const descriptor = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: false,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(
      Reflect.defineProperty(object, key, {
        get: () => null,
        set: (_value) => {},
        enumerable: true,
        configurable: false,
      }),
      false,
    );
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
  },
  "define >> non-configurable >> to data": (object) => {
    const key = "foo";
    /** @type {PropertyDescriptor} */
    const descriptor = {
      get: () => null,
      set: (_value) => {},
      enumerable: true,
      configurable: false,
    };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
    assertEqual(
      Reflect.defineProperty(object, key, {
        value: 123,
        writable: true,
        enumerable: true,
        configurable: false,
      }),
      false,
    );
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor);
  },
  "define >> non-configurable >> set writable": (object) => {
    const key = "foo";
    const descriptor1 = {
      value: 123,
      writable: true,
      enumerable: true,
      configurable: false,
    };
    const descriptor2 = { ...descriptor1, value: 456 };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor1), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor1);
    assertEqual(Reflect.defineProperty(object, key, descriptor2), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor2);
  },
  "define >> non-configurable >> set constant": (object) => {
    const key = "foo";
    const descriptor1 = {
      value: 123,
      writable: false,
      enumerable: true,
      configurable: false,
    };
    const descriptor2 = { ...descriptor1, value: 456 };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor1), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor1);
    assertEqual(Reflect.defineProperty(object, key, descriptor2), false);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor1);
  },
  "define >> non-configurable >> change get": (object) => {
    const key = "foo";
    /** @type {PropertyDescriptor} */
    const descriptor1 = {
      get: () => null,
      set: (_value) => {},
      enumerable: true,
      configurable: false,
    };
    /** @type {PropertyDescriptor} */
    const descriptor2 = { ...descriptor1, get: () => null };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor1), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor1);
    assertEqual(Reflect.defineProperty(object, key, descriptor2), false);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor1);
  },
  "define >> non-configurable >> change set": (object) => {
    const key = "foo";
    /** @type {PropertyDescriptor} */
    const descriptor1 = {
      get: () => null,
      set: (_value) => {},
      enumerable: true,
      configurable: false,
    };
    /** @type {PropertyDescriptor} */
    const descriptor2 = { ...descriptor1, set: (_value) => null };
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.defineProperty(object, key, descriptor1), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor1);
    assertEqual(Reflect.defineProperty(object, key, descriptor2), false);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor1);
  },
  "derived >> data": (object) => {
    const key = "foo";
    const value = 123;
    assertEqual(Reflect.getPrototypeOf(object), null);
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.has(object, key), false);
    assertEqual(Reflect.get(object, key), undefined);
    assertEqual(Reflect.set(object, key, value), true);
    assertEqual(Reflect.get(object, key), value);
    assertEqual(Reflect.has(object, key), true);
  },
  "derived >> accessor": (object) => {
    const key = "foo";
    const value = 123;
    const receiver = {};
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(
      Reflect.defineProperty(object, key, {
        get(...args) {
          assertEqual(this, receiver);
          assertDeepEqual(args, []);
          return value;
        },
        set(...args) {
          assertEqual(this, receiver);
          assertDeepEqual(args, [value]);
        },
        enumerable: true,
        configurable: true,
      }),
      true,
    );
    assertEqual(Reflect.has(object, key), true);
    assertEqual(Reflect.get(object, key, receiver), value);
    assertEqual(Reflect.set(object, key, value, receiver), true);
  },
  "derived >> get constant": (object) => {
    const key = "foo";
    const value = 123;
    const receiver = {};
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(
      Reflect.defineProperty(object, key, {
        get(...args) {
          assertEqual(this, receiver);
          assertDeepEqual(args, []);
          return value;
        },
        set(...args) {
          assertEqual(this, receiver);
          assertDeepEqual(args, [value]);
        },
        enumerable: true,
        configurable: true,
      }),
      true,
    );
    assertEqual(Reflect.has(object, key), true);
    assertEqual(Reflect.get(object, key, receiver), value);
    assertEqual(Reflect.set(object, key, value, receiver), true);
  },
};

for (const [name, test] of Object.entries(tests)) {
  console.log(` actual >> ${name}`);
  test({ __proto__: null });
  console.log(`virtual >> ${name}`);
  test(
    new Proxy(
      { __proto__: null },
      virtualizeHandler(
        { __proto__: null },
        /** @type {any} */ ({ __proto__: null }),
      ),
    ),
  );
}

// Syncronize pre-existing non-configurable property
{
  const target = {};
  const descriptor = {
    value: 123,
    writable: true,
    enumerable: true,
    configurable: false,
  };
  Reflect.defineProperty(target, "foo", descriptor);
  const key = "foo";
  const proxy = new Proxy({}, virtualizeHandler(target, {}));
  assertDeepEqual(Reflect.getOwnPropertyDescriptor(proxy, key), descriptor);
}
