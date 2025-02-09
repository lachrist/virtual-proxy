const {
  Proxy,
  Proxy: { revocable },
  String,
  TypeError,
  JSON: { stringify },
  Object: { hasOwn },
  Reflect,
  Reflect: {
    isExtensible,
    defineProperty,
    deleteProperty,
    ownKeys,
    setPrototypeOf,
    preventExtensions,
  },
} = globalThis;

//////////
// Util //
//////////

/**
 * @type {<X>(array: X[], item: X) => boolean}
 */
const includes = (array, item) => {
  const { length } = array;
  for (let index = 0; index < length; index++) {
    if (array[index] === item) {
      return true;
    }
  }
  return false;
};

////////////////////
// VirtualHandler //
////////////////////

/**
 * @type {(
 *   handler: keyof typeof Reflect,
 *   operation: keyof typeof Reflect,
 * ) => string}
 */
const format = (operation, handler) =>
  `Cannot perform ${operation} on virtual target in ${handler} handler`;

/**
 * @type {(
 *   handler: keyof typeof Reflect,
 *   operation: keyof typeof Reflect,
 *   key: string | symbol,
 * ) => string}
 */
const formatWithKey = (handler, operation, key) =>
  `Cannot perform ${operation} (${stringify(String(key))}) on virtual target in ${handler} handler`;

/**
 * @type {<V extends object, T extends object>(
 *   origin: "preventExtensions" | "isExtensible",
 *   $target: T,
 *   context: {
 *     target: V,
 *     handler: import(".").VirtualHandler<V>,
 *   },
 * ) => boolean}
 */
const preventExtensionHelper = (origin, $target, { target, handler }) => {
  const keys = handler.ownKeys(target);
  for (let index = 0, length = keys.length; index < length; index++) {
    const key = keys[index];
    if (!hasOwn($target, key)) {
      if (
        !defineProperty($target, key, {
          value: null,
          writable: true,
          configurable: true,
          enumerable: true,
        })
      ) {
        throw new TypeError(formatWithKey(origin, "defineProperty", key));
      }
    }
  }
  if (!setPrototypeOf($target, handler.getPrototypeOf(target))) {
    throw new TypeError(format(origin, "setPrototypeOf"));
  }
  return preventExtensions($target);
};

/**
 * @template {object} V
 * @template {object} T
 * @type {import(".").ActualHandler<V, T>}
 */
