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
    delete temp.rid;
    delete temp.end;
    delete temp.allow;

    const req_logs = this.#RID_MAP.get(obj.rid);
    !req_logs ? this.#RID_MAP.set(obj.rid, [temp]) : req_logs.push(temp);

    if(obj.end){
      Database.collection("logs")?.updateOne({rid : obj.rid}, {
        $set : {
          uac_trace    : req_logs,
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
  constructor(opts : any){
    super(opts);
  }

  log(obj : any, callback : ()=> void){
    Database.collection("logs")?.updateOne({rid : obj.rid}, {
      $set : {
        ...obj
      }
    }, {upsert : true})
    setImmediate(()=> this.emit("logged", obj));

    callback();
  }
}