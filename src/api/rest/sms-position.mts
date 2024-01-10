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
        "get-qs": {},
        "update-position": {
            _id: object_id,
            title: Joi.string(),
            education: Joi.array(),
            education_level: Joi.string(),
            experience: Joi.array(),
            training_hours: Joi.number(),
            rating: Joi.array(),
            sg: Joi.string(),
        }
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
            "get-qs"(req, res) {
                this.get_qs().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            }
        },
        "PUT": {
            "update-position"(req, res) {
                const { _id, title, education, education_level, experience, training_hours, rating, sg } = req.body
                this.update_position(_id, title, education, education_level, experience, training_hours, rating, sg).then(() => res.json({ data: "Successfully Update Position!" }))
                    .catch((error) => res.status(400).json({ error }))

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
        async get_qs() {
            return this.db?.collection(collection).aggregate([
                {
                    $match: {},
                },
                {
                    $lookup: {
                        from: "sms-education",
                        let: { id: "$education" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $in: ["$_id", "$$id"] },
                                },
                            },
                        ],
                        as: "education",
                    },
                },
                {
                    $set: {
                        education: {
                            $map: {
                                input: "$education",
                                as: "educ",
                                in: {
                                    text: "$$educ.title",
                                },
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: "sms-experience",
                        let: { id: "$experience" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $in: ["$_id", "$$id"] },
                                },
                            },
                        ],
                        as: "experience",
                    },
                },
                {
                    $set: {
                        experience: {
                            $map: {
                                input: "$experience",
                                as: "exp",
                                in: {
                                    text: "$$exp.title",
                                },
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: "sms-performance-rating",
                        let: { id: "$rating" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $in: ["$_id", "$$id"] },
                                },
                            },
                        ],
                        as: "rating",
                    },
                },

                {
                    $lookup: {
                        from: "sms-salary-grade",
                        localField: "sg",
                        foreignField: "_id",
                        as: "sg",
                    },
                },
                {
                    $unwind: {
                        path: "$sg",
                        preserveNullAndEmptyArrays: true
                    }
                }

            ]).toArray()
        },
        async update_position(id, title, education, education_level, experience, training_hours, rating, sg) {
            const result = await this.db?.collection(collection).updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        title: title,
                        education: education,
                        education_level: education_level,
                        experience: experience,
                        training_hours: training_hours,
                        rating: rating,
                        sg: sg
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