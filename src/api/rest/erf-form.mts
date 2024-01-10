import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "erf"

export default REST({
    cfg: {
        service: "ERF"
    },

    validators: {
        "create-erf": {
            surname: Joi.string(),
            givenname: Joi.string(),
            middlename: Joi.string(),
            birthdate: Joi.string(),
            sex: Joi.string(),
            employee_no: Joi.string(),
            position: Joi.string(),
            salary_grade: Joi.number(),
            item_no: Joi.string(),
            plantilla_no: Joi.string(),
            authorized_salary: Joi.number(),
            ipcrf_rating: Joi.number(),
            education_attainment: Joi.array(),
            service_record: Joi.array(),
            professional_study: Joi.array(),
            years_teaching: {
                public_schools: Joi.number(),
                private_schools: Joi.number()
            },
            degree_equivalent: {
                present_degree: Joi.number(),
                equivalent: Joi.number()
            },
            teaching_experience: {
                public_schools: Joi.number(),
                private_schools: Joi.number()
            }

        },
        "update-erf": {
            applicant_details: Joi.object()
        },



    },

    handlers: {
        "POST": {
            "create-erf"(req, res) {
                this.create_erf(req.body)
                    .then(() => res.json({ data: "Successfully Created ERF!" }))
                    .catch((error) => res.status(400).json({ error }))
            },
        },

        "PUT": {
            "update-erf"(req, res) {
                this.update_erf(req.body.applicant_details, req.body.status)
            },


        },


    },

    controllers: {
        async create_erf(data) {
            const document = this.db?.collection(collection).find({ _id: new ObjectId(data._id) })

        },
        async create_initial_req(data) {
            return this.db?.collection(collection).insertOne(data)
        },


        async update_erf(applicant_details, status) {
            const id = applicant_details._id;
            delete applicant_details._id;

            return this.db?.collection("applicant").updateOne(
                { _id: new ObjectId(id) },
                { $set: { ...applicant_details, status: 'For Signature' } },
                { upsert: true }
            );
        },

    }
})