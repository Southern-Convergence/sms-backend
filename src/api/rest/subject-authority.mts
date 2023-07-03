import { object_id, handle_res } from "@lib/api-utils.mjs";
import Joi from "joi";
import {ObjectId} from "mongodb";
import { REST } from "sfr";

export default REST({
  cfg : {
    base_dir : "admin"
  },
  
  validators : {
    "get-users"   : {},

    "create-user" : {
      name        : Joi.array().required(),
      email       : Joi.string().email().required()
    },

    "update-user" : {
      user_id : object_id,
      user    : Joi.object().required()
    },

    "delete-user" : {
      user_id : object_id
    },
  },

  handlers   : {
    POST : {
      "create-user"(req, res){
        this.create_user(req.body)
        .then(()=> res.json({data : "Successfully created user."}))
        .catch((error)=> res.status(400).json({error}));
      },
      "update-user"(req, res){
        this.update_user(req.body.user_id, req.body.user)
        .then(()=> res.json({data : "Successfully updated user."}))
        .catch((error)=> res.status(400).json({error}));
      },
      "delete-user"(req, res){
        this.delete_user(req.body.user_id)
        .then(()=> res.json({data : "Successfully deleted user."}))
        .catch((error)=> res.status(400).json({error}));
      },
    }
  },
  
  controllers : {
    get_users(){
      return this.db.collection("users").find({ username : { $not : { $eq : "Ultravisor"} }}).toArray();
    },
    async create_user(user){
      const temp = await this.db.collection("users").findOne({ $or : [{ username : user.username }, { email : user.email }]})
      if(temp)return Promise.reject("Failed to create user, user already exists.");

      this.db.collection("users").insertOne(user);
    },
    async update_user(user_id, user){
      const temp = await this.db.collection("users").updateOne({ _id : new ObjectId(user_id)}, { $set : user });

      if(!temp.matchedCount)return Promise.reject("Failed to update user, user does not exist.");
    },
    async delete_user(user_id){
      const temp = await this.db.collection("users").deleteOne({ _id : new ObjectId(user_id)});

      if(!temp.deletedCount)return Promise.reject("Failed to delete user, user does not exist.");
    },
  }
});