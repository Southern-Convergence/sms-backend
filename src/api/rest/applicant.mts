import { Link } from './../../../../frontend/.nuxt/components.d';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "applicant"

export default REST({
    cfg: {
        service: "ERF"
    },

    validators: {
        "create-application": {
            date: Joi.date(),
            surname: Joi.string(),
            givenname: Joi.string(),
            middlename: Joi.string(),
            email: Joi.string(),
            birthday: Joi.string(),
            current_position: Joi.string(),
            employee_no: Joi.string(),
            plantilla_no: Joi.string(),
            division: Joi.string(),
            school: Joi.string(),
            position: Joi.string(),
            education: Joi.string(),
            education_level: Joi.string(),
            experience: Joi.string(),
            training: Joi.string(),
            eligibility: Joi.string(),
            performance_rating: Joi.string(),
            status: Joi.string(),

        },
        "get-application": {},

        "dissapproved-application": {
            id: object_id,
            applicants_data: Joi.object(),
            reason: Joi.string(),
        },

        "approved-application": {
            id: object_id,
            applicants_data: Joi.object(),
            link: Joi.string()
        },


        "get-applicant": {
            id: object_id
        }
    },

    handlers: {
        "POST": {
            "create-application"(req, res) {
                this.create_application(req.body)
                    .then(() => res.json({ data: "Successfully sent application!" }))
                    .catch((error) => res.status(400).json({ error }))

            },

            "dissapproved-application"(req, res) {
                const { email, status, surname, givenname, control_no } = req.body.applicants_data
                this.postoffice[EMAIL_TRANSPORT].post(
                    {
                        from: "ralphrenzo@gmail.com",
                        to: email
                    },
                    {
                        context: {
                            name: `${givenname} ${surname} `,
                            control_no: `${control_no}`,
                            reason: req.body.reason,

                        },
                        template: "sms-dissapproved",
                        layout: "centered"
                    },

                ).then(() => console.log("Sucess")).catch((error) => console.log(error))
                this.dissapproved_application(req.body.id, email, req.body.reason, status).then((data) => res.json({ data }))
                    .catch((error) => res.status(400).json({ error }))

            },

            "approved-application"(req, res) {
                const { email, status, surname, givenname, control_no } = req.body.applicants_data;
                this.postoffice[EMAIL_TRANSPORT].post(
                    {
                        from: "ralphrenzo@gmail.com",
                        to: email
                    },
                    {
                        context: {
                            name: `${givenname} ${surname} `,
                            link: `${req.body.link}?id=${req.body.id}`,
                            control_no: `${control_no}`
                        },
                        template: "sms-approved",
                        layout: "centered"
                    },
                ).then(() => console.log("Success")).catch((error) => console.log(error));

                this.approved_application(req.body.id, email, status)
                    .then((data) => res.json({ data }))
                    .catch((error) => res.status(400).json({ error }));
            },


        },

        "GET": {
            "get-application"(req, res) {
                this.get_application().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            },

            "get-applicant"(req, res) {
                const { id } = req.query
                console.log(id)
                this.get_applicant(id).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            }
        },


    },
    controllers: {
        async create_application(data) {
            const temp = await this.db?.collection(collection).findOne({ email: data.email });

            if (temp) {
                return Promise.reject("Failed to Submit Application, Control Number Already Exists");
            }

            const current_date = new Date();
            const year = current_date.getFullYear();
            const month = String(current_date.getMonth() + 1).padStart(2, '0');
            const day = String(current_date.getDate()).padStart(2, '0');
            const formatted_date = `${year}-${month}-${day}`;

            const existing_control_no = await this.db?.collection(collection).find({ date: formatted_date }).sort({ control_no: -1 }).limit(1).toArray();

            let number = 1;

            if (existing_control_no.length > 0) {
                const last_code = existing_control_no[0].control_no;
                const last_number_match = last_code.match(/\d+$/g);

                if (last_number_match) {
                    const last_numbers = last_number_match.map(Number);
                    const max_number = Math.max(...last_numbers);
                    number = max_number + 1;
                }
            }

            const paddedNumber = `${formatted_date}-${number.toString().padStart(4, '0')}`;
            const new_data = {
                ...data,
                control_no: paddedNumber,
                date: formatted_date
            };

            this.db?.collection(collection).insertOne({ ...new_data })
        },
        async get_application() {
            return this.db?.collection(collection).find({}).toArray()
        },

        async dissapproved_application(id, email, status, reason) {
            return this.db?.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { email: email, status: "Dissapproved", reason: reason } }, { upsert: true })
        },
        async approved_application(id, email, status) {
            const result = await this.db?.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { email: email, status: "Approved" } }, { upsert: true })
            // if (!result.modefiedCount) return Promise.reject("Failed to update");
            // return Promise.resolve("Successfully updated")
        },

        async get_applicant(id) {
            return this.db?.collection(collection).findOne({ _id: new ObjectId(id) })
        }

    }
})