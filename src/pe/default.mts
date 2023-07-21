import { PolicyEngine } from "@core/auac.mjs";
import UACException from "@utils/uac-exceptions.mjs";

import Grant from "@lib/grant.mjs";

export default PolicyEngine({
  requisites : {
    "Role Based" : {
      "access" : ["subject", true],

      "_id"    : ["object", true]
    },

    "Family Name Based" : {
      "last_name" : ["subject", true]
    },

    "Kindness Based" : {
      "good_intentions" : ["subject", true],
    }
  },


  logic : {
    "Role Based"(){
      /* 
        This configuration of RBAC is slightly different that what is considered intuitive for most people
        There are no direct comparisons between roles and whatnot, instead, a role is given a set of grants.
      
        "Allow" decision is solely based on if the resource in question is a member of the set of resource grants to a role.
      */
      const { access, _id } = this.attrs;

      const [apt_details] = Grant.get_apt_details(access[0]);

      if(apt_details.name === "Ultravisor")return;

      
      //Check if resource is a grant in the apt resource declaration.
      //Grant.get_apt_resource(access, _id);
    }
  }
})