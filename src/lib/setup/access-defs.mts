import Database from "@lib/database.mjs";
import { named_imports } from "@lib/import-helper.mjs";

import bcrypt from "bcrypt";

const SALT = 10;

export default async()=>{
  const [ domains, policies, users ] = await named_imports(["domains", "policies", "users"], "uac");
  
  const collections = await Database.get_instance()?.collections();

  const cols = collections?.map((v)=> v.collectionName);
  
  if(cols?.includes("policies"))return;
  
  let policies_result = await Database.collection("policies")?.insertMany(policies);

  /* @ts-ignore */
  const POLICY_MAP = Object.fromEntries(Object.entries(policies_result?.insertedIds).map(([index, oid])=> [policies[index].name, oid]))
  /* Resolve domain dependencies */
  let resolved_domains = domains.map((v : {[key : string] : any})=> {
    const { name, secret_key, icon, access_policies, security_policies, resources } = v;
    
    return {
      name, secret_key, icon,
      access_policies   : access_policies.map((a : string)=> POLICY_MAP[a]),
      security_policies : security_policies.map((a : string)=> POLICY_MAP[a]),
      resources
    }
  });


  let domain_result = await Database.collection("domains")?.insertMany(resolved_domains);

  /* @ts-ignore */
  const DOMAIN_MAP = Object.fromEntries(Object.entries(domain_result?.insertedIds).map(([index, oid])=> [domains[index].name, oid]));
  /* @ts-ignore */
  const R_DOMAIN_MAP = Object.fromEntries(Object.entries(domain_result?.insertedIds).map(([index, oid])=> [oid, domains[index].name]));
  
  let ap_templates = domains.flatMap((v : {[key : string] : any})=>{
    /* @ts-ignore */
    return v.access_templates.map((a)=>{
      const { basis, name, grants } = a;
      return { basis : POLICY_MAP[basis], domain_id : DOMAIN_MAP[v.name], name, grants };
    });
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
    v.access = AP_MAP[`${domain}${attr}`];
    v.status = "active";

    return v;
  });

  await Database.collection("users")?.insertMany(resolved_users);

  console.log("[SETUP]Access-Def Complete");
}