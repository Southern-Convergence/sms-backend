import { ObjectId, TransactionOptions } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

import multers from "@lib/multers.mjs";
import { v4 } from "uuid";
import Application from "class/Application.mjs";
import { log } from 'handlebars';
import App from 'class/App.mjs';

const collection = "applicant"

export default REST({
  cfg: {
    service: "ERF",
    public: true
  },

  validators: {
    "create-application": multers["sms-docs"].any(),
    "get-application": {},
    "get-applicant": {
      id: object_id
    },
    "get-erf": {
      id: object_id
    },
    "get-selected-qs": {},
    "get-requests": {
    },
    "get-signatory": {
      id: object_id
    },
    "get-endorsement": {
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
    "get-evaluators": {
      division_id: object_id
    },
    "get-ro-evaluators": {},
    "assign-evaluator-application": {
      app_id: object_id,
      evaluator: object_id
    },
    "assign-ro-evaluator-application": {
      app_id: object_id,
      evaluator: object_id
    },

    "recommending-approval-application": {
      applicants_data: Joi.object(),
    },
    "approval-application": {
      applicants_data: Joi.object(),
    },
    /**
     * APPROVAL PROCCESS
     */
    "evaluator-approved": {
      approved: Joi.boolean().required(),
      app_id: object_id
    },
    "handle-principal": {
      sdo_attachment: Joi.any().allow(null),
      attachment: Joi.object().required(),
      app_id: object_id,
    },
    "handle-admin4": {
      sdo_attachment: Joi.any().allow(null),
      attachment: Joi.object().required(),
      app_id: object_id
    },
    "handle-evaluator": multers["sms-docs"].any(),
    "handle-verifier": {
      sdo_attachment: Joi.object().required(),
      attachment: Joi.object().required(),
      app_id: object_id
    },
    "handle-recommending-approver": {
      sdo_attachment: Joi.object().required(),
      attachment: Joi.object().required(),
      app_id: object_id
    },
    "handle-approver": {
      sdo_attachment: Joi.object().required(),
      attachment: Joi.object().required(),
      app_id: object_id
    },
    "handle-admin5": {
      sdo_attachment: Joi.object().required(),
      attachment: Joi.object().required(),
      app_id: object_id
    },
    "get-pending-dashboard": {
    },
    "get-ro-completed-dashboard": {}
  },

  handlers: {
    "POST": {
      async "create-application"(req, res) {
        let form = Object.assign({}, JSON.parse(req.body.form));

        if (req.files?.length) {

          //@ts-ignore
          const x = Object.fromEntries(req.files?.map((v: any) => v.fieldname.split("-")[0]).map((v: any) => [v, []]));
          form.attachments = x;

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
          }))
            .catch(console.error)

          Object.entries(form.attachments).forEach(([key, value]) => {

            const links = result?.filter((v: string) => v.match(key));
            const payload = {
              link: links,
              valid: null,
              remarks: "",
              description: key,
              timestamp: Date.now()
            }

            form.attachments[key] = payload;
          })
        }

        this.create_application(form)
          .catch(console.error)
          .then((data) => {
            this.postoffice[EMAIL_TRANSPORT].post(
              {
                from: "mariannemaepaclian@gmail.com",
                to: form.personal_information.email
              },
              {
                context: {
                  name: `${form.personal_information.last_name} ${form.personal_information.first_name}`,
                  control_number: `${form.control_number}`,
                  link: `/sms/applicant-history/${form._id}`
                },
                template: "sms-approved",
                layout: "centered"
              }
            );
            res.json({ data });
          });
      },
      "dissapproved-application"(req, res) {
        const { email, status, lastname, firstname, control_number } = req.body.applicants_data.personal_information;

        this.postoffice[EMAIL_TRANSPORT].post(
          {
            from: "mariannemaepaclian@gmail.com",
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

    },
    "GET": {
      "get-application"(req, res) {
        this.get_application(new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-application-qs"(req, res) {
        this.get_application_qs()
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "get-selected-qs"(req, res) {
        this.get_selected_qs()
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },


      "get-applicant"(req, res) {
        const { id } = req.query
        this.get_applicant(id).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-erf"(req, res) {
        const { id } = req.query
        this.get_erf(id).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-signatory"(req, res) {
        const { id } = req.query
        this.get_signatory(id).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-endorsement"(req, res) {
        const { id } = req.query
        this.get_endorsement(id).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-evaluators"(req, res) {
        this.get_evaluators(new ObjectId(req.query.division_id?.toString())).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-ro-evaluators"(req, res) {
        this.get_ro_evaluators().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-pending-dashboard"(req, res) {
        this.get_pending_dashboard().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-ro-completed-dashboard"(req, res) {
        this.get_ro_completed_dashboard().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "assign-evaluator-application"(req, res) {
        this.assign_evaluator_application(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "assign-ro-evaluator-application"(req, res) {
        this.assign_ro_evaluator_application(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "evaluator-approved"(req, res) {
        this.handle_evaluator(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      /**
       * APPROVAL PROCCESS
       */
      "handle-principal"(req, res) {
        this.handle_principal(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "handle-admin4"(req, res) {
        this.handle_admin4(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      async "handle-evaluator"(req, res) {
        const form = Object.assign({}, JSON.parse(req.body.form));
        if (req.files?.length) {

          //@ts-ignore
          const x = Object.fromEntries(req.files?.map((v: any) => v.fieldname.split("-")[0]).map((v: any) => [v, []]));
          form.sdo_attachments = x;

          //@ts-ignore
          const result = await Promise.all(Array.from(req.files).map(async (v: any) => {
            const uuid = v4();

            const fn = v.fieldname.split("-")[0];
            const dir = `sms/${req.session.user?._id}/applicant-requirements/SDO-${fn}`
            const mime = v.originalname.split(".")[1]; //bug this shit


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
          Object.entries(form.sdo_attachments).forEach(([key, value]) => {
            const links = result.filter((v: string) => v.match(key));
            const payload = {
              link: links,
              valid: null,
              remarks: "",
              description: key,
              timestamp: Date.now()
            }
            form.sdo_attachments[key] = payload;
          })
        };

        this.handle_evaluator(form, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "handle-verifier"(req, res) {
        this.handle_verifier(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "handle-recommending-approver"(req, res) {
        this.handle_recommending_approver(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "handle-approver"(req, res) {
        this.handle_approver(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "handle-admin5"(req, res) {
        this.handle_admin5(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    }
  },
  controllers: {
    async create_application(data) {
      /**
       * TODO: UPLOAD ONLY WHEN REQUEST IS VALID
       */
      const is_email = await this.db?.collection(collection).findOne({ "personal_information.email": data.personal_information.email });
      if (is_email) return Promise.reject("Failed to Submit Application, Email Address Already Exists");

      const count = await this.db.collection('counters').findOne({});
      if (!count) return Promise.reject("Failed to locate counting");

      const { data: assignees, error: assingees_error } = await App.GET_ASSIGNEES();
      if (assingees_error) return Promise.reject("Failed to resolve assingees");

      data.assignees = assignees;

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
      data.position = data.qualification.position ? new ObjectId(data.qualification.position) : "";
      data.education = data.qualification.education ? data.qualification.education.map((v: string) => new ObjectId(v)) : "";
      data.experience = data.qualification.experience ? data.qualification.experience.map((v: string) => new ObjectId(v)) : "";

      data.designation.division = data.designation.division ? new ObjectId(data.designation.division) : "";
      data.designation.school = data.designation.school ? new ObjectId(data.designation.school) : "";
      data.designation.current_sg = data.designation.current_sg ? new ObjectId(data.designation.current_sg) : "";



      data.per_rating = data.qualification.per_rating ? new ObjectId(data.qualification.per_rating) : "";

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
        return Promise.reject("Transactions")
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

      return this.db.collection('sms-qualification-standards').aggregate(
        [
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
                    $expr: { $in: ["$_id", "$$ids"] },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    title: 1,
                  },
                },
              ],
              as: "attachment",
            },
          },
          {
            $set: {
              attachment: "$attachment.title",
            },
          },
          {
            $lookup: {
              from: "sms-attachment",
              let: { ids: "$sdo_attachment" },
              pipeline: [
                {
                  $match: {
                    $expr: { $in: ["$_id", "$$ids"] },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    title: 1,
                  },
                },
              ],
              as: "sdo_attachment",
            },
          },
          {
            $set: {
              sdo_attachment: {
                $arrayToObject: {
                  $map: {
                    input: "$sdo_attachment",
                    as: "req",
                    in: {
                      k: "$$req.title",
                      v: null
                    }
                  }
                }
              }
            }
          }
        ]).toArray();
    },
    async get_application(user: ObjectId) {
      return App.GET_REQUESTS(user)
        .then(({ data }) => Promise.resolve(data))
        .catch(({ error }) => Promise.reject(error));
    },
    async get_evaluators(division: ObjectId) {
      return this.db.collection('users').aggregate([
        {
          $match: {
            "designation_information.division": division,
          },
        },
        {
          $lookup: {
            from: "ap-templates",
            let: {
              role: "$role",
            },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: {
                        $eq: ["$_id", "$$role"],
                      },
                    },
                    {
                      $expr: {
                        $eq: ["$name", "Evaluator"],
                      },
                    },
                  ],
                },
              },
            ],
            as: "evaluator",
          },
        },
        {
          $unwind: {
            path: "$evaluator",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            "evaluator.name": "Evaluator"
          }
        },
        {
          $set: {
            title: {
              $concat: [
                "$first_name",
                " ",
                "$middle_name",
                " ",
                "$last_name"
              ]
            }
          }
        },
        {
          $project: {
            title: 1
          }
        }
      ]).toArray()
    },
    async get_ro_evaluators() {
      return this.db.collection('users').aggregate([
        {
          $match: {
            side: "RO"
          },
        },
        {
          $lookup: {
            from: "ap-templates",
            let: {
              role: "$role",
            },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: {
                        $eq: ["$_id", "$$role"],
                      },
                    },
                    {
                      $expr: {
                        $eq: ["$name", "Evaluator"],
                      },
                    },
                  ],
                },
              },
            ],
            as: "evaluator",
          },
        },
        {
          $unwind: {
            path: "$evaluator",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            "evaluator.name": "Evaluator"
          }
        },
        {
          $set: {
            title: {
              $concat: [
                "$first_name",
                " ",
                "$middle_name",
                " ",
                "$last_name"
              ]
            }
          }
        },
        {
          $project: {
            title: 1
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
            $unwind: {
              path: '$school',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "sms-salary-grade",
              localField: "designation.current_sg",
              foreignField: "_id",
              as: "current_sg",
            }
          },

          {
            $unwind: {
              path: "$scurrent_sg",
              preserveNullAndEmptyArrays: true,
            }
          },
          {
            $set: {
              current_sg: { $arrayElemAt: ["$current_sg.salary_grade", 0] },
              division: '$division.title',
              school: '$school.title',
            }
          }
        ]
      ).next()

    },
    async get_erf(id) {
      return this.db?.collection(collection).aggregate(
        [
          {
            $match: {
              _id: new ObjectId(id)
            }
          },
          {
            $unwind: "$assignees"
          },
          {
            $lookup: {
              from: "users",
              localField: "assignees.id",
              foreignField: "_id",
              as: "assignee_info"
            }
          },
          {
            $unwind: "$assignee_info"
          },
          {
            $group: {
              _id: null,
              assignees_fullnames: {
                $push: {
                  $concat: [
                    "$assignee_info.first_name",
                    " ",
                    "$assignee_info.last_name"
                  ]
                }
              },
              document: { $first: "$$ROOT" }
            }
          },
          {
            $replaceRoot: {
              newRoot: {
                $mergeObjects: ["$document", { assignees_fullnames: "$assignees_fullnames" }]
              }
            }
          },
          {
            $project: {
              full_name: {
                $concat: ["$personal_information.first_name", " ", "$personal_information.last_name"]
              },
              birthday: "$personal_information.birthday",
              plantilla_no: "$designation.plantilla_no",
              item_no: "$designation.item_no",
              current_position: "$designation.current_position",
              educational_attainment: 1,
              service_record: 1,
              public_years_teaching: "$equivalent_unit.public_years_teaching",
              yt_equivalent: "$equivalent_unit.yt_equivalent",
              professional_study: 1,
              ipcrf_rating: "$designation.ipcrf_rating",
              assignees_fullnames: 1,

            }
          }
        ]
      ).next()

    },
    async dissapproved_application(id, email, status, reason) {
      return this.db?.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { email: email, status: "Dissapproved", reason: reason } }, { upsert: true })
    },
    async assign_evaluator_application(data: any) {
      const { app_id, evaluator, status } = data;
      const result = await this.db.collection("applicant").updateOne({ _id: new ObjectId(app_id) }, { $set: { "assignees.2.id": new ObjectId(evaluator), "assignees.1.approved": true, status: "For Evaluation" } });
      if (!result) return Promise.reject("Failed to assign!");
      return Promise.resolve("Successfully assigned evaluator!");
    },
    async assign_ro_evaluator_application(data: any) {
      const { app_id, evaluator, status } = data;
      const result = await this.db.collection("applicant").updateOne({ _id: new ObjectId(app_id) }, { $set: { "assignees.6.id": new ObjectId(evaluator), "assignees.6.approved": true, status: "For Evaluation" } });
      if (!result) return Promise.reject("Failed to assign!");
      return Promise.resolve("Successfully assigned evaluator!");
    },
    /**
     * APPROVAL PROCCESS
     */
    async handle_principal(data: any, user: ObjectId) {
      const result = App.HANDLE_PRINCIPAL(data, user)
      if (!result) return Promise.reject("Failed to submit!");
      return Promise.resolve("Successfully submitted to the Schools Division Office!");
    },

    async handle_admin4(data: any, user: ObjectId) {
      const result = App.HANDLE_ADMIN4(data, user)
      if (!result) return Promise.reject("Failed to submit!");
      return Promise.resolve("Successfully checked!");
    },
    async handle_evaluator(data: any, user: ObjectId) {
      const result = App.HANDLE_EVALUATOR(data, user)
      if (!result) return Promise.reject("Failed to submit!");
      return Promise.resolve("Successfully evaluated!");
    },
    async handle_verifier(data: any, user: ObjectId) {
      const result = App.HANDLE_VERIFIER(data, user)
      if (!result) return Promise.reject("Failed to submit!");
      return Promise.resolve("Successfully verified!");
    },

    async handle_recommending_approver(data: any, user: ObjectId) {
      const result = App.HANDLE_RECOMMENDING_APPROVER(data, user)
      if (!result) return Promise.reject("Failed to submit!");
      return Promise.resolve("Successfully recommended!");
    },

    async handle_approver(data: any, user: ObjectId) {
      const result = App.HANDLE_APPROVER(data, user)
      if (!result) return Promise.reject("Failed to submit!");
      return Promise.resolve("Successfully approved!");
    },
    async handle_admin5(data: any, user: ObjectId) {
      const result = App.HANDLE_ADMIN5(data, user)
      if (!result) return Promise.reject("Failed to submit!");
      return Promise.resolve("Successfully checked!");
    },
    async get_signatory(id) {
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
            $project: {
              division: '$division.title',
              school: '$school.title',
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
    async get_selected_qs() {
      return this.db?.collection('sms-qualification-standards').aggregate(
        [
          {
            $match: {}
          },
          {
            $lookup: {
              from: "sms-education",
              localField: "education",
              foreignField: "_id",
              as: "education",
            }
          },
          {
            $lookup: {
              from: "sms-experience",
              localField: "experience",
              foreignField: "_id",
              as: "experience",
            }
          },
          {
            $lookup: {
              from: "sms-performance-rating",
              localField: "rating",
              foreignField: "_id",
              as: "rating",
            }
          },
          {
            $lookup: {
              from: "sms-salary-grade",
              localField: "sg",
              foreignField: "_id",
              as: "sg",
            }
          },



          {
            $unwind: {
              path: "$sg",
              preserveNullAndEmptyArrays: true,
            }
          },
          {
            $project: {
              title: 1,
              "sg.salary_grade": 1,
              education_level: 1,
              training_hours: 1,
              "education.title": 1,
              "experience.title": 1,
              "rating.title": 1

            }
          }
        ]
      ).toArray()

    },
    async get_endorsement(id) {
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
            $project: {
              division: '$division.title',
              school: '$school.title',
              full_name: {
                $concat: ["$personal_information.first_name", " ", "$personal_information.last_name"]
              },
              current_position: '$designation_.current_position',
              created_date: '$created_date',
            }
          }
        ]
      ).next()

    },
    async get_pending_dashboard() {
      const pending = await this.db?.collection('applicant')?.aggregate([
        {
          $match: {
            $and: [
              { "assignees.5.approved": true },
              { status: "Completed" }
            ]
          }
        }
      ]).toArray();
      return pending.length;
    },
    async get_ro_completed_dashboard() {
      const completed = await this.db?.collection('applicant')?.aggregate([
        {
          $match: {
            $and: [
              { "assignees.10.approved": true },
              { status: "Completed" }

            ]
          }
        }
      ]).toArray();
      return completed.length;
    },



  }
})