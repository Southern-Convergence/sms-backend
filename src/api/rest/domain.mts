import { handle_res, object_id } from "@lib/api-utils.mjs";
import Joi from "joi";
import { ObjectId } from "mongodb";
import { REST } from "sfr";

export default REST({
  cfg: {
    base_dir: "admin",
    
  },

  validators: {
    "get-domain": {},
    "get-resources": {
      domain_id: object_id,
    },

    //>>>Start of Subdomain Management API
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
    //>>>End of Subdomain Management API

    //>>Start of domain policy management
    "remove-access-policy": {
      domain_id: object_id,
      policy_id: object_id,
    },

    "add-access-policy": {
      domain_id: object_id,
      policy_id: object_id,
    },
    //>>End of domain policy management

    //>>Start domain security policy
    "add-security-policy": {
      domain_id: object_id,
      security_id: object_id,
    },
    "remove-security-policy": {
      domain_id: object_id,
      security_id: object_id,
    },
    //>>End domain security policy

    //Object Attribute Management
    "create-page" : {
      domain_id : object_id,
      page : {
        name : Joi.string().required(),
        path : Joi.string()
      }
    },

    //APT Management
    "get-apts": {
      domain_id: object_id,
    },
    "get-apt" : {
      apt_id : object_id
    },
    "create-apt": {
      domain_id: object_id,
      basis: object_id,

      name: Joi.string().required(),
      resources: Joi.array(),
    },

    "update-apt": {
      name: Joi.string(),
      resources: Joi.array(),
    },
    "remove-apt": {
      id: object_id,
    },
    "grant-resource": {
      apt_id: object_id,
      resource_id: object_id,
    },
  },

  handlers: {
    GET: {
      "get-resources"(req, res) {
        handle_res(this.get_resources(req.query.domain_id), res);
      },
      "get-subdomains"(req, res) {
        handle_res(this.get_subdomains(req.query.domain_id), res);
      },
      "get-apts"(req, res) {
        handle_res(this.get_apts(req.query.domain_id), res);
      },
      "get-apt"(req, res) {
        handle_res(this.get_apt_details(req.query.apt_id), res);
      },
    },

    POST: {
      "create-subdomain"(req, res) {
        const { domain_id, subdomain } = req.body;
        this.create_subdomain(domain_id, subdomain)
          .then(() => res.json({ data: "Successfully created subdomain." }))
          .catch((error) => res.status(400).json({ error }));
      },

      //>> Domain policy management
      "remove-access-policy"(req, res) {
        const { domain_id, policy_id } = req.body;
        this.remove_domain_access_policy(domain_id, policy_id)
          .then((result) => res.json({ data: result }))
          .catch((error) => res.status(400).json({ error }));
      },
      "add-access-policy"(req, res) {
        const { domain_id, policy_id } = req.body;
        this.add_domain_access_policy(domain_id, policy_id)
          .then((result) => res.json({ data: result }))
          .catch((error) => res.status(400).json({ error }));
      },
      "remove-security-policy"(req, res) {
        const { domain_id, security_id } = req.body;
        this.remove_domain_security_policy(domain_id, security_id)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "add-security-policy"(req, res) {
        const { domain_id, security_id } = req.body;
        this.add_domain_security_policy(domain_id, security_id)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

      "create-page"(req, res){
        const { domain_id, page } = req.body;
        this.create_page(domain_id, page)
        .then(()=> res.json({data : "Successfully created page."}))
        .catch((error)=> res.status(400).json({error}));
      },

      //>> APT Resource Management
      "grant-resource"(req, res) {
        const { apt_id, resource_id } = req.body;

        this.grant_resource(apt_id, resource_id)
          .then(() =>
            res.json({ data: "Successfully granted resource to APT." })
          )
          .catch((error) => res.json({ error }));
      },
    },

    DELETE: {
      "delete-subdomain"(req, res) {
        const { subdomain_id } = req.body;
        handle_res(this.delete_subdomain(subdomain_id), res);
      },
      "delete-resource"(req, res){
        this.delete_resource(req.body.resource_id)
        .then(()=> res.json({data : "Successfully deleted resource" }))
        .catch((error)=> res.json({error}));
      } 
    },
  },

  controllers: {
    get_resources(domain_id) {
      return this.db
        .collection("resources")
        .find({ domain_id: new ObjectId(domain_id) })
        .toArray();
    },

    //>>>Start of Subdomain Management API
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
    //>>>End of Subdomain Management API

    //>>Start domain policy management
    async remove_domain_access_policy(domain_id: string, policy_id: string) {
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
      return Promise.reject("Failed to remove access policy from domain");
    },
    async add_domain_access_policy(domain_id: string, policy_id: string) {
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
    //>>End domain policy management

    //>>Start domain security policy management
    async add_domain_security_policy(domain_id: string, security_id: string) {
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
    async remove_domain_security_policy(
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
      return Promise.reject("Failed to remove security policy from domain");
    },
    //>>End domain security policy management

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

    /* AP Management */
    get_apts(domain_id) {
      return this.db
        .collection("ap-templates")
        .find({ domain_id: new ObjectId(domain_id) })
        .toArray();
    },
    async create_apt(domain_id, ap) {},
    async get_apt_details(apt_id) {
      const result = await this.db
        .collection("ap-templates")
        .aggregate([
          {
            $match: {
              _id: new ObjectId(apt_id),
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

    async grant_resource(apt_id, resource_id) {
      const resource = await this.db
        .collection("resources")
        .findOne({ _id: new ObjectId(resource_id) });
      if (!resource)
        return Promise.reject("Failed to grant resource, no such resource.");

      return this.db
        .collection("ap-templates")
        .updateOne(
          { _id: new ObjectId(apt_id) },
          {
            $push: { resources: new ObjectId(resource_id) },
          }
        )
        .then((v) => {
          if (!v.modifiedCount)
            return Promise.reject("Failed to grant resource, no such APT.");
        });
    },
  },
});