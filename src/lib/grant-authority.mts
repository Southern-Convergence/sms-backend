import Database from "@lib/database.mjs";

/*
  A singleton class which allows for efficient lookups of access grants from
  a pre-allocated dictionary of all declared Access Policies.

  Details:
  Merge Rule: POLA
*/

export default class GrantAuthority{
  static #namespaces : NamespaceMap = {};
  static #resources  : {[domain : string] : {[id : string] : ResourceMap}} = {};
  static #ap_table   : {[ap : string] : { pages : {}, endpoints : {} }} = {};

  static #default_domain = "Southern Convergence";

  static async build_definitions(){
    let temp = await Database.collection("domains")?.aggregate([
      {
        '$lookup': {
          'from': 'resources', 
          'localField': '_id', 
          'foreignField': 'domain_id', 
          'as': 'resources'
        }
      }, {
        '$lookup': {
          'from': 'ap-templates', 
          'localField': '_id', 
          'foreignField': 'domain_id', 
          'as': 'ap'
        }
      }
    ]).toArray();

    /* this.#namespaces["WS"] = Object.fromEntries(Object.entries(ws_namespaces).map(([namespace, endpoints])=>{
      return [namespace, Object.fromEntries(Object.entries(endpoints[2]).map(([k])=> [k, true]))];
    })); */

    //Build Resources Dictionary
    temp?.forEach((v)=>{
      const { _id, resources, ap } = v;

      //Resources dictionary will be used as basis for pre-compiling AP-Templates.
      this.#resources[_id] = Object.fromEntries(resources.map((r : any)=>  [r._id, r]));

      ap.forEach((t : any)=> {
        const { _id, domain_id, grants } = t;

        /*
          This is where the magic happens. :D
          Additive Model Scheme:

          Subdomains are broken down into pages.
          Pages are broken down into endpoints and stored in AP-Template.
          Endpoints are stored in AP-Templates.
        */
        let pages: {[key : string] : object} = {};
        let endpoints : {[key : string] : boolean} = {};
        grants.map((g : any)=>[this.#resources[domain_id][g.resource], g.write]).forEach((v : [any, boolean])=>{
          switch(v[0].type){
            case "subdomain" : {
              //Fuck this is horribly coded. it's 4:35A.M, I'm tired.
              v[0].pages.map((p : string)=> this.#resources[domain_id][p]).forEach((p : any)=>{
                const { name, desc, ref } = p;

                p.endpoints.map((e : string)=> this.#resources[domain_id][e]).forEach((e : any)=>{
                  if(!endpoints[e.ref]){
                    endpoints[e.ref] = (e.op === "Write");
                  }
                });

                if(!pages[p.ref])pages[p.ref] = {
                  name, desc, ref,
                  write : v[1]
                }; //Writes overwrites Reads when ruleset collisions are found.
              });
            }break;
            case "page" : {
              
            }break;
          }
        });
        
        this.#ap_table[_id] = {pages , endpoints};
      })
    });

    //temp?.forEach((v)=> console.log(v.resources ))
    console.log("GA Memory Footprint:", this.get_footprint());
  }

  static async load_endpoints(REST : RESTNamespaceDeclaration, WS : WSNamespaceDeclaration){
    
    //Build domain id for domain resolution required below.
    const domains = await Database.collection("domains")?.find({}).toArray();
    
    /* @ts-ignore */
    const domain_map = Object.fromEntries(domains?.map((v)=> [v.name, v._id]));

    Object.entries(REST).forEach(([namespace, {__meta__}])=>{
      const { cfg, validators, handlers } = __meta__;
      
      Object.entries(handlers).forEach(([method, handlermap])=> {
        Object.keys(handlermap).filter((v)=> validators[v]).forEach((v)=> {
          const obj = {
            name : `[AUTO] ${v.toUpperCase()}`,
            desc : "",
            ref  : `${method}/${namespace}/${v}`,
            op   : "",
            
            protocol  : "REST",
            domain_id : cfg.domain ? domain_map[cfg.domain] : domain_map[this.#default_domain],
            type      : "endpoint"
          };
          Database.collection("resources")?.updateOne({ ref : obj.ref}, { $set : obj }, { upsert : true});
        });
      });
    });

    Object.entries(WS).forEach(([namespace, {__meta__}])=>{
      const { cfg, validators, handlers } = __meta__;

      //Later tater hubya ak
    });
  }

  static get_footprint(){
    const size = new TextEncoder().encode(JSON.stringify([this.#ap_table])).length
    return `${Math.floor(size)} ${bytes2mem(size)}`;
  }

  static get_page_grants(access : string){ 
    const match = this.#get_template(access);
    if(match === "A01")return [];
    return Object.values(match.pages);
  }

  //Socket only.
  static endpoint_accessible(access : string, route : string){
    const match = this.#get_template(access);
    if(!match)return "A01";

    const result = match.endpoints[route];
    if(typeof result === undefined)return "IO1";
    
    return "";
  }

  static #get_template(access : string) : any{
    const matched_ap = this.#ap_table[access];
    if(!matched_ap)return "A01";

    return matched_ap;
  }
}

function bytes2mem(bytes : number) {
  return ["Bytes", "Kb", "Mb", "Gb", "Tb"][Math.floor(Math.log2(bytes) / 10)];
}