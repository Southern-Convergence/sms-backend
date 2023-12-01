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
      created_date: Joi.date(),
      control: Joi.string(),
      // Qualifications
      position: Joi.string(),
      educ_level: Joi.string(),
      education: Joi.array(),
      experience: Joi.array(),
      training: Joi.number(),
      per_rating: Joi.string(),
      // personal information
      lastname: Joi.string(),
      firstname: Joi.string(),
      middlename: Joi.string(),
      email: Joi.string(),
      birthday: Joi.string(),
      gender: Joi.string(),
      // designation
      current_position: Joi.string(),
      employee_no: Joi.string(),
      plantilla_no: Joi.string(),
      division: Joi.string(),
      district: Joi.string(),
      item_no: Joi.string(),
      school: Joi.string(),
      school_address: Joi.string(),
      ipcrf_rating: Joi.string(),

      // education attainment
      // transcipt_record: Joi.string(),
      education_attainment: Joi.array(),
      registrar_name: Joi.string(),
      registrar_email: Joi.string(),
      registrar_no: Joi.number(),

      // service record
      service_record: Joi.array(),
      professional_study: Joi.array(),
      status: Joi.string(),
    },




  },

  handlers: {
    "POST": {
      "create-application"(req, res) {
        this.create_application(req.body)
          .then(() => res.json({ data: "Successfully sent application!" }))
          .catch((error) => res.status(400).json({ error }))

      },



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


  }
})