import { Link } from '../../../../frontend/.nuxt/components';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-performance-rating"

export default REST({
    cfg: {
        service: "MAIN"
    },

    validators: {
        "create-rating": {
            title: Joi.string(),
        },
        "get-rating": {}
    },

    handlers: {
        "POST": {
            "create-rating"(req, res) {
                this.create_rating(req.body)
                    .then(() => res.json({ data: "Successfully added Rating Performance!" }))
                    .catch((error) => res.status(500).json({ error }));
            },
        },
        "GET": {
            "get-rating"(req, res) {
                this.get_rating().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            }
        }
    },
    controllers: {
        async create_rating(data) {
            return this.db?.collection(collection).insertOne(data)
        },

        async get_rating() {
            return this.db?.collection(collection).find({}).toArray()
        }

    }
})