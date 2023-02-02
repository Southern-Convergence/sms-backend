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
    const { name, secret_key, icon, access_policies, security_policies } = v;
    
    return {
      name, secret_key, icon,
      access_policies   : access_policies.map((a : string)=> POLICY_MAP[a]),
      security_policies : security_policies.map((a : string)=> POLICY_MAP[a])
    }
  });


  let domain_result = await Database.collection("domains")?.insertMany(resolved_domains);

  /* @ts-ignore */
  const DOMAIN_MAP = Object.fromEntries(Object.entries(domain_result?.insertedIds).map(([index, oid])=> [domains[index].name, oid]));
  /* @ts-ignore */
  const R_DOMAIN_MAP = Object.fromEntries(Object.entries(domain_result?.insertedIds).map(([index, oid])=> [oid, domains[index].name]));
  
  /*   
  const endpoint_items = domains.flatMap((v)=> v.endpoints.map((ev)=> ({...ev, domain_id : DOMAIN_MAP[v.name], type : "endpoint"})));

  const endpoint_result = await Database.collection("resources")?.insertMany(endpoint_items);
  
  const ENDPOINT_MAP = Object.fromEntries(Object.entries(endpoint_result?.insertedIds).map(([index, oid])=> [endpoint_items[index].ref, oid]));
  */

  /* @ts-ignore */
  const page_items = domains.flatMap((v)=> v.pages.map((e)=> ({...e, endpoints : [], domain_id : DOMAIN_MAP[v.name], type : "page"})));
  
  let page_result = await Database.collection("resources")?.insertMany(page_items);
  
  /* @ts-ignore */
  const PAGE_MAP = Object.fromEntries(Object.entries(page_result?.insertedIds).map(([index, oid])=> [page_items[index].name, oid]));
  
  /* @ts-ignore */
  const subdomain_items = domains.flatMap((v)=> v.subdomains.map((e)=> ({...e, pages : e.pages.map((p)=> PAGE_MAP[p]), domain_id : DOMAIN_MAP[v.name], type : "subdomain"})))
  
  let subdomain_result = await Database.collection("resources")?.insertMany(subdomain_items);
  
  /* @ts-ignore */
  const SUBDOMAIN_MAP = Object.fromEntries(Object.entries(subdomain_result?.insertedIds).map(([index, oid])=> [subdomain_items[index].name, oid]));

  let ap_templates = domains.flatMap((v : {[key : string] : any})=>{
    /* @ts-ignore */
    return v.access_templates.map((a)=>{
      const { basis, name, grants } = a;
      /* @ts-ignore */
      const grant_result = grants.map((g)=>{
        const { type, name } = g;

        switch(type){
          case "subdomain" : return {resource : SUBDOMAIN_MAP[name], write : true};
          case "page"      : return {resource : PAGE_MAP[name],      write : true};
        }
      }).filter(Boolean);
      return { basis : POLICY_MAP[basis], domain_id : DOMAIN_MAP[v.name], name, grants : grant_result };
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

    const { domain, attr, type } = v.access;
    v.access = AP_MAP[`${domain}${attr}`];

    return v;
  });

  await Database.collection("users")?.insertMany(resolved_users);

  console.log("[SETUP]Access-Def Complete");
}