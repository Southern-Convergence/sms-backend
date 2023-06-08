import { REST } from "sfr";

import { ObjectId } from "mongodb";

import Joi from "joi";
import otpgen from "@lib/otpgen.mjs";

const EXPIRY = 3600000 * 72; //72 Hours

export default REST({
  cfg : {
    public : true
  },

  validators : {
    verify  : {otp     : Joi.string().required()},
    reissue : {user_id : Joi.string().required()},
  },

  handlers : {
    POST : {
      verify(req, res){
        const { otp } = req.body;

        this.verify_otp(otp)
        .then(()=> res.json({data : "OTP is valid"}))
        .catch((error)=> res.status(400).json({error}));
      },

      async reissue(req, res){
        const { user_id } = req.body;

        const user = await this.get_user(user_id);

        if(!user){
          this.delete_otps(user_id);
          return Promise.reject("Failed to re-issue OTP, user not found.");
        }
        
        const reissued_otp = otpgen();

        this.save_otp(reissued_otp, user_id)
        ?.then(()=> {
          this.mailmen["ethereal"].post({
            from : "sad@sad.com",
            to   : user.email,
            subject : "Account-Recovery"
          }, {
            template : "recovery",
            context  : {first_name : user.first_name, last_name : user.last_name, otp : reissued_otp }
          })
          .then(()=> res.json({data : "Successfully re-issued token."}))
          .catch(()=> res.status(400).json({error : "Failed to re-issue OTP, please try again"}))
        })
        .catch(()=> res.status(400).json({error : "Failed to re-issue OTP, please contact an administrator."}));
      }
    }
  },

  controllers : {
    async verify_otp(token){
      const match = await this.db?.collection("otp").findOne({token});
      if(!match)return Promise.reject("OTP not found");
      //Has Expired?
      if(Date.now() > new Date(match.expiry).getTime())return Promise.reject(match.user_id);
    },

    get_user(user_id){
      return this.db?.collection("users").findOne({_id : new ObjectId(user_id)})
    },

    save_otp(token, user_id){
      return this.db?.collection("otp").updateOne({ user_id }, {$set : { token, expiry : new Date(Date.now() + EXPIRY), user_id }}, {upsert : true});
    },

    delete_otps(user_id){
      this.db?.collection("otp").deleteMany({user_id : new ObjectId(user_id)})
    }
  }
})