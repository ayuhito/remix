const { createTarGzip, parseTar } = require("nanotar");
const fs = require("node:fs/promises");
const path = require("node:path");

async function recursiveReaddir(dir) {
  let files = [dir];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // We want to push the directory path as well for the tarball
      files.push(fullPath);
      files = files.concat(await recursiveReaddir(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function createArchives() {
  try {
    const files = await fs.readdir(__dirname);
    const dirs = await Promise.all(
      files.map(async (file) => {
        const stat = await fs.stat(path.join(__dirname, file));
        return stat.isDirectory() ? file : null;
      })
    );

    for (let dir of dirs.filter(Boolean)) {
      const fullPath = path.join(__dirname, dir);
      console.log(`Creating archive for ${fullPath}`);

      try {
        const dirFiles = await recursiveReaddir(fullPath);
        const files = await Promise.all(dirFiles.map(async (filePath) => {
          const relativePath = path.relative(__dirname, filePath);
          const stat = await fs.stat(filePath);

          /** @type {import("nanotar").TarFileInput} */
          const item = {
            name: relativePath,
            attrs: {
              mode: stat.mode,
              mtime: stat.mtime.getTime(),
              uid: stat.uid,
              gid: stat.gid,
            },
          };

          if (!stat.isDirectory()) {
            item.data = (await fs.readFile(filePath)).buffer;
          } else {
            console.log(`Adding directory ${relativePath}`);
          }

          return item;
        }));
       
        const archive = await createTarGzip(files);
        await fs.writeFile(path.join(__dirname, `${dir}.tar.gz`), archive);
      } catch (err) {
        console.error(`Error processing directory ${fullPath}:`, err);
      }
    }
  } catch (err) {
    console.error("Error reading directories:", err);
  }
}
 
createArchives().catch((err) => console.error("Main error:", err));
