import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "qualification-standards"

export default REST({
    cfg: {
        service: "ERF"
    },

    validators: {
        "create-qs": {
            position: Joi.string(),
            salary_grade: Joi.number(),
            education: Joi.string(),
            experience: Joi.string(),
            training: Joi.string(),
            education_level: Joi.string(),
            eligibility: Joi.string(),
            performance_rating: Joi.string(),

        },

        "get-qs": {},

        "update-qs": {
            _id: object_id,
            qs: Joi.object()
        }

    },

    handlers: {
        "POST": {
            "create-qs"(req, res) {

                this.create_qs(req.body)
                    .then(() => res.json({ data: "Successfully Created Qualifation Standard" }))
                    .catch((error) => res.status(400).json({ error }))
            }
        },

        "GET": {
            "get-qs"(req, res) {
                this.get_qs().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            }
        },

        "PUT": {
            "update-qs"(req, res) {
                const { _id, qs } = req.body
                this.update_qs(_id, qs).then(() => res.json({ data: "Successfully Update Qualifation Standard" }))
                    .catch((error) => res.status(400).json({ error }))
            }
        }

    },

    controllers: {
        async create_qs(data) {
            this.db?.collection(collection).insertOne(data)
        },

        async get_qs() {
            return this.db?.collection(collection).find({}).toArray()
        },

        async update_qs(id, qs) {
            delete qs._id
            const item = await this.db?.collection(collection).findOne({ _id: new ObjectId(id) })
            if (!item) return Promise.reject("Item not Found, Failed to Update!")
            return this.db?.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: qs })
        }
    }

})