const fs = require('fs');
const path = require('path');

const targetDir = "houston";
const dir = path.dirname(__filename);
const houston = path.join(dir, targetDir);

fs.readdir(houston, function (err, files) {
  //handling error
  if (err) {
      return console.log('Unable to scan directory: ' + err);
  } 
  //listing all files using forEach
  const output = {};
  for (f in files) {
    const filename = files[f];
    if (filename.endsWith(".json"))
      continue;
    const entityName = path.basename(filename).replace(/\w/g, '_');
    output[entityName] = `./models/${targetDir}/${encodeURIComponent(filename)}`;
  }
  fs.writeFileSync(path.join(houston, "index.json"), JSON.stringify(output));
  console.log("All Done");
});