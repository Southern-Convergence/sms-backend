import Database from "@lib/database.mjs";
import { ObjectId } from "mongodb";

interface Designation {
  name: string;
  division_id: ObjectId;
  school_id: ObjectId;
  role_name: string;
  role_id: ObjectId;
  side: string;
};


export async function user_desig_resolver(user: ObjectId) {
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
  ]).next();

  if (!designation) return Promise.reject({ data: null, error: "Failed to locate designation" });
  return Promise.resolve({ data: designation as Designation, error: null })
}

