/*
  This script is aptly called stages because you're supposed
  to call any setup scripts in sequence if they have dependencies.
*/

import auac_cleanup from "@setup/auac-cleanup.mjs";
import api_defs from "@setup/api-defs.mjs";
import access_defs from "@setup/access-defs.mjs";
import build_indices from "@setup/build-indices.mjs";
import grant_def from "@setup/grant-def.mjs";

export default async function(){
  console.time("Setup Script Runtime");
  try{
    await auac_cleanup();
    await api_defs();
    await access_defs();
    await build_indices();
    await grant_def();

  }catch(err){
    console.log(err);
  }
  console.timeEnd("Setup Script Runtime");
}