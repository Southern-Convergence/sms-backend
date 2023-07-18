export default class UACException extends Error {
  constructor(code : string){
    const name = code || "Unknown Error";
    super(name);
    this.name = name;
  }
  //Will be expanded to contain vital error information, those will be inserted within stacktrace to provide diagnostics for any inspector/s
  //For now, its a dumb custom error.
}