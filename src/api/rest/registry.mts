import { object_id, handle_res } from "@lib/api-utils.mjs";
import Grant from "@lib/grant.mjs";
import Joi from "joi";
import { ObjectId } from "mongodb";
import { REST } from "sfr";

export default REST({
  cfg : {

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

    "register-service" : {
      openapi : Joi.string().required(),
      info : {
        title : Joi.string().required(),
        description : Joi.string().allow(""),
        version : Joi.string()
      },

      schemes : Joi.array().required(),

      paths : Joi.array()
    },

    "get-services" : {

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
        res.json({data : Grant.get_services()});
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

      "register-service"(req, res){
        try{
          Grant.register_service(req.body.info.title, req.body);
          res.json({data : "Successfully registered service."});
        }catch(error){
          res.json({error : "Failed to register service."});
        }
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
  },
});
