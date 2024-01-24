import { Link } from '../../../../frontend/.nuxt/components';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-school"

export default REST({
  cfg: {
    service: "MAIN"
  },

  validators: {
    "create-school": {
      title: Joi.string(),
      address: Joi.string(),
      email: Joi.string(),
      telephone: Joi.string(),
      division: Joi.string().allow(""),

    },
    "create-school-user": {
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
    "get-school": {},
    "get-school-users": {
      id: object_id
    },
    "update-school": {
      _id: object_id,
      title: Joi.string(),
      address: Joi.string(),
      email: Joi.string(),
      telephone: Joi.string(),
      division: Joi.string().allow(""),
    }
  },

  handlers: {
    "POST": {

      "create-school"(req, res) {
        this.create_school(req.body)
          .then(() => res.json({ data: "Successfully added school!" }))
          .catch((error) => res.status(500).json({ error }));
      },
      "create-school-user"(req, res) {
        this.create_school_user(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }))
      },
    },
    "GET": {
      "get-school"(req, res) {
        this.get_school().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-school-users"(req, res) {
        this.get_school_users(new ObjectId(req.query.id?.toString()))
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }))
      }
    },
    "PUT": {
      "update-school"(req, res) {
        const { _id, title, address } = req.body
        this.update_school(_id, title, address).then(() => res.json({ data: "Successfully Update school" }))
          .catch((error) => res.status(400).json({ error }))
      }
    }
  },
  controllers: {
    async get_school_users(school: ObjectId) {
      return await this.db.collection('users').aggregate([
        {
          $match: {
            "designation_information.school": school
          },

        },
        {
          $lookup: {
            from: "sms-school",
            localField: "designation_information.school",
            foreignField: "_id",
            as: "school"
          }
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
          $unwind: {
            path: "$school",
            preserveNullAndEmptyArrays: false

          }
        },
        {
          $unwind: {
            path: "$role",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            school: "$school._id",
            role: "$role.name",

          }
        }

      ]).toArray();

    },
    async create_school_user(data) {
      const { school } = data.designation_information;
      data.role = new ObjectId(data.role);
      if (!school) return Promise.reject("Could not find division");

      const division_id = await this.db.collection('sms-school').findOne({ _id: new ObjectId(school) }, { projection: { division: 1 } });

      if (!division_id) return Promise.reject("Failed to find division id");

      data.designation_information.division = division_id.division;
      data.designation_information.school = new ObjectId(school);



      const result = await this.db.collection('users').insertOne(data);
      if (!result.insertedId) return Promise.reject("Failed to insert user");
      return Promise.resolve("Successfully inserted user.");
    },
    async create_school(data) {
      data.division = new ObjectId(data.division);
      // logic send mai
      const result = await this.db.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Failed to insert school");
      return Promise.resolve("Succesfully created school");

    },

    async get_school() {
      return this.db?.collection(collection).find({}).toArray()
    },

    async update_school(id, title, address) {
      const result = await this.db?.collection(collection).updateOne(
        { _id: new ObjectId(id) },
        { $set: { title: title, address: address } }
      );
      if (result.matchedCount === 0) {
        return Promise.reject("Item not Found, Failed to Update!");
      }
      return result;
    }

  }
})