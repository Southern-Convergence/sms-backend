import Database from "@lib/database.mjs";

export default async()=> {
  /* Resets the auac set of collections to allow insertion of configurations */
  const auac_collections = [
    "ap-templates",
    "domains",
    "policies",
    "resources"
  ];

  const db = Database.get_instance();
  const ns = await db?.listCollections().toArray().then((v)=> v.flatMap((c)=> c.name));
  const drop_reqs = auac_collections.filter((v)=> ns?.includes(v)).map((v)=> db?.dropCollection(v));
  await Promise.all(drop_reqs);
}