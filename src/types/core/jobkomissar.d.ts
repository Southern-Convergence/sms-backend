declare type Db            = import("mongodb").Db;

declare type DefineOptions = import("agenda").DefineOptions;
declare type Processor     = import("agenda").Processor;
declare type Server        = import("socket.io").Server;


declare type KomissarJobs = {
  [cron : string] : {
    [job_name : string] : Job
  }
};

declare type Job = {
  options : DefineOptions;
  action  : Processor;
} & ThisType<KomissarFacilities>


declare type KomissarFacilities = {
  postoffice  : TransportDict,
  io          : Server
  db          : Db
}