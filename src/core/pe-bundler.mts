import { Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

import PIP from "@core/pip.mjs";


import {assess_namespace, get_stats} from "@utils/dir_fiddlers.mjs";
import Grant from "@lib/grant.mjs";
import { render_hbs } from "@lib/mailman.mjs";
import UACException from "@utils/uac-exceptions.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const pe_dir   = path.join(directory, "../pe");

export default async(app : Express)=> {
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
      const requisite_fns = Object.entries(requisite_map).flatMap(([attr, [type, mandatory]])=> {
        return [attr ,(subject_id : string, resource_id : string)=> {
          if(type === "object")return Grant.get_attr(resource_id, attr, Boolean(mandatory));
          if(type === "subject")return Grant.get_attr(subject_id, attr, Boolean(mandatory));
        }];
      });

      return [pe, {requisites : requisite_fns, logic_block }];
    })

    console.log(pe_descriptors);


    const fn = (subject_id : string, resource_id : string)=> {
      
    }

    const sss = Object.fromEntries(pe_descriptors)
    return [engine_name, fn];
  });

  const PolicyEngines = Object.fromEntries(bundled);
  console.log(PolicyEngines)

  app.use((req, res, next) => {
    //How to find true Happiness: Steps below
    //Figure out what endpoint is being called
    //Treat it as a resource request
    //Get session context
    //Get APT from session
    //Get Basis of APT
    //Use Basis to figure out which PE to use.
    //profit?????

    //Step 1: Get Resource
    const grant_result: any = Grant.get_rest_resource(
      req.path.replace("/", "")
    );
    //Step 1.1: Is it Publicly accessible?
    if (grant_result.sfr_cfg.public) return next();

    //Step 2: Get Session
    const { user } = req.session;
    //Step 2.2: Get APT From Session
    const apts = user?.access;
    if (!apts || !apts.length)throw new UACException(UACExceptionCode["PAP-003"]); //Immediately deny access if apt is nil.
    //Step 2.3: Get Basis of APT
    const pe_def = apts.map((v)=>Grant.get_apt_details(v.toString()));
    pe_def.forEach(([_apt, _policy])=> {

    });


    next();
  });
}

type PolicyEngineMap = {
  [engine_name : string] : {
    [policy : string] : (resource_id : string, subject_id : string)=> boolean
  }
}