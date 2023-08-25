import Joi from "joi";
import { REST } from "sfr";

import { PUBLIC_VAPID_KEY } from "@cfg/index.mjs";

import web_push from "web-push";
import {ObjectId} from "mongodb";
import {handle_res} from "@lib/api-utils.mjs";

export default REST({
  cfg : {
  },

  validators : {
    "get-vapid-key" : {},
    "get-subscriptions" : {},

    "toggle" : {
      permission   : Joi.string().required(),
      subscription : Joi.any()
    },

    "subscribe" : {
      namespace : Joi.string().required(),
      channel   : Joi.string().required()
    },

    "unsubscribe" : {
      namespace : Joi.string().required(),
      channel   : Joi.string().required()
    },

    "notify" : {
      message : Joi.string().required(),
      ttl : Joi.number().required(),
      delay : Joi.number().required()
    }
  },

  handlers : {
    GET : {
      "get-vapid-key"(_, res){
        res.json({data : PUBLIC_VAPID_KEY});
      },

      "get-subscriptions"(req, res){
        if(!req.session.user)return res.status(400).json({error : "No Session Found."});
        handle_res(this.get_subscription(req.session.user?._id!), res);
      }
    },

    POST : {
      toggle(req, res){
        this.set_subscription(req.session.user?._id!, req.body)
        .then(()=> res.json({data : "Successfully toggled notification preferences."}))
        .catch(()=> res.status(400).json({ error : "Failed to toggle notification preferences."}));
      },

      subscribe(req, res){
        this.subscribe(req.session.user?._id!, req.body)
        .then(()=> res.json({data : "Successfully subscribed"}))
        .catch(()=> res.status(400).json({error : "Failed to subscribe."}))
      },
  
      unsubscribe(req, res){
        this.unsubscribe(req.session.user?._id!, req.body)
        .then(()=> res.json({data : "Successfully unsubscribed"}))
        .catch(()=> res.status(400).json({error : "Failed to unsubscribe, no such subscription"}))
      },

      async notify(req, res){
        const { delay, message, ttl } = req.body;
        
        const temp = await this.get_subscription(req.session.user?._id!);

        if(!temp)return res.status(400).json({error : "Failed to send push notification, no subscription found."});

        setTimeout(()=> {
          web_push.sendNotification(temp?.sub, message, {TTL : ttl})
          .then(()=> res.json({data : "Successfully sent push notification"}))
          .catch((error)=> {
            console.log(error);
            res.status(400).json({error : "Failed to send push notification"})  
          });
        }, delay);
      }
    }
  },

  controllers : {
    subscribe(user_id, {namespace, channel}){
      return this.db.collection("subscriptions").updateOne({user_id : new ObjectId(user_id) }, {
        $set : {
          [`namespaces.${namespace}.${channel}`] : true
        }
      }, {upsert : true});
    },

    unsubscribe(user_id, {namespace, channel}){
      return this.db.collection("subscriptions").updateOne({user_id : new ObjectId(user_id) }, {
        $set : {
          [`namespaces.${namespace}.${channel}`] : false
        }
      }, {upsert : true});
    },

    async get_subscription(user_id){
      const temp = await this.db.collection("subscriptions").findOne({user_id : new ObjectId(user_id)});
      if(!temp)return Promise.reject("No Subscriptions");
      return temp;
    },

    set_subscription(user_id, {permission, subscription}){
      return this.db.collection("subscriptions").updateOne({user_id : new ObjectId(user_id)}, {
        $set : {
          permission, sub : subscription,
          namespaces : { }
        }
      }, { upsert : true });
    }
  }
});

function send_notification(subscriptions : any[]){
  const notification = JSON.stringify({
    title: "Hello, Notifications!",
    options: {
      body: `ID: ${Math.floor(Math.random() * 100)}`
    }
  });

  const options = {
    TTL: 10000,
  };

  subscriptions.forEach(subscription => {
    const endpoint = subscription.endpoint;
    const id = endpoint.substr((endpoint.length - 8), endpoint.length);
    web_push.sendNotification(subscription, notification, options)
      .then(result => {
        console.log(`Endpoint ID: ${id}`);
        console.log(`Result: ${result.statusCode}`);
      })
      .catch(error => {
        console.log(`Endpoint ID: ${id}`);
        console.log(`Error: ${error} `);
      });
  });
}