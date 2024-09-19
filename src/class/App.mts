import Database from "@lib/database.mjs";
import { log } from "handlebars";
import { ObjectId, Timestamp } from "mongodb";
import { ALLOWED_ORIGIN } from '@cfg/index.mjs';
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

import { PostOffice } from "@lib/mailman.mjs";


const enum ROLES {
  PRINCIPAL = "Principal",
  ADMIN_4 = "Administrative Officer IV",
  EVALUATOR = "Evaluator",
  ROEVALUATOR = "RO Evaluator",
  VERIFIER = "Verifier",
  ADMIN_5 = "Administrative Officer V",
};

const enum SIDE {
  SDO = "SDO",
  RO = "RO"
}

interface Designation {
  name: string;
  division_id: ObjectId;

  role_name: string;
  role_id: ObjectId;
  side: string;
}

export default class App {

  static async GET_ASSIGNEES(): Promise<{ data: any, error: any }> {

    return Promise.all([
      await Database.collection('ap-templates')?.findOne({ name: ROLES.PRINCIPAL }, { projection: { _id: 1 } }),
      await Database.collection('ap-templates')?.findOne({ name: ROLES.ADMIN_4 }, { projection: { _id: 1 } }),
      await Database.collection('ap-templates')?.findOne({ name: ROLES.EVALUATOR }, { projection: { _id: 1 } }),
      await Database.collection('ap-templates')?.findOne({ name: ROLES.VERIFIER }, { projection: { _id: 1 } }),
      await Database.collection('ap-templates')?.findOne({ name: ROLES.ADMIN_5 }, { projection: { _id: 1 } }),
    ]).then(([principal, admin4, evaluator, verifier, admin5]) => {

      const assignees = [
        {
          name: "Principal",
          id: principal?._id,
          approved: null,
          remarks: [],
          timestamp: null,


        },
        {
          name: "Administrative Officer IV",
          id: admin4?._id,
          approved: null,
          evaluator_approved: null,
          remarks: [],
          timestamp: null,

        },
        {
          name: "Evaluator",
          id: evaluator?._id,
          approved: null,
          remarks: [],
          timestamp: null,
          range_assignment: {
            name: null,
            remarks: null
          }
        },

        {
          name: "RO Administrative Officer V",
          id: admin5?._id,
          approved: null,
          evaluator_approved: null,
          remarks: [],
          timestamp: null,
        },
        {
          name: "RO Evaluator",
          id: evaluator?._id,
          approved: null,
          remarks: [],
          timestamp: null,
          range_assignment: {
            name: null,
            remarks: null
          },
        },
        {
          name: "RO Verifier",
          id: verifier?._id,
          approved: null,
          remarks: [],
          timestamp: null,
        },
      ];
      return Promise.resolve({ data: assignees, error: null });
    }).catch((error) => Promise.reject({ data: null, error: error }))
  };

  static async GET_REQUESTS(user_id: ObjectId, filter: any): Promise<{ data: any, error: any }> {

    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user_id);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (!designation) return Promise.reject({ data: null, error: "Could not resolve designation." });

    const { role_name, division_id, side } = designation;
    if (!role_name) return Promise.reject({ data: null, error: "hello world" });

