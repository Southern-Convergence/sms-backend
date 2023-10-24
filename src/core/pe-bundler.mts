import { Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

import {assess_namespace, get_stats} from "@utils/dir-fiddlers.mjs";
import Grant from "@lib/grant.mjs";
import { render_hbs } from "@lib/mailman.mjs";
import UACException from "@utils/uac-exceptions.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const pe_dir   = path.join(directory, "../pe");

export default async()=> {
  const pe_path = await fs.readdir(pe_dir);
  const pe:PolicyDeclaration = await get_stats(pe_path, pe_dir).then((v)=> assess_namespace(v, pe_dir));

  const _bundled = Object.entries(pe).map(([_, engine])=> {
    const { requisites } = engine;

    const requisite_fns = Object.entries(requisites).map(([attr, [type, mandatory]])=> {
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

    return [engine.name, {...engine, requisites : Object.fromEntries(requisite_fns)}]
  })

  Grant.build_engine_definitions(Object.fromEntries(_bundled));
}