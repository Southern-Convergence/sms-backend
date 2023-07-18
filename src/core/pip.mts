/* Standard PIP of the UAC ACM */
import db from "@lib/database.mjs";
import {ObjectId} from "mongodb";

import UACException from "@utils/uac-exceptions.mjs";

export default async(attr : string, [type, mandatory = true] : RequisiteDescription)=> {
/*   const res_attr = await db.collection(DB_MAP[type])?.findOne({_id : new ObjectId(id)}, { projection : { [attr] : 1}});

  if(!res_attr && mandatory)throw new UACException(UACExceptionCode["PIP-002"]);

  return res_attr[`${attr}`]; */
}

const DB_MAP = {
  "subject"    : "users",
  "object"     : "resources",
  "contextual" : "ctx_attrs"
}