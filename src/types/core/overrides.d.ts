declare type IResult = import("ua-parser-js").IResult;
declare type ObjectId = import("mongodb").ObjectId;

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
      email    : string;
      type     : string;
      access   : ObjectId[];
    },

    start : number;
    ip?    : string;

    agent? : IResult
  }
}

