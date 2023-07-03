declare type ObjectId = import("mongodb").ObjectId;

declare type User = {
  _id      : string;
  username : string;
  name     : string[];
  type     : string;
  access   : {
    //Derived from AP-Template lookup
    _id       : string;
    name      : string;
    basis     : ObjectId;
    domain_id : ObjectId;
    resources    : {
      resource : ObjectId,
      write    : Boolean
    }[]
  }
}


declare type GrantTable = {
  [domain : string] : {
    [ap_template : string] : {
      [page : string] : BoundResource
    }
  }
}

declare type Domain = {
  name       : string;
  secret_key : string;
  icon       : string;

  access_policies   : string[];
  security_policies : string[];
    
  access_templates : AccessTemplate[];
}

declare type Subdomain = {
  name  : string;
  desc  : string;
  pages : Page[];
}

declare type Page = {
  name      : string;
  desc      : string;
  ref       : string;
  endpoints : Endpoint[];
  files     : File[];
}

declare type Endpoint = {
  name : string;
  ref  : string;
  desc : string;
  type : Operation;
  protocol : Protocol;
}

declare type File = {
  name : string;
}

/* AP */
declare type AccessTemplate = {
  basis  : string;
  name   : string;

  resources : {
    [subdomain : string] : {
      pages : {[page : string] : boolean}
    }
  } 
}

declare type RoleMap = {
  [ap_schema : string] : {
    [name : string] : {
      pages : Grants,
      endpoints : {}
    }
  }
}

declare type BoundResource = {
  pages     : {
    [page : string] : boolean
  }
  endpoints : {
    [endpoint_name : string] : boolean
  }
}

declare type ResourceMap = {
  [id : string] : (RawEndpoint | RawPage | RawSubdomain);
}

declare type NamespaceMap = {
  [namespace : string] : {
    [protocol : Protocol] : {
      [endpoint : string] : string; //Protocol (HTTP or WS)
    }
  }
}

declare type Grants = {[page : string] : boolean};
declare type PageGrant = {name : string; ref : string; write : true};

/* Common object for the resolution of Grants */
declare type GrantAddress = {
  domain : string;
  type   : string;
  attr   : string;
}


/* Database Objects */
declare type RawEndpoint = {
  name      : string;
  desc      : string;
  ref       : string;
  namespace : string,
  op        : ("Read" | "Write");
  protocol  : ("WS" | "REST");
  domain_id : string;
  type      : "endpoint";
}

declare type RawPage = {
  name      : string;
  desc      : string;
  ref       : string;
  domain_id : string;
  endpoints : string[];
  type      : "page";
}

declare type RawSubdomain = {
  name      : string;
  desc      : string;
  pages     : string[];
  domain_id : string;
  type      : "subdomain" 
}


/* Custom Errors */

//Notation:
/*
  A = Issues with Resolving Grant Access.
  I = Insufficient Privileges
  O = Ownership Issues
  L = Location Issues

  A01  = Access-Template
  I01  = No Access.
  I02  = No Write Access.
  O01  = No Ownership.
  O02  = Ownership Revoked.
  L01  = Out of Perimeter
  L02  = Out of Bounds(Locality)
*/
declare type UACException = (
  "UAC-A01" |
  "UAC-I01" |
  "UAC-I02" |
  "UAC-O01" |
  "UAC-O02" |
  "UAC-L01" |
  "UAC-L02"
)