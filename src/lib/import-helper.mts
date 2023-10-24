import fs from "fs/promises";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const directory = path.dirname(__filename);

/**
 * @desc Attempts to import json files in a specified directory.
 * 
 * @param files An array of string which identifies the files to find.
 * @param dir   Relative directory of the search
 */
export const named_imports = async (files : string[], dir : string)=> Promise.all(files.map((v)=>fs.readFile(path.join(directory, `setup/src/${dir}/${v}.json`)).then((d)=> JSON.parse(d.toString()))));

export const to_dict = (src : [], key : string)=> Object.fromEntries(src.map((v)=> [v[key], v]));