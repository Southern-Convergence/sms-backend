/*
  This script is aptly called stages because you're supposed
  to call any setup scripts in sequence if they have dependencies.
*/

import access_defs from "@setup/access-defs.mjs";

import build_indices from "@setup/build-indices.mjs";

export default async function(){
  console.time("Setup Script Runtime");
  try{
    await access_defs();
    await build_indices();
  }catch(err){
    console.log(err);
  }
  console.timeEnd("Setup Script Runtime");
}