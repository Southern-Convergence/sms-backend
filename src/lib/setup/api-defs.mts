import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

import {assess_namespace, get_stats} from "@utils/dir_fiddlers.mjs";
import Database from "@lib/database.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const rest_dir  = path.join(directory, "../../api/rest");
const ws_dir    = path.join(directory, "../../api/ws");


const DEFAULT_DOMAIN = "Southern Convergence";

export default async()=> {
  const [rest_paths, ws_paths] = await Promise.all([fs.readdir(rest_dir), fs.readdir(ws_dir)]);
  const [rest, ws]             = await Promise.all([get_stats(rest_paths, rest_dir).then((v)=> assess_namespace(v, rest_dir)), get_stats(ws_paths, ws_dir).then((v)=> assess_namespace(v, ws_dir))]);

  const REST:RESTNamespaceDeclaration = rest;
  const WS:WSNamespaceDeclaration = ws;

  
  //Build domain id for domain resolution required below.
  const domains = await Database.collection("domains")?.find({}).toArray();
  
  /* @ts-ignore */
  const domain_map = Object.fromEntries(domains?.map((v)=> [v.name, v._id]));
  
  Object.entries(REST).forEach(([namespace, {__meta__}])=>{
    const { cfg, validators, handlers } = __meta__;
    
    Object.entries(handlers).forEach(([method, handlermap])=> {
      Object.keys(handlermap).filter((v)=> validators[v]).forEach((v)=> {
        const obj = {
          name : `[AUTO] ${v.toUpperCase()}`,
          sfr_cfg : cfg,
          desc : "",
          ref  : `${cfg.base_dir ? `${cfg.base_dir}/` : ''}${namespace}/${v}`,
          op   : "",

          protocol  : "REST",
          method,
          domain_id : cfg.domain ? domain_map[cfg.domain] : domain_map[DEFAULT_DOMAIN],
          type      : "endpoint"
        };
        Database.collection("resources")?.updateOne({ ref : obj.ref}, { $set : obj }, { upsert : true});
      });
    });
  });
  
  Object.entries(WS).forEach(([namespace, {__meta__}])=>{
    const { cfg, validators, handlers } = __meta__;

    //Later tater hubya ak
  });
}