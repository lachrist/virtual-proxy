
const Proxy = global.Proxy;
const Boolean = global.Boolean;
const TypeError = global.TypeError;
const Object_create = Object.create;
const Object_is = Object.is;
const WeakMap_prototype_get = WeakMap.prototype.get;
const WeakMap_prototype_set = WeakMap.prototype.set;

const Reflect_apply = Reflect.apply;
const Reflect_construct = Reflect.construct;
const Reflect_defineProperty = Reflect.defineProperty;
const Reflect_deleteProperty = Reflect.deleteProperty;
const Reflect_get = Reflect.get;
const Reflect_getOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
const Reflect_getPrototypeOf = Reflect.getPrototypeOf;
const Reflect_has = Reflect.has;
const Reflect_isExtensible = Reflect.isExtensible;
const Reflect_preventExtensions = Reflect.preventExtensions;
const Reflect_ownKeys = Reflect.ownKeys;
const Reflect_set = Reflect.set;
const Reflect_setPrototypeOf = Reflect.setPrototypeOf;

const cache = new WeakMap();
cache.get = WeakMap_prototype_get;
cache.set = WeakMap_prototype_set;
const inners = new WeakMap();
inners.get = WeakMap_prototype_get;
inners.set = WeakMap_prototype_set;

// https://tc39.github.io/ecma262/#sec-invariants-of-the-essential-internal-methods

