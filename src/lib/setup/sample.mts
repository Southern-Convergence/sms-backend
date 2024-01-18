import Database from "@lib/database.mjs";
import * as fs from 'fs/promises';
import { ObjectId } from "mongodb";

export default async () => {

  const temp = await Database.collection('sms-sdo')?.findOne({ title: "Calbiga City" });
  if (temp) return;
  // SDO Roles
  const sdo_roles = ["Administrative Officer IV", "Evaluator", "Verifier", "Recommending Approver", "Approver"];
  const s_roles = await Database.collection('ap-templates')?.find({ name: { $in: sdo_roles } }, { projection: { name: 1 } }).toArray();
  if (!s_roles?.length) return console.log("[SYSTEM] Could not resolve SDO Roles");
  const s_map = Object.fromEntries(s_roles?.map((v: any) => [v.name, v._id]));
  // RO Roles
  const ro_roles = ["Administrative Officer V", "Verifier", "Evaluator", "Recommending Approver", "Approver"];
  const r_roles = await Database.collection('ap-templates')?.find({ name: { $in: ro_roles } }, { projection: { name: 1 } }).toArray();
  if (!r_roles?.length) return console.log("[SYSTEM] Could not resolve SDO Roles");
  const r_map = Object.fromEntries(r_roles?.map((v: any) => [v.name, v._id]));

  // Get Principal
  const p = await Database.collection("ap-templates")?.findOne({ name: "Principal" }, { projection: { _id: 1 } });
  if (!p) return console.log("[SYSTEM] Could not find principal role");

  const uv = await Database.collection('users')?.findOne({ username: "Ultravisor" }, { projection: { domain_id: 1, access: 1, resources: 1, password: 1 } });
  if (!uv) return console.log("[SYSTEM] Could not resolve ultravisor");

  const uv_r = await Database.collection('ap-templates')?.findOne({ name: "Ultravisor" }, { projection: { resources: 1 } });
  if (!uv_r) return console.log("[SYSTEM] Could not resolve resources");
  // Get Ultivisor resources and assign to signatory
  const f = ["Verifier", "Evaluator", "Recommending Approver", "Approver", "Administrative Officer IV", "Administrative Officer V", "Principal"];
  const ap_update = await Database.collection('ap-templates')?.updateMany({ name: { $in: f } }, { $set: { resources: uv_r.resources } });
  if (!ap_update?.modifiedCount) console.log("[SYSTEM] Could not assign resources");


  const sdo = JSON.parse(await fs.readFile('sdo.json', 'utf-8'));
  const school = JSON.parse(await fs.readFile('school.json', 'utf-8'));
  const school_user = JSON.parse(await fs.readFile('school_user.json', 'utf-8'));
  const ro_user = JSON.parse(await fs.readFile('ro_user.json', 'utf-8'));
  const sdo_user = JSON.parse(await fs.readFile('sdo_user.json', 'utf-8'));

  let sdo_id: ObjectId;
  let school_id: ObjectId;

  const sdo_result = await Database.collection('sms-sdo')?.insertOne(sdo);

  if (!sdo_result?.insertedId) return console.log("[SYSTEM] SDO Insert failed");
  sdo_id = sdo_result.insertedId;

  school.division = sdo_id;
  const school_result = await Database.collection('sms-school')?.insertOne(school);
  if (!school_result?.insertedId) return console.log("[SYSTEM] School insert failed");
  school_id = school_result.insertedId;

  const payload = {
    division: sdo_id,
    school: school_id
  };

  school_user.access = uv.access;
  school_user.domain_id = uv.domain_id;
  school_user.designation_information = payload;
  school_user.role = new ObjectId(p._id);
  school_user.password = uv.password;

  const su_result = await Database.collection('users')?.insertOne(school_user);
  if (!su_result?.insertedId) return console.log("[SYSTEM] Failed to insert school user");

  const ssr = Object.values(s_map);

  const sdx = sdo_user.map((v: any, index: number) => {
    const payload = {
      division: sdo_id,
      school: "",
    };

    return {
      ...v,
      access: uv.access,
      domain_id: uv.domain_id,
      designation_information: payload,
      password: uv.password,
      role: ssr[index]
    }
  });

  const so_result = await Database.collection('users')?.insertMany(sdx);
  if (!so_result?.insertedIds) return console.log("[SYSTEM] Failed to insert SDO Users");

  const rrr = Object.values(r_map);
  const rx = ro_user.map((v: any, index: number) => {
    return {
      ...v,
      access: uv.access,
      domain_id: uv.domain_id,
      role: rrr[index],
      password: uv.password
    }
  });

  const ro_result = await Database.collection("users")?.insertMany(rx);
  if (!ro_result?.insertedIds) return console.log("[SYSTEM] Failed to insert RO Users")
  console.log("[SYSTEM] Sample Seeder Successfully executed.")
}