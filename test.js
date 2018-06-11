
const VirtualProxy = require("./main.js");
const Check = require("./check.js");

let remote;
const reflect = {};
Reflect.ownKeys(Reflect).forEach((key) => {
  reflect[key] = function () {
    if (this !== reflect)
      throw new Error("This should refer to the colletion of handlers");
    if (arguments[0] !== "virtual")
      throw new Error("The target should be the string 'virtual'");
    arguments[0] = remote;
    return Reflect[key](...arguments);
  };
});

remote = {};
Check.object(VirtualProxy.object("virtual", reflect));

remote = [];
Check.array(VirtualProxy.array("virtual", reflect));

remote = function () {}
Check.function(VirtualProxy.function("virtual", reflect));

remote = () => {}
Check.arrow(VirtualProxy.arrow("virtual", reflect));

console.log(Check.counter+" assertions passed!");
