const o = {};
Reflect.defineProperty(o, "foo", {
  value: 123,
  writable: false,
  enumerable: true,
  configurable: true,
});
const p = new Proxy(o, {
  ownKeys: () => ({ length: 1, 0: "foo" }),
});

console.log(Reflect.ownKeys(p));
