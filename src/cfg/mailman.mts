export default {
  default: {
    mail_options: {},
    transport_options: {
      service: "Gmail",
      host: "smtp.gmail.com",

      auth: {
        type: "OAuth2",
        user: "systems.ncr@deped.gov.ph",
        clientId:
          "709014817156-qi2eb56uag5hg6s82rb64rkd9iltk36f.apps.googleusercontent.com",
        clientSecret: "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",
        refreshToken:
          "1//04UPz4tZYR4OQCgYIARAAGAQSNwF-L9IrmpmfE5jrKqtqH_DAqnXj6OUymLeEhA1Iqus2gho1H1CJxjZ8QT1HSyu61A_Js2dc6WY",
      },
    },
  },

  ethereal: {
    mail_options: {
      to: "hipolito.smitham@ethereal.email",
    },
    transport_options: {
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: "dan10@ethereal.email",
        pass: "eFDRDSNcs4WAED1kBy",
      },
    },

  },


};
