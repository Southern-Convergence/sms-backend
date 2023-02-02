declare type IResult = import("ua-parser-js").IResult;

export declare namespace Express {
  interface Request {
    tenant? : string
  }
}

export declare module "express-session" {
  interface SessionData {
    user : {
      _id      : string;
      username : string;
      type     : string;
      access   : string;
    },

    start : number;
    ip?    : string;

    agent? : IResult
  }
}

