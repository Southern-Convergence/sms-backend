import { ObjectId } from "mongodb";
import { ALLOWED_ORIGIN, EMAIL_TRANSPORT } from "@cfg/index.mjs";
import Joi from "joi";
import { REST } from "sfr";
import { object_id } from "@lib/api-utils.mjs";
import multers from "@lib/multers.mjs";
import { assemble_upload_params } from "@utils/index.mjs";
import { v4 } from "uuid";
const MAX_STEP = 8;

/* @ts-ignore */
const img = multers["rsa-esig"];

export default REST({
  validators: {
    "get-core-hris-metrics": {},
    "get-birthday-celebrants": {
      range: Joi.number(),
    },
    "get-users": {},
    "get-user": {},
    "get-users-by-age": {
      from: Joi.number(),
      to: Joi.number(),
    },

    "get-si-list": {
      from: Joi.date().allow(""),
      to: Joi.date().allow(""),
    },

    "get-tenure": {
      user_id: object_id,
    },

    //Dashboards
    "get-rnr-metrics": {
      year: Joi.number().required(),
    },

    //Administrative controls
    "invite-user": {
      first_name: Joi.string().required(),
      middle_name: Joi.string().allow(""),
      last_name: Joi.string().required(),
      appellation: Joi.string().allow(""),
      email: Joi.string().email().required(),

      domain: {
        id: object_id,
        name: Joi.string().required(),
      },
      apts: Joi.array().required(),
      group: Joi.any().allow(""),

      designation: {
        office: {
          name: Joi.string().required(),
          id: object_id,
        },
        unit: {
          name: Joi.string().required(),
          id: object_id,
        },
        position: {
          name: Joi.string().required(),
          id: object_id,
        },
      },
    },

    "deactivate-user": {
      user_id: object_id,
      reason: Joi.string().required(),
    },

    // Signatures
    "add-signatures": {
      user_id: object_id,
      signatures: Joi.string(),
    },

    "used-esig": {
      user_id: object_id,
      used_esig: Joi.string(),
    },

    "get-user-e-sig": {},
  },

  handlers: {
    GET: {
      async "get-core-hris-metrics"(_, res) {
        let data = await this.core_hris_metrics();
        res.json({ data });
      },

      async "get-birthday-celebrants"(req, res) {
        const { range } = req.query;
        const trail_length = Number(range) * 24 * 60 * 60 * 1000;
        const delta = new Date();

        let results = await this.get_birthdays();

        let celebrants = results
          ?.map((v) => {
            v.birthday = new Date(v.dob);
            v.birthday.setFullYear(delta.getFullYear());
            delete v.dob;

            return v;
          })
          .filter(
            (v) =>
              delta.getTime() - trail_length <= v.birthday.getTime() &&
              delta.getTime() + trail_length >= v.birthday.getTime()
          )
          .sort((a, b) => b.birthday.getTime() - a.birthday.getTime());

        res.json({ data: celebrants });
      },

      async "get-users"(_, res) {
        let data = await this.get_users();
        res.json({ data });
      },

      async "get-user"(req, res) {
        const _id = req.session.user?._id;
        this.get_user(_id || "")
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

      async "get-rnr-metrics"(req, res) {
        this.get_rnr_metrics(req.query.year)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },

      async "get-users-by-age"(req, res) {
        const { from, to } = req.query;

        const data = await this.get_user_age_and_designations();

        let results = data
          ?.filter((v: any) => {
            const age = get_age(v.dob);
            const [min, max] = [Number(from), Number(to)];

            return (min ? age >= min : true) && (max ? age <= max : true);
          })
          .map((v: any) => {
            const age = get_age(v.dob);

            const delta = new Date(v.dob);
            delta.setFullYear(new Date().getFullYear());
            delta.setFullYear(
              delta.getTime() < Date.now()
                ? delta.getFullYear() + 1
                : delta.getFullYear()
            );

            delete v.dob;
            return {
              ...v,
              next_birthday: delta.toDateString(),
              age,
            };
          });

        res.json({ data: results });
      },

      async "get-si-list"(req, res) {
        const { from, to } = req.query;

        const FROM = from ? new Date(from.toString()) : "";
        const TO = to ? new Date(to.toString()) : "";

        let data = await this.get_service_records();

        data = data?.map((v) => ({
          ...v,
          service_records: sanitize_records(v.records),
        }));

        //Algorithm: Derive Step Increment Eligibility from Service Record
        const incremented_result = data?.map((v) => {
          //Pre-process other data:

          /*
            Steps:
            * Derive Current Position
            * Project Step Increment in 3-year intervals.
            * Ascending Chronological sort of step-increment schedules.
          */

          //Derive Current Position
          //Get Latest Promotion, if none, original appointment is used.

          //Strategy: Onion Peeling
          let service_records = [...v.service_records];
          let current_position = null;
          while (!current_position && service_records.length) {
            const peel = service_records.pop();
            const is_appointment = peel.remarks === "Original Appointment";
            const is_promotion = peel.remarks === "Promotion";
            //Either will serve as basis for calculating the step increment schedule
            if (is_appointment || is_promotion) current_position = peel;
          }

          let increments = [];
          if (current_position && current_position.from) {
            const { step } = v.employee.compensation;

            for (let i = step; increments.length < MAX_STEP; i++) {
              const { from } = current_position;
              let sample = new Date(from);
              sample.setFullYear(sample.getFullYear() + i * 3);

              // Max Step is 8, calculations of schedule that goes beyond this are not allowed.
              const step_data = [sample.toDateString(), i + 1];

              if (i >= 8 || (TO && sample.getTime() > TO.getTime())) break;
              if (FROM && sample.getTime() >= FROM.getTime())
                increments.push(step_data);
              else if (!FROM) increments.push(step_data);
            }
          }

          return {
            ...v,
            increments,
          };
        });

        const result = incremented_result?.filter((v) => v.increments.length);

        res.json({ data: result });
      },

      async "get-tenure"(req, res) {
        const { user_id } = req.query;

        const records = await this.get_service_records_by_id(user_id);

        const duration = records?.reduce((a, { from, to }) => {
          if (!from || !to) return a;
          return a + (to - from) / 1000; //in seconds
        }, 0);

        const scales = [60, 60, 24, 30, 12];
        const scale_desc = ["Minute", "Hour", "Day", "Month", "Year"];

        scales.reduce((a, b, i) => {
          const temp = Number((a / b).toFixed(1));
          const scale = temp >= 2 ? `${scale_desc[i]}s` : scale_desc[i];
          scale_desc[i] = `${temp} ${scale}`;

          return temp;
        }, duration!);

        res.json({ data: scale_desc });
      },
      async "get-user-e-sig"(req, res) {
        const _id = req.session.user?._id;
        this.get_user_esig(_id || "")
          .then((data) => res.json({ data }))
          .catch((error) => console.log(error));
      },
    },

    POST: {
      async "invite-user"(req, res) {
        const { first_name, last_name, email, apts, group, designation } =
          req.body;

        const { user } = req.session;
        if (!user)
          return res
            .status(400)
            .json({ error: "Failed to invite user, invalid session." });

        const invitation_code = v4();

        const { office, unit, position } = designation;

        const item_number = await this.get_item_number(position.id);

        this.invite_user(req.body, invitation_code, user)
          .then(() => {
            this.postoffice[EMAIL_TRANSPORT].post(
              {
                from: "systems@mail.com",
                to: email,
                subject: "SMS Invitation",
              },
              {
                template: "hris-invite",
                layout: "default",
                context: {
                  invited_by_name: user.username,
                  invited_by_email: user.email,
                  invited_domain: "DepEd's HRIS System",

                  office: office.name,
                  unit: unit.name,
                  position: position.name,
                  item_number,

                  name: `${first_name} ${last_name}`,
                  roles: apts.map((v: any) => v.name).toString(),
                  group: group ? group.name : "None",
                  link: `${ALLOWED_ORIGIN}/onboarding?ref=${invitation_code}`,
                },
              }
            ).then(() => res.json({ data: "Successfully sent invitation" }));
          })
          .catch((error) => res.status(400).json({ error }));
      },
      "deactivate-user"(req, res) {
        const { user_id, reason } = req.body;

        this.deactivate_user(user_id, reason)
          .then(() => res.json({ data: "Successfully deactivated user." }))
          .catch(() =>
            res.status(400).json({ error: "Failed to deactivate user." })
          );
      },

      "add-signatures"(req, res) {
        const { user_id, signatures } = req.body;
        // if(req.file){
        //   /* @ts-ignore */
        //   this.spaces["hris"].upload(assemble_upload_params(req.file?.originalname, req.file!, "user-documents", user_id))
        // }
        // /* @ts-ignore */
        // let url;
        // if (req.file && req.file.fieldname) {
        //     url = `user-documents/${req.file.fieldname}/${user_id}`;
        // } else {
        //     url = signatures;
        // }

        /* @ts-ignore */
        this.add_signatures(user_id, signatures)
          .then(() => res.json({ data: "Sucessfully Added Signature." }))
          .catch(() =>
            res.status(400).json({ error: "Failed to Add Signature." })
          );
      },
    },

    PUT: {
      "used-esig"(req, res) {
        const { user_id, used_esig } = req.body;

        this.used_esig(user_id, used_esig)
          .then(() => res.json({ data: "Sucessfully Used Signature." }))
          .catch(() =>
            res.status(400).json({ error: "Failed to Add Signature." })
          );
      },
    },
  },

  controllers: {
    async core_hris_metrics() {
      const result: any = await this.db
        .collection("users")
        .aggregate([
          {
            $match: {
              type: "regional",
              designation_information: {
                $exists: true,
              },
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "designation_information.office",
              foreignField: "_id",
              as: "office",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "designation_information.unit",
              foreignField: "_id",
              as: "unit",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "designation_information.item_number",
              foreignField: "_id",
              as: "position",
            },
          },
          {
            $unwind: "$office",
          },
          {
            $unwind: "$unit",
          },
          {
            $unwind: "$position",
          },
          {
            $project: {
              office: "$office.name",
              unit: "$unit.name",
              position: "$position.name",
              dob: "$personal_information.dob",
              sex: "$personal_information.sex",
              birthplace: "$personal_information.birthplace",
              citizenship: "$personal_information.citizenship",
              religion: "$personal_information.religion",
              ethnicity: "$personal_information.ethnicity",
              civil_status: "$personal_information.civil_status",
              height: "$personal_information.height",
              weight: "$personal_information.weight",
              blood_type: "$personal_information.blood_type",
            },
          },
        ])
        .toArray();

      return result;
    },

    async get_users() {
      return this.db
        .collection("users")
        .aggregate([
          {
            $match: {
              type: "regional",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "designation_information.item_number",
              foreignField: "_id",
              as: "designation_information.item_number",
            },
          },
          {
            $unwind: "$designation_information.item_number",
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "designation_information.item_number.staffing.office",
              foreignField: "_id",
              as: "designation_information.office",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "designation_information.item_number.staffing.unit",
              foreignField: "_id",
              as: "designation_information.unit",
            },
          },
          {
            $unwind: "$designation_information.office",
          },
          {
            $unwind: {
              path: "$designation_information.unit",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$designation_information.item_number",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              appellation: 1,
              email: 1,
              agency_id: 1,
              status: 1,
              office: "$designation_information.office.name",
              unit: "$designation_information.unit.name",
              position:
                "$designation_information.item_number.plantilla.name",
              personal_information: {
                dob: 1,
                citizenship: 1,
                civil_status: 1,
                sex: 1,
                height: 1,
                weight: 1,
                ethnicity: 1,
                disabilities: 1,
              },
            },
          },
        ])
        .toArray();
    },

    async get_user(_id: string) {
      let temp = await this.db
        .collection("users")
        .aggregate([
          {
            $match: {
              _id: new ObjectId(_id),
            },
          },
          {
            $lookup: {
              from: "hris-rewards",
              localField: "_id",
              foreignField: "employee_id",
              as: "awards",
            },
          },
          {
            $lookup: {
              from: "hris-recognitions",
              localField: "_id",
              foreignField: "employee_id",
              as: "recognitions",
            },
          },
          {
            $lookup: {
              from: "hris-service-records",
              localField: "_id",
              foreignField: "employee_id",
              as: "service_records",
            },
          },
          {
            $lookup: {
              from: "hris-trainings",
              localField: "_id",
              foreignField: "employee_id",
              as: "trainings",
            },
          },
          {
            $lookup: {
              from: "hris-work-experiences",
              localField: "_id",
              foreignField: "employee_id",
              as: "work_experiences",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "designation_information.item_number",
              foreignField: "_id",
              as: "designation_information.item_number",
            },
          },
          {
            $unwind: "$designation_information.item_number",
          },
          {
            $lookup: {
              from: "plantilla",
              localField:
                "designation_information.item_number.plantilla.office",
              foreignField: "_id",
              as: "designation_information.office",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "designation_information.item_number.plantilla.unit",
              foreignField: "_id",
              as: "designation_information.unit",
            },
          },
          {
            $unwind: {
              path: "$designation_information.office",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$designation_information.unit",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              password: 0,
            }
          }
        ])
        .toArray();
      if (!temp?.length)
        return Promise.reject("Failed to get user, user does not exist.");
      return temp[0];
    },

    async get_service_records() {
      return this.db
        .collection("hris-service-records")
        .aggregate([
          {
            $match: {
              remarks: {
                $in: [
                  new RegExp("^promote", "i"),
                  new RegExp("^promotion", "i"),
                  new RegExp("^appt", "i"),
                  new RegExp("^original", "i"),
                  new RegExp("^appointment", "i"),
                ],
              },
            },
          },
          {
            $project: {
              from: 1,
              to: 1,
              remarks: 1,
              employee_id: 1,
              position: 1,
            },
          },
          {
            $sort: {
              from: 1,
            },
          },
          {
            $group: {
              _id: "$employee_id",
              records: {
                $push: "$$ROOT",
              },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "employee",
            },
          },
          {
            $unwind: "$employee",
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "employee.designation_information.office",
              foreignField: "_id",
              as: "employee.designation_information.office",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "employee.designation_information.unit",
              foreignField: "_id",
              as: "employee.designation_information.unit",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "employee.designation_information.item_number",
              foreignField: "_id",
              as: "employee.designation_information.item_number",
            },
          },
          {
            $unwind: "$employee.designation_information.office",
          },
          {
            $unwind: "$employee.designation_information.unit",
          },
          {
            $unwind: "$employee.designation_information.item_number",
          },
          {
            $project: {
              employee: {
                first_name: 1,
                middle_name: 1,
                last_name: 1,
                appellation: 1,
                email: 1,
                designation_information: {
                  salary_grade:
                    "$employee.designation_information.salary_grade",
                  office: "$employee.designation_information.office.name",
                  unit: "$employee.designation_information.unit.name",
                  position:
                    "$employee.designation_information.item_number.name",
                },
                compensation: {
                  step: 1,
                },
              },
              records: {
                from: 1,
                to: 1,
                remarks: 1,
                position: 1,
              },
            },
          },
        ])
        .toArray();
    },

    get_service_records_by_id(user_id) {
      return this.db
        .collection("hris-service-records")
        .aggregate([
          {
            $match: {
              employee_id: new ObjectId(user_id),
            },
          },
          {
            $project: {
              from: 1, //Only get-tenure uses this so projection is set to this for now.
              to: 1,
            },
          },
        ])
        .toArray();
    },

    async get_rnr_metrics(year) {
      return this.db
        .collection("hris-rewards")
        .aggregate([
          {
            $match: {
              date: {
                $exists: true,
                $ne: "",
              },
            },
          },
          {
            $addFields: {
              date: {
                $toDate: "$date",
              },
            },
          },
          {
            $project: {
              year: {
                $year: "$date",
              },
              employee_id: 1,
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              type: 1,
              date: 1,
              reason: 1,
              prize: 1,
              document: 1,
            },
          },
          {
            $match: {
              year: {
                $eq: Number(year),
              },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "employee_id",
              foreignField: "_id",
              as: "employee",
            },
          },
          {
            $unwind: "$employee",
          },
          {
            $project: {
              employee_id: 1,
              personal_information: "$employee.personal_information",
              office: "$employee.designation_information.office",
              unit: "$employee.designation_information.unit",
              position: "$employee.designation_information.item_number",
              first_name: "$employee.first_name",
              middle_name: "$employee.middle_name",
              last_name: "$employee.last_name",
              type: 1,
              date: 1,
              reason: 1,
              prize: 1,
              document: 1,
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "office",
              foreignField: "_id",
              as: "office",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "unit",
              foreignField: "_id",
              as: "unit",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "position",
              foreignField: "_id",
              as: "position",
            },
          },
          {
            $unwind: "$office",
          },
          {
            $unwind: "$unit",
          },
          {
            $unwind: "$position",
          },
          {
            $project: {
              employee_id: 1,
              personal_information: 1,
              office: "$office.name",
              unit: "$unit.name",
              position: "$position.name",
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              type: 1,
              date: 1,
              reason: 1,
              prize: 1,
              document: 1,
            },
          },
        ])
        .toArray();
    },

    async get_user_age_and_designations() {
      return this.db
        .collection("users")
        .aggregate([
          {
            $match: {
              type: "regional",
            },
          },
          {
            $match: {
              "personal_information.dob": {
                $gt: 1,
              },
            },
          },
          {
            $project: {
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              office: "$designation_information.office",
              unit: "$designation_information.unit",
              position: "$designation_information.item_number",
              dob: "$personal_information.dob",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "office",
              foreignField: "_id",
              as: "office",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "unit",
              foreignField: "_id",
              as: "unit",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "position",
              foreignField: "_id",
              as: "position",
            },
          },
          {
            $unwind: "$office",
          },
          {
            $unwind: "$unit",
          },
          {
            $unwind: "$position",
          },
          {
            $project: {
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              dob: 1,
              office: "$office.name",
              unit: "$unit.name",
              position: "$position.name",
            },
          },
        ])
        .toArray();
    },

    async get_birthdays() {
      return await this.db
        .collection("users")
        .aggregate([
          {
            $match: {
              "personal_information.dob": {
                $exists: true,
                $gt: 1,
                $ne: "",
              },
            },
          },
          {
            $project: {
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              dob: "$personal_information.dob",
              office: "$designation_information.office",
              unit: "$designation_information.unit",
              position: "$designation_information.item_number",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "office",
              foreignField: "_id",
              as: "office",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "unit",
              foreignField: "_id",
              as: "unit",
            },
          },
          {
            $lookup: {
              from: "plantilla",
              localField: "position",
              foreignField: "_id",
              as: "position",
            },
          },
          {
            $unwind: "$office",
          },
          {
            $unwind: "$unit",
          },
          {
            $unwind: "$position",
          },
          {
            $project: {
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              dob: {
                $toDate: "$dob",
              },
              office: "$office.name",
              unit: "$unit.name",
              position: "$position.name",
            },
          },
        ])
        .toArray();
    },

    async invite_user(user: any, code, invited_by) {
      const {
        first_name,
        middle_name,
        last_name,
        appellation,
        email,
        group,
        apts,
        domain,
        designation,
      } = user;
      const domain_id = new ObjectId(domain.id);
      const session = this.instance.startSession();
      invited_by.id = new ObjectId(invited_by.id);

      const { office, unit, position } = designation;

      const [user_res, invite_res] = await Promise.all([
        this.db.collection("users").findOne({ domain_id, email: user.email }),
        this.db
          .collection("invites")
          .findOne({ domain_id, "user.email": user.email }),
      ]);

      if (user_res)
        return Promise.reject("Failed to invite user, user already exists.");
      if (invite_res)
        return Promise.reject(
          "Failed to invite user, invitation already sent."
        );

      return session
        .withTransaction(async () => {
          const temp = await this.db.collection("users").insertOne({
            username: null,
            password: null,
            email,

            access: apts.map((v: any) => new ObjectId(v._id)),
            status: "invited",
            type: "regional",
            first_name,
            middle_name,
            last_name,
            appellation,

            designation_information: {
              salary_grade: 0,
              office: new ObjectId(office.id),
              unit: new ObjectId(unit.id),
              item_number: new ObjectId(position.id),
            },

            domain_id,

            //Create embedded refs
            gov_ids: {},
            personal_information: {},
            compensation: {},
            civic_organizations: [],
            educational_records: [],
            eligibilities: [],
            references: [],
            other_information: {
              skills: [],
              non_academic_distinctions: [],
              organizations: [],
            },
          });

          this.db.collection("invites").insertOne({
            created: new Date(),
            code,
            domain_id,
            group,
            apts,
            user: { ...user, id: temp.insertedId },
            invited_by,
          });
        })
        .finally(() => session.endSession());
    },

    async deactivate_user(user_id, reason) {
      //Reason will be used as basis for updating service records.
      const session = this.instance.startSession();

      return session
        .withTransaction(async () => {
          const user = await this.db
            .collection("users")
            .findOne({ _id: new ObjectId(user_id) });
          if (!user)
            return Promise.reject("Failed to deactivate user, no such user.");

          const item_no = user.designation_information.item_number;
          const vacate_stamp = new Date();

          this.db.collection("users").updateOne(
            { _id: new ObjectId(user_id) },
            {
              $set: {
                status: "deactivated",
                "designation_information.item_number": null,
              },
            }
          );
          this.db.collection("plantilla").updateOne(
            { _id: item_no },
            {
              $set: {
                vacation_stamp: vacate_stamp,
                vice: user._id,
              },
            }
          );
          this.db.collection("plantilla-logs").updateOne(
            { item_no },
            {
              $push: {
                activities: {
                  type: "vacate",
                  timestamp: vacate_stamp,
                  subject: {
                    user_id: user._id,
                    first_name: user.first_name,
                    middle_name: user.middle_name,
                    last_name: user.last_name,
                  },
                  reason,
                },
              },
            },
            { upsert: true }
          );
        })
        .finally(async () => await session.endSession());
    },

    async get_item_number(position_id) {
      const temp = await this.db
        .collection("plantilla")
        .findOne({ _id: new ObjectId(position_id) });
      if (!temp) return Promise.reject("Item does not exist");
      if (temp.type !== "position")
        return Promise.reject("Item must be a position.");

      return temp.item_number;
    },

    async add_signatures(user_id, signatures) {
      return this.db
        .collection("users")
        .updateOne(
          { _id: new ObjectId(user_id) },
          { $push: { signatures: { link: signatures } } }
        );
    },

    async get_user_esig(_id: string) {
      const id = _id.toString();
      return this.db
        .collection("users")
        .findOne(
          { _id: new ObjectId(id) },
          { projection: { _id: 0, signatures: 1, used_esig: 1 } }
        );
    },

    async used_esig(user_id, used_esig) {
      return this.db
        ?.collection("users")
        .updateOne(
          { _id: new ObjectId(user_id) },
          { $set: { used_esig: used_esig } }
        );
    },
  },
});

const promote_flags = ["promote", "promoted", "promotion"];
const appt_flags = ["original", "appointment", "appt"];

function sanitize_records(records: any[]) {
  return records.map((v) => {
    let temp = v.remarks.toLowerCase();
    let result = {
      ...v,
      from: v.from ? new Date(v.from).toDateString() : "",
      to: v.to ? new Date(v.to).toDateString() : "",
    };

    if (promote_flags.filter((v) => temp.indexOf(v) !== -1).length)
      result.remarks = "Promotion";
    if (appt_flags.filter((v) => temp.indexOf(v) !== -1).length)
      result.remarks = "Original Appointment";

    return result;
  });
}

function get_age(timestamp: number) {
  return Math.floor(
    (new Date().getTime() - timestamp) / (1000 * 60 * 60 * 24 * 365)
  );
}
