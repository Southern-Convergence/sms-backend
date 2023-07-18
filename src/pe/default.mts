import { PolicyEngine } from "@core/auac.mjs";

export default PolicyEngine({
  requisites : {
    "Role Based" : {
      "access" : ["subject", false]
    },

    "Family Name Based" : {
      "last_name" : ["subject", true]
    }
  },


  logic : {
    "Role Based" : ()=> {


      return true;
    }
  }
})