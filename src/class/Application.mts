import { MenusSubsystemSelect } from './../../../frontend/.nuxt/components.d';
import Database from "@lib/database.mjs";
import { ObjectId } from "mongodb";

export default class Application {

  static async get_assignees(school_id: ObjectId, division: ObjectId): Promise<{ data: any, error: any }> {
    // Principal
    const { data: principal_data, error: principal_error } = await Application.get_school_principal(school_id);
    if (principal_error) return Promise.reject({ data: null, error: principal_error });
    // Administrative Officer IV
    const { data: admin4_data, error: admin4_error } = await Application.get_admin_4(division);
    if (admin4_error) return Promise.reject({ data: null, error: admin4_error });
    // Evaluator
    const { data: evaluator_data, error: evaluator_error } = await Application.get_evaluator(division);
    if (evaluator_error) return Promise.reject({ data: null, error: evaluator_error });
    // Verifier
    const { data: verifier_data, error: verifier_error } = await Application.get_verifier(division);
    if (verifier_error) return Promise.reject({ data: null, error: verifier_error });
    // Recommending Approver
    const { data: recommender_data, error: recommender_error } = await Application.get_recommender(division);
    if (recommender_error) return Promise.reject({ data: null, error: recommender_error })
    //  Approver
    const { data: approver_data, error: approver_error } = await Application.get_approver(division);
    if (approver_error) return Promise.reject({ data: null, error: approver_error })

    const assignees = [
      {
        name: "Principal",
        id: principal_data,
        approved: false,
        remarks: [],
        timestamp: "",

      },
      {
        name: "Administrative Officer IV",
        id: admin4_data,
        approved: false,
        evaluator_approved: false,
        remarks: [],
        timestamp: "",
      },
      {
        name: "Evaluator",
        id: evaluator_data,
        approved: false,
        remarks: [],
        timestamp: "",
      },
      {
        name: "Verifier",
        id: verifier_data,
        approved: false,
        remarks: [],
        timestamp: "",
      },
      {
        name: "Recommending Approver",
        id: recommender_data,
        approved: false,
        remarks: [],
        timestamp: "",
      },
      {
        name: "Approver",
        id: approver_data,
        approved: false,
        remarks: [],
        timestamp: "",
      },
      //RO 6
      {
        name: "Administrative Officer V",
        id: admin4_data,
        approved: false,
        evaluator_approved: false,
        remarks: [],
        timestamp: "",
      },
      {
        name: "Evaluator",
        id: evaluator_data,
        approved: false,
        remarks: [],
        timestamp: "",
      },
      {
        name: "Verifier",
        id: verifier_data,
        approved: false,
        remarks: [],
        timestamp: "",
      },
      {
        name: "Recommending Approver",
        id: recommender_data,
        approved: false,
        remarks: [],
        timestamp: "",
      },
      {
        name: "Approver",
        id: approver_data,
        approved: false,
        remarks: [],
        timestamp: "",
      },
    ]
    return Promise.resolve({ data: assignees, error: null });
  }
  // Get principal
  private static async get_school_principal(school_id: ObjectId): Promise<{ data: ObjectId, error: any }> {
    const role = await Database.collection("ap-templates")?.findOne({ name: "Principal" }, { projection: { _id: 1 } });
    if (!role) return Promise.reject({ data: null, error: "Could not find principal role" });

    const school_principal = await Database.collection('users')?.findOne({ $and: [{ "designation_information.school": school_id }, { role: role._id }] },);
    if (!school_principal) return Promise.reject({ data: null, error: "Failed to find school principal" });
    return Promise.resolve({ data: school_principal._id, error: null })
  }
  // Get Admin 4
  private static async get_admin_4(division: ObjectId): Promise<{ data: ObjectId, error: any }> {
    const role = await Database.collection("ap-templates")?.findOne({ name: "Administrative Officer IV" }, { projection: { _id: 1 } });
    if (!role) return Promise.reject({ data: null, error: "Could not find administrative officer role" });

    const sdo_admin = await Database.collection('users')?.findOne({ $and: [{ "designation_information.division": division }, { role: role._id }] },);
    if (!sdo_admin) return Promise.reject({ data: null, error: "Failed to find school principal" });
    return Promise.resolve({ data: sdo_admin._id, error: null })
  }

