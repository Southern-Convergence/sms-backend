import { Link } from '../../../../frontend/.nuxt/components';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-experience"

export default REST({
    cfg: {
        service: "MAIN"
    },

    validators: {

        "create-experience": {
            number_of_years: Joi.number(),
            position: Joi.string(),
            is_ma_equivalent: Joi.boolean(),
            master_arts: Joi.string(),
        },
        "get-experience": {}
    },

    handlers: {
        "POST": {
            "create-experience"(req, res) {
                this.create_experience(req.body)
                    .then(() => res.json({ data: "Successfully added education!" }))
                    .catch((error) => res.status(500).json({ error }));
            },
        },
        "GET": {
            "get-experience"(req, res) {
                this.get_experience().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            }
        }
    },
    controllers: {
        async create_experience(data) {
            return this.db?.collection(collection).insertOne(data)
        },

        async get_experience() {
            return this.db?.collection(collection).find({}).toArray()
        }

    }
})