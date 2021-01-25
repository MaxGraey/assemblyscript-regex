global.TextDecoder = require("text-encoding").TextDecoder;
const fs = require("fs");
const loader = require("@assemblyscript/loader/umd/index");

const Benchmark = require("benchmark");
const suite = new Benchmark.Suite();

wasmModule = loader.instantiateSync(fs.readFileSync("./build/untouched.wasm"), {
  env: {
    log: () => {
      const { __getString, __release } = wasmModule.exports;
      str = __getString(strPtr);
      console.log(str);
      __release(strPtr);
    },
  },
});

function executeRegex(regexStr, valueStr) {
  const {
    RegExp,
    createRegExp,
    __newString,
    __retain,
    __release,
  } = wasmModule.exports;

  // create the regexp
  const regexPtr = __retain(__newString(regexStr));
  const flagsPtr = __retain(__newString(""));
  const regexObjPtr = createRegExp(regexPtr, flagsPtr);
  const regex = RegExp.wrap(regexObjPtr);
  __release(regexPtr);
  __release(flagsPtr);

  const strPtr = __retain(__newString(valueStr));
  regex.exec(strPtr);
  __release(strPtr);
  __release(regexObjPtr);
}

// add tests
suite
  .add("baseline", () => {
    // this test primarily measures the overhead in the wasm / JS interop
    executeRegex("", "");
  })
  .add("character class", () => {
    executeRegex("[a-zA-C0-9J]", "J"); // match char
    executeRegex("[a-zA-C0-9J]", "a"); // match char in range
  })
  .add("concatenation", () => {
    executeRegex("this is a long string", "this is a long string");
  })
  .add("quantifiers", () => {
    executeRegex("a*", "aaaaa");
    executeRegex("a+", "aaaaa");
    executeRegex("a?", "a");
  })
  .add("range quantifiers", () => {
    executeRegex("a{20,30}", "a".repeat(25));
  })
  .add("alternation", () => {
    executeRegex("a|b|c|d|e|f|g", "d");
  })
  // add listeners
  .on("cycle", (event) => {
    console.log(String(event.target));
  })
  // run async
  .run({ async: true });
