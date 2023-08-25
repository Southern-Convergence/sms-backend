import Database from "@lib/database.mjs";

const DAY_IN_SECONDS = 86_400; //There are 86,400 seconds in a day, yea

/* TTL Constants */
const OTP_EXPIRY     = DAY_IN_SECONDS;      // 1 Day
const INVITE_EXPIRY  = DAY_IN_SECONDS * 30; // 30 Days
const SESSION_EXPIRY = DAY_IN_SECONDS * 30; // 30 Days

export default async()=> {
  Database.collection("otp")?.createIndex({ created : 1}, {expireAfterSeconds : OTP_EXPIRY});
  Database.collection("sessions")?.createIndex({ created : 1 }, { expireAfterSeconds : SESSION_EXPIRY });
  Database.collection("invites")?.createIndex({ created : 1 }, { expireAfterSeconds : INVITE_EXPIRY });
  Database.collection("invites")?.createIndex({ code : 1 }, { unique : true });
  Database.collection("subscriptions")?.createIndex({ user_id : 1 });

  Database.collection("resources")?.createIndex({domain_id : 1});
  Database.collection("resources")?.createIndex({ref : "text"});
  Database.collection("ap-templates")?.createIndex({domain_id : 1});
  Database.collection("services")?.createIndex({name : "text"}, {unique : true});
  
  Database.collection("users")?.createIndex({domain_id : 1});
  Database.collection("users")?.createIndex({username : "text"});
  Database.collection("users")?.createIndex({internal  : 1}); //Avoid whole collscans on internal user lookup
}