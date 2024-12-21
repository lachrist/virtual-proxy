import {
  RevocableVirtualProxy,
  VirtualArray,
  VirtualFunction,
  setupVirtualHandler,
  VirtualObject,
  VirtualProxy,
} from "../lib/index.mjs";
import {
  ok as assert,
  strictEqual as assertEqual,
  deepStrictEqual as assertDeepEqual,
  throws as assertThrow,
} from "node:assert";

const {
  Object: { hasOwn },
} = globalThis;

////////////////
// Descriptor //
////////////////

/**
 * @type {(
 *   descriptor: PropertyDescriptor,
 * ) => boolean}
 */
const isAccessorDescriptor = (descriptor) =>
  hasOwn(descriptor, "get") || hasOwn(descriptor, "set");

/**
 * @type {(
 *   descriptor1: PropertyDescriptor,
 *   descriptor2: PropertyDescriptor,
 * ) => boolean}
 */
const canOverwrite = (descriptor1, descriptor2) => {
  if (descriptor1.configurable) {
    return true;
  }
  if (descriptor2.configurable) {
    return false;
  }
  if (descriptor1.enumerable !== descriptor2.enumerable) {
    return false;
  }
  if (!isAccessorDescriptor(descriptor1)) {
    if (isAccessorDescriptor(descriptor2)) {
      return false;
    }
    if (!descriptor1.writable) {
      if (descriptor2.writable) {
        return false;
      }
      if (descriptor1.value !== descriptor2.value) {
        return false;
      }
    }
    return true;
  } else {
    if (!isAccessorDescriptor(descriptor2)) {
      return false;
    }
    if (hasOwn(descriptor1, "get") !== hasOwn(descriptor2, "get")) {
      return false;
    }
    if (descriptor1.get !== descriptor2.get) {
      return false;
    }
    if (hasOwn(descriptor1, "set") !== hasOwn(descriptor2, "set")) {
      return false;
    }
    if (descriptor1.set !== descriptor2.set) {
      return false;
    }
    return true;
  }
};

/**
 * @type {(
 *   target: object,
 *   key: string | symbol,
 *   descriptor1: PropertyDescriptor,
 *   descriptor2: PropertyDescriptor,
 * ) => void}
 */
const testDescriptor = (object, key, descriptor1, descriptor2) => {
  assertEqual(Reflect.defineProperty(object, key, descriptor1), true);
  assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), descriptor1);
  {
    const success = canOverwrite(descriptor1, descriptor2);
    assertEqual(Reflect.defineProperty(object, key, descriptor2), success);
    assertDeepEqual(
      Reflect.getOwnPropertyDescriptor(object, key),
      success ? descriptor2 : descriptor1,
    );
  }
  {
    const success = descriptor1.configurable && descriptor2.configurable;
    assertEqual(Reflect.deleteProperty(object, key), success);
    assertEqual(
      Reflect.getOwnPropertyDescriptor(object, key) === undefined,
      success,
    );
  }
};

const generateDescriptor = () => {
  /**
   * @type {PropertyDescriptor[]}
   */
  const descriptors = [];
  const flags = [true, false];
  {
    const flags = [true, false];
    const values = [123, 456];
    for (const configurable of flags) {
      for (const enumerable of flags) {
        for (const writable of flags) {
          for (const value of values) {
            descriptors.push({
              value,
              writable,
              enumerable,
              configurable,
            });
          }
        }
      }
    }
  }
  {
    /** @type {(undefined | (() => any))[]} */
    const getters = [undefined, () => null, () => null];
    /** @type {(undefined | ((value: any) => void))[]} */
    const setters = [undefined, (_value) => {}, (_value) => {}];
    for (const configurable of flags) {
      for (const enumerable of flags) {
        for (const get of getters) {
          for (const set of setters) {
            descriptors.push(
              /** @type {PropertyDescriptor} */ ({
                get,
                set,
                enumerable,
                configurable,
              }),
            );
          }
        }
      }
    }
  }
  return descriptors;
};

/**
 * @type {<T extends object>(
 *   target: T,
 * ) => T}
 */
const virtualize = (target) =>
  /** @type {any} */ (new Proxy({}, setupVirtualHandler(target, {})));

{
  const descriptors = generateDescriptor();
  const key = "foo";
  for (const descriptor1 of descriptors) {
    for (const descriptor2 of descriptors) {
      testDescriptor({ __proto__: null }, key, descriptor1, descriptor2);
      testDescriptor(
        new Proxy(
          { __proto__: null },
          setupVirtualHandler({ __proto__: null }, {}),
        ),
        key,
        descriptor1,
        descriptor2,
      );
      testDescriptor(
        new Proxy(
          Object.preventExtensions({ __proto__: null, [key]: null }),
          setupVirtualHandler({ __proto__: null }, {}),
        ),
        key,
        descriptor1,
        descriptor2,
      );
    }
  }
}

