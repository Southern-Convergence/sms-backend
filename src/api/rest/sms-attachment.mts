import { Link } from '../../../../frontend/.nuxt/components';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-attachment"

export default REST({
  cfg: {
    service: "MAIN"
  },

  validators: {
    "create-attachment": {
      title: Joi.string(),

    },
    "get-attachment": {},
    "update-attachment": {
      _id: object_id,
      title: Joi.string()
    }
  },

  handlers: {
    "POST": {
      "create-attachment"(req, res) {
        this.create_attachment(req.body)
          .then(() => res.json({ data: "Successfully added attachment!" }))
          .catch((error) => res.status(500).json({ error }));
      },
    },
    "GET": {
      "get-attachment"(req, res) {
        this.get_attachment().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      }
    },
    "PUT": {
      "update-attachment"(req, res) {
        const { _id, title } = req.body
        this.update_attachment(_id, title).then(() => res.json({ data: "Successfully Update attachment!" }))
          .catch((error) => res.status(400).json({ error }))

      }
    }
  },
  controllers: {
    async create_attachment(data) {
      return this.db?.collection(collection).insertOne(data)
    },

    async get_attachment() {
      return this.db?.collection(collection).find({}).toArray()
    },
    async update_attachment(id, title) {
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