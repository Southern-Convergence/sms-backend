declare type PolicyEngine = { new <R, L>(struct : PolicyEngineDescriptor<R, L>) : R & L };

declare type PolicyEngineDescriptor<R, L> = {
  requisites : RequisiteMap & R,
  logic      : LogicMap     & ThisType<R>
}

declare type PolicyDeclaration = {
  [engine_name : string] : {
    __meta__ : {
      requisites : RequisiteMap,
      logic      : LogicMap
    }
  }
}

type RequisiteMap = {[logic_id : string] : {[requisite_name : string] : RequisiteDescription}};
type RequisiteDescription = [AttributeType, boolean?];

type LogicMap = {[logic_id : string] : ()=> void}

/* Commons */
type AttributeType      = ("subject" | "object" | "contextual");