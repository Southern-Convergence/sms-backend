import {REST} from "sfr";
import bcrypt from "bcrypt";
import {ObjectId} from "mongodb";
import Joi from "joi";
import {UAParser} from "ua-parser-js";

import GrantAuthority from "@lib/grant-authority.mjs";

export default REST({
  cfg : {
    public : true
  },

  validators : {
    login               : {username : Joi.string().required(), password : Joi.string().required()},
    logout              : {},
    recovery            : {email   :  Joi.string().email().required()},
    "get-page-grants"   : {},
    "get-user"          : {},
    "get-sessions"      : {},
    "terminate-session" : {session_id : Joi.string().required()}
  },

  handlers : {
    POST : {
      login(req, res){
        if(req.session.user)return res.status(400).json({error : "Already signed-in"});
        const { username, password } = req.body;
        
        this.check_credentials(username, password)
        .then((user)=>{
          /* @ts-ignore */
          req.session.user = user as User;

          let temp = new UAParser(req.headers["user-agent"]);
          req.session.start = Date.now();
          req.session.agent = temp.getResult();
          req.session.ip = req.ip;

          req.session.save((err)=>{
            if(err)return res.status(400).json({error : "Failed to create session."});
            
            return res.json({ data : req.sessionID });
          })
        })
        .catch((error)=> res.status(401).json({error}));
      },

      "terminate-session"(req, res){
        if(!req.session.user)return res.status(401).json({error : "No Session Found."});

        const { session_id } = req.body;

        this.terminate_session(session_id)
        ?.then(()=>res.json({data : "Session Terminated."}))
        .catch((error)=> res.status(400).json({error}));
      }
    },

    GET  : {  
      logout(req, res){
        if(!req.session.user)return res.status(400).json({error : "Already logged-out"});

        req.session.destroy((err)=> {
          if(err)return res.status(400).json({error : "Failed to logout of session."});
          res.json({data : "Successfully logged out."});
        })
      },

      recovery(_, res){
        res.status(404).json({error : "Endpoint is unavailable" });
      },

      async "get-user"(req, res){
        const user = req.session.user;
        if(!user)return res.status(401).json({ error : "No Session Found."});
        let matched_user = await this.get_user(user._id);
        res.json({data : matched_user});
      },
      
      "get-page-grants"(req, res){
        const user = req.session.user;
        if(!user)return res.status(401).json({error : "No Session Found."});
        res.json({data : GrantAuthority.get_page_grants(user.access)})
      },

      async "get-sessions"(req, res){
        if(!req.session.user)return res.status(401).json({ error : "No Session Found."});
        const { id, user } = req.session; 
        let temp = await this.get_user_sessions(user._id);
        
        let data = temp?.map((v)=> {
          if(v._id.toString() === id.toString())v.current = true;
          let temp = v.session;
          delete v.session;

          return {
            ...v,
            ...temp
          }
        })

        res.json({ data });
      }
    }
  },

  controllers : {
    async check_credentials(username : string, password : string){
      let matched_user = await this.db?.collection("users").findOne({username}, { projection : {
        _id      : 1,
        username : 1,
        password : 1,
        type     : 1,
        access   : 1
      }});

      if(!matched_user)return Promise.reject("Invalid Username");
      
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
      return bcrypt.compare(password, pwd)
      .then((result)=> result ? matched_user : Promise.reject("Invalid Password"));
    },

    async get_user(user_id : string){
      const matched_user = await this.db?.collection("users")?.aggregate([
        {
          "$match" : {
            _id : new ObjectId(user_id)
          }
        },
        {
          '$lookup': {
            'from': 'ap-templates', 
            'localField': 'access', 
            'foreignField': '_id', 
            'as': 'access'
          }
        }, {
          '$unwind': '$access'
        }, {
          '$project': {
            'username': 1,
            "name" : 1,
            'type': 1, 
            'access': {
              "_id" : 1,
              'basis': 1, 
              'domain_id': 1, 
              'name': 1
            }
          }
        }
      ]).toArray();
  
      if(!matched_user?.length)return Promise.reject("User not found");
      return matched_user[0];
    },

    get_user_sessions(user_id){
      return this.db?.collection("sessions").find({ "session.user._id" : new ObjectId(user_id)}, {projection : { "session.cookie" : 0 }}).toArray();
    },

    terminate_session(_id){
      return this.db?.collection("sessions").deleteOne({ _id })
      .then((v)=> {
        if(!v.deletedCount)return Promise.reject("Failed to terminate session, Session not found.");
      });
    }
  }
});