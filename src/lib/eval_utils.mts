import Joi from "joi";
export const template = (rule : object, v : object)=> _validate(Joi.object(rule).validate(v));
function _validate(expression : Joi.ValidationResult){
  let result = expression.error;
  return result ? result.details[0].message : false;
}

export const object_id = Joi.string().hex().length(24).required();