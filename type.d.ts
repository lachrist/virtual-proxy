/**
 * Main export of the library, it creates an handler object that should be
 * passed to the Proxy constructor.
 *
 * ```js
 * const proxy = new Proxy(integrity, setupVirtualHandler(target, handler));
 * ```
 *
 * @param target The virtual target object that will be passed to the virtual
 * handler functions.
 * @param handler The virtual handler object which has the same interface as
 * a regular proxy handler object.
 * @returns An (actual) handler object that should be passed to the proxy
 * constructor.
 */
export type setupVirtualHandler = <V extends object, T extends object>(
  target: V,
  handler: ProxyHandler<V>,
) => ProxyHandler<T>;

/**
 * Cosmetic function to create a virtual proxy object, that still enforces MOP
 * invariants, but independently from the virtual target object.
 * @param integrity The actual target object of the proxy that is used to track
 * information for enforcing MOP invariants.
 * @param target The virtual target object that will be passed to the virtual
 * handler object.
 * @param handler The virtual handler object which has the same interface as
 * a regular proxy handler object.
 * @returns A virtual proxy object.
 */
export type VirtualProxy = new <V extends object, T extends object>(
  integrity: T,
  target: V,
  handler: ProxyHandler<V>,
) => T;

/**
 * Cosmetic function to create a revocable virtual proxy object, similar to
 * VirtualProxy but it also returns a function to revoke the proxy.
 * @param integrity The actual target object.
 * @param target The virtual target object.
 * @param handler The virtual handler object.
 * @returns Both a virtual proxy object and a function to revoke the proxy.
 */
export type RevocableVirtualProxy = new <V extends object, T extends object>(
  integrity: T,
  target: V,
  handler: ProxyHandler<V>,
) => { proxy: T; revoke: () => void };

/**
 * Cosmetic function to create a plain virtual proxy object.
 * @param target The virtual target object.
 * @param handler The virtual handler object.
 * @returns A plain virtual proxy object.
 */
export type VirtualObject = new <V extends object, T extends object>(
  target: V,
  handler: ProxyHandler<V>,
) => T;

/**
 * Cosmetic function to create a virtual proxy array.
 * @param target The virtual target object.
 * @param handler The virtual handler object.
 * @returns A virtual proxy array.
 */
export type VirtualArray = new <V extends object, T extends any[]>(
  target: V,
  handler: ProxyHandler<V>,
) => T;

/**
 * Cosmetic function to create a virtual proxy function.
 * @param target The virtual target object.
 * @param handler The virtual handler object.
 * @returns A virtual proxy function.
 */
export type VirtualFunction = new <V extends object, T extends Function>(
  target: V,
  handler: ProxyHandler<V>,
) => T;
