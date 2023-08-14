import { REST } from "sfr";
import Joi from "joi";
import uuid from "uuid"

import multers from "@lib/multers.mjs";

const m = multers["domain-logo"];

/* Joi/Multer Validation Example*/
export default REST({
  validators : {
    //Uses Multer Validation, also inserts file on req object.
    "save-signature" : m.single("signature"),

    //Uses Regular Joi Validation.
    "delete-signature" : { name : Joi.string().required() }
  },

  handlers : {
    POST : {
      "save-signature"(req, res){
        res.json({message : "Successfully sent file"})
      }
    }
  }
})