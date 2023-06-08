import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path from "path";
import { fileURLToPath } from "url";

import CFG from "@cfg/mailman.json" assert { type : "json" };
import { NODE_ENV, ALLOWED_ORIGIN, G_API_REDIRECT } from "@cfg/index.mjs";
import gsuite_client from "@utils/gsuite_client.mjs";


const __filename = fileURLToPath(import.meta.url);
const directory  = path.dirname(__filename);
const IS_DEV     = NODE_ENV === "production";

export class MailMan {
  private _cfg      : (TransportCFG | null) = null;
  /* @ts-ignore TODO: Definite assignment to appropriate transport, I've no time.*/
  private transport : nodemailer.Transporter;

  constructor(namespace : string, cfg : TransportCFG){
    const { user, clientId, clientSecret, refreshToken } = cfg.transport_options.auth;
        
    (async()=> {
      if(!IS_DEV && namespace !== "ethereal")cfg.transport_options.accessToken = await gsuite_client({CLIENT_ID : clientId, REFRESH_TOKEN : refreshToken, SECRET : clientSecret, REDIRECT_URL : G_API_REDIRECT}).getAccessToken();
      this._cfg = cfg;

      this.transport = nodemailer.createTransport(!IS_DEV ? cfg.transport_options : CFG["ethereal"].transport_options);

      this.transport.use("compile", hbs({
        viewEngine : {
          extname : ".hbs",
          partialsDir : path.join(directory, "hbs/partials"),
          defaultLayout : "",
      
          helpers : {
            url_concat : (...args : any[]) => {
              args.pop();
              return [...args].toString().replaceAll(",", "/");
            }
          }
        },
      
        viewPath : path.join(directory, "hbs/templates"),
        extName  : ".hbs"
      }));
    })();
  }

  post(header : PostHeader, body : PostBody){
    body.context = {
      ...body.context,
      domain : ALLOWED_ORIGIN
    }

    return this.transport?.sendMail({
      ...this._cfg?.mail_options,
      ...header,
      ...body,
      context : body.context
    });
  }
}

export class PostOffice{
  static mailmen : TransportDict;

  static initialize(){
    console.log(`[PostOffice]`)
    this.mailmen = Object.fromEntries(Object.entries(CFG).map(([namespace, cfg])=> {
      return [namespace, new MailMan(namespace, cfg)];
    }));
  }
}