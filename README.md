# VirtualProxy

The Proxy API enables powerful reflection on JavaScript objects. However, it is
constrained by strict invariants, such as requiring proxies to report consistent
values for immutable properties (i.e., non-configurable and non-writable). While
these invariants are essential for ensuring the consistent behavior of
JavaScript objects, the current implementation imposes unnecessary limitations
by using the target object for bookkeeping.

This module introduces a mechanism to decouple the target object from the
bookkeeping process, enabling more flexible and versatile use of proxies.

## Demo

```js
import { VirtualProxy, setupVirtualHandler } from "../lib/index.mjs";
const target = Object.freeze({
  name: "John",
  password: "1234",
});
const handler = {
  get: (target, key, receiver) =>
    key === "password" ? "****" : Reflect.get(target, key, receiver),
};
// 1) Proxy
{
  // TypeError: 'get' on proxy: property 'password' is a read-only and
  // non-configurable data property on the proxy target but the proxy
  // did not return its actual value
  const proxy = new Proxy(target, handler);
  console.log(proxy.password);
}
// 2) VirtualProxy
{
  const integrity = {};
  const proxy = new VirtualProxy(integrity, target, handler);
  console.log(proxy.password); // ****
}
// 3) setupVirtualHandler
{
  const integrity = {};
  const proxy = new Proxy(integrity, setupVirtualHandler(target, handler));
  console.log(proxy.password); // ****
}
```

## API

[TypeScript Declaration](./type.d.ts)
