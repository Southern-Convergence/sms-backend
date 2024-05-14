import { Link } from '../../../../frontend/.nuxt/components';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-sdo"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-sdo-user": {
      date: Joi.date(),
      username: Joi.string().allow(""),
      password: Joi.string().allow(""),
      admin: Joi.boolean(),
      email: Joi.string(),
      last_name: Joi.string(),
      middle_name: Joi.string(),
      first_name: Joi.string(),
      contact_number: Joi.string(),
      side: Joi.string(),
      role: Joi.string(),
      status: Joi.string(),
      designation_information: Joi.object({
        division: Joi.string().allow(""),
        school: Joi.string().allow("")
      })

    },

    "create-sdo": {
      title: Joi.string(),
      address: Joi.string(),
      email: Joi.string(),
      telephone: Joi.string(),
      code: Joi.string(),
    },
    "get-sdo": {},
    "update-sdo": {
      _id: object_id,
      title: Joi.string()
    },
    "get-sdo-users": {
      id: object_id
    }
  },

  handlers: {
    "POST": {
      "create-sdo"(req, res) {
        this.create_sdo(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
      "create-sdo-user"(req, res) {
        this.create_sdo_user(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }))
      },

    },
    "GET": {
      "get-sdo"(req, res) {
        this.get_sdo().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-sdo-users"(req, res) {
        this.get_sdo_users(new ObjectId(req.query.id?.toString()))
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }))
      }
    },
    "PUT": {
      "update-sdo"(req, res) {
        const { _id, title } = req.body
        this.update_sdo(_id, title).then(() => res.json({ data: "Successfully Update sdo" }))
          .catch((error) => res.status(400).json({ error }))
      }
    }
  },
  controllers: {
    async create_sdo_user(data) {

      const { division, school } = data.designation_information;

      data.role = new ObjectId(data.role);

      if (division) data.designation_information.division = new ObjectId(division);
      if (school) data.designation_information.school = new ObjectId(school);

      // logic send mai

      const result = await this.db.collection("users").insertOne(data);
      if (!result.insertedId) return Promise.reject("Failed to insert user");
      return Promise.resolve("Succesfully invited users");
    },
    async get_sdo_users(sdo: ObjectId) {
      return await this.db.collection('users').aggregate([
        {
          $match: {
            "designation_information.division": sdo
          },
        },
        {
          $lookup: {
            from: "ap-templates",
            localField: "role",
            foreignField: "_id",
            as: "role",
          },

        },
        {
          $lookup: {
            from: 'sms-school',
            localField: "designation_information.school",
            foreignField: "_id",
            as: "school"
          }
        },
        {
          $lookup: {
            from: 'sms-sdo',
            localField: "designation_information.division",
            foreignField: "_id",
            as: "division"
          }
        },
        {
          $unwind: {
            path: "$role",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$school",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$division",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            role: "$role.name",
            school: "$school.title",
            school_id: "$school._id",
            division: "$division.title"
          }
        },
        {
          $unset: ['designation_information', 'password']
        }
      ]).toArray();

    },
    async create_sdo(data) {
      const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Could not create SDO");
      return Promise.resolve("Successfully created SDO")

    },

    async get_sdo() {
      return this.db?.collection(collection).find({}).toArray()
    },

    async update_sdo(id, title) {
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