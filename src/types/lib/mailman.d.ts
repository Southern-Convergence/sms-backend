declare type SentMessageInfo = import("nodemailer/lib/smtp-transport").SentMessageInfo;
declare type Transporter     = import("nodemailer").Transporter;
declare type SMTPTransport   = import("nodemailer/lib/smtp-transport/index.js");
declare type MailMan         = import("@lib/mailman.mjs").MailMan;

type PostHeader = {
  from         : string;
  to           : string;
  subject?     : string;
  attachments? : any[];
}

type PostBody = {
  template    : string;
  layout      : string;
  context     : {[key : string] : string}; 
}

type MailManCFG = {
  [namespace : string] : TransportCFG;
}

type TransportCFG = {
  mail_options      : SMTPTransport.MailOptions;
  transport_options : SMTPTransport.Options;
}

type TransportDict = {
  [namespace : string] : MailMan;
}