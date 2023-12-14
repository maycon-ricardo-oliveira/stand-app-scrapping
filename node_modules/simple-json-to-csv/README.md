This package was especially made for Bryan

```
const Converter = require("simple-json-to-csv");

const file = new Converter([
  { name: "Kervin", age: "26" },
  { name: "Daniel", age: "4" }
]);

file.convert("out/result.csv").then(console.log);
```