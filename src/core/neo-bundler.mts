import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const rest_dir = path.join(directory, "../api/rest");
const ws_dir   = path.join(directory, "../api/ws");

export default async function parse_namespaces() : Promise<[RESTNamespaceDeclaration, WSNamespaceDeclaration]>{
  //We Split the parsing methods into separate functions so as to maintain readability as they are pretty dense.
  //Prepare Files and Directories:
  const [rest_paths, ws_paths] = await Promise.all([fs.readdir(rest_dir), fs.readdir(ws_dir)]);
  return Promise.all([get_stats(rest_paths, rest_dir).then((v)=> assess_namespace(v, rest_dir)), get_stats(ws_paths, ws_dir).then((v)=> assess_namespace(v, ws_dir))]); 
}

//Helper fns:
async function get_stats(dirs : string[], base_dir : string) {
  let temp = await Promise.all(dirs.map((v)=> fs.lstat(path.join(base_dir, v)).then((stats)=> ({ stats, dir : v }))));
  return temp.filter(({ stats })=> stats.isFile()).map((v)=> v.dir);
}

async function assess_namespace(stats : string[], dir : string){
  let dirs = stats.map((v)=> `file:///${dir.replaceAll("\\", "/")}/${v}`);
  let namespaces = await Promise.all(dirs.map((d)=> import(d).then((v)=> [d.replace(".mjs", "").substring(d.lastIndexOf("/")+1), v.default]))).then(Object.fromEntries);

  //Check validity of the namespace declarations.
  //This will include checks such as:

  //Validation Parity
  //EventHooks Parity
  //Warnings against stale controllers
  //and others that I can come up with.

  //For now, we simply return.
  return namespaces;
}