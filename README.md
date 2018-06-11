# VirtualProxy



Sometimes you would want 

Many applications of proxies do

Bypass trustworthy proxy invariants

Sometimes y


```js

```


```js
const handlers = {
  ownKeys: (path) => Fs.readdirSync(path)
};
const object = VirtualProxy.object("/directory/path", handlers);
Object.preventExtensions(object);


```