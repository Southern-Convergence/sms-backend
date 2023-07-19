import { PolicyEngine } from "@core/auac.mjs";
import UACException from "@utils/uac-exceptions.mjs";

export default PolicyEngine({
  requisites : {
    "Role Based" : {
      "email"    : ["subject", false],
      "type"     : ["subject", false],
      "username" : ["subject", false],

      "nonexistent_property" : ["object", true]
    },

    "Family Name Based" : {
      "last_name" : ["subject", true]
    }
  },


  logic : {
    "Role Based"(){
      
    }
  }
})