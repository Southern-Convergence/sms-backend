declare type SentMessageInfo = import("nodemailer/lib/smtp-transport").SentMessageInfo;
declare type Transporter   = import("nodemailer").Transporter;

/**
  @description
  *MailMan* is a utility class that maintains an instance of an SMTP Connection.
  It uses this connection to send out templated emails using the popular templating engine
  *handlebars*.

  Development transport is set to ethereal regardless
  of the transport used to send out an hbs template.

  The ff. handlebar entities are namespaced.
  * Views
  * Partials
  * Layouts
  * Templates
  
  Declaring these entities under their respective namespaced folders makes it visible to the handlebars compiler.
*/
declare class MailMan{
  static is_dev    : boolean;
  static transport :  Transporter<SentMessageInfo>;

  /**
   * Main method used to initialize an SMTP connection instance.
   */
  initialize():Promise<Transporter<SentMessageInfo>>


  /**
   * The Post method is the main method used to send out handlebar templates as emails.
   */
  post(header : PostHeader, body : PostBody) : Promise
}

type PostHeader = {
  from    : string;
  to      : string;
  subject : string;
  attachments : any[];
}

type PostBody = {
  template    : string;
  context     : {[key : string] : string}; 
}