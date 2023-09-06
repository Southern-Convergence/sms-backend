import winston from "winston";
import "winston-mongodb";
import "morgan";

import {ObjectTransport, CachedTransport} from "@utils/custom-transports.mjs";

import { NODE_ENV, DEVELOPMENT_LOG_LEVEL, PRODUCTION_LOG_LEVEL } from "@cfg/index.mjs";

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
        
      return str;
    })
  )
});

const http_console_transport = new winston.transports.Console({
  level : IS_DEV ? DEVELOPMENT_LOG_LEVEL : PRODUCTION_LOG_LEVEL,

  format : winston.format.combine(
    winston.format.colorize({ all : true }),
    winston.format.timestamp({ format : "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf((log) => {
      const {type, timestamp, level, method, status, message} = log;
      
      let str = `[${type}:${method}] ${timestamp} ${level}: ${message} > ${status}`;
        
      return str;
    })
  )
})

const mongodb_transport = new ObjectTransport({ level : PRODUCTION_LOG_LEVEL });

const transports = [ IS_DEV ? console_transport : mongodb_transport ];
const http_transports = [ IS_DEV ? http_console_transport : mongodb_transport];

export default winston.createLogger({
  defaultMeta: { type : "SYSTEM" },
  transports
});

export const services = winston.createLogger({ 
  defaultMeta: { type : "API" },
  transports : http_transports
});

export const setup = winston.createLogger({
  defaultMeta: { type : "SETUP" },
  transports
});

export const uac = winston.createLogger({
  defaultMeta : { type : "UAC" },
  transports : http_transports
});

export const fileguard = winston.createLogger({
  defaultMeta : { type : "FILEGUARD" },
  transports
})

export const facilities = winston.createLogger({
  defaultMeta : { type : "FACILITY" },
  transports
})