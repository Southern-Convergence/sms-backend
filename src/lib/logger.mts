import winston from "winston";
import "winston-mongodb";

import {ObjectTransport, CachedTransport} from "@utils/custom-transports.mjs";

import { NODE_ENV, DEVELOPMENT_LOG_LEVEL, PRODUCTION_LOG_LEVEL } from "config.mjs";

const IS_DEV = NODE_ENV === "development";

winston.addColors({
  error   : "red",
  warn    : "yellow",
  info    : "green",
  http    : "magenta",
  debug   : "white",
  verbose : "blue"
});

const console_transport = new winston.transports.Console({
  level : IS_DEV ? DEVELOPMENT_LOG_LEVEL : PRODUCTION_LOG_LEVEL,

  format : winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf((log) => {
      const {type, timestamp, level, message} = log;
      let str = `[${type}] ${timestamp} ${level}: ${message}`;

      if(type === "http")str += "\n";
        
      return str;
    })
  )
});

const mongodb_transport = new ObjectTransport({ level : "debug" });
const cached_transports = [ IS_DEV ? console_transport : new CachedTransport({ level : "verbose"})];

const transports = [ IS_DEV ? console_transport : mongodb_transport ];

export default winston.createLogger({
  defaultMeta: { type : "SYSTEM" },
  transports
});

export const services = winston.createLogger({ 
  defaultMeta: { type : "API" },
  transports
});

export const setup = winston.createLogger({
  defaultMeta: { type : "SETUP" },
  transports
});

export const uac = winston.createLogger({
  defaultMeta : { type : "UAC" },
  transports : cached_transports
});