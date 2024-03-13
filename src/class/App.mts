import Database from "@lib/database.mjs";
import { log } from "handlebars";
import { ObjectId } from "mongodb";


const enum ROLES {
  PRINCIPAL = "Principal",
  ADMIN_4 = "Administrative Officer IV",
  EVALUATOR = "Evaluator",
  VERIFIER = "Verifier",
  RECOMMENDING_APPROVER = "Recommending Approver",
  APPROVER = "Approver",
  ADMIN_5 = "Administrative Officer V",
};

const enum SIDE {
  SDO = "SDO",
  RO = "RO"
}

interface Designation {
  name: string;
  division_id: ObjectId;
  school_id: ObjectId;
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
      await Database.collection('ap-templates')?.findOne({ name: ROLES.RECOMMENDING_APPROVER }, { projection: { _id: 1 } }),
      await Database.collection('ap-templates')?.findOne({ name: ROLES.APPROVER }, { projection: { _id: 1 } }),
      await Database.collection('ap-templates')?.findOne({ name: ROLES.ADMIN_5 }, { projection: { _id: 1 } }),
    ]).then(([principal, admin4, evaluator, verifier, recommending_approver, approver, admin5]) => {

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
        },
        {
          name: "Verifier",
          id: verifier?._id,
          approved: null,
          remarks: [],
          timestamp: null,
        },
        {
          name: "Recommending Approver",
          id: recommending_approver?._id,
          approved: null,
          remarks: [],
          timestamp: null,
        },
        {
          name: "Approver",
          id: approver?._id,
          approved: null,
          remarks: [],
          timestamp: null,
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
        },
        {
          name: "RO Verifier",
          id: verifier?._id,
          approved: null,
          remarks: [],
          timestamp: null,
        },
        {
          name: "RO Recommending Approver",
          id: recommending_approver?._id,
          approved: null,
          remarks: [],
          timestamp: null,
        },
        {
          name: "RO Approver",
          id: approver?._id,
          approved: null,
          remarks: [],
          timestamp: null,
        }];

      return Promise.resolve({ data: assignees, error: null });
    }).catch((error) => Promise.reject({ data: null, error: error }))
  };

  static async GET_REQUESTS(user_id: ObjectId): Promise<{ data: any, error: any }> {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user_id);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (!designation) return Promise.reject({ data: null, error: "Could not resolve designation." });


    const { role_name, division_id, school_id, side } = designation;
    if (!role_name) return Promise.reject({ data: null, error: "hello world" });

    switch (role_name) {
      case ROLES.PRINCIPAL:
        const PRINCIPAL_PENDING = await App.GET_PENDING_PRINCIPAL(division_id, school_id);
        return Promise.resolve({ data: PRINCIPAL_PENDING, error: null });

      case ROLES.ADMIN_4:
        const ADMIN_4_PENDING = await App.GET_PENDING_ADMIN_4(division_id)
        return Promise.resolve({ data: ADMIN_4_PENDING, error: null });

      case ROLES.EVALUATOR:
        if (side == SIDE.SDO) {
          const EVALUATOR_PENDING = await App.GET_PENDING_EVALUATOR(division_id)
          return Promise.resolve({ data: EVALUATOR_PENDING, error: null });
        }
        const EVALUATOR_PENDING = await App.GET_PENDING_EVALUATOR_RO(user_id);
        return Promise.resolve({ data: EVALUATOR_PENDING, error: null });

      case ROLES.VERIFIER:
        if (side === SIDE.SDO) {
          const VERIFIER_PENDING = await App.GET_PENDING_VERIFIER(division_id)
          return Promise.resolve({ data: VERIFIER_PENDING, error: null });
        };
        const VERIFIER_PENDING = await App.GET_PENDING_VERIFIER_RO()
        return Promise.resolve({ data: VERIFIER_PENDING, error: null });

      case ROLES.RECOMMENDING_APPROVER:
        if (side === SIDE.SDO) {
          const RECOMMENDING_PENDING = await App.GET_PENDING_RECOMMENDING(division_id)
          return Promise.resolve({ data: RECOMMENDING_PENDING, error: null });
        }
        const RECOMMENDING_PENDING = await App.GET_PENDING_RECOMMENDING_APPROVER_RO()
        return Promise.resolve({ data: RECOMMENDING_PENDING, error: null });

      case ROLES.APPROVER:
        if (side === SIDE.SDO) {
          const APPROVER_PENDING = await App.GET_PENDING_APPROVER(division_id)
          return Promise.resolve({ data: APPROVER_PENDING, error: null })
        }

        const APPROVER_PENDING = await App.GET_PENDING_APPROVER_RO()
        return Promise.resolve({ data: APPROVER_PENDING, error: null })

      case ROLES.ADMIN_5:
        const ADMIN_5_PENDING = await App.GET_PENDING_ADMIN_5()
        return Promise.resolve({ data: ADMIN_5_PENDING, error: null });

      default:
        return Promise.resolve({ data: null, error: "Could not determine your designation" });
    }
  }
  /**
   * PENDING APPLICATION
   */
  private static async GET_PENDING_PRINCIPAL(division_id: ObjectId, school_id: ObjectId) {
    return await Database.collection('applicant')?.aggregate([
      {
        $match: {
          $and: [
            { "designation.school": school_id },
            { "designation.division": division_id },
            { "assignees.0.approved": { "$eq": null } },
            { status: "For Signature" }
          ]

        }
      },
      // {
      //   $match: {
      //     $and: [
      //       { "designation.school": school_id },
      //       { "designation.division": division_id },
      //       { $or: [{ "assignees.0.approved": null }, { $and: [{ "assignees.10.approved": true }, { "assignees.9.approved": true }] }] },
      //       { status: { $in: ["For Signature", "Completed"] } }
      //     ]

      //   }
      // },
      {
        $lookup: {
          from: "sms-school",
          localField: "designation.school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
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
          school: "$school.title",
          control_number: 1,
          status: 1,
          full_name: 1,
          last_name: "$personal_information.last_name",
          first_name: "$personal_information.first_name"

        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_ADMIN_4(division_id: ObjectId) {
    return await Database.collection('applicant')?.aggregate([
      {
        $match:
        // {
        //   $and: [
        //     { "designation.division": division_id },
        //     { $or: [{ "assignees.0.approved": true }, { $and: [{ "assignees.2.approved": true }, { "assignees.1.evaluator_approved": false }] }, { $and: [{ "assignees.3.approved": false }, { "assignees.1.evaluator_approved": false }] }] },
        //     { status: { $in: ["Pending", "For Checking", "Dissapproved"] } }

        //   ]
        // }
        {
          $and: [
            { "designation.division": division_id },
            {
              $or: [
                { "assignees.0.approved": true },
                { $and: [{ "assignees.2.approved": true }, { "assignees.1.evaluator_approved": false }] },
                { $and: [{ "assignees.3.approved": false }, { "assignees.1.evaluator_approved": false }] }
              ]
            },
            { status: { $in: ["Pending", "For Checking", "Disapproved"] } }
          ]
        }

      },
      {
        $lookup: {
          from: "sms-school",
          localField: "designation.school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
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
          school: "$school.title",
          control_number: 1,
          status: 1,
          full_name: 1,
          last_name: "$personal_information.last_name",
          first_name: "$personal_information.first_name"
        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_EVALUATOR(division_id: ObjectId) {
    return await Database.collection('applicant')?.aggregate([
      {
        $match: {
          $and: [


            {
              $or: [
                { "designation.division": division_id },
                { "assignees.2.approved": { "$eq": null } },
                { "assignees.2.approved": { "$eq": null } },
                {
                  $and: [
                    { "assignees.5.approved": false },
                    { "assignees.4.approved": false },
                    { "assignees.3.approved": false },
                    { "assignees.1.approved": false },
                    { "assignees.1.evaluator_approved": true }
                  ]
                }
              ]
            },
            { status: { $in: ["For Evaluation", "Disapproved"] } }
          ]
        }

      },
      // {
      //   "$match": {
      //     "$and": [
      //       { "designation.division": division_id },
      //       { "assignees.1.approved": true },
      //       { "assignees.2.approved": { "$ne": true } },
      //       { "assignees.3.approved": { "$eq": null } },
      //       { status: "For Evaluation" },
      //       {
      //         "$or": [
      //           {
      //             "$and": [
      //               { "assignees.5.approved": false },
      //               { "assignees.4.approved": false },
      //               { "assignees.3.approved": false },
      //               { "assignees.1.approved": false },
      //               { "assignees.1.evaluator_approved": true },
      //               { "status": "Disapproved" }
      //             ]
      //           }
      //         ]
      //       }
      //     ]
      //   }
      // },
      {
        $lookup: {
          from: "sms-school",
          localField: "designation.school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
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
          school: "$school.title",
          control_number: 1,
          status: 1,
          full_name: 1,
          last_name: "$personal_information.last_name",
          first_name: "$personal_information.first_name"
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
          from: "sms-school",
          localField: "designation.school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
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
          school: "$school.title",
          control_number: 1,
          status: 1,
          full_name: 1,
          last_name: "$personal_information.last_name",
          first_name: "$personal_information.first_name"
        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_RECOMMENDING(division_id: ObjectId) {
    return await Database.collection('applicant')?.aggregate([
      {
        $match: {
          $and: [
            { "designation.division": division_id },
            { "assignees.3.approved": true },
            { "assignees.4.approved": { "$eq": null } },
            { status: "Recommending for Approval" }
          ]
        }
      },
      {
        $lookup: {
          from: "sms-school",
          localField: "designation.school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
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
          school: "$school.title",
          control_number: 1,
          status: 1,
          full_name: 1,
          last_name: "$personal_information.last_name",
          first_name: "$personal_information.first_name"
        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_APPROVER(division_id: ObjectId) {
    return await Database.collection('applicant')?.aggregate([
      {
        $match: {
          $and: [
            { "designation.division": division_id },
            { "assignees.4.approved": true },
            { "assignees.5.approved": { "$eq": null } },
            { "assignees.9.approved": { "$ne": true } },
            { "status": "For Approval" }

          ]
        }
      },
      // {
      //   $match: {
      //     $and: [

      //       {
      //         $or: [
      //           { "designation.division": division_id },
      //           { "assignees.4.approved": true },
      //           { "assignees.5.approved": { "$eq": null } },
      //           {
      //             $and: [
      //               { "assignees.6.approved": false },
      //               { "assignees.5.approved": true }
      //             ]
      //           }
      //         ]
      //       },
      //       { status: { $in: ["For Approval", "Disapproved"] } }
      //     ]
      //   }
      // },
      // {
      //   "$match": {

      //     "$and": [
      //       { "designation.division": division_id },
      //       { "assignees.4.approved": true },
      //       { "assignees.5.approved": { "$eq": null } },
      //       { "status": "For Approval" }
      //     ]
      //   }
      // },
      // {
      //   "$match": {
      //     "$and": [
      //       { "assignees.6.approved": false },
      //       { "assignees.5.approved": true },
      //       { "status": "Disapproved" }
      //     ]
      //   }
      // },


      // {
      //   $match: {
      //     $and: [
      //       { "designation.division": division_id },
      //       { "assignees.4.approved": true },
      //       { "assignees.5.approved": null },
      //       { status: "For Approval" }

      //     ]
      //   }
      // },
      {
        $lookup: {
          from: "sms-school",
          localField: "designation.school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
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
          school: "$school.title",
          control_number: 1,
          status: 1,
          full_name: 1,
          last_name: "$personal_information.last_name",
          first_name: "$personal_information.first_name"
        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_ADMIN_5() {
    return await Database.collection('applicant')?.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                { "assignees.5.approved": true },
                { $and: [{ "assignees.7.approved": { "$eq": null } }, { "assignees.6.evaluator_approved": true }] },
                { $and: [{ "assignees.7.approved": false }, { "assignees.5.approved": true }] }
              ]
            },
            { status: { $in: ["Completed", "For Checking", "Dissapproved"] } }
          ]
        }
      },
      {
        $lookup: {
          from: "sms-school",
          localField: "designation.school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
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
          school: "$school.title",
          control_number: 1,
          status: 1,
          full_name: 1,
          last_name: "$personal_information.last_name",
          first_name: "$personal_information.first_name"
        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_EVALUATOR_RO(user_id: any) {
    return await Database.collection('applicant')?.aggregate([
      {
        $match: {
          $and: [

            {
              $or: [
                { "assignees.7.id": new ObjectId(user_id) },
                { "assignees.6.approved": true },
                { "assignees.7.approved": { "$eq": null } },
                { $and: [{ "assignees.10.approved": false }, { "assignees.9.approved": false }, { "assignees.8.approved": false }, { "assignees.6.approved": true }] }
              ]
            },
            { status: { $in: ["For Evaluation", "Dissapproved"] } }

          ]
        }
      },
      {
        $lookup: {
          from: "sms-school",
          localField: "designation.school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
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
          school: "$school.title",
          control_number: 1,
          status: 1,
          full_name: 1,
          last_name: "$personal_information.last_name",
          first_name: "$personal_information.first_name"
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
            { status: "For Verifying" }
          ]
        }
      },
      {
        $lookup: {
          from: "sms-school",
          localField: "designation.school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
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
          school: "$school.title",
          control_number: 1,
          status: 1,
          full_name: 1,
          last_name: "$personal_information.last_name",
          first_name: "$personal_information.first_name"
        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_RECOMMENDING_APPROVER_RO() {
    return await Database.collection('applicant')?.aggregate([
      {
        $match: {

          $and: [
            { "assignees.8.approved": true },
            { "assignees.9.approved": { "$eq": null } },
            { status: "Recommending for Approval" }
          ]
        }
      },
      {
        $lookup: {
          from: "sms-school",
          localField: "designation.school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
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
          school: "$school.title",
          control_number: 1,
          status: 1,
          full_name: 1,
          last_name: "$personal_information.last_name",
          first_name: "$personal_information.first_name"
        },
      },
    ]).toArray();
  };
  private static async GET_PENDING_APPROVER_RO() {
    return await Database.collection('applicant')?.aggregate([
      {
        $match: {
          $and: [
            { $or: [{ "assignees.9.approved": true }, { $and: [{ "assignees.10.approved": true }] }] },
            { status: { $in: ["For Approval", "Completed"] } }
          ]
        }
      },
      {
        $lookup: {
          from: "sms-school",
          localField: "designation.school",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
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
          school: "$school.title",
          control_number: 1,
          status: 1,
          full_name: 1,
          last_name: "$personal_information.last_name",
          first_name: "$personal_information.first_name"
        },
      },
    ]).toArray();
  };
  /**
   * APPLICATION PROCCESS
   */
  static async HANDLE_PRINCIPAL(data: any, user: ObjectId) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.PRINCIPAL) return Promise.reject({ data: null, error: "Not principal" });

    const { app_id, attachment } = data;
    const statuses: boolean[] = [];
    const attachment_log: any[] = [];

    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks) {
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
      status: "",
      remarks: attachment_log,
      timestamp: new Date()
    };
    const filter_null = statuses.filter(status => status === null);
    const status = !statuses.includes(false) && filter_null.length > 0;


    const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
      {
        $set: {
          "assignees.0.approved": status,
          "assignees.0.timestamp": new Date(),
          status: status === true ? "Pending" : "Dissapproved",
          attachments: attachment,
          sdo_attachments: data.sdo_attachment,
        },
        $push: {
          request_log: request_logs,
          "assignees.0.remarks": { $each: attachment_log },
        },

      });
    if (!result?.modifiedCount) return Promise.reject("Failed to Approve")
    attachment_log.length = 0;
    return Promise.resolve("Successfully submitted to Schools Division Office!")

  };
  static async HANDLE_ADMIN4(data: any, user: ObjectId) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.ADMIN_4) return Promise.reject({ data: null, error: "Not principal" });
    const { app_id, attachment } = data;
    const statuses: boolean[] = [];
    const attachment_log: any[] = [];

    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks) {
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
      status: "",
      remarks: attachment_log,
      timestamp: new Date()
    };


    const status = !statuses.includes(false);


    if (data.sdo_attachment && designation.side === SIDE.SDO) {
      const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.1.evaluator_approved": status,
            status: status === true ? 'For Verifying' : 'Dissapproved',
            attachments: attachment,
            "assignees.1.timestamp": new Date(),
            sdo_attachments: data.sdo_attachment
          },
          $push: {
            "assignees.1.remarks": { $each: attachment_log },
            request_log: request_logs
          }
        });

      if (!result?.modifiedCount) return Promise.reject("Failed to verify!")
      return Promise.resolve("Successfully Checked!")
    };

    const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
      {
        $set: {
          "assignees.1.evaluator_approved": status,
          status: status === true ? 'For Verifying' : 'Dissapproved',
          attachments: attachment,
          "assignees.1.timestamp": new Date()
        },
        $push: {
          "assignees.1.remarks": { $each: attachment_log },
          request_log: request_logs
        }
      });

    if (!result?.modifiedCount) return Promise.reject("Failed to verify!")
    return Promise.resolve("Successfully Checked!")
  };


  static async HANDLE_EVALUATOR(data: any, user: ObjectId) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.EVALUATOR) return Promise.reject({ data: null, error: "Not Evaluator" });

    const { app_id, attachment, sdo_attachments } = data;
    const statuses: boolean[] = [];
    const attachment_log: any[] = [];

    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks) {
        attachment_log.push({
          description: v.description,
          remarks: v.remarks,
          timestamp: new Date()
        });
      }
    });

    if (!designation.side) return Promise.reject({ data: null, error: "Could not resolve side" });

    const request_logs = {
      signatory: designation.name,
      role: designation.role_name,
      side: designation.side,
      status: "",
      remarks: attachment_log,
      timestamp: new Date()
    };
    const filter_null = statuses.filter(status => status !== null);
    const status = !statuses.includes(false) && filter_null.length > 0;


    if (designation.side === SIDE.SDO) {
      const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.1.evaluator_approved": true,
            "assignees.2.approved": status,
            "assignees.2.timestamp": new Date(),
            status: status === true ? 'For Checking' : 'Dissapproved',
            attachments: attachment,
            sdo_attachments: sdo_attachments
          },
          $push: {
            "assignees.2.remarks": { $each: attachment_log },
            request_log: request_logs,
          }

        });
      if (!result?.modifiedCount) return Promise.reject("Failed to submit")
      return Promise.resolve("Successfully Evaluated! ");
    };


    const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
      {
        $set: {
          "assignees.6.evaluator_approved": status,
          "assignees.7.approved": status,
          "assignees.7.timestamp": new Date(),
          status: status === true ? 'For Checking' : 'Dissapproved',
          attachments: attachment,

        },
        $push: {
          "assignees.7.remarks": { $each: attachment_log },
          request_log: request_logs,
        }
      });
    if (!result?.modifiedCount) return Promise.reject("Failed to submit")
    return Promise.resolve("Successfully Evaluated! ");

  };

  static async HANDLE_VERIFIER(data: any, user: ObjectId) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.VERIFIER) return Promise.reject({ data: null, error: "Not Verifier" });
    const { attachment, app_id } = data;

    const statuses: boolean[] = [];
    const attachment_log: any[] = [];

    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks) {
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
      status: "",
      remarks: attachment_log,
      timestamp: new Date()
    };
    const filter_null = statuses.filter(status => status === null);
    const status = !statuses.includes(false) && filter_null.length > 0;

    if (data.sdo_attachment && designation.side === SIDE.SDO) {
      const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.3.approved": status,
            status: status === true ? 'Recommending for Approval' : 'Dissapproved',
            "assignees.3.timestamp": new Date(),
            attachments: attachment,
            sdo_attachments: data.sdo_attachment
          },
          $push: {
            "assignees.3.remarks": { $each: attachment_log },
            request_log: request_logs
          }
        });

      if (!result?.modifiedCount) return Promise.reject("Failed to Recommend for  Approval")
      return Promise.resolve("Successfully Recommended!")
    };
    const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
      {
        $set: {
          "assignees.8.approved": status,
          status: status === true ? 'Recommending for Approval' : 'Dissapproved',
          "assignees.8.timestamp": new Date(),
          attachments: attachment,
        },
        $push: {
          "assignees.8.remarks": { $each: attachment_log },
          request_log: request_logs
        }
      });

    if (!result?.modifiedCount) return Promise.reject("Failed to Recommend for  Approval")
    return Promise.resolve("Successfully Recommended!")

  };

  static async HANDLE_RECOMMENDING_APPROVER(data: any, user: ObjectId) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.RECOMMENDING_APPROVER) return Promise.reject({ data: null, error: "Not Recommending Approver" });
    const { attachment, app_id } = data;

    const statuses: boolean[] = [];
    const attachment_log: any[] = [];

    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks) {
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
      status: "",
      remarks: attachment_log,
      timestamp: new Date()
    };

    const filter_null = statuses.filter(status => status === null);
    const status = !statuses.includes(false) && filter_null.length > 0;


    if (data.sdo_attachment && designation.side === 'SDO') {
      const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.4.approved": status,
            status: status ? 'For Approval' : 'Disapproved',
            "assignees.4.timestamp": new Date(),
            attachments: attachment,
            sdo_attachments: data.sdo_attachment

          },
          $push: {
            "assignees.4.remarks": { $each: attachment_log },
            request_log: request_logs
          }
        });

      if (!result?.modifiedCount) return Promise.reject("Failed to approve approver")
      return Promise.resolve("Successdully SDO Recommended!")
    } else {
      const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.9.approved": status,
            status: status ? 'For Approval' : 'Disapproved',
            "assignees.9.timestamp": new Date(),
            attachments: attachment,

          },
          $push: {
            "assignees.9.remarks": { $each: attachment_log },
            request_log: request_logs
          }
        });

      if (!result?.modifiedCount) return Promise.reject("Failed to approve approver")
      return Promise.resolve("Successdully Recommended!")
    }

  };
  static async HANDLE_APPROVER(data: any, user: ObjectId) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.APPROVER) return Promise.reject({ data: null, error: "Not  Approver" });
    const { attachment, app_id } = data;

    const statuses: boolean[] = [];
    const attachment_log: any[] = [];

    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks) {
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
      status: "",
      remarks: attachment_log,
      timestamp: new Date()
    };

    const filter_null = statuses.filter(status => status === null);
    const status = !statuses.includes(false) && filter_null.length > 0;

    const samp = true
    if (data.sdo_attachment && designation.side === 'SDO') {

      const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.5.approved": status,
            status: status ? 'Completed' : 'Disapproved',
            "assignees.5.timestamp": new Date(),
            attachments: attachment,
            sdo_attachments: data.sdo_attachment

          },
          $push: {
            "assignees.5.remarks": { $each: attachment_log },
            request_log: request_logs
          }
        });

      if (!result?.modifiedCount) return Promise.reject("Failed to approve approver")
      return Promise.resolve("Successdully SDO Approved!")
    } else {

      const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
        {
          $set: {
            "assignees.10.approved": status,
            status: status ? 'Completed' : 'Disapproved',
            "assignees.10.timestamp": new Date(),
            attachments: attachment,

          },
          $push: {
            "assignees.10.remarks": { $each: attachment_log },
            request_log: request_logs
          }
        });

      if (!result?.modifiedCount) return Promise.reject("Failed to approve approver")
      return Promise.resolve("Successdully Approved!")
    }

  };




  static async HANDLE_ADMIN5(data: any, user: ObjectId) {
    const { data: designation, error: designation_error } = await App.GET_DESIGNATION(user);
    if (designation_error) return Promise.reject({ data: null, error: designation_error });
    if (designation?.role_name !== ROLES.ADMIN_5) return Promise.reject({ data: null, error: "Not Administrative Officer V" });
    const { app_id, attachment } = data;
    const statuses: boolean[] = [];
    const attachment_log: any[] = [];

    Object.entries(attachment).forEach(([k, v]: [any, any]) => {
      statuses.push(v.valid);
      if (!v.valid && v.remarks) {
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
      status: "",
      remarks: attachment_log,
      timestamp: new Date()
    };


    const status = !statuses.includes(false)

    const result = await Database.collection('applicant')?.updateOne({ _id: new ObjectId(app_id) },
      {
        $set: {
          "assignees.6.evaluator_approved": status,
          status: status === true ? "For Verifying" : "Dissapproved",
          attachments: attachment,
          "assignees.6.timestamp": new Date()
        },
        $push: {
          "assignees.6.remarks": { $each: attachment_log },
          request_log: request_logs
        }
      });

    if (!result?.modifiedCount) return Promise.reject("Failed to verify!")
    return Promise.resolve("Successfully Checked!")
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
                  "$middle_name",
                  " ",
                  "$last_name",
                  " ",
                  "$appelation",
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
          school_id:
            "$designation_information.school",
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