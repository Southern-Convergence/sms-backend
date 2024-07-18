
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'


const collection = "sms-qualification-standards"

export default REST({
    cfg: {
        service: "MAIN",
        public: true
    },

    validators: {
        "create-position": {
            title: Joi.string(),
            with_erf: Joi.boolean(),
            education: Joi.array(),
            supplemented_units: Joi.number(),
            education_level: Joi.string().allow(""),
            ma_units: Joi.number(),
            status_of_appointment: Joi.boolean(),
            leadership_points: Joi.array(),
            experience: Joi.array(),
            is_experience: Joi.boolean(),
            or_20_ma_units: Joi.boolean(),
            training_hours: Joi.number(),
            rating: Joi.array(),
            sg: Joi.string(),
            attachment: Joi.array(),
            sdo_attachment: Joi.array(),
            code: Joi.string(),

        },


        "get-qs": {
            // id: object_id
        },
        "get-applicant-details": {
            id: object_id
        },

        "update-position": {
            _id: object_id,
            position: Joi.object()

        },
        "update-application": {
            enable_application: Joi.boolean()
        },
        "get-submission-status": {}
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
            },

            "get-submission-status"(req, res) {
                this.get_submission_status().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            },
            "get-applicant-details"(req, res) {
                const { id } = req.query
                this.get_applicant_details(id).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            },

        },
        "PUT": {
            "update-position"(req, res) {
                const { _id, position } = req.body

                console.log(position);

                this.update_position(_id, position).then(() => res.json({ data: "Successfully Update Position!" }))
                    .catch((error) => res.status(400).json({ error }))
            },
            "update-application"(req, res) {
                const { enable_application } = req.body;
                this.update_application(enable_application)
                    .then(() => res.json({ data: enable_application ? 'Successfully opened for submission!' : 'Successfully closed for submission!' }))
                    .catch((error) => res.status(400).json({ error }));
            }
        }
    },
    controllers: {
        async create_position(data) {
            data.education = data.education.map((v: string) => new ObjectId(v));
            data.experience = data.experience.map((v: string) => new ObjectId(v));
            data.rating = data.rating.map((v: string) => new ObjectId(v));
            data.sg = new ObjectId(data.sg);
            data.attachment = data.attachment.map((v: string) => new ObjectId(v));
            // data.sdo_attachment = data.sdo_attachment.map((v: string) => new ObjectId(v));
            data.leadership_points = data.leadership_points.map((v: string) => new ObjectId(v));
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
                        from: "sms-attachment",
                        let: { ids: "$attachment" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $in: ["$_id", "$$ids"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    title: 1
                                }
                            }
                        ],
                        as: "attachment"
                    }
                },
                {
                    $lookup: {
                        from: "sms-attachment",
                        let: { ids: "$sdo_attachment" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $in: ["$_id", "$$ids"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    title: 1
                                }
                            }
                        ],
                        as: "sdo_attachment"
                    }
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
                    $lookup: {
                        from: "sms-leadership-and-potential",
                        localField: "leadership_points",
                        foreignField: "_id",
                        as: "leadership_points",
                    },
                },

                {
                    $unwind: {
                        path: "$sg",
                        preserveNullAndEmptyArrays: true
                    }
                },


            ]).toArray()


        },
        async get_submission_status() {
            return this.db?.collection('counters').aggregate([
                {
                    $match: {}
                },
                {
                    $project: {
                        _id: 0,
                        enable_application: 1
                    }
                }
            ]).next();
        },


        async update_position(_id, new_position) {
            console.log('ID', _id);
            console.log('UPDATE', _id);

            const result = await this.db?.collection(collection).updateOne(
                { _id: new ObjectId(_id) },
                { $set: { position: new_position } }
            );
            if (result.modifiedCount === 0) return Promise.reject("Failed to update position");
            return Promise.resolve("Successfully updated position");
        },


        async update_application(enable_application) {
            const count = await this.db.collection('counters').findOne({});
            if (!count) return Promise.reject("Failed to locate counting");

            const result = await this.db.collection('counters').updateOne({ _id: new ObjectId(count._id) }, {
                $set: {
                    enable_application: enable_application
                }
            });

            if (result.matchedCount === 0) {
                return Promise.reject("Item not found, failed to update!");
            }
            return result;
        },
        async get_applicant_details(id) {
            return this.db?.collection('applicant').aggregate(

                [
                    {
                        $match: {
                            _id: new ObjectId(id)

                        }
                    },

                    {
                        $lookup: {
                            from: 'sms-sdo',
                            localField: 'designation.division',
                            foreignField: '_id',
                            as: 'division'
                        }
                    },
                    {
                        $unwind: {
                            path: '$division',
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $project: {
                            division: '$division.title',

                            request_log: '$request_log',
                            control_number: '$control_number',

                            full_name: {
                                $concat: ["$personal_information.first_name", " ", "$personal_information.last_name"]
                            },
                            created_date: '$created_date',
                            status: '$status'
                        }
                    }

                ]
            ).next()

        },

    }
})