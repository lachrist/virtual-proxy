
const cache = new WeakMap();
const inners = new WeakMap();

module.exports = (target, inner, reflect) => {

  inners.set(target, inner);
  let handlers = cache.has(reflect);
  if (handlers)
    return new Proxy(target, handlers);
  handlers = Object.create(null);

  //////////////
  // Function //
  //////////////
  handlers.apply = (target, value, values) => {
    return reflect.apply(inners.get(target), value, values);
  };
  handlers.construct = (target, values) => {
    return reflect.construct(inners.get(target), values);
  };

  //////////////
  // Property //
  //////////////
  handlers.defineProperty = (target, key, descriptor) => {
    return reflect.defineProperty(inners.get(target), key, descriptor);
  };
  handlers.getOwnPropertyDescriptor = function (target, key) {
    const descriptor2 = reflect.getOwnPropertyDescriptor(inners.get(target), key);
    const descriptor1 = Reflect.getOwnPropertyDescriptor(target, key);
    // getOwnPropertyDescriptor >> A property cannot be reported as non-existent, if it exists as an own property of the target object and the target object is not extensible.
    if (!descriptor2 && descriptor1 && !Reflect.isExtensible(target)) {
      Reflect.deleteProperty(target, key);
    }
    // getOwnPropertyDescriptor >> A property cannot be reported as non-configurable, if it does not exists as an own property of the target object or if it exists as a configurable own property of the target object.
    if (descriptor2 && !descriptor2.configurable && (!descriptor1 || descriptor1.configurable)) {
      Reflect.defineProperty(target, descriptor2);
    }
    return descriptor2
  };
  handlers.deleteProperty = function (target, key) {
    return reflect.deleteProperty(inners.get(target), key);
  };
  handlers.ownKeys = function (target) {
    const keys1 = reflect.ownKeys(inners.get(target));
    // ownKeys >> If the target object is not extensible, then the result List must contain all the keys of the own properties of the target object and no other values.
    if (!Reflect.isExtensible(target)) {
      const keys2 = Reflect.ownKeys(target);
      for (let index = 0, length = keys2.length; index < length; index++) {
        if (!keys1.includes(keys2[index])) {
          Reflect.deleteProperty(target, keys2[index]);
        }
      }
    }
    return keys1;
  };

  ////////////////
  // Extensible //
  ////////////////
  const preventExtensions = (target) => {
    // ownKeys >> If the target object is not extensible, then the result List must contain all the keys of the own properties of the target object and no other values.
    // getOwnPropertyDescriptor >> A property cannot be reported as existent, if it does not exists as an own property of the target object and the target object is not extensible.    
    const keys = reflect.ownKeys(inners.get(target));
    for (let index = 0, length = keys.length; index < length; index++) {
      if (!Reflect.getOwnPropertyDescriptor(target, keys[index])) {
        Reflect.defineProperty(target, keys[index], {value:null, configurable:true});
      }
    }
    // getPrototypeOf >> If target is not extensible, Object.getPrototypeOf(proxy) method must return the same value as Object.getPrototypeOf(target).
    Reflect.setPrototypeOf(target, reflect.getPrototypeOf(inners.get(target)));
    // isExtensible >> Object.isExtensible(proxy) must return the same value as Object.isExtensible(target).
    Reflect.preventExtensions(target);
  };
  handlers.isExtensible = (target) => {
    const extensible = reflect.isExtensible(inners.get(target));
    if (!extensible && Reflect.isExtensible(target))
      preventExtensions(target);
    return extensible;
  };
  handlers.preventExtensions = (target) => {
    const success = reflect.preventExtensions(inners.get(target));
    // preventExtensions >> Object.preventExtensions(proxy) only returns true if Object.isExtensible(proxy) is false.
    if (success && Reflect.isExtensible(target))
      preventExtensions(target);
    return success;
  };

  ///////////////
  // Prototype //
  ///////////////
  handlers.setPrototypeOf = (target, prototype) => {
    return reflect.setPrototypeOf(inners.get(target), prototype);
  };
  handlers.getPrototypeOf = (target) => {
    return reflect.getPrototypeOf(inners.get(target));
  }; 

  //////////////////////
  // Property-Derived //
  //////////////////////
  handlers.has = (target, key) => {
    const has = reflect.has(inners.get(target), key);
    // has >> A property cannot be reported as non-existent, if it exists as an own property of the target object and the target object is not extensible.
    if (!has && Reflect.getOwnPropertyDescriptor(target, key) && Reflect.isExtensible(target)) {
      Reflect.deleteProperty(target, key);
    }
    return has;
  };
  handlers.get = (target, key, receiver) => {
    return reflect.get(inners.get(target), key, receiver);
  };
  handlers.set = (target, key, value, receiver) => {
    return reflect.set(inners.get(target), key, value, receiver);
  };

  return new Proxy(target, handlers);

};

module.exports.array = (inner, reflect) => module.exports([], inner, reflect);

module.exports.object = (inner, reflect) => module.exports({}, inner, reflect);

module.exports.function = (inner, reflect) => module.exports(function () {}, inner, reflect);

module.exports.arrow = (inner, reflect) => module.exports(() => {}, inner, reflect);