  // Get Evaluator
  private static async get_evaluator(division: ObjectId): Promise<{ data: ObjectId, error: any }> {
    const role = await Database.collection("ap-templates")?.findOne({ name: "Evaluator" }, { projection: { _id: 1 } });
    if (!role) return Promise.reject({ data: null, error: "Could not find administrative officer role" });

    const sdo_admin = await Database.collection('users')?.findOne({ $and: [{ "designation_information.division": division }, { role: role._id }] },);
    if (!sdo_admin) return Promise.reject({ data: null, error: "Failed to find Administrative Officer IV" });
    return Promise.resolve({ data: sdo_admin._id, error: null })

  }
  // Get Verifier
  private static async get_verifier(division: ObjectId): Promise<{ data: ObjectId, error: any }> {
    const role = await Database.collection("ap-templates")?.findOne({ name: "Verifier" }, { projection: { _id: 1 } });
    if (!role) return Promise.reject({ data: null, error: "Could not find administrative officer role" });

    const sdo_admin = await Database.collection('users')?.findOne({ $and: [{ "designation_information.division": division }, { role: role._id }] },);
    if (!sdo_admin) return Promise.reject({ data: null, error: "Failed to find Evaluator" });
    return Promise.resolve({ data: sdo_admin._id, error: null })
  }
  // Get Recommending Approver
  private static async get_recommender(division: ObjectId): Promise<{ data: ObjectId, error: any }> {
    const role = await Database.collection("ap-templates")?.findOne({ name: "Recommending Approver" }, { projection: { _id: 1 } });
    if (!role) return Promise.reject({ data: null, error: "Could not find verifier role" });

    const sdo_admin = await Database.collection('users')?.findOne({ $and: [{ "designation_information.division": division }, { role: role._id }] },);
    if (!sdo_admin) return Promise.reject({ data: null, error: "Failed to find Verifier" });
    return Promise.resolve({ data: sdo_admin._id, error: null })
  }
  // Get  Approver
  private static async get_approver(division: ObjectId): Promise<{ data: ObjectId, error: any }> {
    const role = await Database.collection("ap-templates")?.findOne({ name: "Approver" }, { projection: { _id: 1 } });
    if (!role) return Promise.reject({ data: null, error: "Could not find verifier role" });

    const sdo_admin = await Database.collection('users')?.findOne({ $and: [{ "designation_information.division": division }, { role: role._id }] },);
    if (!sdo_admin) return Promise.reject({ data: null, error: "Failed to find Recommending Approver" });
    return Promise.resolve({ data: sdo_admin._id, error: null })
  }
  // SCHOOL DIVISION OFFICE
  /**
   * REGIONAL OPFFICE
   */

