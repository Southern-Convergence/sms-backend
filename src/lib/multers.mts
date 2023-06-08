import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

const SIGNATURE_MIME_WHITELIST = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export default {
  hris: multer({
    storage: multer.memoryStorage(),

    limits: {
      fieldNameSize: 92,
      fieldSize: 2_048_000,
      fileSize: 2_048_000,
      headerPairs: 24,
      fields: 24,
      files: 5,
    },

    /* [File-Type Verification Middlewares] */
    fileFilter: async (_, file, cb) => {
      //1st Step: Content-Type Check
      if (!SIGNATURE_MIME_WHITELIST.includes(file.mimetype))
        return cb(
          new Error("Upload Rejection", {
            cause: `File type not supported, consider sending it in either these formats: ${SIGNATURE_MIME_WHITELIST.toString()}`,
          })
        );


      cb(null, true);
    },
  }),
};

//2nd Step: Buffer Magic Number Checking
export const verify_tt:RequestHandler = async(req, _, next)=>{
  if(!req.file)return next(new Error("Upload Rejection", { cause : "No data was sent."}));
  
  const tt = await fileTypeFromBuffer(req.file?.buffer);

  if (!SIGNATURE_MIME_WHITELIST.includes(tt?.mime!)){
    return next(
      new Error("Upload Rejection", {
        cause: `File type not supported, consider sending it in either these formats: ${SIGNATURE_MIME_WHITELIST.toString()}`,
      })
    );
  }

  next(null);
}