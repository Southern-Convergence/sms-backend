import fs from "fs/promises";
import path from "path";

export async function get_stats(dirs : string[], base_dir : string) {
  let temp = await Promise.all(dirs.map((v)=> fs.lstat(path.join(base_dir, v)).then((stats)=> ({ stats, dir : v }))));
  return temp.filter(({ stats })=> stats.isFile()).map((v)=> v.dir);
}

export async function assess_namespace(stats : string[], dir : string){
  let dirs = stats.map((v)=> `file:///${dir.replaceAll("\\", "/")}/${v}`);
  return Promise.all(dirs.map((d)=> import(d).then((v)=> [d.replace(".mjs", "").substring(d.lastIndexOf("/")+1), v.default]))).then(Object.fromEntries);
}

export async function import_bare(stats : string[], dir : string){
  let dirs = stats.map((v)=> `file:///${dir.replaceAll("\\", "/")}/${v}`);
  return Promise.all(dirs.map((d)=> import(d).then((v)=> [d.replace(".mjs", "").substring(d.lastIndexOf("/")+1), v.default])))
}