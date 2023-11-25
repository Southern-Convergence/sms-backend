/*
  This script is aptly called stages because you're supposed
  to call any setup scripts in sequence if they have dependencies.
*/

import auac_cleanup from "@setup/auac-cleanup.mjs";
import access_defs from "@setup/access-defs.mjs";
import build_indices from "@setup/build-indices.mjs";
import grant_def from "@setup/grant-def.mjs";
import logger from "@lib/logger.mjs";
import education from "./education.mjs";

export default async function () {
  try {
    //await auac_cleanup();
    await access_defs();
    await build_indices();
    await grant_def();
    await education();

  } catch (err) {
    logger.error(err)
  }
}