import { Db, MongoClient } from "mongodb";

const { CONNECTION_STRING, DATABASE, HOSTNAME } = process.env;

export default class Database{
  static #con? : MongoClient;
  static #db?  : Db;


  static connect(){
    if(this.#con)return Promise.reject("Only one instance of database is allowed.");
    return new MongoClient(CONNECTION_STRING || "").connect().then((e)=>{
      this.#con = e;
      this.#db  = e.db(DATABASE || "");
      return this.#db;
    });
  }

  static disconnect(){
    if(!this.#con)return Promise.reject("Connection was already terminated");
    return this.#con.close().then(()=> {
      this.#con = undefined;
      this.#db  = undefined;
    });
  }

  static collection(collection : string){
    return this.#db?.collection(collection);
  }

  static get_instance(){
    return this.#db;
  }

  static get_connection(){
    return this.#con;
  }

  static instance(){
    return this.#db;
  }
}