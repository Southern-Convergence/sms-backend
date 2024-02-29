import { REST } from "sfr";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import Joi from "joi";
import { UAParser } from "ua-parser-js";
import otpgen from "@lib/otpgen.mjs";

import { handle_res, object_id } from "@lib/api-utils.mjs";
import Grant from "@lib/grant.mjs";

const MIN_PASSWORD_LENGTH = 8;
const MIN_USERNAME_LENGTH = 6;
const EXPIRY = 3600000 * 72; //72 Hours
const SALT_ROUNDS = 10;

import { EMAIL_TRANSPORT, ALLOWED_ORIGIN } from "@cfg/index.mjs";

export default REST({
  cfg: {
    public: true,

    service: "Identity Management"
  },

  validators: {
    login: {
      username: Joi.string().required(),
      password: Joi.string().required(),
    },
    logout: {},
    recovery: { email: Joi.string().email().required() },
    "update-password": {
      otp: Joi.string().required(),
      password: Joi.string().min(MIN_PASSWORD_LENGTH).required(),
      confirm_password: Joi.string().min(MIN_PASSWORD_LENGTH).required()
    },
    "get-page-resources": {},
    "get-user": {},
    "get-sessions": {},
    "terminate-session": { session_id: Joi.string().required() },

    "verify-invitation-code": {
      code: Joi.string().required()
    },

    "finalize": {
      user_id: object_id,
      invite_id: Joi.string().required(),

      first_name: Joi.string().required(),
      middle_name: Joi.string().allow(""),
      last_name: Joi.string().required(),

      username: Joi.string().min(MIN_USERNAME_LENGTH).required(),
      password: Joi.string().min(MIN_PASSWORD_LENGTH).required(),
    },

    "update-credentials": {
      old_password: Joi.string().min(MIN_PASSWORD_LENGTH),
      new_password: Joi.string().min(MIN_PASSWORD_LENGTH)
    },

    "update-user-id": {
      email: Joi.string().email(),
      username: Joi.string().min(MIN_USERNAME_LENGTH)
    },

    "profile-completion": {}
  },

  handlers: {
    POST: {
      login(req, res) {
        if (req.session.user) {
          return initiate_session(req.session.user);
        }
        const { username, password } = req.body;

        this.check_credentials(username, password)
          .then(initiate_session)
          .catch((error) => res.status(401).json({ error }));

        function initiate_session(user: any) {
          /* @ts-ignore */
          req.session.user = user as User;

          let temp = new UAParser(req.headers["user-agent"]);
          req.session.start = Date.now();
          req.session.agent = temp.getResult();
          req.session.ip = req.ip;

          req.session.save((err) => {
            if (err)
              return res
                .status(400)
                .json({ error: "Failed to create session." });

            return res.json({ data: req.sessionID });
          });
        }
      },

      "terminate-session"(req, res) {
        if (!req.session.user)
          return res.status(401).json({ error: "No Session Found." });

        const { session_id } = req.body;

        this.terminate_session(session_id)
          .then(() => res.json({ data: "Session Terminated." }))
          .catch((error) => res.status(400).json({ error }));
      },

      async recovery(req, res) {
        const { email } = req.body;
        const user = await this.get_user_by_email(email);
        if (!user) return res.status(400).json({ error: "Account recovery failed, no such email." });

        const otp = otpgen();
        this.save_otp(otp, user._id)
          .then(() => {
            this.postoffice[EMAIL_TRANSPORT].post({
              to: (email.toString() || ""),
              subject: "Account Recovery"
            }, {
              template: "uac-recovery",
              layout: "default",
              context: {
                link: `${ALLOWED_ORIGIN}/account-recovery?ref=${otp}`,
                name: `${user.first_name} ${user.last_name}`
              }
            })
              .then(() => res.json({ data: "Successfully issued recovery otp." }))
              .catch((error) => res.status(400).json({ error: `Failed to issue recovery otp. Please contact an administrator.` }))
          })
      },

      async "update-password"(req, res) {
        const { otp, password, confirm_password } = req.body;

        if (password !== confirm_password) return res.status(400).json({ error: "Failed to update password, password's must match." });

        const matched_otp = await this.get_otp(otp);
        if (!matched_otp) return res.status(400).json({ error: "Failed to update user password, otp not found or has expired." });

        this.delete_otp(matched_otp._id);
        bcrypt.hash(password, SALT_ROUNDS)
          .then((pass) => {
            this.update_user_password(matched_otp.user_id, pass)
              .then(() => res.json({ data: "Successfully updated user password" }))
              .catch((error) => res.status(400).json({ error }));
          });
      },

      async "update-credentials"(req, res) {
        if (!req.session.user) return res.status(400).json({ error: "No Session Found." });
        const { old_password, new_password } = req.body;

        const user = await this.get_password(req.session.user._id);
        if (!user) return res.status(400).json({ error: "Failed to update credentials, user not found" });

        const is_match = await bcrypt.compare(old_password, user.password)
        if (!is_match) return res.status(400).json({ error: "Failed to update credentials, old password did not match." });

        bcrypt.hash(new_password, SALT_ROUNDS)
          .then((pass) => {
            this.update_user_password(req.session.user?._id!, pass)
              .then(() => res.json({ data: "Successfully updated user password" }))
              .catch((error) => res.status(400).json({ error }));
          });
      },

      async "update-user-id"(req, res) {
        if (!req.session.user) return res.status(400).json({ error: "No Session Found" });
        const { username, email } = req.body;

        if (!username && !email) return res.status(400).json({ error: "Failed to update credentials, no arguments provided." });

        const user = await this.get_user(req.session.user._id);
        if (!user) return res.status(400).json({ error: "No such user." });

        let temp: any = {};

        if (username) temp.username = username;
        if (email) temp.email = email;

        this.update_user(req.session.user._id, temp)
          .then(() => res.json({ data: "Successfully updated user id." }))
          .catch(() => res.status(400).json({ error: "Failed to update credentials." }));
      },

      "finalize"(req, res) {
        this.finalize_user(req.body)
          .then(() => res.json({ data: "Successfully finalized user account." }))
          .catch((error) => res.status(400).json({ error }));
      }
    },

    GET: {
      logout(req, res) {
        if (!req.session.user)
          return res.status(400).json({ error: "Already logged-out" });

        req.session.destroy((err) => {
          if (err)
            return res
              .status(400)
              .json({ error: "Failed to logout of session." });
          res.json({ data: "Successfully logged out." });
        });
      },

      async "get-user"(req, res) {
        const user = req.session.user;
        if (!user) return res.status(401).json({ error: "No Session Found." });
        let matched_user = await this.get_user(user._id);
        res.json({ data: matched_user });
      },

      "get-page-resources"(req, res) {
        const user = req.session.user;
        if (!user) return res.status(401).json({ error: "No Session Found." });
        const pages = user.access.flatMap((apt) => Grant.get_pages(apt.toString()));

        res.json({ data: pages });
      },

      async "get-sessions"(req, res) {
        if (!req.session.user)
          return res.status(401).json({ error: "No Session Found." });
        const { id, user } = req.session;
        let temp = await this.get_user_sessions(user._id);

        let data = temp.map((v) => {
          if (v._id.toString() === id.toString()) v.current = true;
          let temp = v.session;
          delete v.session;

          return {
            ...v,
            ...temp,
          };
        });

        res.json({ data });
      },

      "verify-invitation-code"(req, res) {
        const { code } = req.query;
        handle_res(this.get_finalization_details(code), res);
      },

      "profile-completion"(req, res) {
        //Base score of 100
        //A criteria object is used as reference for calculating the completion score.

        //For now, I return 100% cuz it's not needed yet.

        res.json({
          data: {
            score: 100,
            details: {}
          }
        });
      }
    }
  },

  controllers: {
    async check_credentials(username: string, password: string) {
      let matched_user = await this.db.collection("users").findOne(
        { username },
        {
          projection: {
            _id: 1,
            username: 1,
            password: 1,
            email: 1,
            type: 1,
            access: 1
          }
        }
      );

      if (!matched_user) return Promise.reject("Invalid Username");

      const pwd = matched_user.password;
      delete matched_user.password;

      /* Check user status (soonish)*/
      /* if(matched_user.status !== "active"){
        const filed_case = await Database.collection("cases")?.findOne({user_id : matched_user._id});
  
        if(!filed_case)return Promise.reject("User account has been suspended for unknown reasons. please contact an administrator for assistance.");
        switch(filed_case.type){
          case "suspension" : return Promise.reject("Suspended Account");
          case "disabled"   : return Promise.reject("Disabled Account");
        }
        } */
      return bcrypt
        .compare(password, pwd)
        .then((result) =>
          result ? matched_user : Promise.reject("Invalid Password")
        );
    },

    async get_user(user_id: string) {
      const matched_user = await this.db
        .collection("users")
        .aggregate([
          {
            $match: {
              _id: new ObjectId(user_id),
            },
          },
          {
            $lookup: {
              from: "ap-templates",
              localField: "access",
              foreignField: "_id",
              as: "access",
            },
          },
          {
            $unwind: {
              path: "$office",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "pshrms-offices",
              localField: "designation_information.office",
              foreignField: "_id",
              as: "office",
            },
          },
          {
            $lookup: {
              from: "pshrms-units",
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
            $unwind: {
              path: "$office",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$unit",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$position",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "ap-templates",
              localField: "role",
              foreignField: "_id",
              as: "role",
            }
          },
          {
            $unwind: {
              path: "$role",
              preserveNullAndEmptyArrays: true,
            }
          },
          {
            $project: {
              username: 1,
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              appelation: 1,
              type: 1,
              status: 1,
              access: {
                _id: 1,
                basis: 1,
                domain_id: 1,
                name: 1,
              },
              side: 1,
              office: "$office.name",
              unit: "$unit.name",
              position: "$position.name",
              role: "$role.name",
              division: "$designation_information.division",
            },
          },
        ])
        .toArray();

      if (!matched_user.length) return Promise.reject("User not found");
      return matched_user[0];
    },

    get_user_sessions(user_id) {
      return this.db
        .collection("sessions")
        .find(
          { "session.user._id": new ObjectId(user_id) },
          { projection: { "session.cookie": 0 } }
        )
        .toArray();
    },

    terminate_session(_id) {
      return this.db
        .collection("sessions")
        .deleteOne({ _id })
        .then((v) => {
          if (!v.deletedCount) return Promise.reject("Failed to terminate session, Session not found.");
        });
    },

    get_user_by_email(email) {
      return this.db.collection("users").findOne({ email });
    },

    get_otp(token) {
      return this.db.collection("otp").findOne({ token });
    },

    save_otp(token, user_id) {
      return this.db.collection("otp").updateOne({ user_id }, { $set: { token, expiry: new Date(Date.now() + EXPIRY), user_id } }, { upsert: true });
    },

    delete_otp(token_id) {
      this.db.collection("otp").deleteOne({ _id: token_id });
    },

    async update_user_password(user_id, password) {

      const result = await this.db.collection("users").updateOne({ _id: new ObjectId(user_id) }, {
        $set: {
          password
        }
      })

      if (!result.modifiedCount) return Promise.reject("Failed to update user password, user not found.");
    },

    async get_finalization_details(code) {
      const temp = await this.db.collection("invites").findOne({ code: code }, { projection: { user: 1 } });

      if (!temp) return Promise.reject("Failed to get invitation details, it is either expired or is invalid.");
      return temp;
    },

    finalize_user(user) {
      const { user_id, invite_id, username, password, first_name, middle_name, last_name } = user;

      const session = this.instance.startSession();

      return session.withTransaction(async () => {
        const user_res = await this.db.collection("users").findOne({ username });

        if (user_res) return Promise.reject("Username is already taken");
        const hashed_password = await bcrypt.hash(password, SALT_ROUNDS);
        this.db.collection("invites").deleteOne({ code: invite_id });
        const update_op = await this.db.collection("users").updateOne({ _id: new ObjectId(user_id) }, {
          $set: {
            username,
            status: "active",

            password: hashed_password,
            first_name, middle_name, last_name
          }
        });

        if (!update_op.modifiedCount) return Promise.reject("Failed to finalize account");
      }).finally(() => session.endSession());
    },

    get_password(user_id) {
      return this.db.collection("users").findOne({ _id: new ObjectId(user_id) }, { projection: { password: 1 } });
    },

    update_user(user_id, obj) {
      return this.db.collection("users").updateOne({ _id: new ObjectId(user_id) }, {
        $set: { ...obj }
      })
    }
  },
});