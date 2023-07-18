import express, { json, Request, Response, NextFunction } from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import express_limiter from "express-rate-limit";
import session from "express-session";
import MongoStore from "connect-mongo";
import compression from "compression";

import Database from "@lib/database.mjs";
import setup_stages from "@setup/stages.mjs";
import { PostOffice } from "@lib/mailman.mjs";

import JobKomissar from "@lib/jobkomissar.mjs";
import { NODE_ENV } from "config.mjs";

import api_bundler from "@core/api-bundler.mjs";
import pe_bundler from "@core/pe-bundler.mjs";

import auac from "auac";
import Grant from "@lib/grant.mjs";
import UACException from "@utils/uac-exceptions.mjs";

const { ALLOWED_ORIGIN, CONNECTION_STRING, DATABASE } = process.env;

const IS_DEV = NODE_ENV === "development";

const app = express();
const server = createServer({}, app);

app.use(express.json({ limit: "100mb" }));
app.use(
  express_limiter({
    windowMs: 1 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  })
);

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

app.use(helmet());
app.disable("x-powered-by");
app.use(json());
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Set-Cookie",
      "Content-Type",
      "Authorization",
      "Access-Control-Allow-Headers",
      "access-control-allow-origin",
      "Access-Control-Allow-Credentials",
      "Access-Control-Expose-Headers",
      "Origin",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["Set-Cookie"],
    credentials: true,
  })
);
app.set("trust proxy", 1);
app.use(
  session({
    secret: "ERWEEEEEEEEEEN~",
    store: new MongoStore({
      mongoUrl: CONNECTION_STRING,
      dbName: DATABASE,
      collectionName: "sessions",
      stringify: false,
    }),

    saveUninitialized: false,
    cookie: {
      httpOnly: !IS_DEV,
      secure: !IS_DEV,
      sameSite: IS_DEV ? "strict" : "none",
    },
  })
);

const io = new Server(server, {
  maxHttpBufferSize: 1e9,
  pingTimeout: 60000,
});

//Catches Most Request errors.
//Default catch behavior logs the server's system directory which is a huge security issue.
app.use((err: Error, _: Request, res: Response, next: NextFunction) => {
  let temp = { error: err.name, details: err.message };
  if (err instanceof SyntaxError) {
    temp = {
      error: "[RetardAlert]Malformed Request Body, Please verify.",
      details: err.message,
    };
  }
  if (err instanceof Error) {
    return res.status(400).json(temp);
  }
  next();
});

server.listen(process.env.PORT, () => {
  //Workaround, AddressInfo doesn't seem to have declared types yet.
  let temp: { [key: string]: any } = new Object(server.address());
  //console.clear();
  console.log(`Process ID: ${process.pid}`);
  console.log(`HTTP Server is running on port`, temp.port);
});


Database.connect().then(async (db) => {
  PostOffice.initialize();
  JobKomissar.init(io, db);
  await setup_stages();


  pe_bundler(app);
  api_bundler(app);
});
