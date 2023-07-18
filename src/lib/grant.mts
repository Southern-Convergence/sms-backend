import UACException from "@utils/uac-exceptions.mjs";

export default class Grant{
  //Steps to find happiness.

  /**
   * Resolve APT
   * Resolve Basis Policy
   * Process Policy Engine
   * 
   */

  /* ID to Object Mappings */
  static #policies  : { [policy_id : string] : Policy } = {};
  static #apts      : { [apt_id : string]    : AccessPolicy } = {};
  static #domains   : { [domain_id : string] : Domain } = {};
  static #resources : { [resource_id : string] : Resource } = {}; 

  /* Name to ID Mappings */
  static #rest_resources : {[resource_name : string] : ObjectId} = {};
  static #ws_resources   : {[resource_name : string] : ObjectId} = {};

  static build_definitions(policies : Policy[] ,apts : AccessPolicy[], domains : Domain[], resources : Resource[]){
    this.#policies = to_dict(policies);
    this.#apts     = to_dict(apts);
    this.#domains  = to_dict(domains);

    resources.forEach((v)=>{
      this.#resources[v._id.toString()] = v;
      if(v.type === "endpoint"){
        /* @ts-ignore not optimal but meh */
        const e:Endpoint = v;
        switch(e.protocol){
          case "REST": this.#rest_resources[e.ref] = e._id;break;
          case "WS"  : this.#ws_resources[e.ref] = e._id;break;
        }
      }
    });
  }

  static get_rest_resource(ref : string){
    const result = this.#rest_resources[ref];
    if(!result)throw new UACException(UACExceptionCode["PIP-001"]);

    return this.#resources[result.toString()];
  }

  static get_attr(_id : string, attr_name : string, mandatory : boolean){
    const resource = this.#resources[_id];
    if(!resource && mandatory)throw new UACException(UACExceptionCode["PIP-001"]);

    /* @ts-ignore */
    const attr = (resource||{})[attr_name];
    if(!attr && mandatory)throw new UACException(UACExceptionCode["PIP-002"]);

    return attr;
  }

  static get_apt_details(apt_id : string){
    const apt = this.#apts[apt_id];
    if(!apt)throw new UACException(UACExceptionCode["PAP-003"]);

    const policy = this.#policies[apt.basis];
    if(!policy)throw new UACException(UACExceptionCode["PAP-002"]);
    
    return [apt, policy];
  }
}

function to_dict(items : any[]){
  return Object.fromEntries(items.map((v)=> [v._id, v]));
}

type Policy = {
  _id  : string;
  name : string;
  type : string;
  desc : string;
  icon : string;
}

type AccessPolicy = {
  _id       : string;
  name      : string;
  basis     : string;
  domain_id : string;
  resources : string[]
}

declare type Domain = {
  _id        : string;
  name       : string;
  secret_key : string;
  icon       : string;

  access_policies   : string[];
  security_policies : string[];
    
  access_templates : APT[];
  resources        : Resource[];
}