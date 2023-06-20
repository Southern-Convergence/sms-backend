/* 
  Job Komissar:

  Another abstraction layer for agenda that I have developed way back in Nov, 2022 when I was dabbling with Agenda and Cron Jobs.

  The concept is to have a singleton that reads from a "Job Table" which is simply a dictionary with the keys as the cron schedule and
  the value as an executable function.
  
*/
import { Agenda } from "agenda";
import {AgendaConfig} from "agenda/dist/agenda/index.js";

import JobTable from "@cfg/jobtable.mjs";
import { PostOffice } from "@lib/mailman.mjs";

const { CONNECTION_STRING } = process.env

const cfg:AgendaConfig = {
  db : {
    address    : CONNECTION_STRING!,
    collection : "agenda"
  },
  maxConcurrency : 15,
  defaultConcurrency : 10,
  lockLimit : 0,
  defaultLockLimit : 0,
  defaultLockLifetime : 10000
}

export default class JobKomissar{
  static instance = new Agenda(cfg);
  static jobtable = JobTable;

  static init(io : Server, db : Db){
    console.log("Initializing JobKomissar");
    this.instance.start()
    .then(()=> {
      //Loops over JobTable to initiate scheds with it's own corresponding cfg and fns.
      Object.entries(this.jobtable).forEach(([sched, jobs])=> {
        Object.entries(jobs).forEach(([job, {options, action}])=> {
          this.instance.define(job, options, action.bind({
            postoffice : PostOffice.get_instances(),
            db,
            io
          }));
          this.instance.every(sched, job);
        });
      });
    })
    .catch((err)=> console.log("Failed to initialize JobKomissar", err.reason));
  }
}