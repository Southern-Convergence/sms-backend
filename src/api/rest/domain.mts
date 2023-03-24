import { object_id } from "@lib/api-utils.mjs";
import Joi from "joi";
import { ObjectId } from "mongodb";
import { REST } from "sfr";

export default REST({
  cfg: {
    base_dir: "admin",
  },

  validators : {
    "get-domain": {},
    "get-resources" : {
      domain_id : object_id
    },
    "get-resources-by-domain-name" : {
      name : Joi.string().required()
    },

    //>>>Start of Subdomain Management API
    "get-subdomains": {
      domain_id: object_id,
    },

    "create-subdomain": {
      domain_id: object_id,
      subdomain: {
        name : Joi.string().required(),
        desc : Joi.string(),
      },
    },

    "update-subdomain": {
      domain_id: object_id,
      subdomain: {
        name: Joi.string(),
        desc: Joi.string(),
      },
    },

    "delete-subdomain" : {
      domain_id : object_id
    },
    //>>>End of Subdomain Management API

    //>>Start of domain policy management
    "remove-access-policy" : {
      domain_id: object_id,
      policy_id: object_id
    },
    
    "add-access-policy" : {
      domain_id: object_id,
      policy_id: object_id
    },
    //>>End of domain policy management

    //>>Start domain security policy
    "add-security-policy" : {
      domain_id: object_id,
      security_id: object_id
    },
    "remove-security-policy" :{
      domain_id: object_id,
      security_id: object_id
    }
    //>>End domain security policy
  },

  handlers: {
    GET: {
      "get-resources"(req, res) {
        this.get_resources(req.query.domain_id)
          ?.then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "get-subdomains"(req, res) {
        this.get_subdomains(req.query.domain_id)
          ?.then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

      "get-resources-by-domain-name"(req, res){
        this.get_resources_by_domain_name(req.query.name)
        ?.then((data)=> res.json({data}))
        .catch((error)=> res.status(400).json({error}));
      }
    },
    POST: {
      "create-subdomain"(req, res) {
        const { domain_id, subdomain } = req.body;
        this.create_subdomain(domain_id, subdomain)
        .then(()=> res.json({data : "Successfully created subdomain."}))
        .catch((error)=> res.status(400).json({error}));
      },
      //>> Domain policy management
      "remove-access-policy"(req, res){
        const { domain_id, policy_id } = req.body;
        this.remove_domain_access_policy(domain_id, policy_id)
        .then((result) => res.json({data: result}))
        .catch((error) => res.status(400).json({error}))
      },
      "add-access-policy"(req, res){
        const { domain_id, policy_id } = req.body;
        this.add_domain_access_policy(domain_id, policy_id)
        .then((result) => res.json({data: result}))
        .catch((error)=> res.status(400).json({error}))
      },
      "remove-security-policy"(req, res){
        const { domain_id, security_id } = req.body;
        this.remove_domain_security_policy(domain_id, security_id)
        .then((data) => res.json({data}))
        .catch(error => res.status(400).json({error}))
      },
      "add-security-policy"(req, res){
        const { domain_id, security_id } = req.body;
        this.add_domain_security_policy(domain_id, security_id)
        .then((data) => res.json({data}))
        .catch(error => res.status(400).json({error}))
      }
    }
  },

  controllers: {
    get_resources(domain_id) {
      return this.db
        ?.collection("resources")
        .find({ domain_id: new ObjectId(domain_id) })
        .toArray();
    },

    async get_resources_by_domain_name(domain_name){
      const domain = await this.db?.collection("domains").aggregate([
        {
          '$match': {
            'name': domain_name
          }
        }, {
          '$lookup': {
            'from': 'resources', 
            'localField': '_id', 
            'foreignField': 'domain_id', 
            'as': 'resources'
          }
        }
      ]).toArray();


      if(!domain?.length)return Promise.reject("Failed to fetch resources, no such domain.");

      return domain[0].resources;
    },

    //>>>Start of Subdomain Management API
    get_subdomains(domain_id) {
      return this.db
        ?.collection("resources")
        .find({ domain_id: new ObjectId(domain_id), type: "subdomain" })
        .toArray();
    },

    async create_subdomain(domain_id, subdomain) {
      let temp = await this.db
        ?.collection("resources")
        .find({
          domain_id: new ObjectId(domain_id),
          type: "subdomain",
          name: subdomain.name,
        })
        .toArray();
      if (temp?.length)
        return Promise.reject(
          "Failed to create subdomain, subdomain already exists."
        );

      return this.db
        ?.collection("resources")
        .insertOne({
          domain_id: new ObjectId(domain_id),
          type: "subdomain",
          ...subdomain,
        });
    },

    async delete_subdomain(subdomain_id) {
      let temp = await this.db
        ?.collection("resources")
        .deleteOne({ _id: new ObjectId(subdomain_id) });

      if (!temp?.deletedCount)
        return Promise.reject(
          "Failed to delete subdomain, subdomain not found."
        );
      return Promise.resolve(true);
    },
    //>>>End of Subdomain Management API

    //>>Start domain policy management
    async remove_domain_access_policy(domain_id: string, policy_id: string){
      const result = await this.db?.collection('domains').updateOne({ _id: new ObjectId(domain_id)}, { $pull: { access_policies: {$eq: new ObjectId(policy_id)}}})
      if(result?.modifiedCount) return Promise.resolve("Successfully removed access policy from domain")
      return Promise.reject("Failed to remove access policy from domain")
    },
    async add_domain_access_policy(domain_id: string, policy_id: string){
      const result = await this.db?.collection('domains').updateOne({_id: new ObjectId(domain_id)}, { $push: { access_policies: new ObjectId(policy_id)}})
      if(result?.modifiedCount) return Promise.resolve("Successfully added access policy to domain")
      return Promise.reject("Failed to add access policy to domain")
    },
    //>>End domain policy management

    //>>Start domain security policy management
    async add_domain_security_policy(domain_id: string, security_id: string){
      const result = await this.db?.collection('domains').updateOne({_id: new ObjectId(domain_id)}, { $push: { security_policies: new ObjectId(security_id)}})
      if(result?.modifiedCount) return Promise.resolve("Successfully added security policy to domain")
      return Promise.reject("Failed to add security policy to domain")
    },
    async remove_domain_security_policy(domain_id: string, security_id: string){
      const result = await this.db?.collection('domains').updateOne({ _id: new ObjectId(domain_id)}, { $pull: { security_policies: {$eq: new ObjectId(security_id)}}})
      if(result?.modifiedCount) return Promise.resolve("Successfully removed security policy from domain")
      return Promise.reject("Failed to remove security policy from domain")
    }
    //>>End domain security policy management
  }
});