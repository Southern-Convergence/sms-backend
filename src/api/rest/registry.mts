import { object_id, handle_res } from "@lib/api-utils.mjs";
import Grant from "@lib/grant.mjs";
import Joi from "joi";
import { ObjectId } from "mongodb";
import { REST } from "sfr";

import grant_def from "@setup/grant-def.mjs";

export default REST({
  cfg : {
    public : true
  },

  validators: {
    "get-registry-classifications": {},
    "create-registry-classification": {
      name: Joi.string().required(),
      description: Joi.string(),
    },
    "update-registry-classification": {
      classification_id: object_id,
      classification: {
        name: Joi.string(),
        description: Joi.string(),
      },
    },
    "delete-registry-classification": {
      classification_id: object_id,
    },
    "get-registry-values": {
      classification_id: object_id,
    },
    "create-registry-value": {
      classification_id: object_id,
      key: Joi.string().required(),
      value: Joi.any(),
    },
    "update-registry-value": {
      registry_id: object_id,
      registry_value: {
        key: Joi.string(),
        value: Joi.any(),
      },
    },
    "delete-registry-value": {
      registry_id: object_id,
    },

    "register-backend" : {
      domain    : Joi.string().required(),
      openapi   : Joi.string().required(),
      info : {
        title       : Joi.string().required(),
        description : Joi.string().allow(""),
        version     : Joi.string()
      },

      schemes : Joi.array().required(),
      paths   : Joi.object(),
      port    : Joi.number().required()
    },

    "register-frontend" : {
      domain    : Joi.string().required(),
      framework : Joi.string().required(),
      version   : Joi.string().required(),
      info      : {
        title       : Joi.string().required(),
        description : Joi.string().allow(""),
        version     : Joi.string()
      },

      pages : Joi.array().required()
    },

    "get-services" : {
      domain : Joi.string().required()
    }
  },

  handlers: {
    GET: {
      "get-registry-values"(req, res) {
        this.get_registry_values(req.query)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

      "get-services"(req, res){
        const { domain } = req.query;
        res.json({data : Grant.get_services(String(domain))});
      }
    },
    POST: {
      "create-registry-classification"(req, res) {
        this.create_registry_value(req.body)
          .then(() =>
            res.json({ data: "Successfully created Registry Classification." })
          )
          .catch((error) => res.status(400).json({ error }));
      },
      "update-registry-classification"(req, res) {
        this.update_registry_classification(req.body)
          .then(() =>
            res.json({ data: "Successfully updated Registry Classification" })
          )
          .catch((error) => res.status(400).json({ error }));
      },
      "delete-registry-classification"(req, res) {
        this.delete_registry_classification(req.body)
          .then(() =>
            res.json({ data: "Successfully deleted Registry Classification" })
          )
          .catch((error) => res.status(400).json({ error }));
      },
      "create-registry-value"(req, res) {
        this.create_registry_value(req.body)
          .then(() =>
            res.json({ data: "Successfully created Registry Value." })
          )
          .catch((error) => res.status(400).json({ error }));
      },
      "update-registry-value"(req, res) {
        this.update_registry_value(
          req.body.registry_id,
          req.body.registry_value
        )
          .then(() =>
            res.json({ data: "Successfully updated Registry Value." })
          )
          .catch((error) => res.status(400).json({ error }));
      },
      "delete-registry-value"(req, res) {
        this.delete_registry_value(req.body.registry_id)
          .then(() =>
            res.json({ data: "Successfully deleted Registry Value." })
          )
          .catch((error) => res.status(400).json({ error }));
      },

      async "register-backend"(req, res){
        const body = Object.assign({}, req.body);
        const domain = body.domain;
        console.log(body.paths)

        this.register_backend_service(body)
        .then((_id) => {
          const domain_id = Grant.get_domain_by_name(domain);
          delete body.paths;
          delete body.domain;
          grant_def();
          res.json({ data: "Successfully registered service." });
        })
        .catch((error) => res.status(400).json({ error }));
      },

      "register-frontend"(req, res){
        this.register_frontend_service(req.body)
        .then((_id)=> {
          const domain_id = Grant.get_domain_by_name(req.body.domain);
          const temp = req.body;
          delete temp.pages;
          delete temp.domain;
          Grant.register_service(domain_id, req.body.info.title, {...temp, type : "frontend", _id});
          res.json({data : "Successfully registered frontend service."})
        })
        .catch((error)=> res.status(400).json({error}))
      }
    },
  },

  controllers: {
    get_registry_classifications() {
      return this.db.collection("registry").find({}).toArray();
    },
    async create_registry_classification(classification) {
      let temp = await this.db
        .collection("registry")
        .findOne({ name: classification.name });
      if (temp)
        return Promise.reject(
          "Failed to create Registry Classification, Classification already exists."
        );

      return this.db.collection("registry").insertOne(classification);
    },
    async update_registry_classification(data) {
      let temp = await this.db
        .collection("registry")
        .updateOne(
          { _id: new ObjectId(data.classification_id) },
          { $set: { ...data.classification } }
        );
      if (!temp.matchedCount)
        return Promise.reject(
          "Failed to update Registry Classification, Registry Classification does not exist."
        );
    },
    async delete_registry_classification(data) {
      let temp = await this.db
        .collection("registry")
        .deleteOne({ _id: new ObjectId(data.classification_id) });
      if (!temp.deletedCount)
        return Promise.reject(
          "Failed to delete Registry Classification, Registry Classification does not exist."
        );
    },
    get_registry_values(classification_id) {
      return this.db
        .collection("registry")
        .findOne({ _id: new ObjectId(classification_id) });
    },
    async create_registry_value(registry_value) {
      let temp = await this.db
        .collection("registry")
        .findOne({ key: registry_value.key });
      if (temp)
        return Promise.reject(
          "Failed to create Registry Value, Registry Value already exists."
        );

      return this.db.collection("registry").insertOne(registry_value);
    },
    async update_registry_value(registry_id, registry_value) {
      let temp = await this.db
        .collection("registry")
        .updateOne(
          { _id: new ObjectId(registry_id) },
          { $set: registry_value }
        );
      if (!temp.matchedCount)
        return Promise.reject(
          "Failed to update Registry Value, Registry Value does not exist."
        );
    },
    async delete_registry_value(registry_id) {
      let temp = await this.db
        .collection("registry")
        .deleteOne({ _id: new ObjectId(registry_id) });
      if (!temp.deletedCount)
        return Promise.reject(
          "Failed to delete Registry Value, Registry Value does not exist."
        );
    },

    async register_frontend_service(service){
      const { domain, framework, version, info, pages } = service;

      const session = this.instance.startSession();

      return session.withTransaction(async()=>{
        let domain_result = await this.db.collection("domains").findOne({name : domain});
        if(!domain_result)return Promise.reject("Failed to register service, no such domain.");

        let service = await this.db.collection("services").findOne({name : info.title});
        let upsert_op = await this.db.collection("services").updateOne(
          { name : info.title },
          { $set : {name : info.title, domain_id : domain_result._id, framework, version, info, type : "frontend"} },
          { upsert : true }
        );

        if(upsert_op.upsertedId)service = {_id : upsert_op.upsertedId};

        pages.forEach((page : any)=>{
          this.db.collection("resources").updateOne(
            {name : page.name},
            {
              $set : {
                ...page,
                type       : "page",
                resources  : [],
                service_id : service?._id,
                domain_id  : domain_result?._id
              }
            },
            {upsert : true}
          );
        });

        return service?._id;
      }).finally(()=> session.endSession());
    },
    async register_backend_service(service){
      const { domain, openapi, info, schemes, paths, port } = service;
      
      const session = this.instance.startSession();

      return session.withTransaction(async()=> {
        let domain_result = await this.db.collection("domains").findOne({name : domain})
        if(!domain_result)return Promise.reject("Failed to register service, no such domain.");

        let service = await this.db.collection("services").findOne({name : info.title});
        let upsert_op = await this.db.collection("services").updateOne(
          { name : info.title },
          { $set : {name : info.title, domain_id : domain_result?._id, openapi, schemes, info, port, type : "backend"} },
          { upsert : true }
        );

        if(upsert_op.upsertedId)service = {_id : upsert_op.upsertedId};
        
        Object.values(paths).forEach((methods : any)=> {
          Object.values(methods).forEach((specs)=> {
            const {oas_spec, sfr_spec} = specs as any;
            this.db.collection("resources")?.updateOne({ ref : sfr_spec.ref }, { $set : {...sfr_spec, domain_id : domain_result?._id, service_id : service?._id, oas_spec} }, { upsert : true});
          });
        });

        return service?._id;
      }).finally(()=> session.endSession());
    }
  },
});