  static async get_ro_admin5(): Promise<{ data: ObjectId, error: any }> {
    const result = await Database.collection('ap-templates')?.aggregate([
      {
        $match: { name: "Administrative Officer V" }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "role",
          as: "user"
        }
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          id: "$user._id"
        }
      }
    ]).toArray();

    if (!result?.length) return Promise.reject({ data: null, error: "Could not find admin 5" });
    return Promise.resolve({ data: result[0].id, error: null })
  };

  static async get_requests(user_id: ObjectId): Promise<{ data: any, error: any }> {
    const { data: role, error: role_error } = await Application.get_role(user_id);
    if (role_error) return Promise.reject({ data: null, error: role_error });
    const name = role.name;

    let requests;
    switch (name) {
      case "Principal":
        requests = await Application.get_principal_pending(user_id);
        break;

      case "Administrative Officer IV":
        requests = await Application.get_admin_4_pending(user_id);
        break;

      case "Evaluator":
        requests = await Application.get_evaluator_pending(user_id);
        break;

      case "Verifier":
        requests = await Application.get_verifier_pending(user_id);
        break;


      case "Recommending Approver":
        requests = await Application.get_recommending_approver_pending(user_id);
        break;

      case "Approver":
        requests = await Application.get_approver_pending(user_id);
        break;

      default:
        requests = [];
        break;
    }

    return Promise.resolve({ data: requests, error: null })
  }
  private static async get_role(id: ObjectId): Promise<{ data: any, error: any }> {

    const result = await Database.collection('users')?.aggregate(
      [
        {
          $match: {
            _id: id
          }
        },
        {
          $lookup: {
            from: 'ap-templates',
            localField: "role",
            foreignField: "_id",
            as: "role"
          }
        },
        {
          $unwind: {
            path: "$role",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $project: {
            _id: 0,
            name: "$role.name"
          }
        }
      ]
    ).toArray();
    if (!result?.length) return Promise.reject({ data: null, error: "Failed to resolve role" });
    return Promise.resolve({ data: { ...result[0] }, error: null })
  }
  private static async get_principal_pending(user_id: ObjectId) {

    return await Database.collection('users')?.aggregate(
      [
        {
          $match: {
            _id: user_id,
          },
        },
        {
          $lookup: {
            from: "applicant",
            let: {
              division:
                "$designation_information.division",
              school: "$designation_information.school",
            },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: {
                        $eq: [
                          "$designation.division",
                          "$$division",
                        ],
                      },
                    },
                    {
                      $expr: {
                        $eq: [
                          "$designation.school",
                          "$$school",
                        ],
                      },
                    },
                    { "assignees.0.approved": false },
                    { status: "For Signature" }
                  ],
                },
              },
            ],
            as: "requests",
          },
        },
        {
          $project: {
            _id: 0,
            requests: 1,
          },
        },
        {
          $unwind: {
            path: "$requests",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "sms-qualification-standards",
            localField: "requests.qualification.position",
            foreignField: "_id",
            as: "position",
          },
        },
        {
          $lookup: {
            from: "sms-school",
            localField: "requests.designation.school",
            foreignField: "_id",
            as: "school",
          },
        },
        {
          $lookup: {
            from: "sms-sdo",
            localField: "requests.designation.division",
            foreignField: "_id",
            as: "division",
          },
        },

        {
          $unwind: {
            path: "$position",
            preserveNullAndEmptyArrays: true,
          },
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
            _id: "$requests._id",
            position: "$position.title",
            control_number: "$requests.control_number",
            division: "$division.title",
            school: "$school.title",
            status: "$requests.status",
            first_name: "$requests.personal_information.first_name",
            last_name: "$requests.personal_information.last_name"

          },
        },
      ]
    ).toArray();
  }
  private static async get_admin_4_pending(user_id: ObjectId) {
    return await Database.collection('users')?.aggregate(
      [
        {
          $match: {
            _id: user_id,
          },
        },
        {
          $lookup: {
            from: "applicant",
            let: {
              division:
                "$designation_information.division",

            },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: {
                        $eq: [
                          "$designation.division",
                          "$$division",
                        ],
                      },
                    },
                    { $or: [{ "assignees.0.approved": true }, { $and: [{ "assignees.2.approved": true }, { "assignees.1.evaluator_approved": true }] }] },
                    { status: { $in: ["Pending", "For Checking"] } }
                  ],
                },
              },
            ],
            as: "requests",
          },
        },
        {
          $project: {
            _id: 0,
            requests: 1,
          },
        },
        {
          $unwind: {
            path: "$requests",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "sms-qualification-standards",
            localField: "requests.qualification.position",
            foreignField: "_id",
            as: "position",
          },
        },
        {
          $lookup: {
            from: "sms-school",
            localField: "requests.designation.school",
            foreignField: "_id",
            as: "school",
          },
        },
        {
          $lookup: {
            from: "sms-sdo",
            localField: "requests.designation.division",
            foreignField: "_id",
            as: "division",
          },
        },

        {
          $unwind: {
            path: "$position",
            preserveNullAndEmptyArrays: true,
          },
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
            _id: "$requests._id",
            position: "$position.title",
            control_number: "$requests.control_number",
            division: "$division.title",
            school: "$school.title",
            status: "$requests.status",
            first_name: "$requests.personal_information.first_name",
            last_name: "$requests.personal_information.last_name"
          },
        },
      ]
    ).toArray();
  }
  private static async get_evaluator_pending(user_id: ObjectId) {
    return await Database.collection('users')?.aggregate(
      [
        {
          $match: {
            _id: user_id,
          },
        },
        {
          $lookup: {
            from: "applicant",
            let: {
              division:
                "$designation_information.division",

            },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: {
                        $eq: [
                          "$designation.division",
                          "$$division",
                        ],
                      },
                    },
                    { "assignees.1.approved": true },
                    { status: "For Evaluation" }
                  ],
                },
              },
            ],
            as: "requests",
          },
        },
        {
          $project: {
            _id: 0,
            requests: 1,
          },
        },
        {
          $unwind: {
            path: "$requests",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "sms-qualification-standards",
            localField: "requests.qualification.position",
            foreignField: "_id",
            as: "position",
          },
        },
        {
          $lookup: {
            from: "sms-school",
            localField: "requests.designation.school",
            foreignField: "_id",
            as: "school",
          },
        },
        {
          $lookup: {
            from: "sms-sdo",
            localField: "requests.designation.division",
            foreignField: "_id",
            as: "division",
          },
        },

        {
          $unwind: {
            path: "$position",
            preserveNullAndEmptyArrays: true,
          },
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
            _id: "$requests._id",
            position: "$position.title",
            control_number: "$requests.control_number",
            division: "$division.title",
            school: "$school.title",
            status: "$requests.status",
            first_name: "$requests.personal_information.first_name",
            last_name: "$requests.personal_information.last_name"
          },
        },
      ]
    ).toArray();
  }

  private static async get_verifier_pending(user_id: ObjectId) {
    return await Database.collection('users')?.aggregate(
      [
        {
          $match: {
            _id: user_id,
          },
        },
        {
          $lookup: {
            from: "applicant",
            let: {
              division:
                "$designation_information.division",

            },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: {
                        $eq: [
                          "$designation.division",
                          "$$division",
                        ],
                      },
                    },
                    { $and: [{ "assignees.2.approved": true }, { "assignees.1.evaluator_approved": true }, { "assignees.1.approved": true }] },
                    { status: "For Verifying" }
                  ],
                },
              },
            ],
            as: "requests",
          },
        },
        {
          $project: {
            _id: 0,
            requests: 1,
          },
        },
        {
          $unwind: {
            path: "$requests",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "sms-qualification-standards",
            localField: "requests.qualification.position",
            foreignField: "_id",
            as: "position",
          },
        },
        {
          $lookup: {
            from: "sms-school",
            localField: "requests.designation.school",
            foreignField: "_id",
            as: "school",
          },
        },
        {
          $lookup: {
            from: "sms-sdo",
            localField: "requests.designation.division",
            foreignField: "_id",
            as: "division",
          },
        },

        {
          $unwind: {
            path: "$position",
            preserveNullAndEmptyArrays: true,
          },
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
            _id: "$requests._id",
            position: "$position.title",
            control_number: "$requests.control_number",
            division: "$division.title",
            school: "$school.title",
            status: "$requests.status",
            first_name: "$requests.personal_information.first_name",
            last_name: "$requests.personal_information.last_name"
          },
        },
      ]
    ).toArray();
  }
  private static async get_recommending_approver_pending(user_id: ObjectId) {
    return await Database.collection('users')?.aggregate(
      [
        {
          $match: {
            _id: user_id,
          },
        },
        {
          $lookup: {
            from: "applicant",
            let: {
              division:
                "$designation_information.division",

            },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: {
                        $eq: [
                          "$designation.division",
                          "$$division",
                        ],
                      },
                    },
                    { "assignees.3.approved": true },
                    { status: "Recommending for Approval" }
                  ],
                },
              },
            ],
            as: "requests",
          },
        },
        {
          $project: {
            _id: 0,
            requests: 1,
          },
        },
        {
          $unwind: {
            path: "$requests",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "sms-qualification-standards",
            localField: "requests.qualification.position",
            foreignField: "_id",
            as: "position",
          },
        },
        {
          $lookup: {
            from: "sms-school",
            localField: "requests.designation.school",
            foreignField: "_id",
            as: "school",
          },
        },
        {
          $lookup: {
            from: "sms-sdo",
            localField: "requests.designation.division",
            foreignField: "_id",
            as: "division",
          },
        },

        {
          $unwind: {
            path: "$position",
            preserveNullAndEmptyArrays: true,
          },
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
            _id: "$requests._id",
            position: "$position.title",
            control_number: "$requests.control_number",
            division: "$division.title",
            school: "$school.title",
            status: "$requests.status",
            first_name: "$requests.personal_information.first_name",
            last_name: "$requests.personal_information.last_name"
          },
        },
      ]
    ).toArray();
  }
  private static async get_approver_pending(user_id: ObjectId) {
    return await Database.collection('users')?.aggregate(
      [
        {
          $match: {
            _id: user_id,
          },
        },
        {
          $lookup: {
            from: "applicant",
            let: {
              division:
                "$designation_information.division",

            },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: {
                        $eq: [
                          "$designation.division",
                          "$$division",
                        ],
                      },
                    },
                    // { "assignees.4.approved": true },
                    // { status: "For Approval" },
                    // { "assignees.5.approved": true },
                    // { status: "Completed" }
                    { $or: [{ "assignees.4.approved": true }, { $and: [{ "assignees.5.approved": true }] }] },
                    { status: { $in: ["For Approval", "Completed"] } }

                  ],
                },
              },
            ],
            as: "requests",
          },
        },
        {
          $project: {
            _id: 0,
            requests: 1,
          },
        },
        {
          $unwind: {
            path: "$requests",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "sms-qualification-standards",
            localField: "requests.qualification.position",
            foreignField: "_id",
            as: "position",
          },
        },
        {
          $lookup: {
            from: "sms-school",
            localField: "requests.designation.school",
            foreignField: "_id",
            as: "school",
          },
        },
        {
          $lookup: {
            from: "sms-sdo",
            localField: "requests.designation.division",
            foreignField: "_id",
            as: "division",
          },
        },

        {
          $unwind: {
            path: "$position",
            preserveNullAndEmptyArrays: true,
          },
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
            _id: "$requests._id",
            position: "$position.title",
            control_number: "$requests.control_number",
            division: "$division.title",
            school: "$school.title",
            status: "$requests.status",
            first_name: "$requests.personal_information.first_name",
            last_name: "$requests.personal_information.last_name"
          },
        },
      ]
    ).toArray();
  }

}

