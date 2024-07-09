
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'


const collection = "sms-leadership-and-potential"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {

    "create-leadership-and-potential": {
      title: Joi.string(),

    },
    "get-leadership-and-potential": {},

    "update-leadership-and-potential": {
      _id: object_id,
      title: Joi.string(),

    },

  },

  handlers: {
    "POST": {
      "create-leadership-and-potential"(req, res) {
        this.create_leadership_and_potential(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

    },
    "GET": {
      "get-leadership-and-potential"(req, res) {
        this.get_leadership_and_potential().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },


    },
    "PUT": {
      "update-leadership-and-potential"(req, res) {
        const { _id, title } = req.body
        this.update_leadership_and_potential(_id, title).then(() => res.json({ data: "Successfully Updated Leadership and Potential!" }))
          .catch((error) => res.status(400).json({ error }))
      },

    }
  },
  controllers: {
    async create_leadership_and_potential(data) {
      const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Failed to create Leadership and Potential!");
      return Promise.resolve("Successfully inserted new Leadership and Potential");
    },

    async get_leadership_and_potential() {
      return this.db?.collection(collection).find({}).toArray()

    },

    async update_leadership_and_potential(_id, title) {
      const result = await this.db?.collection(collection).updateOne(
        { _id: new ObjectId(_id) },
        {
          $set: {
            title
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