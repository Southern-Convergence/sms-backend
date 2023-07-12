import nodemailer from "nodemailer";
import { engine, create } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";

import CFG from "@cfg/mailman.mjs";
import { NODE_ENV, ALLOWED_ORIGIN, G_API_REDIRECT } from "@cfg/index.mjs";
import gsuite_client from "@utils/gsuite_client.mjs";


const __filename = fileURLToPath(import.meta.url);
const directory  = path.dirname(__filename);
const IS_DEV     = NODE_ENV === "production";

const hbs = create({
  extname       : ".hbs",
  partialsDir   : path.join(directory, "hbs/partials"),
  layoutsDir    : path.join(directory, "hbs/layouts"),
  encoding : "utf-8",
  
  defaultLayout : "default",

  helpers : {
    url_concat : (...args : any[]) => {
      args.pop();
      return [...args].toString().replaceAll(",", "/");
    }
  }
})

export class MailMan {
  private _cfg      : (TransportCFG | null) = null;
  /* @ts-ignore TODO: Definite assignment to appropriate transport, I've no time.*/
  private transport : nodemailer.Transporter;

  constructor(namespace : string, cfg : TransportCFG){
    const { clientId, clientSecret, refreshToken } = cfg.transport_options.auth;
    
    (async()=> {
      if(!IS_DEV && namespace !== "ethereal")cfg.transport_options.accessToken = await gsuite_client({CLIENT_ID : clientId, REFRESH_TOKEN : refreshToken, SECRET : clientSecret, REDIRECT_URL : G_API_REDIRECT}).getAccessToken();
      this._cfg = cfg;

      this.transport = nodemailer.createTransport(!IS_DEV ? cfg.transport_options : CFG["ethereal"].transport_options)
    })()
    .catch((err)=> console.log(`Failed to initialize MailMan.\n${namespace}.${err}`))
  }

  async post(header : PostHeader, body : PostBody){
    const { context, layout, template } = body;
    const html = await hbs.render(path.join(directory, `hbs/templates/${template}.hbs`), {...context, domain : ALLOWED_ORIGIN}, { layout });
    return this.transport?.sendMail({
      ...this._cfg?.mail_options,
      ...header,
      html
    }).then(()=> html);
  }
}

export class PostOffice{
  static #instances : TransportDict;

  static initialize(){
    console.log(`PostOffice Initialized`)
    this.#instances = Object.fromEntries(Object.entries(CFG).map(([namespace, cfg])=> {
      return [namespace, new MailMan(namespace, cfg)];
    }));
  }

  static get_instances(){
    return this.#instances;
  }
}