import UACException from "@utils/uac-exceptions.mjs";

import grant_def from "@setup/grant-def.mjs";

import logger, { setup } from "@lib/logger.mjs";

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
  static #apts      : { [apt_id : string] : MappedAccessPolicy } = {};
  static #domains   : { [domain_id : string] : Domain } = {};
  static #resources : { [resource_id : string] : Resource } = {};
  static #services  : { [service_id : string] : any } = {};
  static updated    : boolean = false;

  /* Name to ID Mappings */
  static #rest_resources : {[resource_name : string] : ObjectId} = {};
  static #ws_resources   : {[resource_name : string] : ObjectId} = {};

  /* In-Memory Policy Engine Store */
  static #pe_map : PolicyDeclaration = {};

  //Executed at runtime
  static build_definitions(policies : Policy[] ,apts : AccessPolicy[], domains : Domain[], resources : Resource[]){
    this.#policies = to_dict(policies);
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

    this.#apts = to_dict(apts.map((v)=> ({
      ...v,
      resources : Object.fromEntries(v.resources.map((r)=> [r.toString(), this.#resources[r.toString()]]))
    })));

    Grant.set_state(true);
  }

  //Executed at buildtime
  static build_engine_definitions(PolicyEngine: PolicyDeclaration){
    this.#pe_map = PolicyEngine;
  }

  static set_state(state : boolean){
    setup.verbose(state ? "Grant Authority Flagged as loaded." : "Grant Authority Flagged as outdated");
    if(!state){
      setup.verbose("Automatically Triggered Grant.build_definitions()");
      grant_def();
    }
    this.updated = state;
  }

  static get_rest_resource(ref : string){
    const result = this.#rest_resources[ref];
    if(!result)throw new UACException(UACExceptionCode["PIP-001"]);

    return this.#resources[result.toString()];
  }

  static get_attr(_id : string, attr_name : string, mandatory : boolean){
    const resource = this.#resources[_id];
    if(!resource && mandatory)throw new UACException(UACExceptionCode["PIP-001"], _id);

    /* @ts-ignore */
    const attr = (resource||{})[attr_name];
    if(!attr && mandatory)throw new UACException(UACExceptionCode["PIP-002"], attr_name);

    return attr || null;
  }

  static get_apt_details(apt_id : string){
    if(!this.updated)throw new UACException(UACExceptionCode["PDP-002"]);

    const apt = this.#apts[apt_id];
    if(!apt)throw new UACException(UACExceptionCode["PAP-003"], apt_id);

    const policy = this.#policies[apt.basis];
    if(!policy)throw new UACException(UACExceptionCode["PAP-002"], apt.basis);
    
    return [apt, policy];
  }

  static get_pages(apt_id : string){
    if(!this.updated)throw new UACException(UACExceptionCode["PDP-002"]);

    const apt = this.#apts[apt_id];
    if(!apt)throw new UACException(UACExceptionCode["PAP-003"], apt_id);

    return Object.values(apt.resources).filter((v)=> v.type === "page");
  }

  static get_engine(engine_name : string){
    if(!this.updated)throw new UACException(UACExceptionCode["PDP-002"]);

    const PE = this.#pe_map[engine_name];
    if(!PE)throw new UACException(UACExceptionCode["PAP-004"], engine_name);

    return PE;
  }

  static get_engines(){
    return Object.entries(this.#pe_map);
  }

  static get_apt_resource(apt_id : string, resource_id : string){
    if(!this.updated)throw new UACException(UACExceptionCode["PDP-002"]);

    const apt = this.#apts[apt_id];
    if(!apt)throw new UACException(UACExceptionCode["PAP-003"], apt_id);

    const resource = apt.resources[resource_id];
    if(!resource)throw new UACException(UACExceptionCode["PDP-001"]);

    return resource;
  }

  static register_service(service_id : string, service_details : any){
    if(this.#services[service_id])throw new Error("Failed to register service, service already exists");
    
    logger.info(`Successfully registered ${service_id} into Service Registry`);
    this.#services[service_id] = service_details;
  }

  static get_service(service_id : string){
    return this.#services[service_id];
  }

  static get_services(){
    return this.#services;
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

type MappedAccessPolicy = {
  _id       : string;
  name      : string;
  basis     : string;
  domain_id : string;
  resources : {[resource_id : string] : Resource}
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