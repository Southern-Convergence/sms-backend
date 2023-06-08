import { REST } from "sfr";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import Joi from "joi";
import { UAParser } from "ua-parser-js";
import otpgen from "@lib/otpgen.mjs";

import GrantAuthority from "@lib/grant-authority.mjs";
import {object_id} from "@lib/api-utils.mjs";

const EXPIRY = 3600000 * 72; //72 Hours
const SALT = 10;

export default REST({
  cfg: {
    public: true,
  },

  validators: {
    login: {
      username: Joi.string().required(),
      password: Joi.string().required(),
    },
    logout: {},
    recovery: { email: Joi.string().email().required() },
    "update-password" : {
      otp : Joi.string().required(),
      password : Joi.string().min(8).required(),
      confirm_password : Joi.string().min(8).required()
    },
    "get-page-grants": {},
    "get-user": {},
    "get-sessions": {},
    "terminate-session": { session_id: Joi.string().required() },
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
          ?.then(() => res.json({ data: "Session Terminated." }))
          .catch((error) => res.status(400).json({ error }));
      },

      async recovery(req, res) {
        const { email } = req.body;
        const user = await this.get_user_by_email(email);
        if(!user)return res.status(400).json({error : "Account recovery failed, no such email."});
        
        const otp = otpgen();
        this.save_otp(otp, user._id)
        ?.then(()=> {
          this.mailmen["ethereal"].post({
            from    : "sad@sad.com",
            to      : (email?.toString() || ""),
            subject : "Account Recovery"
          }, {
            template : "recovery",
            context  : {
              otp,
              first_name : user.first_name,
              last_name  : user.last_name
            }
          })
          .then(()=> res.json({data : "Successfully issued recovery otp."}))
          .catch((error)=> res.status(400).json({error : `Failed to issue recovery otp. Please contact an administrator.${error}`}))
        })
      },

      async "update-password"(req, res){
        const { otp, password, confirm_password  } = req.body;

        if(password !== confirm_password)return res.status(400).json({error : "Failed to update password, password's must match."});
        
        const matched_otp = await this.get_otp(otp);
        if(!matched_otp)return res.status(400).json({error : "Failed to update user password, otp not found or has expired."});

        this.delete_otp(matched_otp._id);
        this.update_user_password(matched_otp.user_id, password)
        .then(()=> res.json({data : "Successfully updated user password"}))
        .catch((error)=> res.status(400).json({error}));
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

      "get-page-grants"(req, res) {
        const user = req.session.user;
        if (!user) return res.status(401).json({ error: "No Session Found." });
        res.json({ data: GrantAuthority.get_page_grants(user.access) });
      },

      async "get-sessions"(req, res) {
        if (!req.session.user)
          return res.status(401).json({ error: "No Session Found." });
        const { id, user } = req.session;
        let temp = await this.get_user_sessions(user._id);

        let data = temp?.map((v) => {
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
    },
  },

  controllers: {
    async check_credentials(username: string, password: string) {
      let matched_user = await this.db?.collection("users").findOne(
        { username },
        {
          projection: {
            _id: 1,
            username: 1,
            password: 1,
            type: 1,
            access: 1,
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
        ?.collection("users")
        ?.aggregate([
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
            $project: {
              username    : 1,
              first_name  : 1,
              middle_name : 1,
              last_name   : 1,
              appelation  : 1,
              type: 1,
              status: 1,
              access: {
                _id: 1,
                basis: 1,
                domain_id: 1,
                name: 1,
              },
              office: "$office.name",
              unit: "$unit.name",
              position: "$position.name",
            },
          },
        ])
        .toArray();

      if (!matched_user?.length) return Promise.reject("User not found");
      return matched_user[0];
    },

    get_user_sessions(user_id) {
      return this.db
        ?.collection("sessions")
        .find(
          { "session.user._id": new ObjectId(user_id) },
          { projection: { "session.cookie": 0 } }
        )
        .toArray();
    },

    terminate_session(_id) {
      return this.db
        ?.collection("sessions")
        .deleteOne({ _id })
        .then((v) => {
          if (!v.deletedCount)
            return Promise.reject(
              "Failed to terminate session, Session not found."
            );
        });
    },

    get_user_by_email(email){
      return this.db?.collection("users").findOne({email});
    },

    get_otp(token){
      return this.db?.collection("otp").findOne({token});
    },

    save_otp(token, user_id){
      return this.db?.collection("otp").updateOne({ user_id }, {$set : { token, expiry : new Date(Date.now() + EXPIRY), user_id, stamp : new Date() }}, {upsert : true});
    },

    delete_otp(token_id){
      this.db?.collection("otp").deleteOne({_id : token_id});
    },

    async update_user_password(user_id, password){
      const hashed_password = bcrypt.hashSync(password, SALT);
      const result = await this.db?.collection("users").updateOne({_id : new ObjectId(user_id)}, {
        $set : {
          password : hashed_password
        }
      })

      if(!result?.modifiedCount)return Promise.reject("Failed to update user password, user not found.");
    }
  },
});
