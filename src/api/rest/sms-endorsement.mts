
import { ObjectId } from 'mongodb'
import Joi, { object } from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";
import { user_desig_resolver } from '@utils/marianne.mjs';
import { log } from 'winston';



const collection = "sms-endorsement"

export default REST({
  cfg: {
    service: "MAIN"
  },

  validators: {
    "generate-endorsement": {
      applicants: Joi.array(),
      division: object_id,
      position: object_id,
      generated_by: object_id,
      genarated_date: Joi.string().required(),
    },
    "get-endorsement": {
      sdo: Joi.string().allow(""),
      position: object_id.allow(""),
    },
    "get-batch-endorsement": {
      id: object_id
    },
    "update-generated-endorsement": {
      app_id: object_id,
      applicants: Joi.array(),
      status: Joi.string().required(),
      remarks: Joi.string().allow(null),
      position: Joi.string().allow(null)
    },
  },

  handlers: {
    "POST": {
      "generate-endorsement"(req, res) {
        const { applicants, division, position, generated_by } = req.body;

        this.generate_endorsement(division, position, applicants, generated_by)
          .then(() => res.json({ data: "Successfully generated endorsement!" }))
          .catch((error) => res.status(500).json({ error }));
      },
    },
    "GET": {
      "get-endorsement"(req, res) {
        this.get_endorsement(req.query).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-batch-endorsement"(req, res) {


        const { id } = req.query


        this.get_batch_endorsement(id).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "update-generated-endorsement"(req, res) {
        this.update_generated_endorsement(req.body, new ObjectId(req.session.user?._id))
          .then(() => {
            res.json({ data: "Successfully Update Endorsement!" });
          })
          .catch((error) => res.status(400).json({ error }));
      }
    }
  },
  controllers: {

    async generate_endorsement(division_id, position_id, applicants: string[], generated_by) {

      const { data: designation, error: designation_error } = await user_desig_resolver(new ObjectId(generated_by));
      if (designation_error) return Promise.reject({ data: null, error: designation_error });

      const session = this.instance.startSession();

      session.withTransaction(async () => {
        const division = await this.db.collection("sms-sdo").findOne({ _id: new ObjectId(division_id) });
        if (!division) return Promise.reject("No such division");

        const position = await this.db.collection("sms-qualification-standards").findOne({ _id: new ObjectId(position_id) });
        if (!position) return Promise.reject("No such position");

        const keyed_applicants = applicants.map((id) => new ObjectId(id));
        console.log("keyed_applicants", keyed_applicants);

        const request_logs = {
          signatory: designation.name,
          role: designation.role_name,
          side: designation.side,
          status: "Generate Endorsement",
          timestamp: new Date()
        };

        // Correct this shit
        this.db.collection("applicant").updateMany({ $or: keyed_applicants.map((_id) => ({ _id })) },
          {
            $set: {
              status: "For Verification",
            },

            $push: { request_log: { $each: [request_logs] } } as any

          });

        const counters = await this.db.collection("counters").find().toArray();
        if (!counters.length) return Promise.reject("Failed to increment counter");



        let batch_code = `${division.code || "DIV"}-${position.code || "POS"}-${counters[0].branch_number}`;
        const current_year = new Date().getFullYear();

        const endorsement_log: any[] = [];


        const logs = {
          signatory: new ObjectId(generated_by),
          status: "For Verification",
          timestamp: new Date(),
        }

        this.db.collection("sms-endorsement").insertOne({
          division: division._id,
          position: position._id,
          applicants: keyed_applicants,
          current_year: current_year,
          generated_by: new ObjectId(generated_by),
          generated_date: new Date(),
          status: "For Verification",
          batch_code,
          endorsement_log: [logs],

        }
        );

        this.db.collection("counters").updateOne({ _id: new ObjectId(counters[0]._id) }, {
          $inc: { branch_number: 1 }
        });

      });

      session.endSession();
    },

    async get_endorsement(filter: any) {
      const { sdo, position } = filter;
      let query = {};
      if (sdo) {
        query = { divison: new ObjectId(sdo) };
      }
      if (position) {
        query = {
          position: new ObjectId(position)
        };
      }
      if (sdo && position) {
        query = {
          division: new ObjectId(sdo),
          position: new ObjectId(position)
        };
      }

      return this.db?.collection(collection).aggregate([
        {
          $match: query
        },
        {
          $lookup: {
            from: "sms-sdo",
            localField: "division",
            foreignField: "_id",
            as: "division"
          }
        },
        {
          $unwind: {
            path: "$division",
            preserveNullAndEmptyArrays: true
          }
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
          $unwind: {
            path: "$position",
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $project: {
            division: "$division.title",
            applicants: 1,
            position: "$position.title",
            batch_code: 1,
            status: 1,
            generated_date: 1,
            endorsement_log: 1


          }
        }
      ]
      ).toArray()
    },
    async get_batch_endorsement(id) {
      return this.db?.collection('sms-endorsement').aggregate(
        [
          {
            $match: {
              _id: new ObjectId(id)

            }
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
            $unwind: {
              path: "$position",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: "sms-sdo",
              localField: "division",
              foreignField: "_id",
              as: "division"
            }
          },
          {
            $unwind: {
              path: "$division",
              preserveNullAndEmptyArrays: true
            }
          },

          {
            $lookup: {
              from: "applicant",
              localField: "applicants",
              foreignField: "_id",
              as: "applicants"
            }
          },
          {
            $project: {
              division: "$division.title",
              position: "$position.title",
              batch_code: 1,
              current_year: 1,
              generated_date: 1,
              status: 1,
              endorsement_log: 1,
              applicants: {
                $map: {
                  input: "$applicants",
                  as: "applicant",

                  in: {
                    _id: "$$applicant._id",
                    full_name: { $concat: ["$$applicant.personal_information.first_name", " ", "$$applicant.personal_information.last_name"] },
                    current_position: "$$applicant.designation.current_position",
                  }
                }
              }
            }
          }
        ]).next();
    },

    async update_generated_endorsement(data: any, user_id: ObjectId) {
      const { data: designation, error: designation_error } = await user_desig_resolver(user_id);
      if (designation_error) return Promise.reject({ data: null, error: designation_error });
      if (designation?.role_name !== 'Verifier') return Promise.reject({ data: null, error: "Not Verifier" });




      const { app_id, status, remarks, applicants, position } = data;
      const keyed_applicants = applicants.map((v: any) => new ObjectId(v._id));

      const result = await this.db?.collection(collection).updateOne(
        { _id: new ObjectId(app_id) },
        {
          $set: {
            status: status,
            remarks: remarks,
            applicants: keyed_applicants
          }
        }
      );
      if (status === 'Verified') {
        const request_logs = {
          signatory: designation.name,
          role: designation.role_name,
          side: designation.side,
          status: "For DBM",
          timestamp: new Date()
        };
        const update_applicant_to_dbm = await this.db.collection("applicant").updateMany(
          { _id: { $in: keyed_applicants } },
          {
            $set: { status: "For DBM" },
            $push: { request_log: { $each: [request_logs] } } as any
          }

        );

        const evaluators_email = await this.db?.collection(collection).aggregate([
          {
            $match: {}
          },
          {
            $lookup: {
              from: "applicant",
              localField: "applicants",
              foreignField: "_id",
              as: "applicants"
            }
          },
          {
            $project: {
              evaluator: {
                $map: {
                  input: "$applicants",
                  as: "applicant",
                  in: { "$arrayElemAt": ["$$applicant.assignees", 2] }
                }
              }
            }
          },
          { $unwind: "$evaluator" },
          {
            $lookup: {
              from: "users",
              localField: "evaluator.id",
              foreignField: "_id", as: "evaluator_info"
            }
          },
          { $unwind: "$evaluator_info" },
          {
            $group: {
              _id: "$_id",
              evaluator_info: { $push: "$evaluator_info" },
              evaluator: { $push: "$evaluator" }
            }
          },
          { $project: { evaluator_email: "$evaluator_info.email" } }
        ]).next();

        const x = [...new Set(evaluators_email?.evaluator_email)];
        await Promise.all(x.map(async (email) => {


          if (this.postoffice && this.postoffice[EMAIL_TRANSPORT]) {

            this.postoffice[EMAIL_TRANSPORT].post(
              {
                from: "mariannemaepaclian@gmail.com",
                to: email as string,

              },
              {
                context: { position: position },
                template: "sms-to-evaluator",
                layout: "centered"
              }
            );
          } else {
            console.error("Error: postoffice or EMAIL_TRANSPORT is not defined.");
          }
        }));

        if (!result) return Promise.reject("Failed to update!");
        return Promise.resolve({ update_applicant_to_dbm, message: "Successfully updated endorsement!" });
      }
    }

  }





});

