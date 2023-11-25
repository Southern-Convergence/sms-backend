import { Link } from '../../../../frontend/.nuxt/components';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-qualification-standards"

export default REST({
    cfg: {
        service: "MAIN"
    },

    validators: {
        "create-position": {
            title: Joi.string(),
            education: Joi.array(),
            education_level: Joi.string(),
            experience: Joi.array(),
            training_hours: Joi.number(),
            rating: Joi.array(),
            sg: Joi.string(),
        },
        "get-position": {}
    },

    handlers: {
        "POST": {
            "create-position"(req, res) {
                this.create_position(req.body)
                    .then((data) => res.json({ data }))
                    .catch((error) => res.status(400).json({ error }));
            },
        },
        "GET": {
            "get-position"(req, res) {
                this.get_position().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            }
        }
    },
    controllers: {
        async create_position(data) {

            data.education = data.education.map((v: string) => new ObjectId(v));
            data.experience = data.experience.map((v: string) => new ObjectId(v));
            data.rating = data.rating.map((v: string) => new ObjectId(v));
            data.sg = new ObjectId(data.sg);

            const result = await this.db?.collection(collection).insertOne(data);

            if (!result.insertedId) return Promise.reject("Failed to insert position");
            return Promise.resolve("Successfully inserted new position");
        },

        async get_position() {

            return this.db?.collection(collection).find({}).toArray()
        }

    }
})