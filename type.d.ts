export type virtualizeHandler = <V extends object, T extends object>(
  target: T,
  handler: ProxyHandler<T>,
) => ProxyHandler<V>;

export type VirtualProxy = <V extends object, T extends object>(
  virtual: V,
  target: T,
  handler: ProxyHandler<T>,
) => V;

export type RevocableVirtualProxy = <V extends object, T extends object>(
  virtual: V,
  target: T,
  handler: ProxyHandler<T>,
) => { revoke: () => void; proxy: V };

export type VirtualObject = <V extends object, T extends object>(
  target: T,
  handler: ProxyHandler<T>,
) => V;

export type VirtualArray = <V extends any[], T extends object>(
  target: T,
  handler: ProxyHandler<T>,
) => V;

export type VirtualFunction = <V extends Function, T extends Function>(
  target: T,
  handler: ProxyHandler<T>,
) => V;
