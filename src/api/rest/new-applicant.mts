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
    "get-requests": {
    },
    "get-signatory": {
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
    // "pending-application": {
    //   applicants_data: Joi.object(),
    // },
    "assign-evaluator-application": {
      app_id: object_id,
      evaluator: object_id
    },
    // "checking-application": {
    //   applicants_data: Joi.object(),
    // },
    // "verifying-application": {
    //   applicants_data: Joi.object(),
    // },
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
      status: Joi.boolean().required(),
      app_id: object_id
    },
    "handle-admin4": {
      status: Joi.boolean().required(),
      app_id: object_id
    },
    "handle-evaluator": {
      status: Joi.boolean().required(),
      app_id: object_id
    },
    "handle-verifier": {
      status: Joi.boolean().required(),
      app_id: object_id
    },
    "handle-recommending-approver": {
      status: Joi.boolean().required(),
      app_id: object_id
    },
    "handle-approver": {
      status: Joi.boolean().required(),
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

      // "pending-application"(req, res) {

      //   const { personal_information, status, control_number } = req.body.applicants_data;
      //   const { email, lastname, firstname, } = personal_information
      //   this.postoffice[EMAIL_TRANSPORT].post(
      //     {
      //       from: "mariannemaepaclian@gmail.com",
      //       to: email
      //     },
      //     {
      //       context: {
      //         name: `${firstname} ${lastname} `,
      //         link: `${req.body.link}?id=${req.body.id}`,
      //         control_number: `${control_number}`
      //       },
      //       template: "sms-approved",
      //       layout: "centered"
      //     },
      //   ).then(() => console.log("Success")).catch((error) => console.log(error));
      //   this.pending_application(req.body.applicants_data, status)
      //     .then((data) => res.json({ data }))
      //     .catch((error) => res.status(400).json({ error }));
      // },
      // "checking-application"(req, res) {
      //   const { status } = req.body.applicants_data;
      //   this.checking_application(req.body.applicants_data)
      //     .then((data) => res.json({ data }))
      //     .catch((error) => res.status(400).json({ error }));
      // },
      // "verifying-application"(req, res) {
      //   const { status } = req.body.applicants_data;
      //   this.verifying_application(req.body.applicants_data)
      //     .then((data) => res.json({ data }))
      //     .catch((error) => res.status(400).json({ error }));
      // },
      // "recommending-approval-application"(req, res) {
      //   const { status } = req.body.applicants_data;
      //   this.recommending_approval_application(req.body.applicants_data)
      //     .then((data) => res.json({ data }))
      //     .catch((error) => res.status(400).json({ error }));
      // },
      // "approval-application"(req, res) {
      //   const { status } = req.body.applicants_data;
      //   this.approval_application(req.body.applicants_data)
      //     .then((data) => res.json({ data }))
      //     .catch((error) => res.status(400).json({ error }));
      // },

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
      "handle-evaluator"(req, res) {
        this.handle_evaluator(req.body).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
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
            $set: {
              attachment: "$attachment.title"
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
    // async pending_application(data: any, status) {
    //   const id = data._id;

    //   delete data._id;
    //   data.status = "Pending";

    //   const document = await this.db.collection(collection).findOne({ _id: new ObjectId(id) });
    //   if (!document) return Promise.reject("Could not find application");

    //   data.position = new ObjectId(data.qualification.position);
    //   data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
    //   data.education = data.qualification.education.map((v: string) => new ObjectId(v));
    //   data.per_rating = new ObjectId(data.qualification.per_rating);

    //   const result = await this.db.collection(collection).updateOne({ _id: new ObjectId(id) }, {
    //     $set:

    //       { status: "Pending" }

    //   });
    //   if (!result.modifiedCount) return Promise.reject("Failed to update");
    //   return Promise.resolve("Succesfully updated")
    // },
    async assign_evaluator_application(data: any) {
      const { app_id, evaluator, status } = data;
      const result = await this.db.collection("applicant").updateOne({ _id: new ObjectId(app_id) }, { $set: { "assignees.2.id": new ObjectId(evaluator), "assignees.1.approved": true, status: "For Evaluation" } });
      if (!result.modifiedCount) return Promise.reject("Failed to assign evaluator.");
      return Promise.resolve("Succesfully Assigned to Evaluator!")
    },
    // async checking_application(data: any) {
    //   const id = data._id;
    //   delete data._id;
    //   data.status = "For Checking";
    //   const document = await this.db.collection(collection).findOne({ _id: new ObjectId(id) });
    //   if (!document) return Promise.reject("Could not find application");
    //   data.position = new ObjectId(data.qualification.position);
    //   data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
    //   data.education = data.qualification.education.map((v: string) => new ObjectId(v));
    //   data.per_rating = new ObjectId(data.qualification.per_rating);

    //   const result = await this.db.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { ...data } });
    //   if (!result.modifiedCount) return Promise.reject("Failed to update!");
    //   return Promise.resolve("Succesfully Checked Application!")
    // },
    // async verifying_application(data: any) {
    //   const id = data._id;
    //   delete data._id;
    //   data.status = "For Verifying";
    //   const document = await this.db.collection(collection).findOne({ _id: new ObjectId(id) });
    //   if (!document) return Promise.reject("Could not find application");
    //   data.position = new ObjectId(data.qualification.position);
    //   data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
    //   data.education = data.qualification.education.map((v: string) => new ObjectId(v));
    //   data.per_rating = new ObjectId(data.qualification.per_rating);

    //   const result = await this.db.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { ...data } });
    //   if (!result.modifiedCount) return Promise.reject("Failed to Update!");
    //   return Promise.resolve("Succesfully Verified Application!")
    // },
    // async recommending_approval_application(data: any) {
    //   const id = data._id;
    //   delete data._id;
    //   data.status = "Recommending for Approval";
    //   const document = await this.db.collection(collection).findOne({ _id: new ObjectId(id) });
    //   if (!document) return Promise.reject("Could not find application");
    //   data.position = new ObjectId(data.qualification.position);
    //   data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
    //   data.education = data.qualification.education.map((v: string) => new ObjectId(v));
    //   data.per_rating = new ObjectId(data.qualification.per_rating);

    //   const result = await this.db.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { ...data } });
    //   if (!result.modifiedCount) return Promise.reject("Failed to Update!");
    //   return Promise.resolve("Succesfully Recommended Application!")
    // },
    // async approval_application(data: any) {
    //   const id = data._id;
    //   delete data._id;
    //   data.status = "For Approval";
    //   const document = await this.db.collection(collection).findOne({ _id: new ObjectId(id) });
    //   if (!document) return Promise.reject("Could not find application");
    //   data.position = new ObjectId(data.qualification.position);
    //   data.experience = data.qualification.experience.map((v: string) => new ObjectId(v));
    //   data.education = data.qualification.education.map((v: string) => new ObjectId(v));
    //   data.per_rating = new ObjectId(data.qualification.per_rating);

    //   const result = await this.db.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: { ...data } });
    //   if (!result.modifiedCount) return Promise.reject("Failed to Update!");
    //   return Promise.resolve("Succesfully Approved!")
    // },
    /**
     * APPROVAL PROCCESS
     */
    async handle_principal(data: any) {
      const { status, app_id } = data;
      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) }, { $set: { "assignees.0.approved": status, status: "Pending", "assignees.0.timestamp": Date.now() } })
      if (!result.modifiedCount) return Promise.reject("Failed to approve approver")
      return Promise.resolve("Successfully submitted to Schools Division Office!")
    },
    async handle_admin4(data: any) {
      const { status, app_id } = data;

      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) }, {
        $set: {
          // "assignees.1.approved": status,
          // status: "For Evaluation",
          // "assignees.1.timestamp": Date.now() 

          "assignees.1.evaluator_approved": true,
          status: "For Verifying",


        }
      });


      if (!result.modifiedCount) return Promise.reject("Failed to verify!")
      return Promise.resolve("Successfully verify!")
    },

    async handle_evaluator(data: any) {
      const { status, app_id } = data;
      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) }, { $set: { "assignees.1.evaluator_approved": status, "assignees.2.approved": status, status: "For Checking", "assignees.2.timestamp": Date.now() } })
      if (!result.modifiedCount) return Promise.reject("Failed to submit")
      return Promise.resolve("Successfully Checked! ")
    },
    async handle_verifier(data: any) {
      const { status, app_id } = data;
      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) }, { $set: { "assignees.3.approved": status, status: "Recommending for Approval", "assignees.3.timestamp": Date.now() } })
      if (!result.modifiedCount) return Promise.reject("Failed to Recommend for  Approval")
      return Promise.resolve("Successfully Recommended!")
    },
    async handle_recommending_approver(data: any) {
      const { status, app_id } = data;
      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) }, { $set: { "assignees.4.approved": status, status: "For Approval", "assignees.4.timestamp": Date.now() } })
      if (!result.modifiedCount) return Promise.reject("Failed to approve approver")
      return Promise.resolve("Successdully Approved!")
    },
    async handle_approver(data: any) {
      const { status, app_id } = data;
      const result = await this.db.collection('applicant').updateOne({ _id: new ObjectId(app_id) }, { $set: { "assignees.5.approved": status, status: "Completed" } })
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

  }
})