const actual_handler_prototype = {
  //////////////
  // Function //
  //////////////
  // a) [RELEGATED] The target must be a callable itself. That is, it must be a function object.
  apply(_$target, that, args) {
    const { handler, target } = this;
    return handler.apply(target, that, args);
  },
  // a) [RELEGATED] The target must be a constructor itself.
  // b) [RELEGATED] The result must be an Object.
  construct(_$target, args, new_target) {
    const { handler, target } = this;
    // construct(Boolean, [], /** @type {Function} */ ($target));
    // construct(Boolean, [], /** @type {Function} */ (new_target));
    return handler.construct(target, args, new_target);
  },
  ////////////////
  // Extensible //
  ////////////////
  // a) The result must be the same as Reflect.isExtensible() on the target object.
  isExtensible($target) {
    const { handler, target } = this;
    const extensible = handler.isExtensible(target);
    // a)
    if (extensible && !isExtensible($target)) {
      throw new TypeError("Cannot undo preventExtensions on virtual target");
    }
    if (!extensible && isExtensible($target)) {
      /* c8 ignore start */
      if (!preventExtensionHelper("isExtensible", $target, this)) {
        throw new TypeError(format("isExtensible", "preventExtensions"));
      }
      /* c8 ignore stop */
    }
    return extensible;
  },
  // a) The result is only true if Reflect.isExtensible() on the target object returns false after calling handler.preventExtensions()
  preventExtensions($target) {
    const { handler, target } = this;
    const success = handler.preventExtensions(target);
    // a)
    if (success) {
      /* c8 ignore start */
      if (!preventExtensionHelper("preventExtensions", $target, this)) {
        throw new TypeError(format("preventExtensions", "preventExtensions"));
      }
      /* c8 ignore stop */
    }
    return success;
  },
  ///////////////
  // Prototype //
  ///////////////
  // a) [RELEGATED] The result must be either an Object or null
  // b) [RELEGATED] If the target object is not extensible, the result must be the same as the result of Reflect.getPrototypeOf(target).
  getPrototypeOf(_$target) {
    const { handler, target } = this;
    return handler.getPrototypeOf(target);
  },
  // a) [RELEGATED] If the target object is not extensible, the prototype cannot be changed.
  setPrototypeOf(_$target, prototype) {
    const { handler, target } = this;
    return handler.setPrototypeOf(target, prototype);
  },
  //////////////
  // Property //
  //////////////
  // a) [RELEGATED] A property cannot be added, if the target object is not extensible.
  // b) A property cannot be non-configurable, unless there exists a corresponding non-configurable own property of the target object.
  // c) A non-configurable property cannot be non-writable, unless there exists a corresponding non-configurable, non-writable own property of the target object.
  // d) If a property has a corresponding property on the target object, then the target object property's descriptor must be compatible with descriptor.
  defineProperty($target, key, descriptor) {
    const { handler, target } = this;
    const success = handler.defineProperty(target, key, descriptor);
    // b) + c) + d)
    if (success) {
      const $descriptor = handler.getOwnPropertyDescriptor(target, key);
      if (!$descriptor) {
        throw new TypeError("Missing property descriptor");
      }
      if (!defineProperty($target, key, $descriptor)) {
        throw new TypeError(
          formatWithKey("defineProperty", "defineProperty", key),
        );
      }
    }
    return success;
  },
  // a) [RELEGATED] The result must be either an Object or undefined.
  // b) [RELEGATED] A property cannot be reported as non-existent, if it exists as a non-configurable own property of the target object.
  // c) A property cannot be reported as non-existent, if it exists as an own property of a non-extensible target object.
  // d) [RELEGATED] A property cannot be reported as existent, if it does not exist as an own property of the target object and the target object is not extensible.
  // e) A property cannot be reported as non-configurable, unless it exists as a non-configurable own property of the target object.
  // f) A property cannot be reported as both non-configurable and non-writable, unless it exists as a non-configurable, non-writable own property of the target object.
  // g) If a property has a corresponding property on the target object, then the target object property's descriptor must be compatible with descriptor.
  getOwnPropertyDescriptor($target, key) {
    const { handler, target } = this;
    const descriptor = handler.getOwnPropertyDescriptor(target, key);
    // c)
    if (!descriptor && !isExtensible($target)) {
      if (!deleteProperty($target, key)) {
        throw new TypeError(
          formatWithKey("getOwnPropertyDescriptor", "deleteProperty", key),
        );
      }
    }
    // e) + f) + g)
    if (descriptor && !descriptor.configurable) {
      if (!defineProperty($target, key, descriptor)) {
        throw new TypeError(
          formatWithKey("getOwnPropertyDescriptor", "defineProperty", key),
        );
      }
    }
    return descriptor;
  },
  // a) [RELEGATED] A property cannot be reported as deleted, if it exists as a non-configurable own property of the target object.
  // b) A property cannot be reported as deleted, if it exists as an own property of the target object and the target object is non-extensible.
  deleteProperty($target, key) {
    const { handler, target } = this;
    const success = handler.deleteProperty(target, key);
    // b)
    if (success && !isExtensible($target)) {
      if (!deleteProperty($target, key)) {
        throw new TypeError(
          formatWithKey("deleteProperty", "deleteProperty", key),
        );
      }
    }
    return success;
  },
  // a) [RELEGATED] The result is an Object.
  // b) [RELEGATED] The list of keys contains no duplicate values.
  // c) [RELEGATED] The type of each key is either a String or a Symbol.
  // d) [RELEGATED] The type of each array element is either a String or a Symbol.
  // e) [RELEGATED] The result list must contain the keys of all non-configurable own properties of the target object.
  // f) If the target object is not extensible, then the result list must contain all the keys of the own properties of the target object and no other values.
  ownKeys($target) {
    const { handler, target } = this;
    const keys = handler.ownKeys(target);
    // f)
    if (!isExtensible($target)) {
      const $keys = ownKeys($target);
      const $length = $keys.length;
      for (let $index = 0; $index < $length; $index++) {
        const $key = $keys[$index];
        if (!includes(keys, $key)) {
          if (!deleteProperty($target, $key)) {
            throw new TypeError(
              formatWithKey("ownKeys", "deleteProperty", $key),
            );
          }
        }
      }
    }
    return keys;
  },
  //////////////////////
  // Property-Derived //
  //////////////////////
  // a) [RELEGATED] A property cannot be reported as non-existent, if it exists as a non-configurable own property of the target object.
  // b) A property cannot be reported as non-existent, if it exists as an own property of the target object and the target object is not extensible.
  has($target, key) {
    const { handler, target } = this;
    const existent = handler.has(target, key);
    // b)
    if (!existent && !isExtensible($target)) {
      if (!deleteProperty($target, key)) {
        throw new TypeError(formatWithKey("has", "deleteProperty", key));
      }
    }
    return existent;
  },
  // a) [RELEGATED] The value reported for a property must be the same as the value of the corresponding target object property, if the target object property is a non-writable, non-configurable own data property.
  // b) [RELEGATED] The value reported for a property must be undefined, if the corresponding target object property is a non-configurable own accessor property that has an undefined getter.
  get(_$target, key, receiver) {
    const { handler, target } = this;
    return handler.get(target, key, receiver);
  },
  // a) [RELEGATED] Cannot change the value of a property to be different from the value of the corresponding target object property, if the corresponding target object property is a non-writable, non-configurable own data property.
  // b) [RELEGATED] Cannot set the value of a property if the corresponding target object property is a non-configurable own accessor property that has an undefined setter.
  set(_$target, key, value, receiver) {
    const { handler, target } = this;
    return handler.set(target, key, value, receiver);
  },
};

