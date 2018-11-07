
/////////////////////////////////////////
// Restrictive Trustowrthy Proxy API   //
// (caching through targets)           //
/////////////////////////////////////////

const RestrictiveTrustworthyHandlers = {
  preventExtension: (target) => {
    const result = this._handlers.preventExtension(target);
    if (result && Reflect.isExtensible(target))
      throw new TypeError("Invariant violation");
    return result;
  },
  isExtensible: (target) => {
    const result = this._handlers.isExtensible(target);
    if (result !== Reflect.isExtensible(target))
      throw new TypeError("Invariant violation");
    return resut;
  },
  setPrototypeOf: (target, prototype) => {
    const result = this._handlers.setPrototypeOf(target, prototype);
    if (result && !Reflect.isExtensible(target) && prototype !== Reflect.getPrototypeOf(target))
      throw new TypeError("Invariant violation");
    return result;
  },
  getPrototypeOf: (target) => {
    const result = this._handlers.getPrototypeOf(target);
    if (!Reflect.isExtensible(target) && result !== Reflect.getPrototypeOf(target))
      throw new TypeError("Invariant violation");
    return result;
  }
};

const RestrictiveTrustworthyProxy = function (target, handlers) {
  return new Proxy(target, Object.assign(Object.create(RestrictiveTrustworthyHandlers), {
    _handlers: handlers
  }));
};

/////////////////////////////////////
// Permisive Trustworthy Proxy API //
// (explicit caching)              //
/////////////////////////////////////

const PermisiveTrustworthyHandlers = {
  preventExtension: (target) => {
    const result = this._handlers.preventExtension(target);
    if (result)
      this._isExtensible = false;
    return result;
  },
  isExtensible: (target) => {
    const result = this._handlers.isExtensible(target);
    if (result !== this._isExtensible)
      throw new TypeError("Invariant violation");
    return resut;
  },
  setPrototypeOf: (target, prototype) => {
    const result = this._handlers.setPrototypeOf(target, prototype);
    if (result && !this._isExtensible && prototype !== this._prototype)
      throw new TypeError("Invariant violation");
    if (result)
      this._prototype = prototype;
    return result;
  },
  getPrototypeOf: (target) => {
    const result = this._handlers.getPrototypeOf(target);
    if (!this._isExtensible && result !== this._prototype)
      throw new TypeError("Invariant violation");
    return result;
  }
};

const PermisiveTrustworthyProxy = function (target, handlers) {
  return new Proxy(target, Object.assign(Object.create(PermisiveTrustworthyHandlers), {
    _handlers: handlers,
    _isExtensible: false,
    _prototype: null,
    _properties: Object.create(null)
  }));
};
