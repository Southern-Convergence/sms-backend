/*
  AUAC Policy Engine v1
  My take on how to decompose and engineer a customizable Policy Engine based on the NIST 800-162 Guide


  Introduction of the ff. abstract concepts
  * PolicyRequisites : A list of attributes that conforms to a given PolicyLogic's requirements.
  * PolicyLogic      : Hard-coded, machine-expressed syntax which applies conventional logic against a given set of attributes.
  * PolicyResolution : Post-processor function which resolves AP conflicts using an AP's MP.

  An elaborate and comprehensive discussion of an organization's unique access requirements and criteria is important to furnish robust
  and dependable NLPs (Natural Language Policy), which may then be translated into the three concepts outlined above.
  
  A unified set of interfaces is built around these three concepts to support the customizable nature that is being pursued by this sh8t.
  
  After a few back&forths, I think I can fashion the Policy-Engine like how SFRs are made.
   
  Disclaimer: I'm no seasoned software engineer, any feedbacks and corrections are highly appreciated.
*/

import Grant from "@lib/grant.mjs";
import {uac} from "@lib/logger.mjs";
import UACException from "@utils/uac-exceptions.mjs";

export default ({ engine, deconflict = "sequence" }: UACConfig):RequestHandler => {
  //const PE_ENGINE = Grant.get_engine(engine);
  //How to find true Happiness: Steps below
  //Figure out what endpoint is being called
  //Treat it as a resource request
  //Get session context
  //Get APT from session
  //Get Basis of APT
  //Use Basis to figure out which PE to use.
  //profit?????
  
  //Get PE
  //Get APT Name
  //Resolve Requisites
  //Execute Logic Block
  //Profit???


  return (req, res, next) => {
    const rid = res.getHeader("rid");
    uac.verbose({message : `UAC - ACM Sequence Started`, rid});
    //Step 1: Get Resource
    const resource: any = Grant.get_rest_resource(req.path.replace("/", ""));
    uac.verbose({ message : `Resolved Resource: ${resource.name}`, service_id : resource.service_id, domain_id : resource.domain_id, rid});
    //Step 1.1: Is it Publicly accessible?
    uac.verbose({ message : `Is Public Resource?: ${Boolean(resource.sfr_cfg.public)}`, end : true, allow : true, rid});
    if (resource.sfr_cfg.public){
      uac.verbose({ message : `APT Decision: Allow`, end : true, allow : true, rid});
      return next();
    }
    //Step 2: Get Session
    const { user } = req.session;
    
    //Step 2.1: Get APTs from session
    const apts = user?.access;
    uac.verbose({ message : `Has Session?: ${Boolean(user)}`, rid});
    if (!apts || !apts.length)throw new UACException(UACExceptionCode["PAP-003"]); //Immediately deny access if apt is nil. (by virtue of indeterminate attempts)
    //Step 2.3: Get Basis of APT
    const pe_def = apts.map((v) => Grant.get_apt_details(v.toString()));
    
    //Step 3: Profit??? (No, actually, evaluation takes place here, logic blocks allows us to customize our access decisions)
    uac.verbose({ message : `Starting APT Resolution (${pe_def.length} found)...`, rid});
    pe_def.forEach(([_apt, _policy])=> {
      uac.verbose({ message : `APT Details: Name=${_apt.name} Basis=${_policy.name}`, rid});
      const PE_ENGINE = Grant.get_engine(_policy.name);
      const { requisites, logic } = PE_ENGINE;
      const attrs = Object.fromEntries(Object.entries(requisites).map(([attr, fn])=> [attr, fn(user, resource._id)]));      
      logic.bind({attrs, policy : _policy, apt : _apt, session : req.session})();
      uac.verbose({ message : `APT Decision: Allow`, end : true, allow : true, rid});
    });

    next();
  };
};


export function PolicyEngine(struct: PolicyEngineDescriptor){
  const requisites = struct.requisites || {};
  const logic      = struct.logic;

  return {
    name   : struct.name,
    abbrev : struct.abbrev || "",
    author : struct.author || "",
    desc   : struct.desc   || "",
    icon   : struct.icon   || "",
    requisites,
    logic
   };
}