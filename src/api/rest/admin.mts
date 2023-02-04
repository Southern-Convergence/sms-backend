import {object_id} from "@lib/eval_utils.mjs";
import Joi from "joi";
import {ObjectId} from "mongodb";
import { REST } from "sfr";

export default REST({ 
  validators : {
    //>>>Start of Domain Management API
    "get-domains"   : {},

    "create-domain" : {
      name            : Joi.string().required(),
      secret_key      : Joi.string(),
      icon            : Joi.string(),
      access_policy   : Joi.array().required(),
      security_policy : Joi.array().required()
    },

    "update-domain" : {
      domain_id : object_id,
      domain : {
        name            : Joi.string(),
        secret_key      : Joi.string(),
        icon            : Joi.string(),
        access_policy   : Joi.array(),
        security_policy : Joi.array()
      }
    },

    "delete-domain" : {
      domain_id : object_id
    },
    //>>>End of Domain Management API


    //>>>Start of User Management API
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
    //>>>End of User Management API


    //>>>Start of Policy Management API
    "get-policies"  : {},

    "get-access-policies" : {},

    "get-security-policies" : {},
    "create-access-policy" : {
      name : Joi.string().required(),
      desc : Joi.string(),
      icon : Joi.string(),
      attr : Joi.string()
    },
    
    "update-access-policy" : {
      policy_id : object_id,
      policy : {
        name : Joi.string(),
        desc : Joi.string(),
        icon : Joi.string(),
        attr : Joi.string()
      }
    },

    "delete-access-policy" : {
      policy_id : object_id
    },

    "create-security-policy" : {},

    "update-security-policy" : {},

    "delete-security-policy" : {},
    //>>>End of Policy Management API

    
    //>>>Start of Registry Actions API
    "get-registry-classifications" : {},

    "create-registry-classification" : {
      name        : Joi.string().required(),
      description : Joi.string()
    },

    "update-registry-classification" : {
      classification_id : object_id,
      classification    : {
        name        : Joi.string(),
        description : Joi.string() 
      }
    },

    "delete-registry-classification" : {
      classification_id : object_id
    },

    "get-registry-values"   : {
      classification_id : object_id
    },

    "create-registry-value" : {
      classification_id : object_id,
      key               : Joi.string().required(),
      value             : Joi.any() 
    },

    "update-registry-value" : {
      registry_id    : object_id,
      registry_value : {
        key   : Joi.string(),
        value : Joi.any()
      }
    },

    "delete-registry-value" : {
      registry_id : object_id
    },
    //>>>End of Registry Actions API
  },

  handlers : {
    GET : {
      //>>>Start of Domain Management API
      "get-domains"(_, res){
        this.get_domains()
        ?.then((data)=> res.json({data}))
        .catch((error)=> res.status(400).json({error}));
      },
      "get-users"(_, res){
        this.get_users()
        ?.then((data)=> res.json({data}))
        .catch((error)=> res.status(400).json({error}));
      },
      //>>>End of Domain Management API


      //>>>Start of Policy Management API
      async "get-policies"(_, res){
        let [access, security] = await Promise.all([this.get_access_policies(), this.get_security_policies()])
        res.json({data : (access || []).concat(security || [])});
      },
      "get-access-policies"(_, res){
        this.get_access_policies()
        ?.then((data)=> res.json({data}))
        .catch((error)=> res.status(400).json({error}));
      },
      "get-security-policies"(_, res){
        this.get_security_policies()
        ?.then((data)=> res.json({data}))
        .catch((error)=> res.status(400).json({error}));
      },
      //>>>Start of Policy Management API


      //>>>Start of Registry Actions API
      "get-registry-values"(req, res){
        const { classification_id } = req.body;
        this.get_registry_values(classification_id)
        ?.then((data)=> res.json({data}))
        .catch((error)=> res.status(400).json({error}));
      },

      "get-registry-classifications"(_, res){
        this.get_registry_classifications()
        ?.then((data)=> res.json({data}))
        .catch((error)=> res.status(400).json({error}));
      },

      //>>>End of Registry Actions API
    },
    
    POST : {
      //>>>Start of Domain Management API
      "create-domain"(req, res){
        this.create_domain(req.body)
        .then(()=> res.json({data : "Successfully created domain."}))
        .catch((error)=> res.status(400).json({error}));
      },
      "update-domain"(req, res){
        this.update_domain(req.body.domain_id, req.body.domain)
        .then(()=> res.json({data : "Successfully updated domain."}))
        .catch((error)=> res.status(400).json({error}));
      },
      "delete-domain"(req, res){
        this.delete_domain(req.body.domain_id)
        .then(()=> res.json({data : "Successfully deleted domain."}))
        .catch((error)=> res.status(400).json({error}));
      },
      //>>>End of Domain Management API

      
      //>>>Start of User Management API
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
      //>>>End of User Management API


      //>>>Start of Policy Management API
      "create-access-policy"(req, res){
        this.create_access_policy(req.body)
        .then(()=> res.json({data : "Successfully created Access Policy."}))
        .catch((error)=> res.status(400).json({error}));
      },
      "update-access-policy"(req, res){
        this.update_access_policy(req.body.policy_id, req.body.policy)
        .then(()=> res.json({data : "Successfully Access Policy."}))
        .catch((error)=> res.status(400).json({error}));
      },
      "delete-access-policy"(req, res){
        this.delete_access_policy(req.body.policy_id)
        .then(()=> res.json({data : "Successfully deleted Access Policy."}))
        .catch((error)=> res.status(400).json({error}));
      },
      "create-security-policy"(req, res){
        this.create_security_policy(req.body)
        .then(()=> res.json({data : "Successfully created Security Policy."}))
        .catch((error)=> res.status(400).json({error}));
      },
      "update-security-policy"(req, res){
        this.update_security_policy(req.body.policy_id, req.body.policy)
        .then(()=> res.json({data : "Successfully updated Security Policy."}))
        .catch((error)=> res.status(400).json({error}));
      },
      "delete-security-policy"(req, res){
        this.delete_security_policy(req.body.policy_id)
        .then(()=> res.json({data : "Successfully deleted Security Policy."}))
        .catch((error)=> res.status(400).json({error}));
      },
      //>>>End of Policy Management API


      //>>>Start of Registry Actions API
      "create-registry-classification"(req, res){
        this.create_registry_value(req.body)
        .then(()=> res.json({data : "Successfully created Registry Classification."}))
        .catch((error)=> res.status(400).json({error}));
      },

      "update-registry-classification"(req, res){
        this.update_registry_classification(req.body)
        .then(()=> res.json({ data : "Successfully updated Registry Classification"}))
        .catch((error)=> res.status(400).json({error}));
      },

      "delete-registry-classification"(req, res){
        this.delete_registry_classification(req.body)
        .then(()=> res.json({ data : "Successfully deleted Registry Classification"}))
        .catch((error)=> res.status(400).json({error}));
      },

      "get-registry-values"(req, res){
        this.get_registry_values(req.body)
        ?.then((data)=> res.json({data}))
        .catch((error)=> res.status(400).json({error}));
      },

      "create-registry-value"(req, res){
        this.create_registry_value(req.body)
        .then(()=> res.json({data : "Successfully created Registry Value."}))
        .catch((error)=> res.status(400).json({error}));
      },
      "update-registry-value"(req, res){
        this.update_registry_value(req.body.registry_id, req.body.registry_value)
        .then(()=> res.json({data : "Successfully updated Registry Value."}))
        .catch((error)=> res.status(400).json({error}));
      },
      "delete-registry-value"(req, res){
        this.delete_registry_value(req.body.registry_id)
        .then(()=> res.json({data : "Successfully deleted Registry Value."}))
        .catch((error)=> res.status(400).json({error}));
      }
      //>>>End of Registry Actions API
    }
  },

  controllers : {
    //>>>Start of Domain Management API
    get_domains(){
      return this.db?.collection("domains").aggregate([
        {
          '$lookup': {
            'from': 'policies', 
            'localField': 'access_policies', 
            'foreignField': '_id', 
            'as': 'access_policies'
          }
        }, {
          '$lookup': {
            'from': 'policies', 
            'localField': 'security_policies', 
            'foreignField': '_id', 
            'as': 'security_policies'
          }
        }
      ]).toArray();
    },
    async create_domain(domain){
      const temp = await this.db?.collection("domains").findOne({name : domain.name});
      if(temp)return Promise.reject("Failed to create domain, domain already exists.");

      return this.db?.collection("domains").insertOne(domain);
    },
    async update_domain(domain_id, domain){
      const temp = await this.db?.collection("domains").updateOne({_id : new ObjectId(domain_id)}, { $set : domain});
      if(!temp?.matchedCount)return Promise.reject("Failed to update domain, domain does not exist.");
    },
    async delete_domain(domain_id){
      const temp = await this.db?.collection("domains").deleteOne({_id : new ObjectId(domain_id)});

      if(!temp?.deletedCount)return Promise.reject("Failed to delete domain, domain does not exist.");
    },
    //>>>End of Domain Management API


    //>>>Start of User Management API
    get_users(){
      return this.db?.collection("users").find({ username : { $not : { $eq : "Ultravisor"} }}).toArray();
    },
    async create_user(user){
      const temp = await this.db?.collection("users").findOne({ $or : [{ username : user.username }, { email : user.email }]})
      if(temp)return Promise.reject("Failed to create user, user already exists.");

      this.db?.collection("users").insertOne(user);
    },
    async update_user(user_id, user){
      const temp = await this.db?.collection("users").updateOne({ _id : new ObjectId(user_id)}, { $set : user });

      if(!temp?.matchedCount)return Promise.reject("Failed to update user, user does not exist.");
    },
    async delete_user(user_id){
      const temp = await this.db?.collection("users").deleteOne({ _id : new ObjectId(user_id)});

      if(!temp?.deletedCount)return Promise.reject("Failed to delete user, user does not exist.");
    },
    //>>>End of User Management API


    //>>>Start of Policy Management API
    get_access_policies(){
      return this.db?.collection("policies").find({type : "access"}).toArray();
    },
    async create_access_policy(access_policy){
      let temp = await this.db?.collection("policies").findOne({ name : access_policy.name, type : "access" });
      if(temp)return Promise.reject("Failed to create Access Policy, Access Policy already exists.");

      this.db?.collection("policies").insertOne({...access_policy, type : "access"});
    },
    async update_access_policy(policy_id, access_policy){
      let temp = await this.db?.collection("policies").updateOne({ _id : new ObjectId(policy_id) }, { $set : access_policy });
      if(!temp?.matchedCount)return Promise.reject("Failed to update Access Policy, Access Policy does not exist.");
    },
    async delete_access_policy(policy_id){
      let temp = await this.db?.collection("policies").deleteOne({ _id : new ObjectId(policy_id) });
      if(!temp?.deletedCount)return Promise.reject("Failed to delete Access Policy, Access Policy does not exist.");
    },

    get_security_policies(){
      return this.db?.collection("policies").find({type : "security"}).toArray();
    },
    async create_security_policy(security_policy){
      let temp = await this.db?.collection("policies").findOne({ name : security_policy.name, type : "security" });
      if(temp)return Promise.reject("Failed to create Security Policy, Security Policy already exists.");

      this.db?.collection("policies").insertOne({...security_policy, type : "security"});
    },
    async update_security_policy(policy_id, security_policy){
      let temp = await this.db?.collection("policies").updateOne({ _id : new ObjectId(policy_id) }, { $set : security_policy });
      if(!temp?.matchedCount)return Promise.reject("Failed to update Security Policy, Security Policy does not exist.");
    },
    async delete_security_policy(policy_id){
      let temp = await this.db?.collection("policies").deleteOne({ _id : new ObjectId(policy_id) });
      if(!temp?.deletedCount)return Promise.reject("Failed to delete Security Policy, Security Policy does not exist.");
    },
    //>>>End of Policy Management API

    
    //>>>Start of Registry Actions API
    get_registry_classifications(){
      return this.db?.collection("registry").find({}).toArray();
    },

    async create_registry_classification(classification){
      let temp = await this.db?.collection("registry").findOne({ name : classification.name });
      if(temp)return Promise.reject("Failed to create Registry Classification, Classification already exists.");

      return this.db?.collection("registry").insertOne(classification);
    },

    async update_registry_classification(data){
      let temp = await this.db?.collection("registry").updateOne({ _id : new ObjectId(data.classification_id)}, { $set : {...data.classification}});
      if(!temp?.matchedCount)return Promise.reject("Failed to update Registry Classification, Registry Classification does not exist.");
    },

    async delete_registry_classification(data){
      let temp = await this.db?.collection("registry").deleteOne({ _id : new ObjectId(data.classification_id) });
      if(!temp?.deletedCount)return Promise.reject("Failed to delete Registry Classification, Registry Classification does not exist.");
    },

    get_registry_values(classification_id){
      return this.db?.collection("registry").findOne({_id : new ObjectId(classification_id)});
    },
    async create_registry_value(registry_value){
      let temp = await this.db?.collection("registry").findOne({ key : registry_value.key });
      if(temp)return Promise.reject("Failed to create Registry Value, Registry Value already exists.");

      return this.db?.collection("registry").insertOne(registry_value);
    },
    async update_registry_value(registry_id, registry_value){
      let temp = await this.db?.collection("registry").updateOne({ _id : new ObjectId(registry_id) }, { $set : registry_value });
      if(!temp?.matchedCount)return Promise.reject("Failed to update Registry Value, Registry Value does not exist.");
    },
    async delete_registry_value(registry_id){
      let temp = await this.db?.collection("registry").deleteOne({ _id : new ObjectId(registry_id) });
      if(!temp?.deletedCount)return Promise.reject("Failed to delete Registry Value, Registry Value does not exist.");
    },
    //>>>End of Registry Actions API
  }
});