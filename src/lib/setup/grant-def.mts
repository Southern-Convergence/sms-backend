import Database from "@lib/database.mjs";
import Grant from "@lib/grant.mjs";

export default async()=> {
  const auac_collections = [
    "ap-templates",
    "domains",
    "policies",
    "resources"
  ];

  const [apts, domains, policies, resources] = await Promise.all(auac_collections.map((v)=> Database.collection(v)?.find().toArray()));

  /* @ts-ignore */
  Grant.build_definitions(policies, apts, domains, resources);
}