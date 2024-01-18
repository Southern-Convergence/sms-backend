import Database from "@lib/database.mjs";
import { ObjectId } from "mongodb";

export default class Application {


  public static async apply(applicant: any) {


    const { data: assignees, error: assignees_error } = await Application.get_assignees(new ObjectId(applicant.designation.school), new ObjectId(applicant.designation.division));
    applicant.assigness = assignees
    return Promise.resolve("Succesfully applied for this shit")
  }

  private static async get_assignees(school_id: ObjectId, division: ObjectId): Promise<{ data: any, error: any }> {
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


    const assignees = [
      {
        name: "Principal",
        id: principal_data,
        approved: false,
        remarks: "",
        timestamp: "",
      },
      {
        name: "Administrative Officer IV",
        id: admin4_data,
        approved: false,
        evaluator_approved: false,
        remarks: "",
        timestamp: "",
      },
      {
        name: "Evaluator",
        id: evaluator_data,
        approved: false,
        remarks: "",
        timestamp: "",
      },
      {
        name: "Verifier",
        id: verifier_data,
        approved: false,
        remarks: "",
        timestamp: "",
      },
      {
        name: "Recommending Approver",
        id: recommender_data,
        approved: false,
        remarks: "",
        timestamp: "",
      },
      {
        name: "Approver",
        id: "",
        approved: false,
        remarks: "",
        timestamp: "",
      },
    ]
    console.log(assignees);

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

}

