import {PolicyEngine} from "auac";

export default PolicyEngine({
  name   : "Claim Based",
  abbrev : "CBAC",
  author : "Emmanuel Abellana",
  icon   : "mdi-hand-extended",
  desc   : "Access to resources are determined by ownership of a requested resource.",
  
  requisites : {
    "owners"   : ["object", true],
    "_id"      : ["contextual", true]
    //For all intents and purposes, one can simply use the native Date class for schedule comparations.
  },

  logic(){

  }
})