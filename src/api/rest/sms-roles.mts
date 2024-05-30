
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'


const collection = "sms-roles"

export default REST({
  cfg: {
    service: "MAIN"
  },

  validators: {

    "create-roles": {
      title: Joi.string(),
    },
    "get-roles": {},
    "update-roles": {
      _id: object_id,
      title: Joi.string()
    }
  },

  handlers: {
    "POST": {
      "create-roles"(req, res) {
        this.create_roles(req.body)
          .then(() => res.json({ data: "Successfully added roles!" }))
          .catch((error) => res.status(500).json({ error }));
      },
    },
    "GET": {
      "get-roles"(req, res) {
        this.get_roles().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "update-roles"(req, res) {
        const { _id, title } = req.body
        this.update_roles(_id, title).then(() => res.json({ data: "Successfully Update roles" }))
          .catch((error) => res.status(400).json({ error }))
      }
    }
  },
  controllers: {

    async create_roles(data) {
      return this.db?.collection(collection).insertOne(data)
    },

    async get_roles() {
      return this.db?.collection(collection).find({}).toArray()
    },

    async update_roles(id, title) {
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