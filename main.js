
const cache = new WeakMap();
const inners = new WeakMap();

module.exports = (target, inner, original) => {

  inners.set(target, inner);
  let handlers = cache.has(original);
  if (handlers)
    return new Proxy(target, handlers);
  handlers = Object.create(null);

  //////////////
  // Function //
  //////////////  
  handlers.apply = (target, value, values) => {
    return ("apply" in original ? original : Reflect).apply(inners.get(target), value, values);
  };
  handlers.construct = (target, values) => {
    return ("construct" in original ? original : Reflect).construct(inners.get(target), values);
  };

  ////////////////
  // Properties //
  //////////////// 
  handlers.defineProperty = (target, values) => {
    return ("defineProperty" in original ? original : Reflect).construct(inners.get(target), values);
  };
  handler.getOwnPropertyDescriptor = function (target, key) {
    const descriptor2 = ("getOwnPropertyDescriptor" in Reflect).getOwnPropertyDescriptor(inners.get(target), key);
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
    return ("deleteProperty" in origina ? original : Reflect).deleteProperty(target, values);
  };
  handlers.ownKeys = function (target) {
    const keys1 = ("ownKeys" in original ? original : Reflect).ownKeys(inners.get(target));
    // ownKeys >> If the target object is not extensible, then the result List must contain all the keys of the own properties of the target object and no other values.
    if (!Reflect.isExtensible(target)) {
      const keys2 = Reflect.ownKeys(target);
      for (let index = 0, length = keys.length; index < length; index++) {
        if (!keys1.includes(keys2[index])) {
          Reflect.deleteProperty(target, keys2[index]);
        }
      }
    }
    return keys1;
  }
  
  ////////////////
  // Extensible //
  //////////////// 
  handlers.isExtensible = (target) => {
    const extensible = ("isExtensible" in original ? original : Reflect).isExtensible(inners.get(target));
    if (!extensible && Reflect.isExtensible(target)) {
      // ownKeys >> If the target object is not extensible, then the result List must contain all the keys of the own properties of the target object and no other values.
      // getOwnPropertyDescriptor >> A property cannot be reported as existent, if it does not exists as an own property of the target object and the target object is not extensible.    
      const keys = Reflect.ownKeys(object);
      for (let index = 0, length = keys.length; index < length; index++) {
        if (!Reflect.getOwnPropertyDescriptor(target, keys[index])) {
          Reflect.defineProperty(target, keys[index], {value:null, configurable:true});
        }
      }
      // getPrototypeOf >> If target is not extensible, Object.getPrototypeOf(proxy) method must return the same value as Object.getPrototypeOf(target).
      Reflect.setPrototypeOf(target, ("getPrototypeOf" in original ? original : Reflect).getPrototypeOf(inners.get(target)));
      // isExtensible >> Object.isExtensible(proxy) must return the same value as Object.isExtensible(target).
      Reflect.preventExtensions(target);
    }
    return extensible;
  };
  handlers.preventExtensions = (target) => {
    return (("preventExtensions" in original ? original : Reflect).preventExtensions(inner.get(target)));
  };

  ///////////////
  // Prototype //
  ///////////////
  handlers.setPrototypeOf = (target, prototype) => {
    return ("setPrototypeOf" in original ? original : Reflect).setPrototypeOf(inner.get(target), prototype);
  };
  handlers.getPrototypeOf = (target, prototype) => {
    return ("getPrototypeOf" in orignal ? original : Reflect).getPrototypeOf(inners.get(target), prototype);
  }; 

  //////////////////////
  // Property Derived //
  //////////////////////
  handlers.has = (target, key) => {
    const has = ("has" in original ? original : Reflect).has(inners.get(target), key);
    // has >> A property cannot be reported as non-existent, if it exists as an own property of the target object and the target object is not extensible.
    if (!has && Reflect.getOwnPropertyDescriptor(object, target) && Reflect.isExtensible(target)) {
      Reflect.deleteProperty(target, key);
    }
    return has;
  };
  handlers.get = (target, key, receiver) => {
    return ("get" in original ? original : Reflect).get(inners.get(target), key, receiver);
  };
  handlers.set = (target, key, value, receiver) => {
    return ("set" in original ? original : Reflect).set(inners.get(target), key, value, receiver);
  };

  return new Proxy(target, handlers);

};
