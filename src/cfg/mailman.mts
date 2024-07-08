import { GMAIL_EMAIL, GMAIL_ID, GMAIL_REFRESH_TOKEN, GMAIL_SECRET } from "@cfg/index.mjs";

export default {
  default: {
    mail_options: {
      from: GMAIL_EMAIL
    },
    transport_options: {
      service: "Gmail",
      host: "smtp.gmail.com",

      auth: {
        type: "OAuth2",
        user: GMAIL_EMAIL,

        clientId: GMAIL_ID,
        clientSecret: GMAIL_SECRET,
        refreshToken: GMAIL_REFRESH_TOKEN
      },
    },
  },

  ethereal: {
    mail_options: {},
    transport_options: {
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: "dan10@ethereal.email",
        pass: "eFDRDSNcs4WAED1kBy",
      },
    },

  }
};
