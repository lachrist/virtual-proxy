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

type Handler<H, T> = {
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

export type VirtualHandler<V, T> = Handler<
  {
    target: T;
    handler: ActualHandler<T>;
  },
  V
>;

export type ActualHandler<T> = Handler<{ __brand: "ActualHandler" }, T> & {
  __brand: "ActualHandler";
};