module.exports = (target, inner, reflect) => {

  if (reflect === void 0) {
    reflect = inner;
    inner = target;
    if (Array.isArray(inner)) {
      target = [];
    } else if (typeof inner === "function") {
      if (Reflect_getOwnPropertyDescriptor(inner, "prototype")) {
        target = Reflect.getOwnPropertyDescriptor(inner, "arguments") ? function () {} : function () { "use strict"; };
      } else {
        target = () => {};
      }
    } else {
      target = {};
    }
  }
  inners.set(target, inner);
  let handlers = cache.has(reflect);
  if (handlers)
    return new Proxy(target, handlers);
  handlers = Object_create(null);

  //////////////
  // Function //
  //////////////
  // The target must be a callable itself. That is, it must be a function object.
  handlers.apply = (target, value, values) => {
    if (typeof target !== "function")
      throw new TypeError("Target is not a function");
    return reflect.apply(inners.get(target), value, values);
  };
  // [RELEGATED] The result must be an Object.
  handlers.construct = (target, values, newtarget) => {
    Reflect.construct(Boolean, [], target);
    Reflect.construct(Boolean, [], newtarget);
    return reflect.construct(inners.get(target), values, newtarget);
  };

  //////////////
  // Property //
  //////////////
  // https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-defineownproperty-p-desc
  // A property cannot be added, if the target object is not extensible.
  // A property cannot be added as or modified to be non-configurable, if it does not exists as a non-configurable own property of the target object.
  // A property may not be non-configurable, if a corresponding configurable property of the target object exists.
  // If a property has a corresponding target object property then Object.defineProperty(target, prop, descriptor) will not throw an exception.
  // In strict mode, a false return value from the defineProperty handler will throw a TypeError exception.
  handlers.defineProperty = (target, key, descriptor) => {
    const target_descriptor = Reflect_getOwnPropertyDescriptor(target, key);
    if (!target_descriptor && !Reflect_isExtensible(target))
      return false;
    if (target_descriptor && !target_descriptor.configurable) {
      if (descriptor.configurable)
        return false;
      if (target_descriptor.enumerable && !descriptor.enumerable)
        return false;
      if (!target_descriptor.enumerable && descriptor.enumerable)
        return false;
      if (Reflect_getOwnPropertyDescriptor(descriptor, "value") || Reflect_getOwnPropertyDescriptor(descriptor, "writable")) {
        if (Reflect_getOwnPropertyDescriptor(target_descriptor, "get"))
          return false;
        if (!target_descriptor.writable && target_descriptor.writable)
          return false;
        if (!target_descriptor.writable && target_descriptor.value !== descriptor.value)
          return false;
      } else {
        if (Reflect_getOwnPropertyDescriptor(target_descriptor, "value"))
          return false;
        if (target_descriptor.get !== descriptor.get)
          return false;
        if (target_descriptor.set !== descriptor.set)
          return false;
      }
    }
    if (!descriptor.configurable)
      Reflect_defineProperty(target, key, descriptor);
    return reflect.defineProperty(inners.get(target), key, descriptor);
  };
  // [RELEGATED] getOwnPropertyDescriptor must return an object or undefined.
  // A property cannot be reported as non-existent, if it exists as a non-configurable own property of the target object.
  // A property cannot be reported as non-existent, if it exists as an own property of the target object and the target object is not extensible.
  // A property cannot be reported as existent, if it does not exists as an own property of the target object and the target object is not extensible.
  // A property cannot be reported as non-configurable, if it does not exists as an own property of the target object or if it exists as a configurable own property of the target object.
  // The result of Object.getOwnPropertyDescriptor(target) can be applied to the target object using Object.defineProperty and will not throw an exception.
  handlers.getOwnPropertyDescriptor = (target, key) => {
    const target_descriptor = Reflect_getOwnPropertyDescriptor(target, key);
    if (target_descriptor && !target_descriptor.configurable && !target_descriptor.writable)
      return target_descriptor;
    const descriptor = reflect.getOwnPropertyDescriptor(inners.get(target), key);
    if (descriptor && !descriptor.configurable)
      Reflect_defineProperty(target, key, descriptor);
    if (!descriptor && target_descriptor && !Reflect_isExtensible(target))
      Reflect_deleteProperty(target, key);
    return descriptor;
  };
  // A property cannot be deleted, if it exists as a non-configurable own property of the target object.
  handlers.deleteProperty = (target, key) => {
    const target_descriptor = Reflect_getOwnPropertyDescriptor(target, key);
    if (target_descriptor && !target_descriptor.configurable)
      return false;
    return reflect.deleteProperty(inners.get(target), key);
  };
  // [RELEGATED] The result of ownKeys must be an array.
  // [RELEGATED] The type of each array element is either a String or a Symbol.
  // The result List must contain the keys of all non-configurable own properties of the target object.
  // If the target object is not extensible, then the result List must contain all the keys of the own properties of the target object and no other values.
  handlers.ownKeys = (target) => {
    if (Reflect_isExtensible(target))
      return reflect.ownKeys(inners.get(target));
    const keys = reflect.ownKeys(inners.get(target));
    const target_keys = Reflect_ownKeys(target);
    for (let index = 0, length = target_keys.length; index < length; index++) {
      if (!keys.includes(target_keys[index])) {
        Reflect_deleteProperty(target, target_keys[index]);
      }
    }
    return keys;
  };

  ////////////////
  // Extensible //
  ////////////////
  // isExtensible >> Object.isExtensible(proxy) must return the same value as Object.isExtensible(target).
  // preventExtensions >> Object.preventExtensions(proxy) only returns true if Object.isExtensible(proxy) is false.
  // getPrototypeOf >> If target is not extensible, Object.getPrototypeOf(proxy) method must return the same value as Object.getPrototypeOf(target).
  // ownKeys >> If the target object is not extensible, then the result List must contain all the keys of the own properties of the target object and no other values.
  // getOwnPropertyDescriptor >> A property cannot be reported as existent, if it does not exists as an own property of the target object and the target object is not extensible.
  const preventExtensions = (target) => {
    const keys = reflect.ownKeys(inners.get(target));
    for (let index = 0, length = keys.length; index < length; index++) {
      if (!Reflect_getOwnPropertyDescriptor(target, keys[index])) {
        Reflect_defineProperty(target, keys[index], {value:null, configurable:true});
      }
    }
    Reflect_setPrototypeOf(target, reflect.getPrototypeOf(inners.get(target)));
    Reflect_preventExtensions(target);
  };
  // Object.isExtensible(proxy) must return the same value as Object.isExtensible(target).
  handlers.isExtensible = (target) => {
    if (Reflect_isExtensible(target)) {
      if (reflect.isExtensible(inners.get(target)))
        return true;
      preventExtensions(target);
      return false;
    }
    return false;
  };
  // Object.preventExtensions(proxy) only returns true if Object.isExtensible(proxy) is false.
  handlers.preventExtensions = (target) => {
    if (Reflect_isExtensible(target)) {
      reflect.preventExtensions(inners.get(target));
      preventExtensions(target);
    }
    return true;
  };

  ///////////////
  // Prototype //
  ///////////////
  // [RELEGATED] getPrototypeOf method must return an object or null. >> 
  // If target is not extensible, Object.getPrototypeOf(proxy) method must return the same value as Object.getPrototypeOf(target).
  handlers.getPrototypeOf = (target) => {
    if (Reflect_isExtensible)
      return reflect.getPrototypeOf(inners.get(target));
    return Reflect_getPrototypeOf(target);
  };
  // If target is not extensible, the prototype parameter must be the same value as Object.getPrototypeOf(target).
  handlers.setPrototypeOf = (target, prototype) => {
    if (Reflect_isExtensible(target))
      return reflect.setPrototypeOf(inners.get(target), prototype);
    return Reflect_getPrototypeOf(target) === prototype
  };

  //////////////////////
  // Property-Derived //
  //////////////////////
  // A property cannot be reported as non-existent, if it exists as a non-configurable own property of the target object.
  // A property cannot be reported as non-existent, if it exists as an own property of the target object and the target object is not extensible.
  handlers.has = (target, key) => {
    const target_descriptor = Reflect_getOwnPropertyDescriptor(target, key);
    if (target_descriptor && !target_descriptor.configurable)
      return true;
    if (reflect.getOwnPropertyDescriptor(inners.get(target), key))
      return true;
    const prototype = Reflect_isExtensible(target) ? reflect.getPrototypeOf(inners.get(target)) : Reflect_getPrototypeOf(target);
    const result = Boolean(prototype) && Reflect_has(prototype, key);
    if (!result && target_descriptor && !Reflect_isExtensible(target))
      Reflect_deleteProperty(target, key);
    return result;
  };
  // The value reported for a property must be the same as the value of the corresponding target object property if the target object property is a non-writable, non-configurable data property.
  // The value reported for a property must be undefined if the corresponding target object property is non-configurable accessor property that has undefined as its [[Get]] attribute.
  handlers.get = (target, key, receiver) => {
    const target_descriptor = Reflect_getOwnPropertyDescriptor(target, key);
    if (target_descriptor && !target_descriptor.configurable) {
      if (Reflect_getOwnPropertyDescriptor(target_descriptor, "value")) {
        if (!target_descriptor.writable) {
          return target_descriptor.value;
        }
      } else {
        if (target_descriptor.get) {
          return Reflect_apply(target_descriptor.get, receiver, []);
        }
        return void 0;
      }
    }
    const inner_descriptor = reflect.getOwnPropertyDescriptor(inners.get(target), key);
    if (inner_descriptor) {
      if (Reflect_getOwnPropertyDescriptor(inner_descriptor, "value")) {
        return inner_descriptor.value;
      } else {
        if (inner_descriptor.get) {
          return Reflect_apply(inner_descriptor.get, receiver, []);
        }
        return void 0;
      }
    }
    const prototype = Reflect_isExtensible(target) ? reflect.getPrototypeOf(inners.get(target)) : Reflect_getPrototypeOf(target);
    if (prototype)
      return Reflect_get(prototype, key, receiver);
    return void 0;
  };
  // https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-set-p-v-receiver
  // Cannot change the value of a property to be different from the value of the corresponding target object property if the corresponding target object property is a non-writable, non-configurable data property.
  // Cannot set the value of a property if the corresponding target object property is a non-configurable accessor property that has undefined as its [[Set]] attribute.
  // In strict mode, a false return value from the set handler will throw a TypeError exception.
  handlers.set = (target, key, value, receiver) => {
    const target_descriptor = Reflect_getOwnPropertyDescriptor(target, key);
    if (target_descriptor && !target_descriptor.configurable) {
      if (Reflect_getOwnPropertyDescriptor(target_descriptor, "value")) {
        if (!target_descriptor.writable) {
          return false;
        }
      } else {
        if (descriptor.set) {
          Reflect_apply(descriptor.set, receiver, [value]);
          return true;
        }
        return false;
      }
    }
    let inner_descriptor = reflect.getOwnPropertyDescriptor(inners.get(target), key);
    if (!inner_descriptor) {
      const prototype = Reflect_isExtensible(target) ? reflect.getPrototypeOf(inners.get(target)) : Reflect_getPrototypeOf(target);
      if (prototype)
        return Reflect_set(prototype, key, value, receiver);
      inner_descriptor = {value:void 0, writable:true, enumerable:true, configurable:true};
    };
    if (Reflect_getOwnPropertyDescriptor(inner_descriptor, "value")) {
      if (!inner_descriptor.writable)
        return false;
      if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function"))
        return false;
      const receiver_descriptor = Reflect_getOwnPropertyDescriptor(receiver, key) || {value:void 0, writable:true, enumerable:true, configurable:true};
      if (!Reflect_getOwnPropertyDescriptor(receiver_descriptor, "value"))
        return false;
      if (!receiver_descriptor.writable)
        return false;
      Reflect_setPrototypeOf(receiver_descriptor, null);
      receiver_descriptor.value = value;
      Reflect_defineProperty(receiver, key, receiver_descriptor);
      return true;
    } else {
      if (inner_descriptor.set) {
        Reflect_apply(inner_descriptor.set, receiver, [value]);
        return true;
      }
      return false;
    }
  }

  return new Proxy(target, handlers);

};

module.exports.Array = (inner, reflect) => module.exports([], inner, reflect);

module.exports.Object = (inner, reflect) => module.exports({}, inner, reflect);

module.exports.StrictFunction = (inner, reflect) => module.exports(function () { "use strict"; }, inner, reflect);

module.exports.Function = (inner, reflect) => module.exports(function () {}, inner, reflect);

module.exports.Arrow = (inner, reflect) => module.exports(() => {}, inner, reflect);

module.exports.StrictArrow = (inner, reflect) => module.exports(() => { "use strict"; }, inner, reflect);
