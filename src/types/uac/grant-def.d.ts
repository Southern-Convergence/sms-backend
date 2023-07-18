declare type ObjectId = import("mongodb").ObjectId;

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

declare type UserStatus = (
  "active"     | 
  "suspended"  |
  "terminated" | 
  "invited"    
);

declare type UserType = (
  "internal" |
  "npe"      
);

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


/* Resource Types */
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

declare const enum UACExceptionCode {
  //PIP Exceptions
  "PIP-001" = "No Such Resource",
  "PIP-002" = "No Such Attribute",


  //PAP Exceptions
  "PAP-001" = "Failed to resolve domain",
  "PAP-002" = "Failed to resolve Policy",
  "PAP-003" = "Failed to resolve APT",

  
  //PDP Exceptions
  "PDP-001" = "Deny",
  "PDP-002" = "Indeterminate"
}