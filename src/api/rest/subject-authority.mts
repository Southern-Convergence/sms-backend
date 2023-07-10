import { object_id, handle_res } from "@lib/api-utils.mjs";
import Joi from "joi";
import {ObjectId} from "mongodb";
import { REST } from "sfr";

export default REST({
  cfg : {
    base_dir : "admin"
  },
  
  validators : {
    "get-users"   : {
      domain_id : object_id
    },

    "invite-user" : {
      domain_id   : object_id,
      user_type   : Joi.string().allow("human", "npe").required(),
      apts        : Joi.array().required(),
      group       : object_id,
      user_info   : Joi.object().required(),
      email       : Joi.string().email().required()
    },

    "create-user-group" : {
      domain_id : object_id,
      name      : Joi.string().required(),
      desc      : Joi.string()
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
    GET : {
      async "get-users"(req, res){
        handle_res(this.get_users(req.query.domain_id), res);
      },

      async "get-users-by-group"(req, res){
        const { domain_id } = req.query;
        const user_groups = await this.get_user_groups(domain_id);

        
      }
    },
    POST : {
      "invite-user"(req, res){
        this.create_user(req.body)
        .then(async ()=> {
          await this.postoffice["ethereal"].post({
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
          });

          res.json({data : "Successfully sent invitation"});
        })
        .catch((error)=> res.status(400).json({error : "Failed to send invitation"}));
      },

      "create-user-group"(req, res){
        this.create_user_group(req.body)
        .then(()=> res.json({data : "Successfully created user-group"}))
        .catch((error)=> res.json({error}));
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
    async get_users(domain_id){
      //Aggregate/De-duped Accesses
      const [user_groups, users] = await Promise.all([
        this.db.collection("user-groups").find({domain_id : new ObjectId(domain_id)}).toArray(),
        this.db.collection("users").find({ username : { $ne : "Ultravisor" } }).toArray()
      ]);

      const groups = Object.fromEntries(user_groups.map((v)=> [v._id.toString(), {...v, name : v.name, users : [] as any[]}]));
      const unassigned = [] as any[];

      users.forEach((v)=>{
        if(v.user_group && groups[v.user_group.toString()])groups[v.user_group.toString()].users.push(v);
        else unassigned.push(v);
      })

      const temp =  { "Unassigned" : {name : "Unassigned", users : unassigned}, ...groups};
      //Return object with keys as the name of the user-group;
      return Object.fromEntries(Object.values(temp).map((v)=> [v.name, {
        ...v,
        users : v.users
      }]))
    },
    async create_user(user){
      user.domain_id = new ObjectId(user.domain_id);
      const temp = await this.db.collection("users").findOne({ domain_id : user.domain_id,  $or : [{ username : user.username }, { email : user.email }]})
      if(temp)return Promise.reject("Failed to create user, user already exists.");

      this.db.collection("users").insertOne(user);
    },

    async get_user_groups(domain_id){
      this.db.collection("user-groups").find({domain_id : new ObjectId(domain_id)});
    },
    async create_user_group(user_group){
      user_group.domain_id = new ObjectId(user_group.domain_id);
      const temp = await this.db.collection("user-groups").findOne({ domain_id : user_group.domain_id, name : user_group.name });
      if(temp)return Promise.reject("Failed to create user group, a user group with the same name already exists.");
    
      return this.db.collection("user-groups").insertOne(user_group);
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