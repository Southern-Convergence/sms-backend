import { Express, Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import yaml from "js-yaml";

import { assess_namespace, get_stats } from "@utils/dir-fiddlers.mjs";
import { template } from "@lib/api-utils.mjs";
import { verify_tt } from "@lib/multers.mjs";
import { PostOffice } from "@lib/mailman.mjs";
import { facilities } from "@lib/logger.mjs";
import spaces from "@lib/spaces.mjs";
import j2s from "joi-to-swagger";
import { NODE_ENV, PORT } from "@cfg/index.mjs";
import Grant from "@lib/grant.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const rest_dir = path.join(directory, "../api/rest");
const ws_dir = path.join(directory, "../api/ws");
const docs_dir = path.join(directory, "../api/docs");

const openapi_yaml = path.join(directory, "../../openapi.yml");
const openapi_docs = path.join(directory, "../static/docs");
console.log(openapi_docs);
export default async (app: Express) => {
  //Reset from last build phase
  await fs.rm(openapi_docs, { recursive: true, force: true });

  //Build directories
  await Promise.all([rest_dir, ws_dir, docs_dir, openapi_docs].map((dir)=> fs.mkdir(dir, {recursive : true})));
       
  const [rest_paths, ws_paths, docs_path] = await Promise.all([
    fs.readdir(rest_dir),
    fs.readdir(ws_dir),
    fs.readdir(docs_dir)
  ]);

  const [rest, ws, docs] = await Promise.all([
    get_stats(rest_paths, rest_dir).then((v) => assess_namespace(v, rest_dir)),
    get_stats(ws_paths, ws_dir).then((v) => assess_namespace(v, ws_dir)),
    get_stats(docs_path, docs_dir).then((v) => assess_namespace(v, docs_dir)),
  ]);

  facilities.verbose(`Detected ${Object.keys(rest).length} REST SFRs.`);
  facilities.verbose(`Detected ${Object.keys(ws).length} WS SFRs.`);
  facilities.verbose(`Detected ${Object.keys(docs).length} OpenAPI Complementary Documents.`);

  const REST: RESTNamespaceDeclaration = rest;
  const oas_definitions: any = [];
  Object.entries(REST).forEach(([namespace, module]) => {
    const { validators, handlers, controllers, cfg } = module.__meta__;

    //Unwind config and apply it to the code below.
    const base_dir = cfg.base_dir ? `/${cfg.base_dir}` : "";
    const is_public = Boolean(cfg.public);

    Object.entries(handlers).forEach(([method, endpoints]) => {
      for (const [k, v] of Object.entries(endpoints)) {
        const validator = validators[k];
        const validator_type =
          typeof validator === "function" ? "multer" : "joi";

        const dir = `${base_dir}/${namespace}/${k}`;
        if (!validator) continue;

        //Conditionally insert middlewares based on validator type.
        if (validator_type === "multer") {
          app[method.toLowerCase() as RESTRequestType](
            dir,
            validator,
            verify_tt
          );

          app.use(
            (err: Error, _: Request, res: Response, next: NextFunction) => {
              let temp = { error: err.message, details: err.cause };
              if (err) return res.status(400).json(temp);
              next();
            }
          );
        }

        if (validator_type === "joi") {
          /*
            Lookup against the docs dictionary for matching
            OpenAPI path declaration
          */
          const temp = build_oas_definitions(
            [namespace, method, k, dir],
            validator,
            cfg
          );
          oas_definitions.push(temp);

          app[method.toLowerCase() as RESTRequestType](
            dir,
            (req, res, next) => {
              //Main Middleware for checking incoming requests.
              /*
              It performs the ff. in sequence.
              * Check if the requested endpoint is flagged as publicly accessible.
              * Check if session exists and is valid.
              * Check if request body is valid and conforms to the endpoint's expected request body.
            */
              let error: string | boolean = true;

              /* PUBLIC ACCESSIBILITY CHECK */
              if (!is_public) {
                /* SESSION VALIDITY CHECK */
                if (!req.session.user)
                  return res.status(401).json({ error: "Session not found." });

                /* AUTHORIZATION CHECK    */
              }

              /* REQUEST BODY VALIDITY CHECK */
              switch (method.toLowerCase()) {
                case "get":
                  error = template(validator, req.query);
                  break;
                default:
                  error = template(validator, req.body);
              }

              if (error) return res.status(400).json({ error });

              next();
            }
          );
        }

        /*
          Actual Injection of values happens here...
          Type Injections are done over at /src/core/index.mts
        */
        app[method.toLowerCase() as RESTRequestType](
          dir,
          v.bind({
            ...controllers,
            postoffice: PostOffice.get_instances(),
            spaces,
          })
        );
      }
    });
  });

  fs.readFile(openapi_yaml).then(async(d) => {
    let temp: any = yaml.load(d.toString());
    const refs = await Promise.all(
      oas_definitions.map(async(v: any) => {
        const paths = v[0].replace("/", "").split("/");

        const dir = paths.toString().replaceAll(",", "/");
        
        const oas_path = path.join(openapi_docs, dir);
        const filename = paths.pop();
        
        await fs.mkdir(oas_path, { recursive: true });
        await fs.writeFile(
          path.join(oas_path, `${filename}.yml`),
          yaml.dump(v[1]),
          { flag: "w+" }
        );

        return [`/${dir}`, {
          $ref : `docs/${dir}.yml`,
          obj  : v[1]
        }];
      })
    );
    
    temp.paths = Object.fromEntries(refs.map((v)=> [v[0], {$ref : v[1].$ref}]));
    
    //Write both to project root and to static docs for service discovery API.
    const _yaml = yaml.dump(temp);
    
    Promise.all([
      fs.writeFile(openapi_yaml, _yaml, { flag : "w+" }),
      fs.writeFile(path.join(openapi_docs, `index.yml`), _yaml, { flag : "w+" })
    ])
    .then(()=> {
      temp.paths = Object.fromEntries(refs.map((v)=> [v[0], v[1].obj]));
      
      Grant.register_service(temp.info.title, {
        ...temp,
        PORT
        //Idk, still leaning on using etcd, but it may take a while before I can use it proficiently
      });
    })
  });

  function build_oas_definitions(doc_address: string[], validator: any, cfg : SFRConfig) {
    const [namespace, method, endpoint, dir] = doc_address;
    const match = doc_lookup(namespace, method, endpoint);

    let operation_obj = {
      tags: [`sfr-router:${namespace}`, `sfr-stag:${cfg.service || "unspecified"}`],
      summary: "",
      
      description: "",
      deprecated: false,

      operationId: `[${method}]${endpoint}`,

      responses: {
        "200": {
          description: "Successful Operation",
          content: {
            "application/json": {
              schema: {},
            },
          },
        },

        "400": {
          description: "A non-fatal error has occured",
          content: {
            "application/json": {
              schema: {},
            },
          },
        }
      }
    } as any; //Serves as the default settings for operation declarations.

    if(cfg.public){
      operation_obj.responses["401"] = {
        description: "UAC Exception",
        content: {
          "application/json": {
            schema: {},
            example: "No Such Resource",
          },
        },
      }
    }

    if (match) {
      if (match.tags) match.tags = operation_obj.tags.concat(match.tags);
      operation_obj = { ...operation_obj, ...match };
    }

    const { swagger } = j2s(validator);

    //If method is GET, the converted validator is used as the "parameters" for the current operation_obj,
    //Otherwise, it is used as the "requestBody"
    operation_obj[method === "GET" ? "parameters" : "requestBody"] = swagger;

    return [dir, { [`${method}`.toLowerCase()]: operation_obj }];
  }

  function doc_lookup(namespace: string, method: string, endpoint: string) {
    let result = null;
    try {
      //Uncaught try catch is shorter than multiple type checks.
      result = docs[namespace][method][endpoint];
    } catch (error) {}

    return result;
  }
};