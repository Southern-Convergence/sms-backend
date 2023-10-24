import { WS } from "sfr";
import {template} from "@lib/api-utils.mjs";
import Joi from "joi";

export default WS({
  validators : {
    sample_endpoint : {
      fieldA : Joi.string().required(),
      fieldB : Joi.number()
    }
  },

  handlers : {
    sample_controller(){
      return Promise.resolve({});
    }
  },

  controllers : {
    sample_controller(){
      //Make db calls i guess.
      return Promise.resolve({ items : [] });
    }
  }
})