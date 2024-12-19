
const VirtualProxy = require("./main.js");
const Check = require("./check.js");

let virtual;
const reflect = {};
Reflect.ownKeys(Reflect).forEach((key) => {
  reflect[key] = function () {
    if (this !== reflect)
      throw new Error("This should refer to the colletion of handlers");
    if (arguments[0] !== "virtual")
      throw new Error("The target should be the string 'virtual'");
    arguments[0] = virtual;
    return Reflect[key](...arguments);
  };
});

virtual = {};
Check.Object(VirtualProxy.Object("virtual", reflect));

virtual = [];
Check.Array(VirtualProxy.Array("virtual", reflect));

virtual = function () {}
Check.Function(VirtualProxy.Function("virtual", reflect));

virtual = function () { "use strict"; }
Check.StrictFunction(VirtualProxy.StrictFunction("virtual", reflect));

virtual = () => {}
Check.Arrow(VirtualProxy.Arrow("virtual", reflect));

virtual = () => { "use strict"; }
Check.StrictArrow(VirtualProxy.StrictArrow("virtual", reflect));

console.log(Check.counter+" assertions passed!");