    switch (role_name) {
      case ROLES.PRINCIPAL:
        const PRINCIPAL_PENDING = await App.GET_PENDING_PRINCIPAL(division_id, filter);
        return Promise.resolve({ data: PRINCIPAL_PENDING, error: null });

      case ROLES.ADMIN_4:
        const ADMIN_4_PENDING = await App.GET_PENDING_ADMIN_4(division_id, filter)
        return Promise.resolve({ data: ADMIN_4_PENDING, error: null });

      case ROLES.EVALUATOR:
        const EVALUATOR_PENDING = await App.GET_PENDING_EVALUATOR(division_id, user_id)
        return Promise.resolve({ data: EVALUATOR_PENDING, error: null });


      case ROLES.ROEVALUATOR:
        const ROEVALUATOR_PENDING = await App.GET_PENDING_EVALUATOR_RO(filter, user_id);
        return Promise.resolve({ data: ROEVALUATOR_PENDING, error: null });

      case ROLES.VERIFIER:
        if (side === SIDE.SDO) {
          const VERIFIER_PENDING = await App.GET_PENDING_VERIFIER(division_id)
          return Promise.resolve({ data: VERIFIER_PENDING, error: null });
        };
        const VERIFIER_PENDING = await App.GET_PENDING_VERIFIER_RO()
        return Promise.resolve({ data: VERIFIER_PENDING, error: null });



      case ROLES.ADMIN_5:
        const ADMIN_5_PENDING = await App.GET_PENDING_ADMIN_5(filter)
        return Promise.resolve({ data: ADMIN_5_PENDING, error: null });

      default:
        return Promise.resolve({ data: null, error: "Could not determine your designation" });
    }
  }
  /**
   * PENDING APPLICATION
   */
  private static async GET_PENDING_PRINCIPAL(division_id: ObjectId, filter: any) {

    return await Database.collection('applicant')?.aggregate([
      {
        $match: {
          $and: [

            { "designation.division": division_id },
            // { "assignees.0.approved": null },
            { status: { $in: ["Disapproved", "For Signature"] } }
          ]

        },
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
          position: "$position.title"

        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_ADMIN_4(division_id: ObjectId, filter: any) {

    const { position, sdo, status } = filter;
    let query = {};
    if (sdo && position && status) {
      query = {
        $and: [
          { "designation.division": new ObjectId(sdo) },
          { "qualification.position": new ObjectId(position) },

          { "status": status }
        ]
      };
    } else if (position) {
      query = { "qualification.position": new ObjectId(position) };
    }

    else if (status) {
      query = { "status": status };
    }

    const match = {
      $match:
      {
        $and: [
          { "designation.division": division_id },
          {
            $or: [
              // { "assignees.1.approved": { $ne: null } },
              {
                $and: [{ "assignees.0.approved": true }, { status: "Pending" }]
              },
              { $and: [{ "assignees.2.approved": true }, { "assignees.1.approved": true }, { status: "For Checking" }] },
              { $and: [{ "assignees.3.approved": false }, { "assignees.3.evaluator_approved": false }, { status: "Disapproved" }] },
              { $and: [{ "assignees.1.approved": true }, { "assignees.2.approved": false }, { "assignees.1.evaluator_approved": false }, { status: "Disapproved" }] },
              { status: { $in: ["Approved for Printing"] } }
            ]
          },
          query

        ]
      }
    };
    return await Database.collection('applicant')?.aggregate([
      match,


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
        $lookup: {
          from: 'sms-qualification-standards',
          localField: 'qualification.position',
          foreignField: '_id',
          as: 'is_with_erf'
        }
      },
      {
        $unwind: {
          path: "$position",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$is_with_erf",
          preserveNullAndEmptyArrays: true,
        }
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
          district: "$designation.district",
          current_position: "$designation.current_position",
          is_with_erf: '$is_with_erf.with_erf'
        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_EVALUATOR(division_id: ObjectId, user_id: ObjectId) {
    return await Database.collection('applicant')?.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                {
                  $and: [
                    // { "assignees.2.id": user_id },
                    // { "designation.division": division_id },
                    // { "assignees.1.approved": true },
                    // { "assignees.2.approved": { "$not": { "$eq": true } } },
                    // { "assignees.3.approved": { "$not": { "$eq": true } } },
                    { status: "For Evaluation" }
                  ]
                },
                {
                  $and: [
                    { "assignees.2.id": user_id },
                    { "designation.division": division_id },
                    { "assignees.1.evaluator_approved": true },
                    { "assignees.2.approved": true },
                    { "assignees.1.approved": false },
                    { status: "Disapproved" }
                  ]
                },
                {
                  status: "For DBM"
                }
              ]
            }
          ]
        }

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
          current_position: "$designation.current_position"

        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_VERIFIER(division_id: ObjectId) {
    return await Database.collection('applicant')?.aggregate([
      {
        $match: {
          $and: [
            { "designation.division": division_id },
            { "assignees.3.approved": { "$eq": null } },
            { "assignees.4.approved": { "$ne": true } },
            { "assignees.1.evaluator_approved": true },
            { status: "For Verifying" },
          ]
        }
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
          current_position: "$designation.current_position"

        },
      },
    ]).toArray();
  };

  private static async GET_PENDING_ADMIN_5(filter: any) {
    //filter condition
    const { position, sdo, status } = filter;
    let query = {};
    if (sdo && position && status) {
      query = {
        $and: [
          { "designation.division": new ObjectId(sdo) },
          { "qualification.position": new ObjectId(position) },
          { "status": status }
        ]
      };
    } else if (sdo) {
      query = { "designation.division": new ObjectId(sdo) };
    } else if (position) {
      query = { "qualification.position": new ObjectId(position) };
    }
    else if (status) {
      query = { "status": status };
    }
    const match = {
      $match: {
        $and: [
          {
            $or: [
              { $and: [{ "assignees.1.approved": true }, { "assignees.1.evaluator_approved": true }, { status: "RO Pending" }] },
              { $and: [{ "assignees.4.approved": true }, { "assignees.3.approved": true }, { "assignees.3.evaluator_approved": true }, { status: "For Checking" }] },
              { $and: [{ "assignees.4.approved": true }, { "assignees.3.approved": true }, { "assignees.3.evaluator_approved": true }, { status: "Received Printout/s" }] },
              { $and: [{ "assignees.4.approved": false }, { "assignees.3.evaluator_approved": false }, { status: "Disapproved" }] }
            ]
          },
          query
        ]

      }
    };

    return await Database.collection('applicant')?.aggregate([
      match,


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
          current_position: "$designation.current_position"
        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_EVALUATOR_RO(filter: any, user_id: ObjectId) {
    const { position, sdo, school } = filter;
    let query = {};
    if (sdo && position) {
      query = {
        $and: [
          { "designation.division": new ObjectId(sdo) },
          { "qualification.position": new ObjectId(position) }
        ]
      };
    } else if (sdo) {
      query = { "designation.division": new ObjectId(sdo) };
    } else if (position) {
      query = { "qualification.position": new ObjectId(position) };
    } else if (school) {
      query = { "designation.school": school };
    }


    const match = {
      $match: {
        $and: [
          {
            $or: [
              { "assignees.4.id": new ObjectId(user_id) },
              {
                $and: [
                  { "assignees.2.approved": true },
                  { "assignees.1.approved": true },
                  { "assignees.1.evaluator_approved": true }
                ]
              },
              {
                $and: [
                  { "assignees.2.approved": true },
                  { "assignees.3.approved": true }
                ]
              },
              {
                $and: [
                  { "assignees.3.approved": false },
                  { "assignees.4.approved": true },
                  { "assignees.4.evaluator_approved": true },
                  { status: "Disapproved" }
                ]
              }
            ]
          },
          { status: { "$in": ["For Evaluation", "Approved for Printing", "For DBM", "Received Printout/s", "Completed"] } },
          query
        ]
      }

    }
    return await Database.collection('applicant')?.aggregate([
      match,


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
          approved: 1,
          position: "$position.title",
          current_position: "$designation.current_position"
        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_VERIFIER_RO() {
    return await Database.collection('applicant')?.aggregate([
      {
        $match: {
          $and: [
            { "assignees.7.approved": true },
            { "assignees.8.approved": { "$eq": null } },
            { "status": { "$in": ["Approved for Printing", "For DBM", "Received Printout/s", "Completed"] } }
          ]
        }
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
      }, {
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
          current_position: "$designation.current_position"
        },
      },
    ]).toArray();
  };

  /**
   * APPLICATION PROCCESS
   */

  static async HANDLE_PRINCIPAL(data: any) {
    const { app_id, attachment, principal_esig, principal_name } = data;
    const statuses: boolean[] = [];
    const attachment_log: any[] = [];

    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks && v.remarks.length > 0) {
        attachment_log.push({
          description: v.description,
          remarks: v.remarks,
          timestamp: new Date()
        });
      }
    });
    const request_logs = {
      signatory: data.principal_name,
      role: "Principal",
      side: "School",
      status: statuses.includes(false) && attachment_log.length > 0 ? "Disapproved" : "Pending",
      remarks: attachment_log,
      timestamp: new Date()
    };
    const status = !statuses.includes(false)
    Object.entries(attachment).forEach(([k, v]: [string, any]) => {
      attachment[k].valid = null;
      attachment[k].remarks = [];
      attachment[k].timestamp = null;
    });
    const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
      {
        $set: {
          "assignees.0.approved": status,
          "assignees.0.name": data.principal_name,
          "assignees.0.timestamp": new Date(),
          status: request_logs.status,
          attachments: attachment,
          "principal.signature": data.principal_esig,
          "principal.name": data.principal_name,

        },
        $push: {
          request_log: request_logs,
          "assignees.0.remarks": { $each: attachment_log },
        },
      });
    if (!result?.modifiedCount) return Promise.reject("Failed to Approve")
    return Promise.resolve("Successfully submitted to Schools Division Office!")

  };

  static async HANDLE_ADMIN4(data: any, user: ObjectId) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.ADMIN_4) return Promise.reject({ data: null, error: "Not principal" });
    const statuses: boolean[] = [];
    const attachment_log: any[] = [];
    const { app_id, attachment } = data;


    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks && v.remarks.length > 0) {
        attachment_log.push({
          description: v.description,
          remarks: v.remarks,
          timestamp: new Date()
        });
      }
    });

    const request_logs = {
      signatory: designation.name,
      role: designation.role_name,
      side: designation.side,
      status: statuses.includes(false) && attachment_log.length > 0 ? "Disapproved" : (data.status === 'For Checking' ? "RO Pending" : "For Evaluation"),
      remarks: attachment_log,
      timestamp: new Date()
    };

    const applicant = await Database.collection('applicant')?.aggregate(
      [
        {
          $match:
          {
            _id: new ObjectId(app_id),
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
          $project:

          {
            _id: 1,
            "principal.email": 1,
            "principal.name": 1,
            control_number: 1,
            full_name: 1
          }

        }
      ]
    ).next()

    const status = !statuses.includes(false);

    Object.entries(attachment).forEach(([k, v]: [string, any]) => {
      attachment[k].valid = null;
      attachment[k].remarks = [];
      attachment[k].timestamp = null;
    });
    return await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
      {
        $set: {
          "assignees.1.approved": status,
          status: request_logs.status,
          attachments: attachment,
          "assignees.1.timestamp": new Date(),

        },
        $push: {
          "assignees.1.remarks": { $each: attachment_log },
          request_log: request_logs
        }
      }).then((data) => {
        if (request_logs.status === 'Disapproved') {
          PostOffice.get_instances()[EMAIL_TRANSPORT].post(
            {
              from: "mariannemaepaclian@gmail.com",
              to: applicant?.principal.email,
              subject: "Returned Reclass",
            },
            {
              context: {
                name: `${applicant?.principal.name} `,
                control_number: `${applicant?.control_number}`,
                full_name: `${applicant?.full_name}`,
                link: `${ALLOWED_ORIGIN}/sms/erf${`?id=`}${applicant?._id}`

              },
              template: "sms-disapproved",
              layout: "centered"
            }
          );
        }


        return Promise.resolve("Successfully Verify!")
      }).catch(() => Promise.reject("Failed to Verify"));



  };

  static async HANDLE_EVALUATOR(data: any, user: ObjectId, pal: any) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.EVALUATOR) return Promise.reject({ data: null, error: "Not Evaluator" });

    const { app_id, attachment, range_assignment } = data;

    const statuses: boolean[] = [];
    const attachment_log: any[] = [];


    const pal_data = {
      description: "Plantialla Allocation List",
      link: pal,
      timestamp: new Date,
      remarks: [],
      valid: true
    }
    attachment.pal = pal_data
    const all_attachment = attachment


    Object.entries(all_attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks && v.remarks.length > 0) {
        attachment_log.push({
          description: v.description,
          remarks: v.remarks,
          timestamp: new Date()
        });
      }
    });

    const request_logs = {
      signatory: designation.name,
      role: designation.role_name,
      side: designation.side,
      status: statuses.includes(false) && attachment_log.length > 0 ? "Disapproved" : "For Checking",
      remarks: attachment_log,
      timestamp: new Date()
    };
    const status = !statuses.includes(false)

    Object.entries(all_attachment).forEach(([k, v]: [string, any]) => {
      attachment[k].valid = null;
      attachment[k].remarks = [];
      attachment[k].timestamp = null;
    });

    const query = designation.side === 'SDO' ? {
      $set: {
        "assignees.1.evaluator_approved": status,
        "assignees.2.approved": status,
        "assignees.2.timestamp": new Date(),
        status: request_logs.status,
        attachments: all_attachment,
        "assignees.2.range_assignment": range_assignment,


      },
      $push: {
        "assignees.2.remarks": { $each: attachment_log },
        request_log: request_logs,
      }
    } : {
      $set: {
        "assignees.3.evaluator_approved": status,
        "assignees.4.approved": status,
        "assignees.4.timestamp": new Date(),
        "assignees.4.range_assignment": range_assignment,
        status: request_logs.status,
        attachments: attachment,
      },
      $push: {
        "assignees.4.remarks": { $each: attachment_log },
        request_log: request_logs,
      }
    };

    const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) }, query);

    if (!result?.modifiedCount) return Promise.reject({ data: null, error: "Failed to submit" });
    return Promise.resolve({ data: "Successfully Evaluated!", error: null });

  };
  static async HANDLE_RO_EVALUATOR(data: any, user: ObjectId) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.ROEVALUATOR) return Promise.reject({ data: null, error: "Not RO Evaluator" });

    const { app_id, attachment, range_assignment } = data;

    const statuses: boolean[] = [];
    const attachment_log: any[] = [];


    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks && v.remarks.length > 0) {
        attachment_log.push({
          description: v.description,
          remarks: v.remarks,
          timestamp: new Date()
        });
      }
    });

    const request_logs = {
      signatory: designation.name,
      role: designation.role_name,
      side: designation.side,
      status: statuses.includes(false) && attachment_log.length > 0 ? "Disapproved" : "For Checking",
      remarks: attachment_log,
      timestamp: new Date()
    };
    const status = !statuses.includes(false)

    Object.entries(attachment).forEach(([k, v]: [string, any]) => {
      attachment[k].valid = null;
      attachment[k].remarks = [];
      attachment[k].timestamp = null;
    });

    const query = {
      $set: {
        "assignees.3.evaluator_approved": status,
        "assignees.4.approved": status,
        "assignees.4.timestamp": new Date(),
        "assignees.4.range_assignment": range_assignment,
        status: request_logs.status,
        attachments: attachment,
      },
      $push: {
        "assignees.4.remarks": { $each: attachment_log },
        request_log: request_logs,
      }
    };

    const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) }, query);

    if (!result?.modifiedCount) return Promise.reject({ data: null, error: "Failed to submit" });
    return Promise.resolve({ data: "Successfully Evaluated!", error: null });

  };

  static async HANDLE_VERIFIER(data: any, user: ObjectId) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.VERIFIER) return Promise.reject({ data: null, error: "Not Verifier" });
    const { attachment, app_id } = data;

    const applicant = await Database.collection('applicant')?.aggregate(
      [
        {
          $match:

          {
            _id: new ObjectId(app_id),
          },
        },
        {
          $project:

          {
            "personal_information.last_name": 1,
            "personal_information.first_name": 1,
            "personal_information.email": 1,
            control_number: 1,
          },
        },
      ]
    ).next()


    const statuses: boolean[] = [];
    const attachment_log: any[] = [];

    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks && v.remarks.length > 0) {
        attachment_log.push({
          description: v.description,
          remarks: v.remarks,
          timestamp: new Date()
        });
      }
    });
    const request_logs = {
      signatory: designation.name,
      role: designation.role_name,
      side: designation.side,
      status: statuses.includes(false) && attachment_log.length > 0 ? "Disapproved" : (designation.side === SIDE.SDO ? "Recommending for Approval" : "Approved for Printing"),
      remarks: attachment_log,
      timestamp: new Date()
    };
    const status = !statuses.includes(false)

    const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
      {
        $set: {
          "assignees.3.approved": status,
          status: request_logs.status,
          "assignees.3.timestamp": new Date(),
          attachments: attachment,
          sdo_attachments: data.sdo_attachment
        },
        $push: {
          "assignees.3.remarks": { $each: attachment_log },
          request_log: request_logs
        }
      }).then((data) => {
        PostOffice.get_instances()[EMAIL_TRANSPORT].post(
          {
            from: "mariannemaepaclian@gmail.com",
            to: applicant?.personal_information.email,
            subject: "SMS Approved for Printing",
          },
          {
            context: {
              name: `${applicant?.personal_information.last_name} ${applicant?.personal_information.first_name}`,
              control_number: `${applicant?.control_number}`,

            },
            template: "sms-for-printing",
            layout: "centered"
          }
        );
        return Promise.resolve("Successfully Approved for Printing!")
      }).catch(() => Promise.reject("Failed to Recommend for  Approval"));

  };


  // updated with return
  static async HANDLE_ADMIN5(data: any, user: ObjectId) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.ADMIN_5) return Promise.reject({ data: null, error: "Not Administrative Officer V" });
    const { attachment, sdo_attachment, app_id } = data;
    const statuses: boolean[] = [];
    const attachment_log: any[] = [];


    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks && v.remarks.length > 0) {
        attachment_log.push({
          description: v.description,
          remarks: v.remarks,
          timestamp: new Date()
        });
      }
    });
    const applicant = await Database.collection('applicant')?.aggregate(
      [
        {
          $match:

          {
            _id: new ObjectId(app_id),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignees.2.id",
            foreignField: "_id",
            as: "sdo_evaluator"
          }
        },
        {
          $unwind: {
            path: "$sdo_evaluator",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $project: {
            full_name: {
              $concat: [
                "$personal_information.first_name",
                " ",
                "$personal_information.last_name"
              ]
            },
            "personal_information.email": 1,
            control_number: 1,
            evaluator_name: {
              $concat: [
                "$sdo_evaluator.first_name",
                " ",
                "$sdo_evaluator.last_name"
              ]
            },
            evaluator_email: "$sdo_evaluator.email"
          },
        },
      ]
    ).next()

    const request_logs = {
      signatory: designation.name,
      role: designation.role_name,
      side: designation.side,
      status: statuses.includes(false) ? "Disapproved" : "Approved for Printing",
      remarks: attachment_log,
      timestamp: new Date()
    };
    const status = !statuses.includes(false)

    Object.entries(attachment).forEach(([k, v]: [string, any]) => {
      attachment[k].valid = null;
      attachment[k].remarks = [];
      attachment[k].timestamp = null;
    });
    const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
      {
        $set: {
          "assignees.3.approved": status,
          status: request_logs.status,
          attachments: attachment,
          "assignees.3.timestamp": new Date(),

        },
        $push: {
          "assignees.3.remarks": attachment_log,
          request_log: request_logs
        }
      }).then((data) => {
        PostOffice.get_instances()[EMAIL_TRANSPORT].post(
          {
            from: "mariannemaepaclian@gmail.com",
            to: applicant?.personal_information.email,
            subject: "SMS Approved for Printing",
          },
          {
            context: {
              name: `${applicant?.full_name}`,
              control_number: `${applicant?.control_number}`,

            },
            template: "sms-for-printing",
            layout: "centered"
          }
        );
        PostOffice.get_instances()[EMAIL_TRANSPORT].post(
          {
            from: "mariannemaepaclian@gmail.com",
            to: `${applicant?.evaluator_email}`,
            subject: `Approved for Printing - ${applicant?.full_name}`,

          },
          {
            context: {
              name: `${applicant?.full_name}`,
              evaluator: `${applicant?.evaluator_name}`,
              control_number: `${applicant?.control_number}`,

            },
            template: "sms-evaluator-for-printing",
            layout: "centered"
          }
        );

        return Promise.resolve("Successfully Approved for Printing!")
      }).catch(() => Promise.reject("Failed to Approved"));

  };
  /**
   * HELPER FUNCTION
   */
  private static async GET_DESIGNATION(user: ObjectId): Promise<{ data: Designation | null, error: string | null }> {
    const designation = await Database.collection('users')?.aggregate([
      {
        $match: { _id: user },
      },
      {
        $lookup: {
          from: "ap-templates",
          localField: "role",
          foreignField: "_id",
          as: "role"
        }
      },
      {
        $unwind: {
          path: "$role",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $set: {
          name: {
            $trim: {
              input: {
                $concat: [
                  "$first_name",

                  " ",
                  "$last_name",
                  " ",

                ],
              },
            },
          },
        },
      },
      {
        $project: {
          division_id:
            "$designation_information.division",

          role_id: "$role._id",
          role_name: "$role.name",
          name: 1,
          side: 1,

        },
      },
    ]).toArray();

    if (!designation?.length) return Promise.reject({ data: null, error: "Failed to locate designation" });
    return Promise.resolve({ data: designation[0] as Designation, error: null })
  }
}