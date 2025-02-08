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

type Handler<H, X> = {
  apply(this: H, target: X, that: any, args: any[]): any;
  construct(this: H, target: X, args: any[], new_target: Function): object;
  defineProperty(
    this: H,
    target: X,
    key: string | symbol,
    descriptor: Descriptor,
  ): boolean;
  deleteProperty(this: H, target: X, key: string | symbol): boolean;
  getOwnPropertyDescriptor(
    this: H,
    target: X,
    key: string | symbol,
  ): Descriptor | undefined;
  isExtensible(this: H, target: X): boolean;
  ownKeys(this: H, target: X): (string | symbol)[];
  preventExtensions(this: H, target: X): boolean;
  getPrototypeOf(this: H, target: X): object | null;
  setPrototypeOf(this: H, target: X, prototype: object | null): boolean;
  has(this: H, target: X, p: string | symbol): boolean;
  get(this: H, target: X, key: string | symbol, receiver: any): any;
  set(
    this: H,
    target: X,
    key: string | symbol,
    value: any,
    receiver: any,
  ): boolean;
};

export type ActualHandler<V, T> = Handler<
  {
    target: V;
    handler: VirtualHandler<V>;
    TypeError: new (message: string) => unknown;
  },
  T
>;

export type VirtualHandler<V> = Handler<{ __brand: "VirtualHandler" }, V> & {
  __brand: "VirtualHandler";
};
