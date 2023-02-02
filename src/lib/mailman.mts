import nodemailer from "nodemailer";
import handlebars from "handlebars";
import hbs from "nodemailer-express-handlebars";

import OAuthClient from "./google_api.mjs";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const directory  = path.dirname(__filename);


import {
  NODE_ENV,
  GOOGLE_API_EMAIL,
  GOOGLE_API_CLIENT_ID,
  GOOGLE_API_SECRET,
  GOOGLE_API_GMAIL_REFRESH_TOKEN,
  ETHEREAL_EMAIL,
  ETHEREAL_PASSWORD
} from "../config.mjs";
import SMTPTransport from "nodemailer/lib/smtp-transport/index.js";

export default class MailMan{
  private static is_dev    = NODE_ENV !== "production";
  private static transport:nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  static async initialize(){
    console.log(`MailMan transporter is set to ${this.is_dev ? "Ethereal" : "Gmail"}`);

    if(!this.is_dev){
      const accessToken = await OAuthClient.getAccessToken();
      this.transport = nodemailer.createTransport({
        service : "Gmail",
        host    : "smtp.gmail.com",
        auth : {
          type         : "OAuth2",
          user         : GOOGLE_API_EMAIL,
          clientId     : GOOGLE_API_CLIENT_ID,
          clientSecret : GOOGLE_API_SECRET,
          accessToken  : (accessToken.token || ""),
          refreshToken : GOOGLE_API_GMAIL_REFRESH_TOKEN
        }
      });

      this.transport.use("compile", hbs({
        viewEngine : {
          extname : ".hbs",
          partialsDir : path.join(directory, "hbs/partials"),
          defaultLayout : false,
      
          helpers : {
            url_concat : (...args : any[]) => {
              args.pop();
              return [...args].toString().replaceAll(",", "/");
            }
          }
        },
      
        viewPath : path.join(directory, "hbs"),
        extName  : ".hbs"
      }));

      
      return this.transport;
    }
    this.transport = nodemailer.createTransport({
      host : "smtp.ethereal.email",
      port : 587,
      auth : {
        user : ETHEREAL_EMAIL,
        pass : ETHEREAL_PASSWORD
      }
    });

    return Promise.resolve(this.transport);
  }
  
  static post(header : PostHeader, body : PostBody){
    this.transport.sendMail({...header, ...body});
  }
}