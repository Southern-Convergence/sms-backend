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
   
  Disclaimer: I'm no software engineer, any feedbacks and corrections are highly appreciated.
*/


const middleware: RequestHandler = (req, res, next)=> {
  
  next();
}

export default middleware;


export function PolicyEngine<R, L>(struct : PolicyEngineDescriptor<R, L>): R & L  {
  const requisites : RequisiteMap = struct.requisites || {};
  const logic      : LogicMap     = struct.logic || {};

  const __meta__ = { requisites, logic };

  return { __meta__, ...__meta__ } as R & L;
}


const PE_SAMPLE = {
  requisites : {
    "Family Name Based" : {
      "l_name" : ["subject", "last_name", true]
    }
  },

  logic : {
    "Family Name Based" : ()=> {
      //Injected requisites
    }
  }
}

//For the sake of simplicity, APs do not of