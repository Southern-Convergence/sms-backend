import { object_id, handle_res } from "@lib/api-utils.mjs";
import Grant from "@lib/grant.mjs";
import Joi from "joi";
import {ObjectId} from "mongodb";
import { REST } from "sfr";

export default REST({
  cfg : {
    base_dir : "admin",

    service : "Identity Access Management"
  },

  validators: {
    "get-domains": {},
    "get-domain": {
      domain_id: object_id,
    },
    "create-domain": {
      name: Joi.string().required(),
      secret_key: Joi.string(),
      icon: Joi.string(),
      access_policy: Joi.array().required(),
      security_policy: Joi.array().required(),
    },
    "update-domain": {
      domain_id: object_id,
      domain: {
        name: Joi.string(),
        secret_key: Joi.string(),
        icon: Joi.string(),
        access_policy: Joi.array(),
        security_policy: Joi.array(),
      },
    },
    "delete-domain": {
      domain_id: object_id,
    },
  
    "get-policies"  : {},
    "get-access-policies" : {},
    "get-security-policies" : {},
    "create-access-policy" : {
      name : Joi.string().required(),
      desc : Joi.string(),
      icon : Joi.string()
    },
    "update-access-policy" : {
      policy_id : object_id,
      policy : {
        name : Joi.string(),
        desc : Joi.string(),
        icon : Joi.string()
      }
    },
    "delete-access-policy" : {
      policy_id : object_id
    },
    "create-security-policy" : {},
    "update-security-policy" : {},
    "delete-security-policy" : {},

    "revoke-access-policy": {
      domain_id: object_id,
      policy_id: object_id,
    },
    "enforce-access-policy": {
      domain_id: object_id,
      policy_id: object_id,
    },
    "enforce-security-policy": {
      domain_id: object_id,
      security_id: object_id,
    },
    "revoke-security-policy": {
      domain_id: object_id,
      security_id: object_id,
    },
    "get-apts": {
      domain_id: object_id,
    },
    "get-apt" : {
      id : object_id
    },
    "create-apt": {
      domain_id: object_id,
      basis: object_id,

      name : Joi.string().required(),
      desc : Joi.string(),
      resources: Joi.array(),
    },
    "update-apt": {
      apt_id : object_id,
      name: Joi.string(),
      resources: Joi.array(),
    },
    "delete-apt": {
      apt_id: object_id,
    },
    "set-resources": {
      apt_id    : object_id,
      resources : Joi.array(),
    },
  },

  handlers: {
    GET: {
      "get-domains"(_, res) {
        handle_res(this.get_domains(), res);
      },
      "get-domain"(req, res) {
        handle_res(this.get_domain(req.query.domain_id), res);
      },

      async "get-policies"(_, res){
        let [access, security] = await Promise.all([this.get_access_policies(), this.get_security_policies()])
        res.json({data : (access || []).concat(security || [])});
      },
      "get-access-policies"(_, res){
        this.get_access_policies()
        .then((data)=> res.json({data}))
        .catch((error)=> res.status(400).json({error}));
      },
      "get-security-policies"(_, res){
        this.get_security_policies()
        .then((data)=> res.json({data}))
        .catch((error)=> res.status(400).json({error}));
      },

      "get-apts"(req, res) {
        handle_res(this.get_apts(req.query.domain_id), res);
      },
      "get-apt"(req, res) {
        handle_res(this.get_apt_details(req.query.id), res);
      },
    },

    POST : {
      "create-domain"(req, res){
        this.create_domain(req.body)
        .then(()=> res.json({data : "Successfully created domain."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },
      "update-domain"(req, res){
        this.update_domain(req.body.domain_id, req.body.domain)
        .then(()=> res.json({data : "Successfully updated domain."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },

      "create-access-policy"(req, res){
        this.create_access_policy(req.body)
        .then(()=> res.json({data : "Successfully created Access Policy."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },
      "update-access-policy"(req, res){
        this.update_access_policy(req.body.policy_id, req.body.policy)
        .then(()=> res.json({data : "Successfully Access Policy."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },

      "create-security-policy"(req, res){
        this.create_security_policy(req.body)
        .then(()=> res.json({data : "Successfully created Security Policy."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },
      "update-security-policy"(req, res){
        this.update_security_policy(req.body.policy_id, req.body.policy)
        .then(()=> res.json({data : "Successfully updated Security Policy."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },

      "enforce-access-policy"(req, res) {
        const { domain_id, policy_id } = req.body;
        this.enforce_access_policy(domain_id, policy_id)
        .then((result) => res.json({ data: result }))
        .catch((error) => res.status(400).json({ error }));
        Grant.set_state(false);
      },
      "revoke-access-policy"(req, res) {
        const { domain_id, policy_id } = req.body;
        this.revoke_access_policy(domain_id, policy_id)
        .then((result) => res.json({ data: result }))
        .catch((error) => res.status(400).json({ error }));
        Grant.set_state(false);
      },
      "enforce-security-policy"(req, res) {
        const { domain_id, security_id } = req.body;
        this.enforce_security_policy(domain_id, security_id)
        .then((data) => res.json({ data }))
        .catch((error) => res.status(400).json({ error }));
        Grant.set_state(false);
      },
      "revoke-security-policy"(req, res) {
        const { domain_id, security_id } = req.body;
        this.revoke_security_policy(domain_id, security_id)
        .then((data) => res.json({ data }))
        .catch((error) => res.status(400).json({ error }));
        Grant.set_state(false);
      },

      "create-apt"(req, res){
        this.create_apt(req.body)
        .then(()=> res.json({data : "Successfully created apt."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },

      "set-resources"(req, res){
        const { apt_id, resources } = req.body;

        this.set_resources(apt_id, resources)
        .then(()=> res.json({data : "Successfully granted resources to APT."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      }
    },

    DELETE : {
      "delete-domain"(req, res){
        this.delete_domain(req.body.domain_id)
        .then(()=> res.json({data : "Successfully deleted domain."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },
      
      "delete-access-policy"(req, res){
        this.delete_access_policy(req.body.policy_id)
        .then(()=> res.json({data : "Successfully deleted Access Policy."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },

      "delete-security-policy"(req, res){
        this.delete_security_policy(req.body.policy_id)
        .then(()=> res.json({data : "Successfully deleted Security Policy."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },

      "delete-apt"(req, res){
        this.delete_apt(req.body.apt_id)
        .then(()=> res.json({data : "Successfully deleted APT."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      }
    }
  },

  controllers: {
    get_domains() {
      return this.db
        .collection("domains")
        .aggregate([
          {
            '$project': {
              'key': 0
            }
          }, {
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
          }, {
            '$lookup': {
              'from': 'resources', 
              'localField': '_id', 
              'foreignField': 'domain_id', 
              'pipeline': [
                {
                  '$project': {
                    'domain_id': 0, 
                    'sfr_cfg': 0
                  }
                }
              ], 
              'as': 'resources'
            }
          }, {
            '$lookup': {
              'from': 'ap-templates', 
              'localField': '_id', 
              'foreignField': 'domain_id', 
              'pipeline': [
                {
                  '$match': {
                    'internal': true, 
                    'name': {
                      '$ne': 'Ultravisor'
                    }
                  }
                }, {
                  '$lookup': {
                    'from': 'users', 
                    'localField': '_id', 
                    'foreignField': 'access', 
                    'as': 'users'
                  }
                }, {
                  '$project': {
                    'name': 1, 
                    'desc': 1, 
                    'users': {
                      '$size': '$users'
                    }
                  }
                }
              ], 
              'as': 'administrators'
            }
          }, {
            '$lookup': {
              'from': 'users', 
              'localField': '_id', 
              'foreignField': 'domain_id', 
              'pipeline': [
                {
                  '$match': {
                    'username': {
                      '$ne': 'Ultravisor'
                    }
                  }
                }
              ], 
              'as': 'users'
            }
          }, {
            '$addFields': {
              'users': {
                '$size': '$users'
              }
            }
          }
        ])
        .toArray();
    },
    get_domain(domain_id){
      return this.db.collection("domains").findOne({_id : new ObjectId(domain_id)}, { projection : {key : 0}});
    },
    async create_domain(domain){
      const temp = await this.db.collection("domains").findOne({name : domain.name});
      if(temp)return Promise.reject("Failed to create domain, domain already exists.");

      return this.db.collection("domains").insertOne(domain);
    },
    async update_domain(domain_id, domain){
      const temp = await this.db.collection("domains").updateOne({_id : new ObjectId(domain_id)}, { $set : domain});
      if(!temp.matchedCount)return Promise.reject("Failed to update domain, domain does not exist.");
    },
    async delete_domain(domain_id){
      const temp = await this.db.collection("domains").deleteOne({_id : new ObjectId(domain_id)});

      if(!temp.deletedCount)return Promise.reject("Failed to delete domain, domain does not exist.");
    },

    get_access_policies(){
      return this.db.collection("policies").find({type : "access"}).toArray();
    },
    async create_access_policy(access_policy){
      let temp = await this.db.collection("policies").findOne({ name : access_policy.name, type : "access" });
      if(temp)return Promise.reject("Failed to create Access Policy, Access Policy already exists.");

      this.db.collection("policies").insertOne({...access_policy, type : "access"});
    },
    async update_access_policy(policy_id, access_policy){
      let temp = await this.db.collection("policies").updateOne({ _id : new ObjectId(policy_id) }, { $set : access_policy });
      if(!temp.matchedCount)return Promise.reject("Failed to update Access Policy, Access Policy does not exist.");
    },
    async delete_access_policy(policy_id){
      let temp = await this.db.collection("policies").deleteOne({ _id : new ObjectId(policy_id) });
      if(!temp.deletedCount)return Promise.reject("Failed to delete Access Policy, Access Policy does not exist.");
    },

    get_security_policies(){
      return this.db.collection("policies").find({type : "security"}).toArray();
    },
    async create_security_policy(security_policy){
      let temp = await this.db.collection("policies").findOne({ name : security_policy.name, type : "security" });
      if(temp)return Promise.reject("Failed to create Security Policy, Security Policy already exists.");

      this.db.collection("policies").insertOne({...security_policy, type : "security"});
    },
    async update_security_policy(policy_id, security_policy){
      let temp = await this.db.collection("policies").updateOne({ _id : new ObjectId(policy_id) }, { $set : security_policy });
      if(!temp.matchedCount)return Promise.reject("Failed to update Security Policy, Security Policy does not exist.");
    },
    async delete_security_policy(policy_id){
      let temp = await this.db.collection("policies").deleteOne({ _id : new ObjectId(policy_id) });
      if(!temp.deletedCount)return Promise.reject("Failed to delete Security Policy, Security Policy does not exist.");
    },

    async enforce_access_policy(domain_id: string, policy_id: string) {
      const result = await this.db
        .collection("domains")
        .updateOne(
          { _id: new ObjectId(domain_id) },
          { $push: { access_policies: new ObjectId(policy_id) } }
        );
      if (result.modifiedCount)
        return Promise.resolve("Successfully added access policy to domain");
      return Promise.reject("Failed to add access policy to domain");
    },
    async revoke_access_policy(domain_id: string, policy_id: string) {
      const result = await this.db
        .collection("domains")
        .updateOne(
          { _id: new ObjectId(domain_id) },
          { $pull: { access_policies: { $eq: new ObjectId(policy_id) } } }
        );
      if (result.modifiedCount)
        return Promise.resolve(
          "Successfully removed access policy from domain"
        );
      return Promise.reject("Failed to delete access policy from domain");
    },
    async enforce_security_policy(domain_id: string, security_id: string) {
      const result = await this.db
        .collection("domains")
        .updateOne(
          { _id: new ObjectId(domain_id) },
          { $push: { security_policies: new ObjectId(security_id) } }
        );
      if (result.modifiedCount)
        return Promise.resolve("Successfully added security policy to domain");
      return Promise.reject("Failed to add security policy to domain");
    },
    async revoke_security_policy(
      domain_id: string,
      security_id: string
    ) {
      const result = await this.db
        .collection("domains")
        .updateOne(
          { _id: new ObjectId(domain_id) },
          { $pull: { security_policies: { $eq: new ObjectId(security_id) } } }
        );
      if (result.modifiedCount)
        return Promise.resolve(
          "Successfully removed security policy from domain"
        );
      return Promise.reject("Failed to delete security policy from domain");
    },
    get_apts(domain_id) {
      return this.db
        .collection("ap-templates")
        .aggregate([
          {
            $match: {
              domain_id : new ObjectId(domain_id),
              name      : { $ne: "Ultravisor" }
            }
          },
          {
            $lookup: {
              from         : "policies",
              localField   : "basis",
              foreignField : "_id",
              pipeline     : [{$project:{name:1,icon:1}}],
              as           : "basis"
            },
          },
          {
            $unwind : "$basis"
          }
        ])
        .toArray();
    },
    async get_apt_details(apt_id) {
      const result = await this.db
        .collection("ap-templates")
        .aggregate([
          {
            $match: {
              _id: new ObjectId(apt_id)
            },
          },
          {
            $graphLookup: {
              from: "resources",
              startWith: "$resources",
              connectFromField: "resources",
              connectToField: "_id",
              as: "resolved_resources"
            },
          },
        ])
        .toArray();

      if (!result.length)return Promise.reject("Failed to get APT details, no such APT");
      const apt = result[0];
      const resource_map = Object.fromEntries(apt.resolved_resources.map((v : any)=> [v._id, v]));
      delete apt.resolved_resources;

      const output = resolve_resources(apt);
      function resolve_resources(item : any){
        if(!item.resources || !item.resources.length)return item;
        return {...item,resources : item.resources.map((v : string)=> resolve_resources(resource_map[v]))}
      }

      return output;
    },
    async create_apt(apt){
      const { domain_id, basis, name } = apt;
      const body = {domain_id : new ObjectId(domain_id), basis : new ObjectId(basis), name};
      const temp = await this.db.collection("ap-templates").findOne(body);

      if(temp)return Promise.reject("Failed to create apt, already exists.");
      return this.db.collection("ap-templates").insertOne({...body, desc : apt.desc || "", resources : []});
    },
    async delete_apt(apt_id){
      const result = await this.db.collection("ap-templates").deleteOne({_id : new ObjectId(apt_id)})
      if(!result.deletedCount)return Promise.reject("Failed to delete APT, no such APT.");
    },



    async set_resources(apt_id, resource_ids) {
      const ids = resource_ids.map((v : any)=> ({_id : new ObjectId(v)}));
      if(ids.length){
        const resource = await this.db.collection("resources").find({$or : ids}).toArray();
        if (resource.length !== ids.length)return Promise.reject("Failed to grant resources, one or more included resources does not exist.");
      }
      
      return this.db
        .collection("ap-templates")
        .updateOne({ _id: new ObjectId(apt_id) },
          {
            $set: {
              resources : ids.map((v:any)=> v["_id"])
            },
          }
        );
    },
  },
});
