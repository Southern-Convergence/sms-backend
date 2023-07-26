import { object_id, handle_res } from "@lib/api-utils.mjs";
import Joi from "joi";
import {ObjectId} from "mongodb";
import { REST } from "sfr";

import Grant from "@lib/grant.mjs";
import grant_def from "@lib/setup/grant-def.mjs";

export default REST({
  cfg : {
    base_dir : "admin"
  },
  
  validators : {
    "get-subdomains": {
      domain_id: object_id,
    },
    "create-subdomain": {
      domain_id: object_id,
      subdomain: {
        name: Joi.string().required(),
        desc: Joi.string(),
      },
    },
    "update-subdomain": {
      domain_id: object_id,
      subdomain: {
        name: Joi.string(),
        desc: Joi.string(),
      },
    },
    "delete-subdomain": {
      subdomain_id: object_id,
    },
    "create-page" : {
      domain_id : object_id,
      page : {
        name : Joi.string().required(),
        path : Joi.string()
      }
    },
    "get-resources": {
      domain_id: object_id,
    },
    "resource-assignment" : {
      parent : object_id,
      child  : object_id
    },

    "delete-resource" : {
      resource_id : object_id
    }
  },

  handlers   : {
    GET : {
      "get-resources"(req, res) {
        handle_res(this.get_resources(req.query.domain_id).catch(console.log), res);
      },
      "get-subdomains"(req, res) {
        handle_res(this.get_subdomains(req.query.domain_id), res);
      },
    },
    POST : {
      "create-subdomain"(req, res) {
        const { domain_id, subdomain } = req.body;
        this.create_subdomain(domain_id, subdomain)
        .then(() => res.json({ data: "Successfully created subdomain." }))
        .catch((error) => res.status(400).json({ error }));
        Grant.set_state(false);
      },
      "create-page"(req, res){
        const { domain_id, page } = req.body;
        this.create_page(domain_id, page)
        .then(()=> res.json({data : "Successfully created page."}))
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },
      "resource-assignment"(req, res){
        const { parent, child } = req.body;
        this.assign_resource(parent, child)
        .then(()=> res.json({data : "Successfully assigned resource."}))
        .catch(()=> res.status(400).json({error : "Failed to assign resource, resource has already been assigned."}));
        Grant.set_state(false);
      }
    },

    DELETE : {
      "delete-resource"(req, res){
        
        this.delete_resource(req.body.resource_id)
        .then(()=> res.json({data : "Successfully deleted resource."}))
        .catch((error)=> res.json({error}));
      }
    }
  },

  controllers : {
    async get_resources(domain_id) {
      const resources = await this.db.collection("resources").find({ domain_id: new ObjectId(domain_id) }).toArray();
      const resource_map = Object.fromEntries(resources.map((v)=> [v._id.toString(), v]));
      function resolve_resources(item : any){
        if(!item.resources || !item.resources.length)return item;
        return {...item, resources : item.resources.map((v : string)=> {
          const res = resource_map[v.toString()];

          if(res)resolve_resources(res)
        })}
      }

      return resources.map(resolve_resources);
    },
    get_subdomains(domain_id) {
      return this.db
        .collection("resources")
        .find({ domain_id: new ObjectId(domain_id), type: "subdomain" })
        .toArray();
    },
    async create_subdomain(domain_id, subdomain) {
      let temp = await this.db
        .collection("resources")
        .find({
          domain_id: new ObjectId(domain_id),
          type: "subdomain",
          name: subdomain.name,
        })
        .toArray();
      if (temp.length)
        return Promise.reject(
          "Failed to create subdomain, subdomain already exists."
        );

      return this.db.collection("resources").insertOne({
        domain_id: new ObjectId(domain_id),
        type: "subdomain",
        resources : [],
        ...subdomain,
      });
    },
    async delete_subdomain(subdomain_id) {
      let temp = await this.db
        .collection("resources")
        .deleteOne({ _id: new ObjectId(subdomain_id) });

      if (!temp.deletedCount)
        return Promise.reject(
          "Failed to delete subdomain, subdomain not found."
        );
      return Promise.resolve(true);
    }, 
    async create_page(domain_id, page){
      const temp = await this.db.collection("resources").findOne({ type : "page", domain_id : new ObjectId(domain_id), name : page.name});
      if(temp)return Promise.reject("Failed to create page, page already exists.");

      return this.db.collection("resources").insertOne({
        domain_id : new ObjectId(domain_id),
        type      : "page",
        resources : [],
        ...page
      });
    },
    delete_resource(resource_id){
      return this.db.collection("resources").deleteOne({_id : new ObjectId(resource_id)})
      .then((v)=> {
        if(!v.deletedCount)return Promise.reject("Failed to delete resource, no such resource.");
      })
    },
    async assign_resource(parent, child){
      const temp = await this.db.collection("resources").find({$or : [{_id : new ObjectId(parent)}, {_id : new ObjectId(child)}]}).toArray();
      if(temp.length !== 2)return Promise.reject("Failed to assign resource, both resource must exist.");
      
      return this.db.collection("resources").updateOne({_id : new ObjectId(parent)}, { $addToSet : {resources : new ObjectId(child) } });
    }
  }
});