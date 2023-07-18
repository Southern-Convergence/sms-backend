import Database from "@lib/database.mjs";

const OTP_EXPIRY = 2_592_000;    // 1 Month (30 Days) before purging
const INVITE_EXPIRY = 2_592_000; // 1 Month (30 Days) before purging inulits
export default async()=> {
  Database.collection("sessions")?.createIndex({ created : 1 }, { expireAfterSeconds : OTP_EXPIRY });
  Database.collection("invites")?.createIndex({ created : 1 }, { expireAfterSeconds : INVITE_EXPIRY });
  Database.collection("invites")?.createIndex({ code : 1 }, { unique : true });

  Database.collection("resources")?.createIndex({domain_id : 1});
}