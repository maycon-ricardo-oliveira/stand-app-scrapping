var jsonexport = require("jsonexport");
var fs = require("fs");

class Converter {
  constructor(data) {
    this.data = data;
  }

  async convert(path) {
    return jsonexport(this.data, (err, csv) => {
      if (err) return console.log(err);
      fs.writeFile(path, csv, err => {
        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        console.log("file saved!");
      });
      console.log(csv);
    });
  }
}

module.exports = Converter;
