const { createTarGzip } = require("nanotar");
const fs = require("node:fs");
const path = require("node:path");
const recursiveReaddir = require("recursive-readdir");

let files = fs.readdirSync(__dirname);
let dirs = files.filter((file) =>
  fs.statSync(path.join(__dirname, file)).isDirectory()
);

for (let dir of dirs) {
  let fullPath = path.join(__dirname, dir);
  console.log(`Creating archive for ${fullPath}`);

  let archive = [];

  // Use recursive-readdir to get all files recursively
  recursiveReaddir(fullPath).then((dirFiles) => {
    for (let filePath of dirFiles) {
      let relativePath = path.relative(__dirname, filePath);
      let stat = fs.statSync(filePath);

      /** @type {import("nanotar").TarFileInput[]} */
      let item = {
        name: relativePath,
        attrs: {
          mode: stat.mode,
          mtime: stat.mtime.getTime(),
          uid: stat.uid,
          gid: stat.gid,
        },
      };

      // If the file is not a directory, include the data attribute
      if (!stat.isDirectory()) {
        item.data = fs.readFileSync(filePath, "binary");
      }

      archive.push(item);
    }

    console.log(archive);

    createTarGzip(archive).then((file) => {
      fs.writeFileSync(path.join(__dirname, `${dir}.tar.gz`), file);
    });
  }).catch((err) => {
    console.error(`Error reading directory ${fullPath}:`, err);
  });
}
