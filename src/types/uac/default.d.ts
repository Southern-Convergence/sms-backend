/*
  Author: Emmanuel Abellana
  Company: Southern Convergence

  XACML-Based Types
  
  Basis Document: XACML 3.0 Errata 1.
  Link: https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/os/xacml-json-http-v1.1-os.pdf

  The types written below was written by the author's best
  ability to faithfully reproduce the standard to which this document adheres to.
*/


/* Result Object Representation */

declare type Decision = ("Permit" | "Deny" | "NotApplicable" | "Indeterminate");


/* MAIN CLASSES */

declare type GeneralRequest = {
  ReturnPolicyIdList? : Boolean,
  CombinedDecision? : Boolean,
  XPathVersion : String,
  Category? : Category[]
}

declare type Category = {
  CategoryId : String,
  Id? : String,
  Content? : String, //Value must be escaped or encoded,
  Attribute? : Attribute[]
}

declare type Attribute = {
  AttributeId : String,
  Value : (String[] | Boolean[] | Number[] | Object[]), //Maps to either an XACML Integer or double.
  Issuer? : String,
  DataType? : String,
  IncludeInResult? : Boolean
}

declare type MultiRequests = {
  RequestReference : RequestReference[]
}

declare type RequestReference = {
  ReferenceId : String[]
}

declare type Policy = {
  name : String,
  description? : String,
  basis : ("Resource" | "Subject" | "Environment" | "Action")
}

declare type Result = {
  Decision : Decision,
  Status? : Status,
  Obligations? : ObligationOrAdvice[],
  AssociatedAdvice? : ObligationOrAdvice[],
  Category? : Category[],
  PolicyIdentifierList? : []//PolicyIdentifier[],
}

declare type Status = {
  StatusMessage? : String,
  StatusDetail : String, //Serialized JSON
  StatusCode : {
    Value? : String,
  }
}

declare type ObligationOrAdvice = {
  Id : string, //XACML Obligation or Advice URI,
  AttributeAssignment : AttributeAssignment
}

declare type AttributeAssignment = {
  AttributeId : String, //A string containing XACML attribute URI.
  Value : String, //Variable
  Category? : String, //A string containing a XACML category URI or the shorthand notation.
  DataType? : String, //
}

declare type PolicyIdentifierList = {
  PolicyIdReference? : IdReference[],
  PolicySetIdReference? : IdReference[]
}

declare type IdReference = {
  Id : String,
  Version? : String
}