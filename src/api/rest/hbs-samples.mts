import {EMAIL_TRANSPORT} from "config.mjs";
import Joi from "joi";
import { REST } from "sfr";

export default REST({
  cfg : {
    public : true
  },

  validators : {

    sample : {}

  },

  handlers : {
    GET : {
      sample(_, res){
        return res.json({data : "Yay"})
        this.postoffice[EMAIL_TRANSPORT].post({
          from : "someone@mail.com",
          to   : "manny@mail.com",
          subject : "You've been caught"
        },
        {
          context  : {},
          template : "uac-internal-invite",
          layout   : "default" 
        }).then((html)=> res.send(html))
      }
    }
  }
})