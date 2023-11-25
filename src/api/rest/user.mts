import { Link } from './../../../../frontend/.nuxt/components.d';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "users"

export default REST({
    cfg: {
        service: "USERS"
    },

    validators: {
        "create-user": {
            date: Joi.date(),
            username: Joi.string(),
            password: Joi.string(),
            lastname: Joi.string(),
            firstname: Joi.string(),
            middlename: Joi.string(),
            email: Joi.string(),
            contact_number: Joi.string(),
            type: Joi.string(),
            role: Joi.string(),
            school: {
                division: Joi.string(),
                school_name: Joi.string(),
                principal: Joi.string(),
                address: Joi.string(),
                school_address: Joi.string(),
                school_email: Joi.string(),
            },
            status: Joi.string(),

        },




        "get-users": {},


    },

    handlers: {
        "POST": {
            "create-user"(req, res) {
                this.create_user(req.body)
                    .then(() => res.json({ data: "Successfully invited user!" }))
                    .catch((error) => res.status(400).json({ error }))
            },


        },
        "GET": {
            "get-users"(req, res) {
                this.get_users().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            },

        }


    },
    controllers: {
        async create_user(data) {
            return this.db?.collection(collection).insertOne(data)
        },

        async get_users() {
            return this.db?.collection(collection).find({}).toArray()
        },


    }
})