import { Link } from '../../../../frontend/.nuxt/components';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-salary-grade"

export default REST({
    cfg: {
        service: "MAIN"
    },

    validators: {
        "create-sg": {
            salary_grade: Joi.number(),
            equivalent: Joi.number(),
        },
        "get-sg": {},
        "update-sg": {
            _id: object_id,
            salary_grade: Joi.number(),
            equivalent: Joi.number(),
        }

    },

    handlers: {
        "POST": {
            "create-sg"(req, res) {
                this.create_sg(req.body)
                    .then(() => res.json({ data: "Successfully added salary grade!" }))
                    .catch((error) => res.status(500).json({ error }));
            },

        },
        "GET": {

            "get-sg"(req, res) {
                this.get_sg().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            }
        },
        "PUT": {
            "update-sg"(req, res) {
                const { _id, salary_grade, equivalent } = req.body
                this.update_sg(_id, salary_grade, equivalent).then(() => res.json({ data: "Successfully Update Salary Grade!" }))
                    .catch((error) => res.status(400).json({ error }))

            }
        }


    },
    controllers: {

        async create_sg(data) {
            return this.db?.collection(collection).insertOne(data)
        },

        async get_sg() {
            return this.db?.collection(collection).find({}).toArray()
        },
        async update_sg(id, salary_grade, equivalent) {
            const result = await this.db?.collection(collection).updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        salary_grade: salary_grade,
                        equivalent: equivalent
                    }
                }
            );
            if (result.matchedCount === 0) {
                return Promise.reject("Item not Found, Failed to Update!");
            }
            return result;
        }


    }
})