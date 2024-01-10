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
            title: Joi.string(),
            // is_ma_equivalent: Joi.boolean(),
            // master_arts: Joi.string(),
        },
        "get-experience": {},
        "update-experience": {
            _id: object_id,
            title: Joi.string()
        }
    },

    handlers: {
        "POST": {
            "create-experience"(req, res) {
                this.create_experience(req.body)
                    .then(() => res.json({ data: "Successfully added Experience!" }))
                    .catch((error) => res.status(500).json({ error }));
            },
        },
        "GET": {
            "get-experience"(req, res) {
                this.get_experience().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            }
        },
        "PUT": {
            "update-experience"(req, res) {
                const { _id, title } = req.body
                this.update_experience(_id, title).then(() => res.json({ data: "Successfully Update Experience!" }))
                    .catch((error) => res.status(400).json({ error }))

            }
        }
    },
    controllers: {
        async create_experience(data) {
            return this.db?.collection(collection).insertOne(data)
        },

        async get_experience() {
            return this.db?.collection(collection).find({}).toArray()
        },
        async update_experience(id, title) {
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