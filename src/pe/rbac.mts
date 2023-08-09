import {PolicyEngine} from "auac";
import Grant from "@lib/grant.mjs";

export default PolicyEngine({
  name   : "Role Based",
  abbrev : "RBAC",
  author : "Emmanuel Abellana",
  icon   : "mdi-badge-account",
  desc   : "Access to resources are determined by the comparation of roles and it's assigned resource grants.",

  requisites : {
    "access" : ["subject", true],
    "_id"    : ["object", true]
  },

  logic(){
    /* 
      This configuration of RBAC is slightly different that what is considered intuitive for most people
      There are no direct comparisons between roles and whatnot, instead, a role is given a set of grants.
      
      "Allow" decision is solely based on if the resource in question is a member of the set of resource grants to a role.
    */
      const { access, _id } = this.attrs;
      
      const roles = access.map((v : string)=> Grant.get_apt_details(v)[0].name);
      if(roles.includes("Ultravisor"))return;

      //Check if resource is a grant in the apt resource declaration.
      //Grant.get_apt_resource(access, _id);
  }
})