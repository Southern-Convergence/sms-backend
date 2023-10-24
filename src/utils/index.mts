import { generateKeyPair, createPublicKey, createPrivateKey, KeyExportOptions } from "node:crypto";

const { UAC_PASSPHRASE } = process.env; 

const PRIVATE_KEY_ENCODING:KeyExportOptions<"pem"> = {
  type : "pkcs8",
  format : "pem",
  cipher : "aes-256-cbc",
  passphrase : UAC_PASSPHRASE
}

export function assemble_upload_params(key : string, file : Express.Multer.File, dir : string):any{
  const { fieldname, mimetype, originalname, buffer } = file;
  const MIME = originalname.split(".")[1];

  return {
    key : `${key}`,
    dir : `${dir ? `${dir}/` : ''}${fieldname}`,
    content_type : mimetype,
    metadata : {
      original_name  : originalname,
      user_id        : key,
      
      timestamp : `${Date.now()}`,
      ext       : MIME,
      mimetype
    },
    body : buffer
  }
}

export function create_key_pair():Promise<{public_key : string, private_key : string}>{
  return new Promise((resolve, reject)=> {
    generateKeyPair("rsa", {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: "spki",
        format: "pem"
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
        cipher: "aes-256-cbc",
        passphrase: UAC_PASSPHRASE
      }
    }, (err, public_key, private_key)=> {
      if(err)return reject(err);
      resolve({public_key, private_key})
    });
  })
}

export function create_public_key(private_key : string){
  const key = createPrivateKey({
    key : private_key,
    format : "pem",
    type : "pkcs8",
    passphrase : UAC_PASSPHRASE
  }).export({
    format : "pem",
    type : "pkcs8",
  })

  return createPublicKey({
    key : key,
    format : "pem"
  }).export({
    type   : "spki",
    format : "pem"
  });
}