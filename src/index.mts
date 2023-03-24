import express, { json, Request, Response, NextFunction } from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import express_limiter from "express-rate-limit";
import session from "express-session";
import MongoStore from "connect-mongo";

import bundler from "@core/neo-bundler.mjs";
import Database from "@lib/database.mjs";

import setup_stages from "@setup/stages.mjs";
import MailMan from "@lib/mailman.mjs";
import GrantAuthority from "@lib/grant-authority.mjs";
import {template} from "@lib/api-utils.mjs";

const { CONNECTION_STRING, DATABASE } = process.env;

const app = express();
const server = createServer({}, app);

app.use(express_limiter({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 500,                // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,   // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,    // Disable the `X-RateLimit-*` headers
}));
app.use(helmet());
app.disable('x-powered-by');
app.use(json());
app.use(express.static("./src/static"));
app.use(cors({
  origin :["http://localhost:3000", "http://localhost:3002"],
  credentials : true
}))


app.use(session({
  secret : "Naisho daiyo~",
  store : new MongoStore({
    mongoUrl : CONNECTION_STRING,
    dbName : DATABASE,
    collectionName : "sessions",
    stringify : false
  }),

  saveUninitialized : false,
  cookie : {
    httpOnly : true,
    secure : false,
  }
}));

const io = new Server(server, {
  maxHttpBufferSize: 1e9,
  pingTimeout: 60000,
});

//Catches Most Request errors.
//Default catch behavior logs the server's system directory which is a huge security issue.
app.use((err: Error, _ : Request, res : Response, next : NextFunction)=>{
    let temp = {error : err.name, details : err.message}
    if(err instanceof SyntaxError){
        temp = {error : "[RetardAlert]Malformed Request Body, Please verify.", details : err.message};
    }
    if(err instanceof Error){
        return res.status(400).json(temp);
    }
    next();
});

server.listen(process.env.PORT, ()=> {
    //Workaround, AddressInfo doesn't seem to have declared types yet.
    let temp:{[key : string] : any} =  new Object(server.address());
    //console.clear();
    console.log(`Process ID: ${process.pid}`);
    console.log(`HTTP Server is running on port`, temp.port);
});

console.clear();
Database.connect()
.then(async()=>{
  MailMan.initialize();
  await setup_stages();

  const [rest_ns, ws_ns] = await bundler(); 

  //GrantAuthority.build_definitions();
  GrantAuthority.load_endpoints(rest_ns, ws_ns);

  Object.entries(rest_ns).forEach(([namespace, module])=>{
    const {validators, handlers, controllers, cfg} = module.__meta__;

    //Unwind config and apply it to the code below.
    const base_dir  = cfg.base_dir ? `/${cfg.base_dir}` : "";
    const is_public = Boolean(cfg.public);

    Object.entries(handlers).forEach(([method, endpoints])=> {
      for(const [k, v] of Object.entries(endpoints)){
        const validator = validators[k];
        if(!validator)continue;

        app[method.toLowerCase() as RESTRequestType](`${base_dir}/${namespace}/${k}`, (req, res, next)=>{
          //Main Middleware for checking incoming requests.
          /*
            console.log(`${base_dir}/${namespace}/${k}`);
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

        /* @ts-ignore */
        app[method.toLowerCase()](`${base_dir}/${namespace}/${k}`, v.bind(controllers));
      }
    });
  });
});