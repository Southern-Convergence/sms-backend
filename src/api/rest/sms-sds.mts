import { ObjectId } from 'mongodb';
import Joi from 'joi';
import { REST } from 'sfr';
import { object_id } from '@lib/api-utils.mjs';
import { log } from 'winston';

const collection = "sms-sds";

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-sds": {
      first_name: Joi.string(),
      middle_name: Joi.string(),
      last_name: Joi.string(),
      suffix: Joi.string(),
      position: Joi.string(),
      ces_rank: Joi.string(),
      address: Joi.string(),
    },
    "get-sds": {},

    "update-sds": {
      sds: Joi.object(),

    },


  },

  handlers: {
    "POST": {
      "create-sds"(req, res) {
        this.create_sds(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => {
            res.status(400).json({ error });
          });
      }


    },
    "GET": {
      "get-sds"(req, res) {
        this.get_sds().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "update-sds"(req, res) {
        const { _id, ...updateData } = req.body.sds;

        console.log("Received update data:", updateData);

        this.update_sds(_id, updateData)
          .then(() => res.json({ data: "Successfully Updated SDS Info!" }))
          .catch((error) => {
            console.error("Error updating SDS info:", error);
            res.status(400).json({ error });
          });
      },
    }


  },

  controllers: {
    async create_sds(data) {
      const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) {
        return Promise.reject("Failed to create sds info!");
      }
      return Promise.resolve("Successfully inserted sds info");
    },

    async get_sds() {
      return this.db?.collection(collection).find({}).next()
    },

    async update_sds(_id, updateData) {

      const updateFields = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      console.log("Updating fields:", updateFields);

      const result = await this.db?.collection(collection).updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateFields }
      );
      if (result.matchedCount === 0) {
        return Promise.reject("Item not Found, Failed to Update!");
      }
      return result;
    }
  }
});
