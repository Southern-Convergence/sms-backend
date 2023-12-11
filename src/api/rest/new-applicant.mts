import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

import multers from "@lib/multers.mjs";
import { v4 } from "uuid";

const collection = "applicant"

export default REST({
  cfg: {
    service: "ERF"
  },

  validators: {
    "create-application": multers["sms-docs"].any(),
    "get-application": {},
    "get-applicant": {
      id: object_id
    },
    /**
     * PAGE: /sms/new-application-form
     */
    "get-application-qs": {},
    "dissapproved-application": {
      id: object_id,
      applicants_data: Joi.object(),
      reason: Joi.string(),
    },
    "pending-application": {
      id: object_id,
      applicants_data: Joi.object(),

    },
  },

  handlers: {
    "POST": {
      async "create-application"(req, res) {
        let form = Object.assign({}, JSON.parse(req.body.form));
        form.attachments = {
          educational_attainment: [],
          service_record: [],
          omnibus: [],
          permit_to_study: [],
        };

        if (req.files?.length) {
          //@ts-ignore
          const result = await Promise.all(Array.from(req.files).map(async (v: any) => {
            const uuid = v4();

            const fn = v.fieldname.split("-")[0];
            const dir = `sms/${req.session.user?._id}/applicant-requirements/${fn}`
            const mime = v.originalname.split(".")[1];


            return await this.spaces["hris"].upload({
              body: v.buffer,
              content_type: v.mimetype,
              dir: dir,
              key: uuid,
              metadata: {
                original_name: v.originalname,
                timestamp: `${Date.now()}`,
                ext: mime,
                mimetype: v.mimetype
              },
            }).then(() => `${dir}/${uuid}`)
          }));


          const sr: string[] = [];
          const ea: string[] = [];
          const ob: string[] = [];
          const ps: string[] = [];

          result.forEach((v: any) => {
            if (v.match("service_record")?.length) sr.push(v);
            if (v.match("permit_study")?.length) ps.push(v);
            if (v.match("omnibus")?.length) ob.push(v);
            if (v.match("tor")?.length) ea.push(v);
          })

          form.attachments.educational_attainment = ea;
          form.attachments.service_record = sr;
          form.attachments.omnibus = ob;
          form.attachments.permit_to_study = ps;

        }

        this.create_application(form)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }))
      },
      "dissapproved-application"(req, res) {
        const { email, status, lastname, firstname, control_number } = req.body.applicants_data.personal_information;

        console.log(req.body.applicants_data);

        this.postoffice[EMAIL_TRANSPORT].post(
          {
            from: "ralphrenzo@gmail.com",
            to: email
          },
          {
            context: {
              name: `${lastname} ${firstname}`,
              control_number: `${control_number}`,
              reason: req.body.reason,
            },
            template: "sms-dissapproved",
            layout: "centered"
          },
        ).then(() => console.log("Success")).catch((error) => console.log(error));

        this.dissapproved_application(req.body.id, email, status, req.body.reason).then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

      "pending-application"(req, res) {
        const { status } = req.body.applicants_data;
        this.pending_application(req.body.id, status)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },



    },
    "GET": {
      "get-application"(req, res) {
        this.get_application().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-application-qs"(req, res) {
        this.get_application_qs()
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
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
      /**
       * TODO: UPLOAD ONLY WHEN REQUEST IS VALID
       */
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
      data.control_number = paddedNumber;
      data.created_date = new Date(data.created_date);
      data.service_record = data.service_record.map((v: any) => {
        return {
          ...v,
          from: (v.from),
          to: (v.to)
        }
      })
      data.position = new ObjectId(data.qualification.position);
      data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
      data.education = data.qualification.education.map((v: string) => new ObjectId(v));
      data.per_rating = new ObjectId(data.qualification.per_rating);

      const result = await this.db?.collection(collection).insertOne(data);

      if (!result.insertedId) return Promise.reject("Failed to apply request");

      console.log(data);

      return Promise.resolve("Successfully applied request");
    },
    /**
     * PAGE: /sms/new-applicant-form
     * @returns PAGE
     */
    async get_application_qs() {
      return this.db.collection('sms-qualification-standards').find({}).toArray();
    },
    async get_application() {
      return this.db?.collection(collection).aggregate([
        {
          $match: {}
        },
        {
          $lookup: {
            from: "sms-qualification-standards",
            localField: "position",
            foreignField: "_id",
            as: "position"
          }
        },
        {
          $set: {
            full_name: {
              $concat: ["$personal_information.firstname", " ", "$personal_information.lastname"]
            }
          }
        },
        {
          $unwind: {
            path: "$position",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            position: "$position.title",
            school: "$designation.school",
            division: "$designation.division",
            full_name: 1,
            status: 1,
            control_number: 1,
          }
        }
      ]).toArray()
    },
    async get_applicant(id) {
      return this.db?.collection(collection).findOne({ _id: new ObjectId(id) })
    },
    async dissapproved_application(id, email, status, reason) {
      return this.db?.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { email: email, status: "Dissapproved", reason: reason } }, { upsert: true })
    },
    async pending_application(id, status) {
      const result = await this.db?.collection(collection).updateOne({ _id: new ObjectId(id) }, {
        $set: {
          status: "Pending",
        }
      }, { upsert: true })

    },


  }
})