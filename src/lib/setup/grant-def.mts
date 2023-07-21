import Database from "@lib/database.mjs";
import Grant from "@lib/grant.mjs";

export default async()=> {
  const auac_collections = [
    "domains",
    "policies",
    "resources"
  ];

  const apts = await Database.collection("ap-templates")?.aggregate([
    {
      '$graphLookup': {
        'from': 'resources', 
        'startWith': '$resources', 
        'connectFromField': 'resources', 
        'connectToField': '_id', 
        'as': 'resources'
      }
    }, {
      '$addFields': {
        'resources': '$resources._id'
      }
    }
  ]).toArray();

  const [domains, policies, resources] = await Promise.all(auac_collections.map((v)=> Database.collection(v)?.find().toArray()));

  /* @ts-ignore */
  Grant.build_definitions(policies, apts, domains, resources);
}