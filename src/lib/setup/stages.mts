/*
  This script is aptly called stages because you're supposed
  to call any setup scripts in sequence if they have dependencies.
*/

import access_defs from "@setup/access-defs.mjs";

export default async function(){
  console.time("Setup Script Runtime");
  try{
    await access_defs();
  }catch(err){
    console.log(err);
  }
  console.timeEnd("Setup Script Runtime");
}