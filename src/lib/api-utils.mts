import Joi from "joi";
import { Response } from "express";
export const template = (rule : object, v : object)=> _validate(Joi.object(rule).validate(v));
function _validate(expression : Joi.ValidationResult){
  let result = expression.error;
  return result ? result.details[0].message : false;
}

export const object_id = Joi.string().hex().length(24).required();

/* QoLs */

export const handle_res = (controller : Promise<any>, res : Response) =>{
  controller
  .then((data)=> res.json({data}))
  .catch((error)=> res.status(400).json({error}));
}