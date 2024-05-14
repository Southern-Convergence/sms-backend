import { Link } from './../../../../frontend/.nuxt/components.d';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "users"

export default REST({
    cfg: {
        service: "USERS",
        public: true
    },

    validators: {
        "create-user": {
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

        "get-users": {},
    },

    handlers: {
        "POST": {
            "create-user"(req, res) {
                this.create_user(req.body)
                    .then((data) => res.json({ data }))
                    .catch((error) => res.status(400).json({ error }))
            },

        },
        "GET": {
            "get-users"(req, res) {
                this.get_users(req.session).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            },

        }
    },
    controllers: {
        async create_user(data) {

            const { division, school } = data.designation_information;

            data.role = new ObjectId(data.role);

            if (division) data.designation_information.division = new ObjectId(division);
            if (school) data.designation_information.school = new ObjectId(school);

            // logic send mai

            const result = await this.db.collection(collection).insertOne(data);
            if (!result.insertedId) return Promise.reject("Failed to insert user");
            return Promise.resolve("Succesfully invited users");
        },

        async get_users(user: any) {
            return this.db.collection(collection).aggregate([
                {
                    $match: {}
                },
                {
                    $lookup: {
                        from: "ap-templates",
                        localField: "role",
                        foreignField: "_id",
                        as: "role"
                    }
                },
                {
                    $lookup: {
                        from: 'sms-sdo',
                        localField: "designation_information.division",
                        foreignField: "_id",
                        as: "designation"
                    }
                },
                {
                    $unwind: {
                        path: "$role",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: "$designation",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $set: {
                        division: "$designation"
                    }
                },
                {
                    $set: {
                        role: "$role.name"
                    }
                },
                {
                    $unset: ['designation', 'designation_information']
                }
            ]
            ).toArray()
        },
    }
})