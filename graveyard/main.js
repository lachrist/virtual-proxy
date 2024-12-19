
const Proxy = global.Proxy;
const Boolean = global.Boolean;
const TypeError = global.TypeError;

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

// https://tc39.github.io/ecma262/#sec-invariants-of-the-essential-internal-methods

const handler = {__proto__:null};

//////////////
// Function //
//////////////
// The target must be a callable itself. That is, it must be a function object.
handler.apply = function (target, value, values) {
  if (typeof target !== "function")
    throw new TypeError("Target is not a function");
  return this.__handler__.apply(this.__target__, value, values);
};
// [RELEGATED] The result must be an Object.
handler.construct = function (target, values, newtarget) {
  Reflect.construct(Boolean, [], target);
  Reflect.construct(Boolean, [], newtarget);
  return this.__handler__.construct(this.__target__, values, newtarget);
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
handler.defineProperty = function (target, key, descriptor_argument) {
  const descriptor = Reflect_getOwnPropertyDescriptor(target, key);
  if (!descriptor && !Reflect_isExtensible(target))
    return false;
  if (descriptor && !descriptor.configurable) {
    if (descriptor_argument.configurable)
      return false;
    if (descriptor.enumerable && !descriptor_argument.enumerable)
      return false;
    if (!descriptor.enumerable && descriptor_argument.enumerable)
      return false;
    if (Reflect_getOwnPropertyDescriptor(descriptor_argument, "value") || Reflect_getOwnPropertyDescriptor(descriptor_argument, "writable")) {
      if (Reflect_getOwnPropertyDescriptor(descriptor, "get"))
        return false;
      if (!descriptor.writable && descriptor.writable)
        return false;
      if (!descriptor.writable && Reflect_getOwnPropertyDescriptor(descriptor_argument, "value") && descriptor.value !== descriptor_argument.value)
        return false;
    } else {
      if (Reflect_getOwnPropertyDescriptor(descriptor, "value"))
        return false;
      if (Reflect_getOwnPropertyDescriptor(descriptor_argument, "get") && descriptor.get !== descriptor_argument.get)
        return false;
      if (Reflect_getOwnPropertyDescriptor(descriptor_argument, "set") && descriptor.set !== descriptor_argument.set)
        return false;
    }
  }
  if (!descriptor_argument.configurable)
    Reflect_defineProperty(target, key, descriptor_argument);
  return this.__handler__.defineProperty(this.__target__, key, descriptor_argument);
};
// [RELEGATED] getOwnPropertyDescriptor must return an object or undefined.
// A property cannot be reported as non-existent, if it exists as a non-configurable own property of the target object.
// A property cannot be reported as non-existent, if it exists as an own property of the target object and the target object is not extensible.
// A property cannot be reported as existent, if it does not exists as an own property of the target object and the target object is not extensible.
// A property cannot be reported as non-configurable, if it does not exists as an own property of the target object or if it exists as a configurable own property of the target object.
// The result of Object.getOwnPropertyDescriptor(target) can be applied to the target object using Object.defineProperty and will not throw an exception.
handler.getOwnPropertyDescriptor = function (target, key) {
  const descriptor = Reflect_getOwnPropertyDescriptor(target, key);
  if (descriptor && !descriptor.configurable && !descriptor.writable)
    return descriptor;
  const __descriptor__ = this.__handler__.getOwnPropertyDescriptor(this.__target__, key);
  if (__descriptor__ && !__descriptor__.configurable)
    Reflect_defineProperty(target, key, __descriptor__);
  if (!__descriptor__ && descriptor && !Reflect_isExtensible(target))
    Reflect_deleteProperty(target, key);
  return __descriptor__;
};
// A property cannot be deleted, if it exists as a non-configurable own property of the target object.
handler.deleteProperty = function (target, key) {
  const descriptor = Reflect_getOwnPropertyDescriptor(target, key);
  if (descriptor && !descriptor.configurable)
    return false;
  return this.__handler__.deleteProperty(this.__target__, key);
};
// [RELEGATED] The result of ownKeys must be an array.
// [RELEGATED] The type of each array element is either a String or a Symbol.
// The result List must contain the keys of all non-configurable own properties of the target object.
// If the target object is not extensible, then the result List must contain all the keys of the own properties of the target object and no other values.
handler.ownKeys = function (target) {
  if (Reflect_isExtensible(target))
    return this.__handler__.ownKeys(this.__target__);
  const keys = Reflect_ownKeys(target);
  const __keys__ = this.__handler__.ownKeys(this.__target__);
  for (let index = 0, length = keys.length; index < length; index++) {
    if (!__keys__.includes(keys[index])) {
      Reflect_deleteProperty(target, keys[index]);
    }
  }
  return __keys__;
};

////////////////
// Extensible //
////////////////
// isExtensible >> Object.isExtensible(proxy) must return the same value as Object.isExtensible(target).
// preventExtensions >> Object.preventExtensions(proxy) only returns true if Object.isExtensible(proxy) is false.
// getPrototypeOf >> If target is not extensible, Object.getPrototypeOf(proxy) method must return the same value as Object.getPrototypeOf(target).
// ownKeys >> If the target object is not extensible, then the result List must contain all the keys of the own properties of the target object and no other values.
// getOwnPropertyDescriptor >> A property cannot be reported as existent, if it does not exists as an own property of the target object and the target object is not extensible.
handler.preventExtensionsHelper = function (target) {
  const keys = this.__handler__.ownKeys(this.__target__);
  for (let index = 0, length = keys.length; index < length; index++) {
    if (!Reflect_getOwnPropertyDescriptor(target, keys[index])) {
      Reflect_defineProperty(target, keys[index], {value:null, configurable:true});
    }
  }
  Reflect_setPrototypeOf(target, this.__handler__.getPrototypeOf(this.__target__));
  Reflect_preventExtensions(target);
};
// Object.isExtensible(proxy) must return the same value as Object.isExtensible(target).
handler.isExtensible = function (target) {
  if (Reflect_isExtensible(target)) {
    if (this.__handler__.isExtensible(this.__target__))
      return true;
    this.preventExtensionsHelper(target);
    return false;
  }
  return false;
};
// Object.preventExtensions(proxy) only returns true if Object.isExtensible(proxy) is false.
handler.preventExtensions = function (target) {
  if (Reflect_isExtensible(target)) {
    this.__handler__.preventExtensions(this.__target__);
    this.preventExtensionsHelper(target);
  }
  return true;
};

///////////////
// Prototype //
///////////////
// [RELEGATED] getPrototypeOf method must return an object or null. >> 
// If target is not extensible, Object.getPrototypeOf(proxy) method must return the same value as Object.getPrototypeOf(target).
handler.getPrototypeOf = function (target) {
  if (Reflect_isExtensible)
    return this.__handler__.getPrototypeOf(this.__target__);
  return Reflect_getPrototypeOf(target);
};
// If target is not extensible, the prototype parameter must be the same value as Object.getPrototypeOf(target).
handler.setPrototypeOf = function (target, prototype) {
  if (Reflect_isExtensible(target))
    return this.__handler__.setPrototypeOf(this.__target__, prototype);
  return Reflect_getPrototypeOf(target) === prototype;
};

//////////////////////
// Property-Derived //
//////////////////////
// A property cannot be reported as non-existent, if it exists as a non-configurable own property of the target object.
// A property cannot be reported as non-existent, if it exists as an own property of the target object and the target object is not extensible.
handler.has = function (target, key) {
  const descriptor = Reflect_getOwnPropertyDescriptor(target, key);
  if (descriptor && !descriptor.configurable)
    return true;
  if (this.__handler__.getOwnPropertyDescriptor(this.__target__, key))
    return true;
  const prototype = Reflect_isExtensible(target) ? this.__handler__.getPrototypeOf(this.__target__) : Reflect_getPrototypeOf(target);
  const result = Boolean(prototype) && Reflect_has(prototype, key);
  if (!result && descriptor && !Reflect_isExtensible(target))
    Reflect_deleteProperty(target, key);
  return result;
};
// The value reported for a property must be the same as the value of the corresponding target object property if the target object property is a non-writable, non-configurable data property.
// The value reported for a property must be undefined if the corresponding target object property is non-configurable accessor property that has undefined as its [[Get]] attribute.
handler.get = function (target, key, receiver) {
  const descriptor = Reflect_getOwnPropertyDescriptor(target, key);
  if (descriptor && !descriptor.configurable) {
    if (Reflect_getOwnPropertyDescriptor(descriptor, "value")) {
      if (!descriptor.writable) {
        return descriptor.value;
      }
    } else {
      if (descriptor.get) {
        return Reflect_apply(descriptor.get, receiver, []);
      }
      return void 0;
    }
  }
  const __descriptor__ = this.__handler__.getOwnPropertyDescriptor(this.__target__, key);
  if (__descriptor__) {
    if (Reflect_getOwnPropertyDescriptor(__descriptor__, "value")) {
      return __descriptor__.value;
    } else {
      if (__descriptor__.get) {
        return Reflect_apply(__descriptor__.get, receiver, []);
      }
      return void 0;
    }
  }
  const prototype = Reflect_isExtensible(target) ? this.__handler__.getPrototypeOf(this.__target__) : Reflect_getPrototypeOf(target);
  if (prototype)
    return Reflect_get(prototype, key, receiver);
  return void 0;
};
// https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-set-p-v-receiver
// Cannot change the value of a property to be different from the value of the corresponding target object property if the corresponding target object property is a non-writable, non-configurable data property.
// Cannot set the value of a property if the corresponding target object property is a non-configurable accessor property that has undefined as its [[Set]] attribute.
// In strict mode, a false return value from the set handler will throw a TypeError exception.
handler.set = function (target, key, value, receiver) {
  const descriptor = Reflect_getOwnPropertyDescriptor(target, key);
  if (descriptor && !descriptor.configurable) {
    if (Reflect_getOwnPropertyDescriptor(descriptor, "value")) {
      if (!descriptor.writable) {
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
  let __descriptor__ = this.__handler__.getOwnPropertyDescriptor(this.__target__, key);
  if (!__descriptor__) {
    const prototype = Reflect_isExtensible(target) ? this.__handler__.getPrototypeOf(this.__target__) : Reflect_getPrototypeOf(target);
    if (prototype)
      return Reflect_set(prototype, key, value, receiver);
    __descriptor__ = {value:void 0, writable:true, enumerable:true, configurable:true};
  };
  if (Reflect_getOwnPropertyDescriptor(__descriptor__, "value")) {
    if (!__descriptor__.writable)
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
    if (__descriptor__.set) {
      Reflect_apply(__descriptor__.set, receiver, [value]);
      return true;
    }
    return false;
  }
}

module.exports = (target, __target__, __handler__) => {

  if (__handler__ === void 0) {
    __handler__ = __target__;
    __target__ = target;
    if (Array.isArray(__target__)) {
      target = [];
    } else if (typeof __target__ === "function") {
      try {
        Reflect_construct(Boolean, [], __target__);
        target = function () { "use strict" };
      } catch (error) {
        target = () => {};
      }
    } else {
      target = {};
    }
  }
  
  return new Proxy(target, {__proto__: handler, __target__, __handler__});

};

module.exports.Array = (__target__, __handler__) => module.exports([], __target__, __handler__);

module.exports.Object = (__target__, __handler__) => module.exports({}, __target__, __handler__);

module.exports.StrictFunction = (__target__, __handler__) => module.exports(function () { "use strict"; }, __target__, __handler__);

module.exports.Function = (__target__, __handler__) => module.exports(function () {}, __target__, __handler__);

module.exports.Arrow = (__target__, __handler__) => module.exports(() => {}, __target__, __handler__);

module.exports.StrictArrow = (__target__, __handler__) => module.exports(() => { "use strict"; }, __target__, __handler__);
