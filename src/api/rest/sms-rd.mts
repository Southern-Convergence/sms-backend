import { Link } from '../../../../frontend/.nuxt/components';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-rd"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {

    "create-rd": {
      first_name: Joi.string(),
      middle_name: Joi.string(),
      last_name: Joi.string(),
      ro_address: Joi.string(),
      position: Joi.string(),


    },
    "get-rd": {},

    "update-rd": {
      _id: object_id,
      first_name: Joi.string(),
      middle_name: Joi.string(),
      last_name: Joi.string(),
      ro_address: Joi.string(),
      position: Joi.string(),
    },

  },

  handlers: {
    "POST": {
      "create-rd"(req, res) {
        this.create_rd(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

    },
    "GET": {
      "get-rd"(req, res) {
        this.get_rd().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },


    },
    "PUT": {
      "update-rd"(req, res) {
        const { _id, first_name, middle_name, last_name, ro_address, position } = req.body
        this.update_rd(_id, first_name, middle_name, last_name, ro_address, position).then(() => res.json({ data: "Successfully Updated Regional Director Information!" }))
          .catch((error) => res.status(400).json({ error }))
      },

    }
  },
  controllers: {
    async create_rd(data) {
      const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Failed to create RD info!");
      return Promise.resolve("Successfully inserted new position");
    },

    async get_rd() {
      return this.db?.collection(collection).find({}).next()

    },

    async update_rd(_id, first_name, middle_name, last_name, ro_address, position) {
      const result = await this.db?.collection(collection).updateOne(
        { _id: new ObjectId(_id) },
        {
          $set: {
            first_name: first_name,
            middle_name: middle_name,
            last_name: last_name,
            ro_address: ro_address,
            position: position

          }
        }
      );
      if (result.matchedCount === 0) {
        return Promise.reject("Item not Found, Failed to Update!");
      }
      return result;
    },


  }
})