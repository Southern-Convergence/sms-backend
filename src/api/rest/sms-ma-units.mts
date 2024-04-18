import { Link } from '../../../../frontend/.nuxt/components';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-ma-units"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {

    "create-ma-units": {
      type: Joi.string(),
      number_of_years: Joi.number(),
      years_equivalent: Joi.number(),
    },
    "get-ma-units": {},

    "update-ma-units": {
      _id: object_id,
      type: Joi.string(),
      number_of_years: Joi.number(),
      years_equivalent: Joi.number(),
    },

  },

  handlers: {
    "POST": {
      "create-ma-units"(req, res) {
        this.create_ma_units(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

    },
    "GET": {
      "get-ma-units"(req, res) {
        this.get_ma_units().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },


    },
    "PUT": {
      "update-ma-units"(req, res) {
        const { _id, type, number_of_years, years_equivalent } = req.body
        this.update_ma_units(_id, type, number_of_years, years_equivalent).then(() => res.json({ data: "Successfully Updated M.A Unit!" }))
          .catch((error) => res.status(400).json({ error }))
      },

    }
  },
  controllers: {
    async create_ma_units(data) {
      const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Failed to create Masteral Art units!");
      return Promise.resolve("Successfully inserted new Masteral Art units");
    },

    async get_ma_units() {
      return this.db?.collection(collection).find({}).toArray()

    },

    async update_ma_units(_id, type, number_of_years, years_equivalent) {
      const result = await this.db?.collection(collection).updateOne(
        { _id: new ObjectId(_id) },
        {
          $set: {
            type: type,
            number_of_years: number_of_years,
            years_equivalent: years_equivalent
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