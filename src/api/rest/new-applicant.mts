
import { ObjectId, TransactionOptions } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";
import { user_desig_resolver } from '@utils/marianne.mjs';



import multers from "@lib/multers.mjs";
import { v4 } from "uuid";
import App from 'class/App.mjs';

import { ALLOWED_ORIGIN } from '@cfg/index.mjs';

// import { create } from 'connect-mongo';

const pdf = multers["sms-docs"]

const collection = "applicant"

export default REST({
  cfg: {
    service: "ERF",
    public: true
  },

  validators: {
    "create-application": multers["sms-docs"].any(),
    "get-application": {
      position: Joi.string().allow(""),
      sdo: Joi.string().allow(""),
      status: Joi.string().allow(""),
    },
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
    "get-applicant-erf": {
      id: object_id
    },
    /**
     * PAGE: /sms/new-application-form
     */
    "get-application-qs": {

    },

    "get-evaluators": {
      division_id: object_id
    },
    "get-ro-evaluators": {},
    "assign-evaluator-application": {
      app_id: object_id,
      evaluator: object_id
    },

    "attach-output-requirement": multers["sms-docs"].any(),
    "complete-application": {
      app_id: object_id,
      approved: Joi.boolean()
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

      attachment: Joi.object().required(),
      status: Joi.string(),
      app_id: object_id
    },
    "handle-principal": {

      attachment: Joi.object().required(),
      status: Joi.string(),
      principal_esig: Joi.string().required(),
      principal_name: Joi.string().required(),

      app_id: object_id,
    },
    "handle-admin4": {

      attachment: Joi.object().required(),
      status: Joi.string(),
      app_id: object_id
    },
    "handle-evaluator": {

      attachment: Joi.object().required(),
      status: Joi.string(),
      app_id: object_id
    },

    "handle-verifier": {

      attachment: Joi.object().required(),
      status: Joi.string(),
      app_id: object_id
    },

    "handle-admin5": {

      attachment: Joi.object().required(),
      status: Joi.string(),
      app_id: object_id
    },

    /**
     * PAGE: SMS RECLASSIFICATION FILTERING
     */
    "get-all-sdo": {},
    "get-all-position": {},
    "assign-multiple-evaluator-application": {
      applicants: Joi.any().allow(null),
      evaluator: object_id
    },
    "generate-endorsement": {
      applicants: Joi.any().allow(null),
      evaluator: object_id
    },
    "get-dashboard": {
      sdo: Joi.string().allow(""),
    },
    "update-applicant": {
      applicant: Joi.object(),
    }

  },

  handlers: {
    "POST": {
      async "create-application"(req, res) {
        let form = Object.assign({}, JSON.parse(req.body.form))
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
          })).catch(console.error)

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
          .then((data: any) => {
            this.postoffice[EMAIL_TRANSPORT].post(
              {
                from: "mariannemaepaclian@gmail.com",
                to: form.personal_information.email,
                subject: "Application Tracking Status",
              },
              {
                context: {
                  name: `${form.personal_information.last_name} ${form.personal_information.first_name}`,
                  control_number: `${form.control_number}`,
                  link: `${ALLOWED_ORIGIN}/sms/applicant-history${`?id=`}${form._id}
`
                },
                template: "sms-approved",
                layout: "centered",

              }
            );

            this.postoffice[EMAIL_TRANSPORT].post(
              {
                from: "mariannemaepaclian@gmail.com",
                to: form.principal.email,
                subject: "SMS Attachments for Verification",
              },
              {
                context: {

                  name: `${form.personal_information.last_name} ${form.personal_information.first_name}`,
                  control_number: `${form.control_number}`,
                  link: `${ALLOWED_ORIGIN}/sms/erf${`?id=`}${form._id}
`
                },
                template: "sms-principal",
                layout: "centered"
              }
            );
            res.json({ data });
          }).catch((error) => res.status(400).json({ error }));
      },



      "attach-output-requirement"(req, res) {
        const { app_id } = req.body
        //@ts-ignore:watch
        const { fieldname, originalname, encoding, mimetype, buffer, size } = req.files[0];
        //@ts-ignore
        const fn = fieldname.split("-")[0];
        const dir = `sms/${req.body.app_id}/applicant-requirements/${fn}`
        const uuid = v4();
        const mime = originalname.split(".")[1];

        this.spaces["hris"].upload({
          body: buffer,
          content_type: mimetype,
          dir: 'sms-docs/',
          key: uuid,
          metadata: {
            original_name: originalname,
            timestamp: `${Date.now()}`,
            ext: mime,
            mimetype: mimetype
          },
        }).then(() => `${dir}/${uuid}`)
        this.attach_output_requirement(app_id, fn, dir, new ObjectId(req.session.user?._id))
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

    },
    "GET": {
      "get-application"(req, res) {
        this.get_application(new ObjectId(req.session.user?._id), req.query).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },

      "get-application-qs"(req, res) {
        this.get_application_qs()
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "get-dashboard"(req, res) {
        this.get_dashboard_data(req.query)
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
      "get-applicant-erf"(req, res) {
        const { id } = req.query
        this.get_applicant_erf(id).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },


      "get-evaluators"(req, res) {
        this.get_evaluators(new ObjectId(req.query.division_id?.toString())).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-ro-evaluators"(req, res) {
        this.get_ro_evaluators().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },

      /**
        * PAGE: SMS RECLASSIFICATION FILTERING
      */
      "get-all-sdo"(req, res) {
        this.get_all_sdo().then((data) => res.status(200).json({ data })).catch((error) => res.status(400).json({ error }));
      },
      "get-all-position"(req, res) {
        this.get_all_position().then((data) => res.status(200).json({ data })).catch((error) => res.status(400).json({ error }));
      }
    },
    "PUT": {
      "assign-evaluator-application"(req, res) {
        this.assign_evaluator_application(req.body, new ObjectId(req.session.user?._id))
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

      "assign-ro-evaluator-application"(req, res) {
        this.assign_ro_evaluator_application(req.body, new ObjectId(req.session.user?._id))
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

      "complete-application"(req, res) {
        this.complete_reclass(req.body, new ObjectId(req.session.user?._id))
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
        this.handle_principal(req.body).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },

      "handle-admin4"(req, res) {

        this.handle_admin4(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },

      "handle-evaluator"(req, res) {
        this.handle_evaluator(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      // async "handle-evaluator"(req, res) {
      //   // const form = Object.assign({}, JSON.parse(req.body.form));
      //   // if (req.files?.length) {

      //   //   //@ts-ignore
      //   //   const x = Object.fromEntries(req.files?.map((v: any) => v.fieldname.split("-")[0]).map((v: any) => [v, []]));
      //   //   form.sdo_attachments = x;

      //   //   //@ts-ignore
      //   //   const result = await Promise.all(Array.from(req.files).map(async (v: any) => {
      //   //     const uuid = v4();

      //   //     const fn = v.fieldname.split("-")[0];
      //   //     const dir = `sms/${req.session.user?._id}/applicant-requirements/SDO-${fn}`
      //   //     const mime = v.originalname.split(".")[1]; //bug this shit


      //   //     return await this.spaces["hris"].upload({
      //   //       body: v.buffer,
      //   //       content_type: v.mimetype,
      //   //       dir: dir,
      //   //       key: uuid,
      //   //       metadata: {
      //   //         original_name: v.originalname,
      //   //         timestamp: `${Date.now()}`,
      //   //         ext: mime,
      //   //         mimetype: v.mimetype
      //   //       },
      //   //     }).then(() => `${dir}/${uuid}`)
      //   //   }));
      //   //   Object.entries(form.sdo_attachments).forEach(([key, value]) => {
      //   //     const links = result.filter((v: string) => v.match(key));
      //   //     const payload = {
      //   //       link: links,
      //   //       valid: null,
      //   //       remarks: "",
      //   //       description: key,
      //   //       timestamp: Date.now()
      //   //     }
      //   //     form.sdo_attachments[key] = payload;
      //   //   })
      //   // };

      //   this.handle_evaluator(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      // },
      "handle-verifier"(req, res) {
        this.handle_verifier(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },

      "handle-admin5"(req, res) {
        this.handle_admin5(req.body, new ObjectId(req.session.user?._id)).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "assign-multiple-evaluator-application"(req, res) {
        this.assign_multiple_evaluator_application(req.body, new ObjectId(req.session.user?._id))
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "generate-endorsement"(req, res) {
        this.generate_endorsement(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
      "update-applicant"(req, res) {
        const { _id, personal_information, principal, control_number } = req.body.applicant;

        const result = this.update_applicant(req.body, this.spaces).then((data) => {
          this.postoffice[EMAIL_TRANSPORT].post(
            {
              from: "mariannemaepaclian@gmail.com",
              to: principal.email
            },
            {
              context: {
                name: `${personal_information.last_name} ${personal_information.first_name}`,
                control_number: `${control_number}`,
                link: `${ALLOWED_ORIGIN}/sms/erf${`?id=`}${_id}
        `
              },
              template: "sms-reapply",
              layout: "centered"
            }
          );
        })
        if (!result) return Promise.reject("Failed to assign!");
        return Promise.resolve("Successfully re-apply reclass!");
      }
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
      let paddedNumber = `${d}-${number.toString().padStart(4, "0")}`;

      const is_control_number = await this.db.collection('applicant').findOne({ control_number: paddedNumber });


      if (is_control_number) {
        const count = await this.db.collection('counters').findOne({}, { projection: { number: 1 } });
        if (!count) return Promise.reject("Failed to locate counting");

        const { number } = count;

        const current_date = new Date();
        const d = current_date.toISOString().split("T")[0];
        paddedNumber = `${d}-${number.toString().padStart(4, "0")}`;
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
      data.qualification.position = data.qualification.position ? new ObjectId(data.qualification.position) : "";
      data.qualification.education = data.qualification.education ? data.qualification.education.map((v: string) => new ObjectId(v)) : "";
      data.qualification.experience = data.qualification.experience ? data.qualification.experience.map((v: string) => new ObjectId(v)) : "";
      data.qualification.per_rating = data.qualification.per_rating ? new ObjectId(data.qualification.per_rating) : "";
      data.designation.division = data.designation.division ? new ObjectId(data.designation.division) : "";

      data.designation.current_sg = data.designation.current_sg ? new ObjectId(data.designation.current_sg) : "";
      data.qualification.leadership_points = data.qualification.leadership_points ? data.qualification.leadership_points.map((v: string) => new ObjectId(v)) : "";



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

      return Promise.resolve("Successfully applied request").then((data) => Promise.resolve(data))
        .catch(({ error }) => Promise.reject(error));
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
    async get_application(user: ObjectId, filter: any) {
      return App.GET_REQUESTS(user, filter)
        .then(({ data }) => Promise.resolve(data))
        .catch(({ error }) => Promise.reject(error));
    },

    async get_evaluators(division: ObjectId) {
      return this.db.collection('users').aggregate([
        {
          $match: {
            "designation_information.division": division,
            side: "SDO"
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
              from: 'sms-sdo',
              localField: 'designation.division',
              foreignField: '_id',
              as: 'division'
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
            $lookup: {
              from: 'sms-qualification-standards',
              localField: 'qualification.position',
              foreignField: '_id',
              as: 'is_with_erf'
            }
          },
          {
            $unwind: {
              path: '$division',
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
            $unwind: {
              path: "$is_with_erf",
              preserveNullAndEmptyArrays: true,
            }
          },
          {
            $set: {
              current_sg: { $arrayElemAt: ["$current_sg.salary_grade", 0] },
              division: '$division.title',

              is_with_erf: '$is_with_erf.with_erf'
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
            $lookup: {
              from: "sms-education",
              localField: "qualification.education",
              foreignField: "_id",
              as: "education",
            }
          },
          {
            $lookup: {
              from: "sms-experience",
              localField: "qualification.experience",
              foreignField: "_id",
              as: "experience",
            }
          },
          {
            $lookup: {
              from: "sms-performance-rating",
              localField: "qualification.per_rating",
              foreignField: "_id",
              as: "rating",
            }
          },
          {
            $lookup: {
              from: "sms-qualification-standards",
              localField: "qualification.position",
              foreignField: "_id",
              as: "position",
            }
          },
          {
            $unwind: {
              path: "$position",
              preserveNullAndEmptyArrays: false
            }

          },
          {

            $unwind: {
              path: "$rating",
              preserveNullAndEmptyArrays: false
            }

          },

          {
            $lookup: {
              from: "sms-leadership-and-potential",
              localField: "qualification.leadership_points",
              foreignField: "_id",
              as: "leadership",
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


          // {

          //   $project: {
          //     full_name: {
          //       $concat: ["$personal_information.first_name", " ", "$personal_information.last_name"]
          //     },
          //     birthday: "$personal_information.birthday",
          //     plantilla_no: "$designation.plantilla_no",
          //     signature: "$personal_information.signature",
          //     item_no: "$designation.item_no",
          //     current_position: "$designation.current_position",
          //     educational_attainment: 1,
          //     service_record: 1,
          //     public_years_teaching: "$equivalent_unit.public_years_teaching",
          //     yt_equivalent: "$equivalent_unit.yt_equivalent",
          //     professional_study: 1,
          //     ipcrf_rating: "$designation.ipcrf_rating",
          //     assignees: 1,
          //     created_date: 1,
          //     qualification: 1,
          //     principal: 1,
          //     education_level: "$qualification.education_level",
          //     training_hours: "$qualification.training",
          //     ma_units: "$qualification.ma_units",
          //     total_ma: "$qualification.total_ma",
          //     status_of_appointment: "$qualification.status_of_appointment",
          //     position: "$position.title",
          //     education: "$education.title",
          //     leadership: "$leadership.title",
          //     experience: "$experience.title",
          //     rating: "$rating.title",
          //     graduate_units: "$qualification.supplemented_units",
          //     attachments: {
          //       $map: {
          //         input: { $objectToArray: "$attachments" },
          //         as: "attachment",
          //         in: "$$attachment.v.description"
          //       }
          //     },
          //     sdo_attachments: {
          //       $map: {
          //         input: { $objectToArray: "$sdo_attachments" },
          //         as: "attachment",
          //         in: "$$attachment.v.description"
          //       }
          //     },

          //   }
          // }
        ]
      ).next()

    },

    async assign_evaluator_application(data: any, user_id: ObjectId) {
      const { data: designation, error: designation_error } = await user_desig_resolver(user_id);
      if (designation_error) return Promise.reject({ data: null, error: designation_error });
      if (designation?.role_name !== 'Administrative Officer IV') return Promise.reject({ data: null, error: "Not Administrative Officer IV" });


      const { app_id, evaluator, status } = data;
      const request_logs = {
        signatory: designation.name,
        role: designation.role_name,
        side: designation.side,
        status: "Assigned to Evaluator",
        timestamp: new Date()
      };
      const result = await this.db.collection("applicant").updateOne({ _id: new ObjectId(app_id) }, {
        $set: { "assignees.2.id": new ObjectId(evaluator), "assignees.1.approved": true, status: "For Evaluation" },
        $push: {
          request_log: request_logs
        }
      });
      if (!result) return Promise.reject("Failed to assign!");
      return Promise.resolve("Successfully assigned evaluator!");
    },
    async attach_output_requirement(app_id, fn, dir, user_id) {

      const { data: designation, error: designation_error } = await user_desig_resolver(user_id);
      if (designation_error) return Promise.reject({ data: null, error: designation_error });
      if (designation?.role_name !== 'Evaluator') return Promise.reject({ data: null, error: "Not Evaluator" });


      const request_logs = {
        signatory: designation.name,
        role: designation.role_name,
        side: designation.side,
        status: "Received Printout/s",
        timestamp: new Date()
      };
      const result = await this.db.collection("applicant").updateOne({ _id: new ObjectId(app_id) }, {
        $set: { status: "Received Printout/s", output_requirement: fn, output_requirement_link: dir },
        $push: {
          request_log: request_logs
        }
      });
      if (!result) return Promise.reject("Failed to assign!");
      return Promise.resolve("Successfully upload received printed  outputs!");
    },
    async complete_reclass(data: any, user_id: ObjectId) {
      const { data: designation, error: designation_error } = await user_desig_resolver(user_id);
      if (designation_error) return Promise.reject({ data: null, error: designation_error });
      if (designation?.role_name !== 'Evaluator') return Promise.reject({ data: null, error: "Not Evaluator" });
      const { app_id, status, approved } = data;
      const request_logs = {
        signatory: designation.name,
        role: designation.role_name,
        side: designation.side,
        status: "Completed",
        timestamp: new Date()
      };
      const result = await this.db.collection("applicant").updateOne({ _id: new ObjectId(app_id) }, { $set: { status: "Completed", approved: approved }, $push: { request_log: request_logs } });
      if (!result) return Promise.reject("Failed to assign!");
      return Promise.resolve("Successfully completed!");
    },
    async assign_ro_evaluator_application(data: any, user_id: ObjectId) {

      const { data: designation, error: designation_error } = await user_desig_resolver(user_id);
      if (designation_error) return Promise.reject({ data: null, error: designation_error });
      if (designation?.role_name !== 'Evaluator') return Promise.reject({ data: null, error: "Not Evaluator" });
      const { app_id, evaluator, status } = data;

      const request_logs = {
        signatory: designation.name,
        role: designation.role_name,
        side: designation.side,
        status: "Assigned to Evaluator",
        timestamp: new Date()
      };
      const result = await this.db.collection("applicant").updateOne({ _id: new ObjectId(app_id) }, {
        $set: { "assignees.3.id": new ObjectId(evaluator), "assignees.3.approved": true, status: "For Evaluation" },
        $push: {
          request_log: request_logs
        }
      });
      if (!result) return Promise.reject("Failed to assign!");


      return Promise.resolve("Successfully assigned evaluator!");
    },
    /**
     * APPROVAL PROCCESS
     */
    async handle_principal(data: any) {


      const result = App.HANDLE_PRINCIPAL(data)
      if (!result) return Promise.reject("Failed to submit!");

      return Promise.resolve("Successfully submitted to Schools Division Office!");

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
    async get_applicant_erf(id) {
      return this.db?.collection(collection).aggregate(
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
            $lookup: {
              from: 'sms-education',
              localField: 'qualification.education',
              foreignField: '_id',
              as: 'education'
            }
          },
          {
            $lookup: {
              from: 'sms-experience',
              localField: 'qualification.experience',
              foreignField: '_id',
              as: 'experience'
            }
          }, {
            $lookup: {
              from: 'sms-leadership-and-potential',
              localField: 'qualification.experience',
              foreignField: '_id',
              as: 'experience'
            }
          },
          {
            $lookup: {
              from: 'sms-qualification-standards',
              localField: 'qualification.position',
              foreignField: '_id',
              as: 'position'
            }
          },
          {
            $lookup: {
              from: 'sms-salary-grade',
              localField: 'designation.current_sg',
              foreignField: '_id',
              as: 'sg'
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
              path: '$position',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: '$sg',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              position_sg: '$position.sg'
            }
          }, {
            $lookup: {
              from: 'sms-salary-grade',
              localField: 'position_sg',
              foreignField: '_id',
              as: 'qs_sg'
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'assignees.2.id',
              foreignField: '_id',
              as: 'sdo_evaluator'
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'assignees.4.id',
              foreignField: '_id',
              as: 'ro_evaluator'
            }
          },
          {
            $unwind: {
              path: '$sdo_evaluator',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: '$ro_evaluator',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              education: "$education.title",
              experience: "$experience.title",
              leadership_points: "$eleadership_points.title",
              personal_information: 1,
              designation: 1,
              qualification: 1,
              educational_attainment: 1,
              equivalent_unit: 1,
              transcript: 1,
              service_record: 1,
              professional_study: 1,
              current_sg: '$sg.salary_grade',
              current_sg_equivalent: '$sg.equivalent',

              attachments: 1,

              assignees: 1,
              division: '$division.title',


              control_number: '$control_number',

              full_name: {
                $concat: ["$personal_information.first_name", " ", "$personal_information.last_name"]
              },
              created_date: '$created_date',
              principal: 1,
              position: '$position.title',
              qs_sg: { $arrayElemAt: ['$qs_sg.salary_grade', 0] },
              sdo_evaluator_name: {
                $concat: ["$sdo_evaluator.first_name", " ", "$sdo_evaluator.last_name"]
              },
              sdo_evaluator_esig: { "$toString": "$sdo_evaluator.e_signature" },
              ro_evaluator_name: {
                $concat: ["$ro_evaluator.first_name", " ", "$ro_evaluator.last_name"]
              },
              ro_evaluator_esig: { "$toString": "$ro_evaluator.e_signature" },

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
            $lookup: {
              from: "sms-leadership-and-potential",
              localField: "leadership_points",
              foreignField: "_id",
              as: "leadership",
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
              "sg.equivalent": 1,
              education_level: 1,
              "education._id": 1,
              training_hours: 1,
              "education.title": 1,
              "experience.title": 1,
              is_experience: 1,
              "rating.title": 1,
              ma_units: 1,
              with_erf: 1,
              "education.high_degree": 1,
              "leadership.title": 1,
              or_20_ma_units: 1,
              supplemented_units: 1,
              status_of_appointment: 1,


            }
          }
        ]
      ).toArray()

    },


    /**
     * PAGE: SMS RECLASSIFICATION FILTERING
   */
    async get_all_sdo() {
      return this.db.collection('sms-sdo').find({}, { projection: { title: 1 } }).toArray()
    },

    async get_all_position() {
      return this.db.collection('sms-qualification-standards').find({}, { projection: { title: 1 } }).toArray()
    },

    async get_dashboard_data(filter: any) {
      const { sdo } = filter;
      let query = {};
      if (sdo) {
        query = { "designation.division": new ObjectId(sdo) };
      }
      return this.db?.collection('applicant').aggregate([
        {
          $match: query

        },


        {
          $lookup: {
            from: "sms-sdo",
            localField: "designation.division",
            foreignField: "_id",
            as: "division",
          },
        },
        {
          $unwind: {
            path: "$division",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "sms-qualification-standards",
            localField: "qualification.position",
            foreignField: "_id",
            as: "position",
          },
        },
        {
          $unwind: {
            path: "$position",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            full_name: {
              $concat: [
                "$personal_information.first_name",
                " ",
                {
                  "$cond": {
                    "if": { "$ne": ["$personal_information.middle_name", ""] },
                    "then": {
                      "$concat": [
                        { "$substr": ["$personal_information.middle_name", 0, 1] },
                        "."
                      ]
                    },
                    "else": ""
                  }
                },
                " ",
                "$personal_information.last_name",
              ]
            }
          },
        },
        {
          $project: {
            division: "$division.title",

            control_number: 1,
            status: 1,
            full_name: 1,
            last_name: "$personal_information.last_name",
            first_name: "$personal_information.first_name",
            position: "$position.title",
            current_position: "$designation.current_position",
            approved: 1,
            created_date: 1
          },
        },
      ]).toArray();
    },

    async assign_multiple_evaluator_application(data, user_id: ObjectId) {
      const { data: designation, error: designation_error } = await user_desig_resolver(user_id);
      if (designation_error) return Promise.reject({ data: null, error: designation_error });
      if (designation?.role_name !== 'Administrative Officer V') return Promise.reject({ data: null, error: "Not Administrative Officer V" });


      const request_logs = {
        signatory: designation.name,
        role: designation.role_name,
        side: designation.side,
        status: "Assigned to RO Evaluator",
        timestamp: new Date()
      };
      const { applicants, evaluator } = data;
      const applicantIds = applicants.map((applicantId: any) => new ObjectId(applicantId));
      await Promise.all(applicantIds.map(async (applicantId: any) => {
        const result = await this.db.collection("applicant").updateOne(
          { _id: applicantId },
          {
            $set: {
              "assignees.4.id": new ObjectId(evaluator),
              "assignees.3.approved": true,
              status: "For Evaluation"
            },
            $push: {
              request_log: request_logs
            }
          }
        );
        if (!result) return Promise.reject("Failed to submit!");
        return Promise.resolve("Successfully submitted!");
      }));
    },

    async generate_endorsement(data) {
      const { applicants, evaluator } = data;
      const applicantIds = applicants.map((applicantId: any) => new ObjectId(applicantId));
      await Promise.all(applicantIds.map(async (applicantId: any) => {
        const result = await this.db.collection("applicant").updateOne(
          { _id: applicantId },
          {
            $set: {
              "assignees.6.id": new ObjectId(evaluator),
              "assignees.6.approved": true,
              status: "For DBM"
            }
          }
        );
        if (!result) return Promise.reject("Failed to submit!");
        return Promise.resolve("Successfully generated endorsement!");
      }));
    },


    async update_applicant(data: any, spaces) {

      const { status, attachments, _id, personal_information, designation, qualification } = data.applicant

      const application = await this.db.collection("applicant").findOne({ _id: new ObjectId(_id) }, { projection: { attachments: 1 } });
      if (!application) return Promise.reject("Could not find application");

      const for_deletion: any = [];

      Object.entries(application.attachments).forEach(([k, v]: [string, any]) => {
        const { link, valid } = v;
        if (!valid && typeof link === 'string') {
          for_deletion.push(link);
        } else if (!valid && Array.isArray(link) && link.length > 0 && typeof link[0] === 'string') {
          for_deletion.push(link[0]);
        }
      });

      for (const link of for_deletion) {
        const delete_links = await spaces["hris"].delete_object(link);
        console.log(delete_links);
      }


      const request_logs = {
        signatory: `${personal_information.first_name} ${personal_information.last_name}`,
        role: 'Applicant',
        side: 'School',
        status: 'For Signature',
        remarks: null,
        timestamp: new Date()
      };
      qualification.position = qualification.position ? new ObjectId(qualification.position) : "";
      qualification.education = qualification.education ? qualification.education.map((v: string) => new ObjectId(v)) : "";
      qualification.experience = qualification.experience ? qualification.experience.map((v: string) => new ObjectId(v)) : "";
      qualification.per_rating = qualification.per_rating ? new ObjectId(qualification.per_rating) : "";
      designation.division = designation.division ? new ObjectId(designation.division) : "";

      designation.current_sg = designation.current_sg ? new ObjectId(designation.current_sg) : "";

      Object.entries(application.attachments).forEach(([k, v]: [string, any]) => {
        v.timestamp = null;
        v.valid = null;
        v.remarks = "";
      });


      console.log('Applicant ID', _id);

      const result = await this.db.collection("applicant").updateOne(
        {
          _id: new ObjectId(_id)
        },
        {
          $set: {
            "personal_information.last_name": personal_information.last_name,
            "personal_information.middle_name": personal_information.middle_name,
            "personal_information.first_name": personal_information.first_name,
            "designation.current_position": designation.current_position,
            "designation.current_sg": designation.current_sg,
            "designation.employee_no": designation.employee_no,
            "designation.plantilla_no": designation.plantilla_no,
            "designation.division": designation.division,
            "designation.district": designation.district,
            "designation.item_no": designation.item_no,
            "designation.school": designation.school,
            "designation.ipcrf_rating": designation.ipcrf_rating,
            attachments: application.attachments,
            status: "For Signature",
            "assignees.0.approved": true,
          },
          $push: {
            request_log: request_logs
          }
        }
      );

      if (!result) return Promise.reject("Failed to submit!");
      return Promise.resolve("Successfully re-apply reclass!");
    }


  }
})