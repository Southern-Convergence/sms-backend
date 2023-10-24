import { object_id, handle_res } from "@lib/api-utils.mjs";
import {EMAIL_TRANSPORT} from "@cfg/index.mjs";
import Joi from "joi";
import {ObjectId} from "mongodb";
import { REST } from "sfr";
import {v4} from "uuid";

const { ALLOWED_ORIGIN } = process.env;

const MIN_PASSWORD_LENGTH = 8;

export default REST({
  cfg : {
    base_dir : "admin",

    service : "Identity Access Management"
  },
  
  validators : {
    "get-users"   : {
      domain_id : object_id
    },

    "invite-user" : {
      domain      : {
        id   : object_id,
        name : Joi.string().required() 
      },

      user_type : Joi.string().allow("internal", "npe").required(), 
      group     : Joi.object(),

      apts        : Joi.array().required(),
      user_info   : Joi.object().required()
    },

    "finalize-user" : {
      first_name  : Joi.string().required(),
      middle_name : Joi.string().allow(""),
      last_name   : Joi.string().required(),

      username : Joi.string(),
      password : Joi.string().min(MIN_PASSWORD_LENGTH),
    },
 
    "create-user-group" : {
      domain_id : object_id,
      name      : Joi.string().required(),
      desc      : Joi.string().allow("")
    },

    "get-user-groups" : {
      domain_id : object_id
    },

    "update-user" : {
      user_id : object_id,
      user    : Joi.object().required()
    },

    "delete-user" : {
      user_id : object_id
    },


    /* APT Assignment */
    "set-apts" : {
      user_id : object_id,
      apts    : Joi.array().items(Joi.string())
    },
    "revoke-apt" :{
      user_id : object_id,
      apt     : object_id
    }
  },

  handlers : {
    GET : {
      async "get-users"(req, res){
        handle_res(this.get_users(req.query.domain_id), res);
      },

      async "get-user-groups"(req, res){
        handle_res(this.get_user_groups(req.query.domain_id), res);
      }
    },
    POST : {
      "invite-user"(req, res){
        //Unwrap variables
        let { domain, group, apts, user_info, user_type } = req.body;
        
        const {user} = req.session;
        if(!user)return res.status(400).json({error : "Failed to invite user, invalid session."});

        const invitation_code = v4();

        this.invite_user({
          domain,
          group,
          apts,
          user : user_info,
          type : user_type,
          invited_by : {
            id       : user._id,
            username : user.username,
            email    : user.email,
            access   : user.access
          },
          code : invitation_code
        })
        .then(()=>{
          this.postoffice[EMAIL_TRANSPORT].post({
            from : "systems@mail.com",
            to   : user_info.email
          }, {
            template : "uac-internal-invite",
            layout   : "default",
            context  : {
              invited_by_name  : user.username,
              invited_by_email : user.email,
              
              name  : `${user_info.first_name} ${user_info.last_name}`,
              roles : apts.map((v : any)=> v.name).toString(),
              group : group ? group.name : "None",
              link  : `${ALLOWED_ORIGIN}/onboarding?ref=${invitation_code}`
            }
          })
          .then(()=> res.json({data : "Successfully sent invitation"}));
        })
        .catch((error)=> res.status(400).json({error}));
      },

      "finalize-user"(req, res){

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

      "set-apts"(req, res){
        const { user_id, apts } = req.body;
        this.set_apts(user_id, apts)
        .then(()=> res.json({data : "Successfully assigned APTs."}))
        .catch((error)=> res.status(400).json({error}));
      },

      "revoke-apt"(req, res){
        const { user_id, apt } = req.body;
        this.revoke_apt(user_id, apt)
        .then(()=> res.json({data : "Succesfully unassigned APT."}))
        .catch((error)=> res.status(400).json({error}));
      }
    }
  },
  
  controllers : {
    async get_users(domain_id){
      //Aggregate/De-duped Accesses
      const [user_groups, users] = await Promise.all([
        this.db.collection("user-groups").find({domain_id : new ObjectId(domain_id)}).toArray(),
        this.db.collection("users").aggregate([
          { $match : {username : { $ne : "Ultravisor" }, domain_id : new ObjectId(domain_id)} },
          {
            $project : {
              first_name  : 1,
              middle_name : 1,
              last_name   : 1,

              email     : 1,
              status    : 1,
              domain_id : 1,
              access    : 1
            }
          },
          {
            $lookup: {
              from         : "ap-templates",
              localField   : "access",
              foreignField : "_id",
              pipeline     : [{$project:{name:1}}],
              as           : "access"
            }
          }
        ]).toArray()
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

    async invite_user({domain, group, apts, user, invited_by, code, type}){
      const domain_id = new ObjectId(domain.id);
      if(group)group.id = new ObjectId(group.id);
      apts = apts.map((v : any)=> ({...v}));
      invited_by.id = new ObjectId(invited_by.id);
      const [user_res, invite_res] = await Promise.all([
        this.db.collection("users").findOne({ domain_id, email : user.email }),
        this.db.collection("invites").findOne({ domain_id, "user.email" : user.email })
      ])

      if(user_res)return Promise.reject("Failed to invite user, user already exists.");
      if(invite_res)return Promise.reject("Failed to invite user, invitation already sent.");

      const session = this.instance.startSession();

      return session.withTransaction(async()=> {
        const temp = await this.db.collection("users").insertOne({
          username    : null,
          password    : null,
          email       : user.email,
          access      : apts.map((v : any)=> new ObjectId(v._id)),
          status      : "invited",
          first_name  : user.first_name, 
          middle_name : user.middle_name, 
          last_name   : user.last_name, 
          
          domain_id,
          type
        });
        this.db.collection("invites").insertOne({ created : new Date(), code, domain_id, group, apts, user : {...user, id : temp.insertedId}, invited_by });
      }).finally(()=> session.endSession());
    },

    async get_user_groups(domain_id){
      return this.db.collection("user-groups").find({domain_id : new ObjectId(domain_id)}).toArray();
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

    async set_apts(user_id, apts){
      apts = apts.map((v : string)=> new ObjectId(v));
      const temp = await this.db.collection("users").updateOne({_id : new ObjectId(user_id)}, { $set : {access : apts}})
      if(!temp.modifiedCount)return Promise.reject("Failed to assign APTs.");
    },

    async revoke_apt(user_id, apt){
      const temp = await this.db.collection("users").updateOne({_id : new ObjectId(user_id)}, {$pull : {access : new ObjectId(apt)}});
      if(!temp.modifiedCount)return Promise.reject("Failed to unassign APT");
    }
  }
});