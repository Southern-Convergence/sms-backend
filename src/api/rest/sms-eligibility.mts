import { Link } from '../../../../frontend/.nuxt/components';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-eligibility"

export default REST({
  cfg: {
    service: "MAIN"
  },

  validators: {
    "create-eligibility": {
      title: Joi.string(),

    },
    "get-eligibility": {},
    "update-eligibility": {
      _id: object_id,
      title: Joi.string()
    }
  },

  handlers: {
    "POST": {
      "create-eligibility"(req, res) {
        this.create_eligibility(req.body)
          .then(() => res.json({ data: "Successfully added eligibility!" }))
          .catch((error) => res.status(500).json({ error }));
      },
    },
    "GET": {
      "get-eligibility"(req, res) {
        this.get_eligibility().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      }
    },
    "PUT": {
      "update-eligibility"(req, res) {
        const { _id, title } = req.body
        this.update_eligibility(_id, title).then(() => res.json({ data: "Successfully Update eligibility!" }))
          .catch((error) => res.status(400).json({ error }))

      }
    }
  },
  controllers: {
    async create_eligibility(data) {
      return this.db?.collection(collection).insertOne(data)
    },

    async get_eligibility() {
      return this.db?.collection(collection).find({}).toArray()
    },
    async update_eligibility(id, title) {
      const result = await this.db?.collection(collection).updateOne(
        { _id: new ObjectId(id) },
        { $set: { title: title } }
      );
      if (result.matchedCount === 0) {
        return Promise.reject("Item not Found, Failed to Update!");
      }
      return result;
    }




  }
})