////////////
// Export //
////////////

const reflection = /** @type {(keyof typeof Reflect)[]} */ (ownKeys(Reflect));

/**
 * @type {<V extends object>(
 *   handler: ProxyHandler<V>,
 * ) => import(".").VirtualHandler<V>}
 */
const toVirtualHandler = (handler) => {
  const descriptor = {
    __proto__: null,
    value: /** @type {any} */ (null),
    writable: true,
    enumerable: true,
    configurable: true,
  };
  const { length } = reflection;
  for (let index = 0; index < length; index++) {
    const key = reflection[index];
    if (!hasOwn(handler, key)) {
      descriptor.value = Reflect[key];
      defineProperty(handler, key, descriptor);
    }
  }
  return /** @type {any} */ (handler);
};

/**
 * @type {<V extends object, T extends object>(
 *   target: V,
 *   handler: ProxyHandler<V>,
 *   options?: {
 *     TypeError?: new (message: string) => unknown,
 *   },
 * ) => import(".").ActualHandler<V, T>}
 */
export const setupVirtualHandler = (target, handler, options) =>
  /** @type {any} */ ({
    __proto__: actual_handler_prototype,
    target,
    handler: toVirtualHandler(handler),
    TypeError:
      options && hasOwn(options, "TypeError")
        ? options.TypeError
        : globalThis.TypeError,
  });

/**
 * @type {<V extends object, T extends object>(
 *   integrity: T,
 *   target: V,
 *   handler: ProxyHandler<V>,
 *   options?: {
 *     TypeError?: new (message: string) => unknown,
 *   },
 * ) => T}
 */
export const VirtualProxy = function (integrity, target, handler, options) {
  return new Proxy(integrity, setupVirtualHandler(target, handler, options));
};

/**
 * @type {<V extends object, T extends object>(
 *   integrity: T,
 *   target: V,
 *   handler: ProxyHandler<V>,
 *   options?: {
 *     TypeError?: new (message: string) => unknown,
 *   }
 * ) => { proxy: T, revoke: () => void }}
 */
export const RevocableVirtualProxy = function (
  integrity,
  target,
  handler,
  options,
) {
  return revocable(integrity, setupVirtualHandler(target, handler, options));
};

/**
 * @type {<V extends object>(
 *   target: V,
 *   handler: ProxyHandler<V>,
 *   options?: {
 *     TypeError?: new (message: string) => unknown,
 *   },
 * ) => object}
 */
export const VirtualObject = function (virtual, handler, options) {
  return VirtualProxy({ __proto__: null }, virtual, handler, options);
};

/**
 * @type {<V extends object>(
 *   virtual: V,
 *   handler: ProxyHandler<V>,
 *   options?: {
 *     TypeError?: new (message: string) => unknown,
 *   },
 * ) => any[]}
 */
export const VirtualArray = function (virtual, handler, options) {
  return VirtualProxy([], virtual, handler, options);
};

/**
 * @type {<V extends object>(
 *   virtual: V,
 *   handler: ProxyHandler<V>,
 *   options?: {
 *     TypeError?: new (message: string) => unknown,
 *   },
 * ) => Function}
 */
export const VirtualFunction = function (virtual, handler, options) {
  return VirtualProxy(
    /* c8 ignore start */
    function () {
      "use-strict";
    },
    /* c8 ignore stop */
    virtual,
    handler,
    options,
  );
};
