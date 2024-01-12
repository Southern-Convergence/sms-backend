import { ObjectId, TransactionOptions } from 'mongodb'
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
    "get-requests": {

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
      applicants_data: Joi.object(),
    },
    "assign-evaluator-application": {
      applicants_data: Joi.object(),

    },
    "checking-application": {
      applicants_data: Joi.object(),
    },
    "verifying-application": {
      applicants_data: Joi.object(),
    },
    "recommending-approval-application": {
      applicants_data: Joi.object(),
    },
    "approval-application": {
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

          const sr: any[] = [];
          const ea: any[] = [];
          const ob: any[] = [];
          const ps: any[] = [];

          result.forEach((v: any) => {
            if (v.match("service_record")?.length) sr.push(v);
            if (v.match("permit_study")?.length) ps.push(v);
            if (v.match("omnibus")?.length) ob.push(v);
            if (v.match("tor")?.length) ea.push(v);
          })

          form.attachments.educational_attainment = {
            link: ea,
            valid: null,
            remarks: "",
            description: "Authenticated copy of Transcript of Records in the masteral course signed by the School Registrar",
            registrar: {
              complete_name: form.transcript.registrar_name,
              contact_number: form.transcript.registrar_no,
              email: form.transcript.registrar_email
            },
          }
          form.attachments.service_record = {
            link: sr,
            valid: null,
            remarks: "",
            description: "Service Record attachment",
          };

          form.attachments.omnibus = {
            link: ob,
            valid: null,
            remarks: "",
            description: "Omnibus",
          };

          form.attachments.permit_to_study = {
            link: ps,
            valid: null,
            remarks: "",
            description: "Permit to Study or acreditation of  units in the masteral course.",

          };
        }


        this.create_application(form)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }))
      },
      "dissapproved-application"(req, res) {
        const { email, status, lastname, firstname, control_number } = req.body.applicants_data.personal_information;

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
        console.log(req.body);

        const { personal_information, status, control_number } = req.body.applicants_data;
        const { email, lastname, firstname, } = personal_information
        this.postoffice[EMAIL_TRANSPORT].post(
          {
            from: "ralphrenzo@gmail.com",
            to: email
          },
          {
            context: {
              name: `${firstname} ${lastname} `,
              link: `${req.body.link}?id=${req.body.id}`,
              control_number: `${control_number}`
            },
            template: "sms-approved",
            layout: "centered"
          },
        ).then(() => console.log("Success")).catch((error) => console.log(error));
        this.pending_application(req.body.applicants_data, status)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "assign-evaluator-application"(req, res) {
        const { status } = req.body.applicants_data;
        this.assign_evaluator_application(req.body.applicants_data)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "checking-application"(req, res) {
        const { status } = req.body.applicants_data;
        this.checking_application(req.body.applicants_data)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "verifying-application"(req, res) {
        const { status } = req.body.applicants_data;
        this.verifying_application(req.body.applicants_data)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "recommending-approval-application"(req, res) {
        const { status } = req.body.applicants_data;
        this.recommending_approval_application(req.body.applicants_data)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "approval-application"(req, res) {
        const { status } = req.body.applicants_data;
        this.approval_application(req.body.applicants_data)
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
      },
      "get-requests"(req, res) {
        this.get_requests(req.session).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      }
    },

  },
  controllers: {

    async get_requests(user: any) {
      console.log(user);
      return Promise.resolve("Succcessfuly ")
    },
    async create_application(data) {
      data.designation.division = new ObjectId(data.designation.division);
      data.designation.s = new ObjectId(data.designation.s);
      /**
       * TODO: UPLOAD ONLY WHEN REQUEST IS VALID
       */
      const is_email = await this.db?.collection(collection).findOne({ "personal_information.email": data.personal_information.email });
      if (is_email) return Promise.reject("Failed to Submit Application, Email Address Already Exists");

      const count = await this.db.collection('counters').findOne({});
      if (!count) return Promise.reject("Failed to locate counting");

      const { number, _id } = count;

      const current_date = new Date();
      const d = current_date.toISOString().split("T")[0];
      let paddedNumber = `${d}-${number.toString().padStart(4, "0")}`; //index comtrol number

      const is_control_number = await this.db.collection('applicant').findOne({ control_number: paddedNumber });

      if (is_control_number) {
        const count = await this.db.collection('counters').findOne({}, { projection: { number: 1 } });
        if (!count) return Promise.reject("Failed to locate counting");

        const { number } = count;

        const current_date = new Date();
        const d = current_date.toISOString().split("T")[0];
        paddedNumber = `${d}-${number.toString().padStart(4, "0")}`; //index comtrol number
      }

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

      const session = this.instance.startSession();

      const transactionOptions: TransactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' }
      };

      try {
        await session.withTransaction(async () => {
          await this.db?.collection(collection).insertOne(data);
          await this.db.collection('counters').updateOne({ _id: new ObjectId(_id) }, { $inc: { number: 1 } });
        }, transactionOptions);
      } catch (err) {
        return Promise.reject(err)
      }
      finally {
        await session.endSession();
      }
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
          $lookup: {
            from: 'sms-school',
            localField: "designation.school",
            foreignField: "_id",
            as: "school"
          }
        },
        {
          $lookup: {
            from: 'sms-sdo',
            localField: "designation.division",
            foreignField: "_id",
            as: "division"
          }
        },
        {
          $set: {
            full_name: {
              $concat: ["$personal_information.firstname", " ", "$personal_information.lastname"]
            },

          }
        },
        {
          $unwind: {
            path: "$position",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: "$division",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$school",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            position: "$position.title",
            control_number: 1,
            division: "$division.title",
            school: "$school.title",
            status: 1,
            full_name: 1

          }
        }
      ]).toArray()
    },
    async get_applicant(id) {
      return this.db?.collection(collection).aggregate(
        [
          {
            $match: {
              _id: new ObjectId(id)

            }
          },
          {
            $lookup: {
              from: 'sms-school',
              localField: 'designation.school',
              foreignField: '_id',
              as: 'school'
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
            $unwind: {
              path: '$school',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              division: '$division.title',
              school: '$school.title',
            }
          }
        ]
      ).next()

    },
    async dissapproved_application(id, email, status, reason) {
      return this.db?.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { email: email, status: "Dissapproved", reason: reason } }, { upsert: true })
    },
    async pending_application(data: any, status) {
      const id = data._id;

      delete data._id;
      data.status = "Pending";

      const document = await this.db.collection(collection).findOne({ _id: new ObjectId(id) });
      if (!document) return Promise.reject("Could not find application");

      data.position = new ObjectId(data.qualification.position);
      data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
      data.education = data.qualification.education.map((v: string) => new ObjectId(v));
      data.per_rating = new ObjectId(data.qualification.per_rating);

      const result = await this.db.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { status: "Pending" } });
      if (!result.modifiedCount) return Promise.reject("Failed to update");
      return Promise.resolve("Succesfully updated")
    },
    async assign_evaluator_application(data: any) {
      const id = data._id;
      delete data._id;
      data.status = "For Evaluation";
      const document = await this.db.collection(collection).findOne({ _id: new ObjectId(id) });
      if (!document) return Promise.reject("Could not find application");
      data.position = new ObjectId(data.qualification.position);
      data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
      data.education = data.qualification.education.map((v: string) => new ObjectId(v));
      data.per_rating = new ObjectId(data.qualification.per_rating);

      const result = await this.db.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { ...data } });
      if (!result.modifiedCount) return Promise.reject("Failed to Assign to Evaluator!");
      return Promise.resolve("Succesfully Assigned to Evaluator!")
    },
    async checking_application(data: any) {
      const id = data._id;
      delete data._id;
      data.status = "For Checking";
      const document = await this.db.collection(collection).findOne({ _id: new ObjectId(id) });
      if (!document) return Promise.reject("Could not find application");
      data.position = new ObjectId(data.qualification.position);
      data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
      data.education = data.qualification.education.map((v: string) => new ObjectId(v));
      data.per_rating = new ObjectId(data.qualification.per_rating);

      const result = await this.db.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { ...data } });
      if (!result.modifiedCount) return Promise.reject("Failed to update!");
      return Promise.resolve("Succesfully Checked Application!")
    },
    async verifying_application(data: any) {
      const id = data._id;
      delete data._id;
      data.status = "For Verifying";
      const document = await this.db.collection(collection).findOne({ _id: new ObjectId(id) });
      if (!document) return Promise.reject("Could not find application");
      data.position = new ObjectId(data.qualification.position);
      data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
      data.education = data.qualification.education.map((v: string) => new ObjectId(v));
      data.per_rating = new ObjectId(data.qualification.per_rating);

      const result = await this.db.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { ...data } });
      if (!result.modifiedCount) return Promise.reject("Failed to Update!");
      return Promise.resolve("Succesfully Verified Application!")
    },
    async recommending_approval_application(data: any) {
      const id = data._id;
      delete data._id;
      data.status = "Recommending for Approval";
      const document = await this.db.collection(collection).findOne({ _id: new ObjectId(id) });
      if (!document) return Promise.reject("Could not find application");
      data.position = new ObjectId(data.qualification.position);
      data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
      data.education = data.qualification.education.map((v: string) => new ObjectId(v));
      data.per_rating = new ObjectId(data.qualification.per_rating);

      const result = await this.db.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { ...data } });
      if (!result.modifiedCount) return Promise.reject("Failed to Update!");
      return Promise.resolve("Succesfully Recommended Application!")
    },
    async approval_application(data: any) {
      const id = data._id;
      delete data._id;
      data.status = "For Approval";
      const document = await this.db.collection(collection).findOne({ _id: new ObjectId(id) });
      if (!document) return Promise.reject("Could not find application");
      data.position = new ObjectId(data.qualification.position);
      data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
      data.education = data.qualification.education.map((v: string) => new ObjectId(v));
      data.per_rating = new ObjectId(data.qualification.per_rating);

      const result = await this.db.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { ...data } });
      if (!result.modifiedCount) return Promise.reject("Failed to Update!");
      return Promise.resolve("Succesfully Approved!")
    },
  }
})