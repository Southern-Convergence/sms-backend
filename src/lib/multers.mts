import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

const SIGNATURE_MIME_WHITELIST = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export default {
  "hris-documents": mmmmmm(
    {
      field_name_size: 92,
      field_size  : 2_048_000,
      file_size   : 2_048_000,
      header_pair : 24,
      fields      : 24,
      files       : 5,
    },
    SIGNATURE_MIME_WHITELIST
  ),

  "hris-signatures" : mmmmmm(
    {
      field_name_size: 92,
      field_size  : 2_048_000,
      file_size   : 2_048_000,
      header_pair : 24,
      fields      : 24,
      files       : 5,
    },
    SIGNATURE_MIME_WHITELIST
  ),

  "letter-of-intent" : mmmmmm(
    {
      field_name_size: 92,
      field_size  : 2_048_000,
      file_size   : 2_048_000,
      header_pair : 24,
      fields      : 24,
      files       : 5,
    },
    [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
  )
};

//2nd Step: Buffer Magic Number Checking
export const verify_tt:RequestHandler = async(req, _, next)=>{
/*   
  if(!req.file)return next(new Error("Upload Rejection", { cause : "No data was sent."}));
  
  const tt = await fileTypeFromBuffer(req.file?.buffer);

  if (!SIGNATURE_MIME_WHITELIST.includes(tt?.mime!)){
    return next(
      new Error("Upload Rejection", {
        cause: `File type not supported, consider sending it in either these formats: ${SIGNATURE_MIME_WHITELIST.toString()}`,
      })
    );
  }
 */
  next(null);
}

function mmmmmm(limits : Limits, whitelist : string[]){
  return multer({
    storage: multer.memoryStorage(),

    limits,

    /* [File-Type Verification Middlewares] */
    fileFilter: async (_, file, cb) => {
      //1st Step: Content-Type Check
      if (!whitelist.includes(file.mimetype))
        return cb(
          new Error("Upload Rejection", {
            cause: `File type not supported, consider sending it in either these formats: ${whitelist.toString()}`,
          })
        );

      cb(null, true);
    },
  })
}

type Limits = {
  field_name_size : number;
  field_size      : number;

  file_size   : number;
  header_pair : number;
  fields      : number;
  files       : number;
}