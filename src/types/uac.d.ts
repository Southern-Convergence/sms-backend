
declare type Session      = import("express-session").Session;
declare type SessionData  = import("express-session").SessionData;

declare type ObjectId = import("mongodb").ObjectId;

/**
 * AUAC Type Definitions
 * 
 * @author Emmanuel Abellana
 * 
 * @description To whom it may concern haha
 */


/* Policy Engine Types */
declare type UACConfig = {
  engine: string;
  deconflict?: DeconflictMethods;
};
declare type PolicyDeclaration = {
  [engine_name : string] : PolicyEngineDescriptor
}

declare type PolicyEngineDescriptor = {
  name    : string;
  abbrev? : string;
  author? : string;
  desc?   : string;
  icon?   : string;

  requisites : (RequisiteMap | ResolvedRequisiteMap);
  logic      : PolicyLogic;
} & ThisType<EngineCtx>

declare type EngineCtx = {
  attrs   : any,
  policy  : Policy,
  apt     : APT,
  session : Session & Partial<SessionData>
}

declare type ResolvedRequisiteMap = {
  [requisite_name : string] : Function
}

declare type AttributeType = (
  "subject"    |
  "object"     |
  "contextual"
)
type RequisiteMap         = {[requisite_name : string] : RequisiteDescription};
type RequisiteResolver    = (resource_id : string, subject_id : string)=> any;
type RequisiteDescription = [AttributeType, boolean?];
type PolicyLogic          = Function


/* AUAC User Types */
declare type User = {
  _id      : ObjectId;
  username : string;
  email    : string;
  name     : string[];
  type     : UserType;
  status   : UserStatus
  access   : {
    //Derived from AP-Template lookup
    _id       : string;
    name      : string;
    basis     : ObjectId;
    domain_id : ObjectId;
    resources : []
  }
}
declare const enum UserStatus {
  Active     = "active",
  Suspended  = "suspended",
  Terminated = "terminated",
  Invited    = "invited",
}
declare const enum UserType{
  Human = "human",
  NPE   = "npe"
}


/* AUAC Resource Types */
declare type Resource = {
  _id        : ObjectId;
  name       : string;
  type       : string;
  desc       : string;
  domain_id  : string;
  service_id : string; 
  resources  : Resource[];
};
declare interface Subdomain extends Resource{};
declare interface Page extends Resource {
  ref       : string;
  resources : Resource[];
}
declare interface Endpoint extends Resource{
  ref      : string;
  desc     : string;
  sfr_cfg  : SFRConfig;
  protocol : Protocol;
  method   : string;
  oas_spec : any;
}
declare interface File extends Resource {
  meta : object;
}


/* AUAC Policy Types */
declare type APT = {
  _id       : string;
  basis     : string;
  domain_id : string;
  resources : Resource[];
}

declare type SPT = {
  _id : string;
}

declare type Policy = {
  name : string;
  type : ("access" | "security"),
  desc : string;
  icon : string;
}

/* AUAC Service Types */
declare type Service = {
  name     : string;
  domain   : string;
  type     : ("frontend" | "backend");
  internal : boolean;
}

declare interface FrontendService extends Service {
  framework : string;
  info : {
    title : string;
    description : string;
    version : string;
  }
  version : string;
}

declare interface BackendService extends Service {
  port : string;
}

/* Exceptions */
declare const enum UACExceptionCode {
  //PIP Exceptions
  "PIP-001" = "No Such Resource",
  "PIP-002" = "No Such Attribute",

  //PAP Exceptions
  "PAP-001" = "Failed to resolve domain",
  "PAP-002" = "Failed to resolve Policy",
  "PAP-003" = "Failed to resolve APT",
  "PAP-004" = "Failed to resolve Policy Engine",

  //PDP Exceptions
  "PDP-001" = "Access Denied",
  "PDP-002" = "Indeterminate"
}

/* Utils */
type DeconflictMethods = "sequence" | "priority";
type AttributeType     = "subject" | "object" | "contextual";