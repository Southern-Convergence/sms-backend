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
        this.postoffice["ethereal"].post({
          from : "someone@mail.com",
          to : "emy@mail.com",
          subject : "System Invite"
        },
        {
          context  : {
            invited_by_name  : "Emmanuel Abellana",
            invited_by_email : "mannyless37@gmail.com",
            invited_domain   : "Southern Convergence",

            name  : "Emylinda Abellana",
            roles : "Hypervisor",
            group : "UAC-Administrators",
            code  : "WHXZ8"
          },
          layout   : "default",
          template : "uac-invite"
        })
        .then(()=>{
          res.json({data : "Successfully sent invitation"})
        })
        .catch((error)=> res.json({error : `Failed to send invitation `}))
      }
    }
  }
})