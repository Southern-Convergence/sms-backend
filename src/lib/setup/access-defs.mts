import Database from "@lib/database.mjs";

import domains from "@setup/src/uac/domains.mjs";
import users from "@setup/src/uac/users.mjs";

import bcrypt from "bcrypt";
import logger from "@lib/logger.mjs";
import {ObjectId} from "mongodb";
import Grant from "@lib/grant.mjs";
import {create_key_pair} from "@utils/index.mjs";

const SALT = 10;

export default async()=> {
  const collections = await Database.get_instance()?.collections();
  const cols = collections?.map((v)=> v.collectionName);
  
  if(cols?.includes("policies"))return;

  const policies = Grant.get_engines().map(([_, engine])=> {
    const temp:any = Object.assign({type : "access"}, engine);
    delete temp.requisites;
    delete temp.logic;
    
    return temp;
  });

  let policies_result = await Database.collection("policies")?.insertMany(policies);

  /* @ts-ignore */
  const POLICY_MAP = Object.fromEntries(Object.entries(policies_result?.insertedIds).map(([index, oid])=> [policies[index].name, oid]))
  /* Resolve domain dependencies */
  let resolved_domains = await Promise.all(domains.map(async(v : {[key : string] : any})=> {
    const { name, icon, access_policies, security_policies, resources } = v;
    
    const { private_key, public_key } = await create_key_pair();

    return {
      name, key : private_key, icon,
      public_key,
      access_policies   : access_policies.map((a : string)=> POLICY_MAP[a]),
      active : true,
      security_policies : security_policies.map((a : string)=> POLICY_MAP[a]),
      resources
    };
  }));


  let domain_result = await Database.collection("domains")?.insertMany(resolved_domains);

  /* @ts-ignore */
  const DOMAIN_MAP = Object.fromEntries(Object.entries(domain_result?.insertedIds).map(([index, oid])=> [domains[index].name, oid]));
  /* @ts-ignore */
  const R_DOMAIN_MAP = Object.fromEntries(Object.entries(domain_result?.insertedIds).map(([index, oid])=> [oid, domains[index].name]));
  
  let ap_templates = domains.flatMap((v : {[key : string] : any})=>{
    /* @ts-ignore */
    return v.access_templates.map((a)=> ({ ...a, basis : POLICY_MAP[a.basis], domain_id : DOMAIN_MAP[v.name]}));
  });
  
  let ap_result = await Database.collection("ap-templates")?.insertMany(ap_templates);
  /* @ts-ignore */
  const AP_MAP = Object.fromEntries(Object.entries(ap_result?.insertedIds).map(([index, oid])=> {
    /* @ts-ignore */
    const temp = ap_templates[index];
    const _d = R_DOMAIN_MAP[temp.domain_id];

    return [`${_d}${temp.name}`, oid];
  }));

  /* Resolve user dependencies */
  /* @ts-ignore */
  let resolved_users = users.map((v)=>{
    v.password = bcrypt.hashSync(v.password, SALT);

    const { domain, attr } = v.access;

    /* @ts-ignore */
    v.access = [AP_MAP[`${domain}${attr}`]];
    /* @ts-ignore */
    v.status = "active";
    /* @ts-ignore */
    v.domain_id = new ObjectId(DOMAIN_MAP[v.domain_id]);

    return v;
  });

  await Database.collection("users")?.insertMany(resolved_users);

  logger.info("[SETUP]Access-Def Complete");
}