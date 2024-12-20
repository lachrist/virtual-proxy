export type virtualizeHandler = <V extends object, T extends object>(
  target: T,
  handler: ProxyHandler<T>,
) => ProxyHandler<V>;
