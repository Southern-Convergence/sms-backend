import Database from "@lib/database.mjs";

const OTP_EXPIRY = 2592000; // 1 Month (30 Days) before purging

export default async()=>{
  Database.collection("sessions")?.createIndex({ created : 1 }, { expireAfterSeconds : OTP_EXPIRY });
}