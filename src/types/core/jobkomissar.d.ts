declare type Database      = import("@lib/database.mjs");

declare type DefineOptions = import("agenda").DefineOptions;
declare type Processor     = import("agenda").Processor;
declare type Server        = import("socket.io").Server;


declare type KomissarJobs = {
  [cron : string] : {
    [job_name : string] : {
      options : DefineOptions;
      action  : Function;
    } & ThisType<KomissarFacilities>
  }
};


declare type KomissarFacilities = {
  postoffice  : TransportDict,
  io          : Server
  db          : Database
}