/////////////
// Calling //
/////////////

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
    setupVirtualHandler(
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

{
  const proxy = new Proxy(
    /** @type {(this: string, ...input: number[]) => number} */ (
      () => {
        throw new Error("unreachable");
      }
    ),
    setupVirtualHandler(
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

///////////
// Other //
///////////

/**
 * @type {{[key in string]: ((object: object) => void) }}
 */
const tests = {
  "prevent-extension": (object) => {
    const key = "foo";
    assertEqual(Reflect.setPrototypeOf(object, null), true);
    assertEqual(Reflect.getPrototypeOf(object), null);
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.isExtensible(object), true);
    assertEqual(Reflect.preventExtensions(object), true);
    assertEqual(Reflect.isExtensible(object), false);
    assertEqual(Reflect.preventExtensions(object), true);
    assertEqual(
      Reflect.defineProperty(object, key, {
        value: 123,
        writable: true,
        enumerable: true,
        configurable: true,
      }),
      false,
    );
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.setPrototypeOf(object, {}), false);
    assertEqual(Reflect.getPrototypeOf(object), null);
  },
  "prevent-extension >> existing property": (object) => {
    const key1 = "foo";
    const key2 = "bar";
    assertDeepEqual(Reflect.ownKeys(object), []);
    assertEqual(
      Reflect.defineProperty(object, key1, {
        value: 123,
        writable: true,
        enumerable: true,
        configurable: true,
      }),
      true,
    );
    assertEqual(
      Reflect.defineProperty(object, key2, {
        value: 456,
        writable: true,
        enumerable: true,
        configurable: false,
      }),
      true,
    );
    assertDeepEqual(Reflect.ownKeys(object), [key1, key2]);
    assertEqual(Reflect.preventExtensions(object), true);
    assertDeepEqual(Reflect.ownKeys(object), [key1, key2]);
  },
  "derived >> data >> writable": (object) => {
    const key = "foo";
    const value = 123;
    assertEqual(Reflect.setPrototypeOf(object, null), true);
    assertEqual(Reflect.getOwnPropertyDescriptor(object, key), undefined);
    assertEqual(Reflect.has(object, key), false);
    assertEqual(Reflect.get(object, key), undefined);
    assertEqual(Reflect.set(object, key, value), true);
    assertEqual(Reflect.get(object, key), value);
    assertEqual(Reflect.has(object, key), true);
    assertDeepEqual(Reflect.getOwnPropertyDescriptor(object, key), {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  },
  "derived >> data >> non-writable": (object) => {
    const key = "foo";
    const value1 = 123;
    const value2 = 456;
    assertEqual(
      Reflect.defineProperty(object, key, {
        value: value1,
        writable: false,
        enumerable: true,
        configurable: true,
      }),
      true,
    );
    assertEqual(Reflect.set(object, key, value2), false);
    assertEqual(Reflect.get(object, key), value1);
  },
  "derived >> accessor": (object) => {
    const key = "foo";
    const value1 = 123;
    const value2 = 456;
    const receiver = {};
    let called = 0;
    assertEqual(
      Reflect.defineProperty(object, key, {
        get() {
          assertEqual(this, receiver);
          return value1;
        },
        set(value) {
          called++;
          assertEqual(this, receiver);
          assertEqual(value, value2);
          return value;
        },
        configurable: true,
        enumerable: true,
      }),
      true,
    );
    assertEqual(Reflect.get(object, key, receiver), 123);
    assertEqual(Reflect.set(object, key, value2, receiver), true);
  },
};

for (const [name, test] of Object.entries(tests)) {
  console.log(` actual >> ${name}`);
  test({ __proto__: null });
  console.log(`virtual >> ${name}`);
  test(
    new Proxy(
      { __proto__: null },
      setupVirtualHandler(
        { __proto__: null },
        /** @type {any} */ ({ __proto__: null }),
      ),
    ),
  );
}

///////////////
// TypeError //
///////////////

{
  const key = "foo";
  const virtual = { __proto__: null };
  Reflect.defineProperty(virtual, key, {
    value: 123,
    writable: true,
    enumerable: true,
    configurable: false,
  });
  assertEqual(Reflect.preventExtensions(virtual), true);
  const proxy = new Proxy(
    virtual,
    setupVirtualHandler(
      { __proto__: null },
      /** @type {any} */ ({ __proto__: null }),
    ),
  );
  assertThrow(() => {
    Reflect.isExtensible(proxy);
  }, TypeError);
  assertThrow(() => {
    Reflect.has(proxy, key);
  }, TypeError);
  assertThrow(() => {
    Reflect.deleteProperty(proxy, key);
  }, TypeError);
  assertThrow(() => {
    Reflect.getOwnPropertyDescriptor(proxy, key);
  }, TypeError);
  assertThrow(() => {
    Reflect.ownKeys(proxy);
  }, TypeError);
}

// Incompatible property on virtual target
{
  const key = "foo";
  const virtual = { __proto__: null };
  assertEqual(
    Reflect.defineProperty(virtual, key, {
      value: 123,
      writable: false,
      enumerable: true,
      configurable: false,
    }),
    true,
  );
  const proxy = new Proxy(
    virtual,
    setupVirtualHandler(
      { __proto__: null },
      /** @type {any} */ ({ __proto__: null }),
    ),
  );
  assertThrow(() => {
    Reflect.getOwnPropertyDescriptor(proxy, key);
  }, TypeError);
  assertThrow(() => {
    Reflect.defineProperty(proxy, key, {
      value: 456,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }, TypeError);
}

// Incompatible property on virtual target
{
  const key = "foo";
  const virtual = { __proto__: null };
  assertEqual(
    Reflect.defineProperty(virtual, key, {
      value: 123,
      writable: false,
      enumerable: true,
      configurable: false,
    }),
    true,
  );
  const target = { __proto__: null };
  assertEqual(
    Reflect.defineProperty(target, key, {
      value: 456,
      writable: false,
      enumerable: true,
      configurable: false,
    }),
    true,
  );
  const proxy = new Proxy(
    virtual,
    setupVirtualHandler(target, /** @type {any} */ ({ __proto__: null })),
  );
  assertThrow(() => {
    Reflect.getOwnPropertyDescriptor(proxy, key);
  }, TypeError);
  assertEqual(
    Reflect.defineProperty(proxy, key, {
      value: 789,
      writable: false,
      enumerable: true,
      configurable: false,
    }),
    false,
  );
}

// Cannot define property before preventing extensions
{
  const key = "foo";
  const virtual = { __proto__: null };
  assertEqual(Reflect.preventExtensions(virtual), true);
  const target = { __proto__: null };
  assertEqual(
    Reflect.defineProperty(target, key, {
      value: 456,
      writable: false,
      enumerable: true,
      configurable: false,
    }),
    true,
  );
  const proxy = new Proxy(
    virtual,
    setupVirtualHandler(target, /** @type {any} */ ({ __proto__: null })),
  );
  assertThrow(() => {
    Reflect.preventExtensions(proxy);
  }, TypeError);
}

// Cannot synchronize prototype before preventing extensions
{
  const virtual = { __proto__: {} };
  assertEqual(Reflect.preventExtensions(virtual), true);
  const target = { __proto__: {} };
  const proxy = new Proxy(
    virtual,
    setupVirtualHandler(target, /** @type {any} */ ({ __proto__: null })),
  );
  assertThrow(() => {
    Reflect.preventExtensions(proxy);
  }, TypeError);
}

{
  const virtual = { __proto__: null };
  const target = { __proto__: null };
  assertEqual(Reflect.preventExtensions(target), true);
  const proxy = new Proxy(
    virtual,
    setupVirtualHandler(target, /** @type {any} */ ({ __proto__: null })),
  );
  assertEqual(Reflect.isExtensible(proxy), false);
}

// Cannot update non-configurable property
{
  const key = "foo";
  const virtual = { __proto__: null };
  assertEqual(Reflect.preventExtensions(virtual), true);
  const target = { __proto__: null };
  const proxy = new Proxy(
    virtual,
    setupVirtualHandler(target, /** @type {any} */ ({ __proto__: null })),
  );
  assertThrow(() => {
    Reflect.defineProperty(proxy, key, {
      value: 123,
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }, TypeError);
}

/////////////////
// Convenience //
/////////////////

assertEqual(Array.isArray(VirtualProxy([123], [], {})), true);

assertEqual(Array.isArray(RevocableVirtualProxy([], [], {}).proxy), true);

{
  const proxy = VirtualObject({}, {});
  assertEqual(Array.isArray(proxy), false);
  assertEqual(typeof proxy, "object");
}

{
  const proxy = VirtualArray({}, {});
  assertEqual(Array.isArray(proxy), true);
  assertEqual(typeof proxy, "object");
}

{
  const proxy = VirtualFunction({}, {});
  assertEqual(Array.isArray(proxy), false);
  assertEqual(typeof proxy, "function");
}
