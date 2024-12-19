const {
  undefined,
  Object: { hasOwn },
  Boolean,
  TypeError,
  Reflect: {
    apply,
    construct,
    getOwnPropertyDescriptor,
    isExtensible,
    defineProperty,
    deleteProperty,
    ownKeys,
    getPrototypeOf,
    setPrototypeOf,
    preventExtensions,
    has,
    get,
    set,
  },
} = globalThis;

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

/**
 * @type {(
 *   descriptor: import(".").Descriptor,
 * ) => descriptor is import(".").DataDescriptor}
 */
const isDataDescriptor = (descriptor) => hasOwn(descriptor, "value");

// isExtensible >> Object.isExtensible(proxy) must return the same value as Object.isExtensible(target).
// preventExtensions >> Object.preventExtensions(proxy) only returns true if Object.isExtensible(proxy) is false.
// getPrototypeOf >> If target is not extensible, Object.getPrototypeOf(proxy) method must return the same value as Object.getPrototypeOf(target).
// ownKeys >> If the target object is not extensible, then the result List must contain all the keys of the own properties of the target object and no other values.
// getOwnPropertyDescriptor >> A property cannot be reported as existent, if it does not exists as an own property of the target object and the target object is not extensible.
/**
 * @type {<V extends object, T>(
 *   $handler: import(".").VirtualHandler<V, T>,
 *   $target: V,
 * ) => void}
 */
const preventExtensionsHelper = ($handler, $target) => {
  const keys = $handler.handler.ownKeys($handler.target);
  for (let index = 0, length = keys.length; index < length; index++) {
    if (!getOwnPropertyDescriptor($target, keys[index])) {
      defineProperty($target, keys[index], {
        value: null,
        configurable: true,
      });
    }
  }
  setPrototypeOf($target, $handler.handler.getPrototypeOf($handler.target));
  preventExtensions($target);
};

/**
 * @template {object} V
 * @template {object} T
 * @type {import(".").VirtualHandlerPrototype<V, T>}
 */
