
const forward = (name) => function () { 
  return name in this.handler ?
    this.handler[name](...arguments) :
    Reflect[name](...arguments);
};

const dispatch = (name, handler, array) => name in handler ?
  handler[name](...array) :
  Reflect[name](...array);

const synchronize = (self, shadow) => {
  if (Reflect.isExtensible(shadow)) {
    Reflect.setPrototypeOf(shadow, dispatch("getPrototypeOf", self.handler, [self.target]));
    const keys = Reflect.ownKeys(shadow);
    for (let key of dispatch("ownKeys", self.handler, [self.target])) {
      if (!keys.includes(key)) {
        Reflect.defineProperty(shadow, key, {configurable:true});
      }
    }
    Reflect.preventExtensions(shadow);
  }
};

const ShadowHandlerPrototype = {
  apply: forward("apply"),
  construct: forward("construct"),
  getPrototypeOf: forward("getPrototypeOf"),
  setPrototypeOf: forward("setPrototypeOf"),
  get: forward("get"),
  set: forward("set"),
  has: forward("has"),
  ownKeys: forward("ownKeys"),
  deleteProperty: forward("deleteProperty"),
  defineProperty: function (shadow, key, descriptor) {
    descriptor = Object.assign({}, descriptor);
    const result = dispatch("defineProperty", this.handler, [this.target, key, descriptor]);
    if (result && !descriptor.configurable)
      Reflect.defineProperty(shadow, key, descriptor);
    return result;
  },
  getOwnPropertyDescriptor: function (shadow, key) {
    const result = dispatch("getOwnPropertyDescriptor", this.handler, [this.target, key])
    if (!result.configurable)
      Reflect.defineProperty(shadow, key, result);
    return result;
  },
  preventExtensions: function (shadow) {
    const result = dispatch("preventExtensions", this.handler, [this.target]);
    if (result)
      synchronize(this, shadow);
    return result;
  },
  isExtensible: function (shadow) {
    const result = dispatch("isExtensible", this.handler, [this.target]);
    if (!result)
      synchronize(this, shadow);
    return result;
  }
};

function ShadowProxy (shadow, target, handler) {
  if (!new.target)
    throw new Error("Constructor ShadowProxy requires 'new'");
  const shadowHandler = Object.create(ShadowHandlerPrototype);
  shadowHandler.handler = handler;
  shadowHandler.target = target;
  return new Proxy(shadow, shadowHandler);
};

const prototype = {};
const shadow = {};
const target = {};
const handler = { getPrototypeOf: (target) => prototype };
const proxy = new ShadowProxy(shadow, target, handler);
Reflect.preventExtensions(proxy);
if (Reflect.getPrototypeOf(shadow) !== prototype)
  throw new Error("Assertion failure");
