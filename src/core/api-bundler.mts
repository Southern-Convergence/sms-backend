import { Express, Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import morgan from "morgan";

import {assess_namespace, get_stats} from "@utils/dir_fiddlers.mjs";
import { template } from "@lib/api-utils.mjs";
import { verify_tt } from "@lib/multers.mjs";
import {PostOffice} from "@lib/mailman.mjs";
import {services} from "@lib/logger.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const rest_dir  = path.join(directory, "../api/rest");
const ws_dir    = path.join(directory, "../api/ws");

export default async(app : Express)=> {
  const [rest_paths, ws_paths] = await Promise.all([fs.readdir(rest_dir), fs.readdir(ws_dir)]);
  const [rest, ws]             = await Promise.all([get_stats(rest_paths, rest_dir).then((v)=> assess_namespace(v, rest_dir)), get_stats(ws_paths, ws_dir).then((v)=> assess_namespace(v, ws_dir))]);

  const REST:RESTNamespaceDeclaration = rest;
  Object.entries(REST).forEach(([namespace, module])=>{
    const {validators, handlers, controllers, cfg} = module.__meta__;

    //Unwind config and apply it to the code below.
    const base_dir  = cfg.base_dir ? `/${cfg.base_dir}` : "";
    const is_public = Boolean(cfg.public);

    Object.entries(handlers).forEach(([method, endpoints])=> {
      for(const [k, v] of Object.entries(endpoints)){
        const validator = validators[k];
        const validator_type = typeof validator === "function" ? "multer" : "joi";

        const dir = `${base_dir}/${namespace}/${k}`;
        if(!validator)continue;
        
        //Conditionally insert middlewares based on validator type.
        if(validator_type === "multer"){
          app[method.toLowerCase() as RESTRequestType](dir, validator);
          app[method.toLocaleLowerCase() as RESTRequestType](dir, verify_tt);

          app.use((err: Error, _ : Request, res : Response, next : NextFunction)=>{
            let temp = {error : err.message, details : err.cause};
            if(err)return res.status(400).json(temp);
            next();
          });
        }
        
        if(validator_type === "joi"){
          app[method.toLowerCase() as RESTRequestType](dir, (req, res, next)=>{

            //Main Middleware for checking incoming requests.
            /*
              It performs the ff. in sequence.
              * Check if the requested endpoint is flagged as publicly accessible.
              * Check if session exists and is valid.
              * Check if request body is valid and conforms to the endpoint's expected request body.
            */
            let error:string | boolean = true;
            
            /* PUBLIC ACCESSIBILITY CHECK */
            if(!is_public){
              /* SESSION VALIDITY CHECK */
              if(!req.session.user)return res.status(401).json({error : "Session not found."})
  
              /* AUTHORIZATION CHECK    */
            }

  
            /* REQUEST BODY VALIDITY CHECK */
            switch(method.toLowerCase()){
              case "get" : error = template(validator, req.query);break;
              default    : error = template(validator, req.body);
            }
            
            if(error)return res.status(400).json({error});
  
            next();
          });
        }

        /*
          Actual Injection of values happens here...
          Type Injections are done over at /src/core/index.mts
        */
        app[method.toLowerCase() as RESTRequestType](dir, v.bind({...controllers, postoffice : PostOffice.get_instances()}));
      }
    });
  });
}