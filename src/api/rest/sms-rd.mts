import { ObjectId } from 'mongodb';
import Joi from 'joi';
import { REST } from 'sfr';
import { object_id } from '@lib/api-utils.mjs';
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-rd";

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-rd": {
      rd: {
        first_name: Joi.string(),
        middle_name: Joi.string(),
        last_name: Joi.string(),
        ro_address: Joi.string(),
        position: Joi.string()
      },
      dbm: {
        first_name: Joi.string(),
        middle_name: Joi.string(),
        last_name: Joi.string(),
        government_agency: Joi.string(),
        dbm_address: Joi.string(),
        position: Joi.string()
      }
    },


  },

  handlers: {
    "POST": {
      "create-rd"(req, res) {
        const { rd, dbm } = req.body;
        this.create_rd(rd, dbm)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      }
    },

  },

  controllers: {
    async create_rd(rd, dbm) {
      const result = await this.db?.collection(collection).insertOne({ rd, dbm });
      if (!result.insertedId) return Promise.reject("Failed to create RD info!");
      return Promise.resolve("Successfully inserted new position");
    },



  }
});
