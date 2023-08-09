import {PolicyEngine} from "auac";

export default PolicyEngine({
  name   : "Schedule Based",
  abbrev : "SBAC",
  author : "Emmanuel Abellana",
  icon   : "mdi-update",
  desc   : "Access to resources are dependent on the requester's schedule",
  
  requisites : {
    "schedule" : ["subject", true],
    "time"     : ["contextual", true]
    //For all intents and purposes, one can simply use the native Date class for schedule comparations.
  },

  logic(){
    
  }
})