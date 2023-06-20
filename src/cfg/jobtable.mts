import {ObjectId} from "mongodb";

const JOBTABLE:KomissarJobs = {
  "* * * * *" : {
    somejob : {
      options : {
        priority : 20
      },

      async action(){
        console.log("Step Increment Runner")
        this.postoffice["ethereal"].post({
          from : "manny@mail.com",
          to   : "dan10@ethereal.email",
        },
        {
          context  : {
            otp : "OTNE",
            first_name : "Emmanuel",
            last_name  : "Abellana"
          },
          template : "recovery"
        });
      }
    }
  }
}

export default JOBTABLE;  