import {PolicyEngine} from "auac";

export default PolicyEngine({
  name   : "Location Based",
  abbrev : "LBAC",
  author : "Emmanuel Abellana",
  icon   : "mdi-map",
  desc   : "Access to resources are determined using geographic locality data",
  
  requisites : {
    
    //For all intents and purposes, one can simply use the native Date class for schedule comparations.
  },

  logic(){
    
  }
})