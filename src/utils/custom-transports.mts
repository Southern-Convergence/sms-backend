import Database from "@lib/database.mjs";
import Transport from "winston-transport";

export class CachedTransport extends Transport{
  //FUck I can't do bulk writes with how logging is supposed to happen on winston logger instances.
  //Here's a workaround, ugly but it will work

  #RID_MAP = new Map();
  constructor(opts : any){
    super(opts);
  }

  log(obj : any, callback : ()=> void){
    const temp = Object.assign({}, obj);
    delete temp.end;
    delete temp.allow;
    
    const req_accumulator = this.#RID_MAP.get(obj.rid);
    !req_accumulator ? this.#RID_MAP.set(obj.rid, [temp]) : req_accumulator.push(temp);

    if(obj.end){
      Database.collection("logs")?.updateOne({rid : obj.rid}, {
        $set : {
          uac_trace    : req_accumulator,
          uac_decision : obj.allow ? "Allow" : "Deny" 
        }
      }, {upsert : true});

      //Destroy RID_MAP Reference
      this.#RID_MAP.delete(obj.rid);
    }

    setImmediate(()=> this.emit("logged", obj));
    callback();
  }
}

export class ObjectTransport extends Transport {
  #RID_MAP = new Map();
  constructor(opts : any){
    super(opts);
  }

  async log(obj : any, callback : ()=> void){
    if(obj.type === "UAC"){
      const temp = Object.assign({}, obj);
      delete temp.end;
      delete temp.allow;
      delete temp.rid;
      delete temp.domain_id;
      delete temp.service_id;
      
      const req_accumulator = this.#RID_MAP.get(obj.rid);
      let meta = {domain_id : null, service_id : null};

      !req_accumulator ? this.#RID_MAP.set(obj.rid, {meta, trace : [temp]}) : req_accumulator.trace.push(temp);

      if(obj.domain_id && obj.service_id){
        meta.domain_id = obj.domain_id;
        meta.service_id = obj.service_id;
        req_accumulator.meta = meta;
      }
    }

    if(obj.type === "API"){
      const req_accumulator = this.#RID_MAP.get(obj.rid) || [];
      const allow = req_accumulator.trace[req_accumulator.trace.length-1].message === "APT Decision: Allow";
      Database.collection("logs")?.insertOne({...obj, uac_decision : allow ? "Allow" : "Deny", uac_trace : req_accumulator.trace, ...req_accumulator.meta});
    
      //Destroy RID_MAP Reference
      this.#RID_MAP.delete(obj.rid);
    }

    //if(!["UAC", "API"].includes(obj.type))Database.collection("logs")?.insertOne(obj);

    setImmediate(()=> this.emit("logged", obj));
    callback();
  }
}