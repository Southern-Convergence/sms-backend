import { ObjectId, TransactionOptions } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

import multers from "@lib/multers.mjs";
import { v4 } from "uuid";
import Application from "class/Application.mjs";
import { log } from 'handlebars';

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

    "assign-evaluator-application": {
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
          }));

          Object.entries(form.attachments).forEach(([key, value]) => {

            const links = result.filter((v: string) => v.match(key));
            const payload = {
              link: links,
              valid: null,
              remarks: "",
              description: key,
            }

            form.attachments[key] = payload;
          })
        }

        this.create_application(form)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }))
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
        this.get_application(req.session.user?._id).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
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
    },
    "PUT": {
      "assign-evaluator-application"(req, res) {
        this.assign_evaluator_application(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "evaluator-approved"(req, res) {
        this.handle_evaluator(req.body).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      /**
       * APPROVAL PROCCESS
       */
      "handle-principal"(req, res) {
        this.handle_principal(req.body).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "handle-admin4"(req, res) {
        this.handle_admin4(req.body).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
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
            }
            form.sdo_attachments[key] = payload;
          })
        };

        this.handle_evaluator(form).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "handle-verifier"(req, res) {
        this.handle_verifier(req.body).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "handle-recommending-approver"(req, res) {
        this.handle_recommending_approver(req.body).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "handle-approver"(req, res) {
        this.handle_approver(req.body).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
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

      const { data: assignees, error: assingees_error } = await Application.get_assignees(new ObjectId(data.designation.school), new ObjectId(data.designation.division));
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

      data.designation.division = new ObjectId(data.designation.division);
      data.designation.school = new ObjectId(data.designation.school);
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
    async get_application(user_id: any) {
      return Application.get_requests(new ObjectId(user_id))
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
    async get_erf(id) {
      return this.db?.collection(collection).aggregate(
        [
          {
            $match: {
              _id: new ObjectId(id)

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
      if (!result.modifiedCount) return Promise.reject("Failed to assign evaluator.");
      return Promise.resolve("Succesfully Assigned to Evaluator!")
    },
    /**
     * APPROVAL PROCCESS
     */
    async handle_principal(data: any) {
      const { app_id, attachment } = data;
      const statuses: boolean[] = [];
      let attachment_log = {}
      Object.entries(attachment).forEach(([k, v]: [any, any]) => {
        statuses.push(v.valid);
        if (!v.valid) {
          attachment_log = {
            description: v.description,
            remarks: v.remarks
          }
        };

      });
      let status = !statuses.includes(false);
      if (data.sdo_attachment) {
        const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) },
          {
            $set: {
              "assignees.0.approved": status,
              "assignees.0.timestamp": Date.now(),
              status: status ? 'Pending' : 'Invalid',
              attachments: attachment,
              sdo_attachments: data.sdo_attachment
            },
            $push: {
              "assignees.0.remarks": attachment_log
            }
          });

        if (!result.modifiedCount) return Promise.reject("Failed to Approve")
        return Promise.resolve("Successfully submitted to Schools Division Office!")
      }
      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.0.approved": status,
            "assignees.0.timestamp": Date.now(),
            status: status ? 'Pending' : 'Invalid',
            attachments: attachment,
          },
          $push: {
            "assignees.0.remarks": attachment_log
          }
        });

      if (!result.modifiedCount) return Promise.reject("Failed to Approve")
      return Promise.resolve("Successfully submitted to Schools Division Office!")
    },
    async handle_admin4(data: any) {
      const { app_id, attachment } = data;
      const statuses: boolean[] = [];
      let attachment_log = {}

      //todo: bug
      Object.entries(attachment).forEach(([k, v]: [any, any]) => {
        statuses.push(v.valid);
        if (!v.valid) {
          attachment_log = {
            description: v.description,
            remarks: v.remarks
          }
        };

      });

      let status = !statuses.includes(false);

      if (data.sdo_attachment) {
        const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) },
          {
            $set: {
              "assignees.1.evaluator_approved": status,
              status: status ? 'For Verifying' : 'Invalid',
              attachments: attachment,
              "assignees.1.timestamp": Date.now(),
              sdo_attachments: data.sdo_attachment
            },
            $push: {
              "assignees.1.remarks": attachment_log
            }
          });

        if (!result.modifiedCount) return Promise.reject("Failed to verify!")
        return Promise.resolve("Successfully Checked!")
      };

      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.1.evaluator_approved": status,
            status: status ? 'For Verifying' : 'Invalid',
            attachments: attachment,
            "assignees.1.timestamp": Date.now()
          },
          $push: {
            "assignees.1.remarks": attachment_log
          }
        });

      if (!result.modifiedCount) return Promise.reject("Failed to verify!")
      return Promise.resolve("Successfully Checked!")


    },
    async handle_evaluator(data: any) {
      const { app_id, attachment, sdo_attachments } = data;
      const statuses: boolean[] = [];
      let attachment_log = {}

      Object.entries(attachment).forEach(([k, v]: [any, any]) => {
        statuses.push(v.valid);
        if (!v.valid) {
          attachment_log = {
            description: v.description,
            remarks: v.remarks
          }
        };
      });

      let status = !statuses.includes(false);
      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.1.evaluator_approved": status,
            "assignees.2.approved": status,
            "assignees.2.timestamp": Date.now(),
            status: status ? 'For Checking' : 'Invalid',
            attachments: attachment,
            sdo_attachments: sdo_attachments
          },
          $push: {
            "assignees.2.remarks": attachment_log
          }
        });
      if (!result.modifiedCount) return Promise.reject("Failed to submit")
      return Promise.resolve("Successfully Evaluated! ")
    },
    async handle_verifier(data: any) {
      const { attachment, app_id } = data;

      const statuses: boolean[] = [];
      let attachment_log = {}
      Object.entries(attachment).forEach(([k, v]: [any, any]) => {
        statuses.push(v.valid);
        if (!v.valid) {
          attachment_log = {
            description: v.description,
            remarks: v.remarks
          }
        };

      });

      let status = !statuses.includes(false);
      if (data.sdo_attachment) {
        const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) },
          {
            $set: {
              "assignees.3.approved": status,
              status: status ? 'Recommending for Approval' : 'Invalid',
              "assignees.3.timestamp": Date.now(),
              attachments: attachment,
              sdo_attachments: data.sdo_attachment
            },
            $push: {
              "assignees.3.remarks": attachment_log
            }
          });

        if (!result.modifiedCount) return Promise.reject("Failed to Recommend for  Approval")
        return Promise.resolve("Successfully Recommended!")
      };
      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.3.approved": status,
            status: status ? 'Recommending for Approval' : 'Invalid',
            "assignees.3.timestamp": Date.now(),
            attachments: attachment,
          },
          $push: {
            "assignees.3.remarks": attachment_log
          }
        });

      if (!result.modifiedCount) return Promise.reject("Failed to Recommend for  Approval")
      return Promise.resolve("Successfully Recommended!")

    },



    async handle_recommending_approver(data: any) {
      const { attachment, app_id } = data;

      const statuses: boolean[] = [];
      let attachment_log = {}
      Object.entries(attachment).forEach(([k, v]: [any, any]) => {
        statuses.push(v.valid);
        if (!v.valid) {
          attachment_log = {
            description: v.description,
            remarks: v.remarks
          }
        };

      });

      let status = !statuses.includes(false);
      if (data.sdo_attachment) {
        const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) },
          {
            $set: {
              "assignees.4.approved": status,
              status: status ? 'For Approval' : 'Invalid',
              "assignees.4.timestamp": Date.now(),
              attachments: attachment,
              sdo_attachments: data.sdo_attachment
            },
            $push: {
              "assignees.4.remarks": attachment_log
            }
          });

        if (!result.modifiedCount) return Promise.reject("Failed to approve approver")
        return Promise.resolve("Successdully Recommended!")
      }
      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.4.approved": status,
            status: status ? 'For Approval' : 'Invalid',
            "assignees.4.timestamp": Date.now(),
            attachments: attachment,
          },
          $push: {
            "assignees.4.remarks": attachment_log
          }
        });

      if (!result.modifiedCount) return Promise.reject("Failed to approve approver")
      return Promise.resolve("Successdully Recommended!")

    },

    async handle_approver(data: any) {
      const { attachment, app_id } = data;
      const statuses: boolean[] = [];
      let attachment_log = {}
      Object.entries(attachment).forEach(([k, v]: [any, any]) => {
        statuses.push(v.valid);
        if (!v.valid) {
          attachment_log = {
            description: v.description,
            remarks: v.remarks
          }
        };

      });
      let status = !statuses.includes(false);
      if (data.sdo_attachment) {
        const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) },
          {
            $set: {
              "assignees.5.approved": status,
              status: status ? 'Completed' : 'Invalid',
              "assignees.5.timestamp": Date.now(),
              attachments: attachment,
              sdo_attachments: data.sdo_attachment
            },
            $push: {
              "assignees.5.remarks": attachment_log
            }
          });

        if (!result.modifiedCount) return Promise.reject("Failed to approve approver")
        return Promise.resolve("Successfully Indorsed to Regional Office!")
      }
      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.5.approved": status,
            status: status ? 'Completed' : 'Invalid',
            "assignees.5.timestamp": Date.now(),
            attachments: attachment,
          },
          $push: {
            "assignees.5.remarks": attachment_log
          }
        });

      if (!result.modifiedCount) return Promise.reject("Failed to approve approver")
      return Promise.resolve("Successfully Indorsed to Regional Office!")
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
              assignees: '$assignees',
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

  }
})