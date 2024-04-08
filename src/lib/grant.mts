import UACException from "@utils/uac-exceptions.mjs";

import grant_def from "@setup/grant-def.mjs";

import logger, { setup } from "@lib/logger.mjs";
import e from "express";

export default class Grant {
  //Steps to find happiness.

  /**
   * Resolve APT
   * Resolve Basis Policy
   * Process Policy Engine
   * 
   */

  /* ID to Object Mappings */
  static #policies: { [policy_id: string]: Policy } = {};
  static #apts: { [apt_id: string]: MappedAccessPolicy } = {};
  static #domains: { [domain_id: string]: Domain } = {};
  static #services: { [service_id: string]: any } = {};
  static updated: boolean = false;

  /* Name to ID Object Mappings */
  static #domain_map: { [domain_name: string]: string } = {};
  static #resources_map: { [resource_id: string]: Resource } = {};
  static #service_map: { [resource_id: string]: any } = {};

  /* Name to ID Mappings */
  static #rest_resources: { [resource_name: string]: ObjectId } = {};
  static #ws_resources: { [resource_name: string]: ObjectId } = {};

  /* In-Memory Policy Engine Store */
  static #pe_map: PolicyDeclaration = {};

  //Executed at runtime
  static build_definitions(policies: Policy[], apts: AccessPolicy[], domains: Domain[], resources: Resource[], services: any[]) {
    this.#policies = to_dict(policies);
    this.#domains = to_dict(domains);
    this.#services = {};
    this.#domain_map = Object.fromEntries(domains.map((v) => [v.name, v._id]));
    this.#service_map = Object.fromEntries(services.map((v) => [v.name, v._id]));

    services.forEach((v) => {
      const d = v.domain_id.toString();
      if (!this.#services[d]) this.#services[d] = {};
      if (!this.#services[d][v._id]) this.#services[d][v._id] = { ...v, paths: [], pages: [] };
    });

    resources.forEach((v) => {
      this.#resources_map[v._id.toString()] = v;
      const target_service = this.#services[v.domain_id][v.service_id];

      if (v.type === "endpoint") {
        /* @ts-ignore not optimal but meh */
        const e: Endpoint = v;
        switch (e.protocol) {
          case "REST": {
            this.#rest_resources[e.ref] = e._id;
            const spec = { sfr_spec: e, oas_spec: e.oas_spec };
            delete spec.sfr_spec.oas_spec;
            target_service.paths.push(spec);
          } break;
          case "WS": this.#ws_resources[e.ref] = e._id; break;
        }
      }

      if (v.type === "page") {
      }
    });

    this.#apts = to_dict(apts.map((v) => ({
      ...v,
      resources: Object.fromEntries(v.resources.map((r) => [r.toString(), this.#resources_map[r.toString()]]))
    })));

    Grant.set_state(true);
  }

  //Executed at buildtime
  static build_engine_definitions(PolicyEngine: PolicyDeclaration) {
    this.#pe_map = PolicyEngine;
  }

  static set_state(state: boolean) {
    setup.verbose(state ? "Grant Authority Flagged as loaded." : "Grant Authority Flagged as outdated");
    if (!state) {
      setup.verbose("Automatically Triggered Grant.build_definitions()");
      grant_def();
    }
    this.updated = state;
  }

  static get_rest_resource(ref: string) {
    const result = this.#rest_resources[ref];
    if (!result) throw new UACException(UACExceptionCode["PIP-001"]);

    return this.#resources_map[result.toString()];
  }

  static get_attr(_id: string, attr_name: string, mandatory: boolean) {
    const resource = this.#resources_map[_id];
    if (!resource && mandatory) throw new UACException(UACExceptionCode["PIP-001"], _id);

    /* @ts-ignore */
    const attr = (resource || {})[attr_name];
    if (!attr && mandatory) throw new UACException(UACExceptionCode["PIP-002"], attr_name);

    return attr || null;
  }

  static get_apt_details(apt_id: string) {
    if (!this.updated) throw new UACException(UACExceptionCode["PDP-002"]);

    const apt = this.#apts[apt_id];
    if (!apt) throw new UACException(UACExceptionCode["PAP-003"], apt_id);

    const policy = this.#policies[apt.basis];
    if (!policy) throw new UACException(UACExceptionCode["PAP-002"], apt.basis);

    return [apt, policy];
  }

  static get_pages(apt_id: string) {
    if (!this.updated) throw new UACException(UACExceptionCode["PDP-002"]);
    const apt = this.#apts[apt_id];
    if (!apt) throw new UACException(UACExceptionCode["PAP-003"], apt_id);

    return Object.values(apt.resources).filter((v) => v.type === "page");
  }

  static get_engine(engine_name: string) {
    if (!this.updated) throw new UACException(UACExceptionCode["PDP-002"]);

    const PE = this.#pe_map[engine_name];
    if (!PE) throw new UACException(UACExceptionCode["PAP-004"], engine_name);

    return PE;
  }

  static get_engines() {
    return Object.entries(this.#pe_map);
  }

  static get_apt_resource(apt_id: string, resource_id: string) {
    if (!this.updated) throw new UACException(UACExceptionCode["PDP-002"]);

    const apt = this.#apts[apt_id];
    if (!apt) throw new UACException(UACExceptionCode["PAP-003"], apt_id);

    const resource = apt.resources[resource_id];
    if (!resource) throw new UACException(UACExceptionCode["PDP-001"]);

    return resource;
  }

  static register_service(domain: string, service: string, service_details: any) {
    const sid = this.#service_map[service];
    logger.info(`Successfully registered ${service} into Service Registry under ${domain} domain.`);
    if (!this.#services[domain]) this.#services[domain] = {};
    if (this.#services[domain][sid]) {
      service_details = {
        ...service_details,
        ...this.#services[domain][sid]
      }
    }
    this.#services[domain][sid] = service_details;
  }

  static get_service(domain: string, service_id: string) {
    const domain_services = this.#services[domain];
    if (!domain_services) return null;
    return domain_services[service_id];
  }

  static get_services(domain: string) {
    const resolved_domain = this.#domain_map[domain];
    const temp = this.#services[resolved_domain.toString()];
    return temp;
  }

  static get_domain_by_name(domain: string) {
    return this.#domain_map[domain];
  }

  static get_service_by_name(service: string) {
    return this.#service_map[service];
  }
}

function to_dict(items: any[]) {
  return Object.fromEntries(items.map((v) => [v._id, v]));
}

type Policy = {
  _id: string;
  name: string;
  type: string;
  desc: string;
  icon: string;
}

type AccessPolicy = {
  _id: string;
  name: string;
  basis: string;
  domain_id: string;
  resources: string[]
}

type MappedAccessPolicy = {
  _id: string;
  name: string;
  basis: string;
  domain_id: string;
  resources: { [resource_id: string]: Resource }
}

declare type Domain = {
  _id: string;
  name: string;
  secret_key: string;
  icon: string;

  access_policies: string[];
  security_policies: string[];

  access_templates: APT[];
  resources: Resource[];
}