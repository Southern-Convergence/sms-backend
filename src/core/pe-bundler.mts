import { Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

import {assess_namespace, get_stats} from "@utils/dir_fiddlers.mjs";
import Grant from "@lib/grant.mjs";
import { render_hbs } from "@lib/mailman.mjs";
import UACException from "@utils/uac-exceptions.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const pe_dir   = path.join(directory, "../pe");

export default async()=> {
  const pe_path = await fs.readdir(pe_dir);
  const pe      = await get_stats(pe_path, pe_dir).then((v)=> assess_namespace(v, pe_dir));

  const PE:PolicyDeclaration = pe;

  const bundled = Object.entries(PE).map(([engine_name, engine])=> {
    const { requisites, logic } = engine.__meta__;

    //Register Valid Policy Engine Descriptors
    const requisite_descriptors = Object.keys(requisites);
    const logic_descriptors     = Object.keys(logic);

    const valid_pe_descriptors = logic_descriptors.filter((v)=> requisite_descriptors.includes(v));

    const pe_descriptors = valid_pe_descriptors.map((pe)=>{
      const requisite_map = requisites[pe];
      const logic_block   = logic[pe];
      //Resolve Requisites
      const requisite_fns = Object.entries(requisite_map).map(([attr, [type, mandatory]])=> {
        return [attr ,(subject : User, resource_id : string)=> {
          if(type === "object")return Grant.get_attr(resource_id, attr, Boolean(mandatory));
          if(type === "subject"){
            /* @ts-ignore */
            const resolved_attr = subject[attr];
            if(!resolved_attr && mandatory)throw new UACException(UACExceptionCode["PIP-002"]);

            return resolved_attr;
          }
        }];
      });

      return [pe, {requisites : Object.fromEntries(requisite_fns), logic_block }];
    })

    return [engine_name, Object.fromEntries(pe_descriptors)];
  });

  const PolicyEngines:PolicyEngineMap = Object.fromEntries(bundled);
  Grant.build_engine_definitions(PolicyEngines);
}