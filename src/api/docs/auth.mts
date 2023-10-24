export default {
  POST : {
    //https://spec.openapis.org/oas/v3.1.0#path-item-object
    login : {
      tags        : ["Account", "Authentication"],
      deprecated  : false,
      description : "Establish an authenticated session through the use of user credentials."
    }
  }
} as PathDeclaration