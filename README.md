# TolerantProxy

The `__proto__` pseudo-property cannot be supported because `Reflect.get(object, "__proto__", receiver)` does not call `Reflect.getPrototypeOf(receiver)`.
