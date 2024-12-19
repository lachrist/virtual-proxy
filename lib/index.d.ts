export type DataDescriptor = {
  value: any;
  writable: boolean;
  enumerable: boolean;
  configurable: boolean;
};

export type AccessorDescriptor = {
  get: () => any;
  set: (value: any) => void;
  enumerable: boolean;
  configurable: boolean;
};

export type Descriptor = DataDescriptor | AccessorDescriptor;

export type Handler<T, H> = {
  apply(this: H, target: T, that: any, args: any[]): any;
  construct(this: H, target: T, args: any[], new_target: Function): object;
  defineProperty(
    this: H,
    target: T,
    key: string | symbol,
    descriptor: Descriptor,
  ): boolean;
  deleteProperty(this: H, target: T, key: string | symbol): boolean;
  getOwnPropertyDescriptor(
    this: H,
    target: T,
    key: string | symbol,
  ): Descriptor | undefined;
  isExtensible(this: H, target: T): boolean;
  ownKeys(this: H, target: T): (string | symbol)[];
  preventExtensions(this: H, target: T): boolean;
  getPrototypeOf(this: H, target: T): object | null;
  setPrototypeOf(this: H, target: T, prototype: object | null): boolean;
  has(this: H, target: T, p: string | symbol): boolean;
  get(this: H, target: T, key: string | symbol, receiver: any): any;
  set(
    this: H,
    target: T,
    key: string | symbol,
    value: any,
    receiver: any,
  ): boolean;
};

export type VirtualHandlerPrototype<V, T> = Handler<V, VirtualHandler<V, T>>;

export type VirtualHandler<V, T> = {
  __proto__: VirtualHandlerPrototype<V, T>;
  target: T;
  handler: Handler<T, {}>;
};

export type Proxy = <V, T>(target: V, handler: VirtualHandler<V, T>) => object;
