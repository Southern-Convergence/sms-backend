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
  [engine_name : string] : {
    __meta__ : {
      requisites : RequisiteMap;
      logic      : PolicyLogic;
    }
  }
}
declare type PolicyEngineDescriptor = {
  requisites : RequisiteMap;
  logic      : PolicyLogic & ThisType<{attrs : any}>;
}
declare type PolicyEngineMap = {
  [engine_name : string] : {
    [policy_name : string] : {
      requisites  : RequisiteResolver,
      logic_block : Function
    }
  }
}
declare type AttributeType = (
  "subject"    |
  "object"     |
  "contextual"
)
type RequisiteMap         = {[logic_id : string] : {[requisite_name : string] : RequisiteDescription}};
type RequisiteResolver    = (resource_id : string, subject_id : string)=> any;
type RequisiteDescription = [AttributeType, boolean?];
type PolicyLogic = {[logic_id : string] : Function}


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
  Internal = "internal",
  NPE      = "npe"
}


/* AUAC Resource Types */
declare type Resource = {
  _id       : ObjectId;
  name      : string;
  type      : string;
  desc      : string;
  resources : Resource[];
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
  "PDP-001" = "Deny",
  "PDP-002" = "Indeterminate"
}

/* Utils */
type DeconflictMethods = "sequence" | "priority";
type AttributeType     = "subject" | "object" | "contextual";