const prototype = {
  //////////////
  // Function //
  //////////////
  // The target must be a callable itself. That is, it must be a function object.
  apply($target, that, args) {
    if (typeof $target !== "function") {
      throw new TypeError("Target is not a function");
    }
    return this.handler.apply(this.target, that, args);
  },
  // [RELEGATED] The result must be an Object.
  construct($target, args, new_target) {
    construct(Boolean, [], /** @type {Function} */ ($target));
    construct(Boolean, [], /** @type {Function} */ (new_target));
    return this.handler.construct(this.target, args, new_target);
  },
  //////////////
  // Property //
  //////////////
  // https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-defineownproperty-p-desc
  // A property cannot be added, if the target object is not extensible.
  // A property cannot be added as or modified to be non-configurable, if it does not exists as a non-configurable own property of the target object.
  // A property may not be non-configurable, if a corresponding configurable property of the target object exists.
  // If a property has a corresponding target object property then Object.defineProperty(target, prop, descriptor) will not throw an exception.
  // In strict mode, a false return value from the defineProperty handler will throw a TypeError exception.
  defineProperty($target, key, descriptor) {
    const $discriptor = /** @type {import(".").Descriptor} */ (
      getOwnPropertyDescriptor($target, key)
    );
    if (!$discriptor && !isExtensible($target)) {
      return false;
    }
    if ($discriptor && !$discriptor.configurable) {
      if (descriptor.configurable) {
        return false;
      }
      if ($discriptor.enumerable !== descriptor.enumerable) {
        return false;
      }
      if (isDataDescriptor(descriptor)) {
        if (!isDataDescriptor($discriptor)) {
          return false;
        }
        if (!$discriptor.writable) {
          if (descriptor.writable) {
            return false;
          }
          if (descriptor.value !== $discriptor.value) {
            return false;
          }
        }
      } else {
        if (isDataDescriptor($discriptor)) {
          return false;
        }
        if (descriptor.get !== $discriptor.get) {
          return false;
        }
        if (descriptor.set !== $discriptor.set) {
          return false;
        }
      }
    }
    if (!descriptor.configurable) {
      defineProperty($target, key, descriptor);
    }
    return this.handler.defineProperty(this.target, key, descriptor);
  },
  // [RELEGATED] getOwnPropertyDescriptor must return an object or undefined.
  // A property cannot be reported as non-existent, if it exists as a non-configurable own property of the target object.
  // A property cannot be reported as non-existent, if it exists as an own property of the target object and the target object is not extensible.
  // A property cannot be reported as existent, if it does not exists as an own property of the target object and the target object is not extensible.
  // A property cannot be reported as non-configurable, if it does not exists as an own property of the target object or if it exists as a configurable own property of the target object.
  // The result of Object.getOwnPropertyDescriptor(target) can be applied to the target object using Object.defineProperty and will not throw an exception.
  getOwnPropertyDescriptor($target, key) {
    const $descriptor = /** @type {import(".").Descriptor} */ (
      getOwnPropertyDescriptor($target, key)
    );
    if (
      $descriptor &&
      isDataDescriptor($descriptor) &&
      !$descriptor.configurable &&
      !$descriptor.writable
    ) {
      return $descriptor;
    }
    const descriptor = /** @type {import(".").Descriptor} */ (
      this.handler.getOwnPropertyDescriptor(this.target, key)
    );
    if (descriptor && descriptor.configurable) {
      defineProperty($target, key, descriptor);
    }
    if (!descriptor && $descriptor && !isExtensible($target)) {
      deleteProperty($target, key);
    }
    return descriptor;
  },
  // A property cannot be deleted, if it exists as a non-configurable own property of the target object.
  deleteProperty($target, key) {
    const $descriptor = getOwnPropertyDescriptor($target, key);
    if ($descriptor && !$descriptor.configurable) {
      return false;
    }
    return this.handler.deleteProperty(this.target, key);
  },
  // [RELEGATED] The result of ownKeys must be an array.
  // [RELEGATED] The type of each array element is either a String or a Symbol.
  // The result List must contain the keys of all non-configurable own properties of the target object.
  // If the target object is not extensible, then the result List must contain all the keys of the own properties of the target object and no other values.
  ownKeys(target) {
    if (isExtensible(target)) {
      return this.handler.ownKeys(this.target);
    }
    const $keys = ownKeys(target);
    const keys = this.handler.ownKeys(this.target);
    const $length = $keys.length;
    for (let $index = 0; $index < $length; $index++) {
      const $key = $keys[$index];
      if (!includes(keys, $key)) {
        deleteProperty(target, $key);
      }
    }
    return keys;
  },
  ////////////////
  // Extensible //
  ////////////////
  // Object.isExtensible(proxy) must return the same value as Object.isExtensible(target).
  isExtensible(target) {
    if (isExtensible(target)) {
      if (this.handler.isExtensible(this.target)) {
        return true;
      }
      preventExtensionsHelper(this, target);
      return false;
    }
    return false;
  },
  // Object.preventExtensions(proxy) only returns true if Object.isExtensible(proxy) is false.
  preventExtensions(target) {
    if (isExtensible(target)) {
      this.handler.preventExtensions(this.target);
      preventExtensionsHelper(this, target);
    }
    return true;
  },
  ///////////////
  // Prototype //
  ///////////////
  // [RELEGATED] getPrototypeOf method must return an object or null. >>
  // If target is not extensible, Object.getPrototypeOf(proxy) method must return the same value as Object.getPrototypeOf(target).
  getPrototypeOf(target) {
    if (isExtensible(target)) {
      return this.handler.getPrototypeOf(this.target);
    }
    return getPrototypeOf(target);
  },
  // If target is not extensible, the prototype parameter must be the same value as Object.getPrototypeOf(target).
  setPrototypeOf(target, prototype) {
    if (isExtensible(target))
      return this.handler.setPrototypeOf(this.target, prototype);
    return getPrototypeOf(target) === prototype;
  },
  //////////////////////
  // Property-Derived //
  //////////////////////
  // A property cannot be reported as non-existent, if it exists as a non-configurable own property of the target object.
  // A property cannot be reported as non-existent, if it exists as an own property of the target object and the target object is not extensible.
  has(target, key) {
    const descriptor = /** @type {import(".").Descriptor} */ (
      getOwnPropertyDescriptor(target, key)
    );
    if (descriptor && !descriptor.configurable) {
      return true;
    }
    if (this.handler.getOwnPropertyDescriptor(this.target, key)) {
      return true;
    }
    const prototype = isExtensible(target)
      ? this.handler.getPrototypeOf(this.target)
      : getPrototypeOf(target);
    const result = Boolean(prototype) && has(prototype, key);
    if (!result && descriptor && !isExtensible(target)) {
      deleteProperty(target, key);
    }
    return result;
  },
  // The value reported for a property must be the same as the value of the corresponding target object property if the target object property is a non-writable, non-configurable data property.
  // The value reported for a property must be undefined if the corresponding target object property is non-configurable accessor property that has undefined as its [[Get]] attribute.
  get(target, key, receiver) {
    const $descriptor = /** @type {import(".").Descriptor} */ (
      getOwnPropertyDescriptor(target, key)
    );
    if ($descriptor && !$descriptor.configurable) {
      if (isDataDescriptor($descriptor)) {
        if (!$descriptor.writable) {
          return $descriptor.value;
        }
      } else {
        if ($descriptor.get) {
          return apply($descriptor.get, receiver, []);
        }
        return undefined;
      }
    }
    const descriptor = this.handler.getOwnPropertyDescriptor(this.target, key);
    if (descriptor) {
      if (isDataDescriptor(descriptor)) {
        return descriptor.value;
      } else {
        if (descriptor.get) {
          return apply(descriptor.get, receiver, []);
        }
        return undefined;
      }
    }
    const prototype = isExtensible(target)
      ? this.handler.getPrototypeOf(this.target)
      : getPrototypeOf(target);
    if (prototype) {
      return get(prototype, key, receiver);
    }
    return undefined;
  },
  // https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-set-p-v-receiver
  // Cannot change the value of a property to be different from the value of the corresponding target object property if the corresponding target object property is a non-writable, non-configurable data property.
  // Cannot set the value of a property if the corresponding target object property is a non-configurable accessor property that has undefined as its [[Set]] attribute.
  // In strict mode, a false return value from the set handler will throw a TypeError exception.
  set(target, key, value, receiver) {
    const $descriptor = /** @type {import(".").Descriptor} */ (
      getOwnPropertyDescriptor(target, key)
    );
    if ($descriptor && !$descriptor.configurable) {
      if (isDataDescriptor($descriptor)) {
        if (!$descriptor.writable) {
          return false;
        }
      } else {
        if ($descriptor.set) {
          apply($descriptor.set, receiver, [value]);
          return true;
        }
        return false;
      }
    }
    let descriptor = this.handler.getOwnPropertyDescriptor(this.target, key);
    if (!descriptor) {
      const prototype = isExtensible(target)
        ? this.handler.getPrototypeOf(this.target)
        : getPrototypeOf(target);
      if (prototype) {
        return set(prototype, key, value, receiver);
      }
      descriptor = {
        value: void 0,
        writable: true,
        enumerable: true,
        configurable: true,
      };
    }
    if (isDataDescriptor(descriptor)) {
      if (!descriptor.writable) return false;
      if (
        receiver === null ||
        (typeof receiver !== "object" && typeof receiver !== "function")
      ) {
        return false;
      }
      const receiver_descriptor = getOwnPropertyDescriptor(receiver, key) || {
        value: void 0,
        writable: true,
        enumerable: true,
        configurable: true,
      };
      if (!getOwnPropertyDescriptor(receiver_descriptor, "value")) {
        return false;
      }
      if (!receiver_descriptor.writable) {
        return false;
      }
      setPrototypeOf(receiver_descriptor, null);
      receiver_descriptor.value = value;
      defineProperty(receiver, key, receiver_descriptor);
      return true;
    } else {
      if (descriptor.set) {
        apply(descriptor.set, receiver, [value]);
        return true;
      }
      return false;
    }
  },
};
