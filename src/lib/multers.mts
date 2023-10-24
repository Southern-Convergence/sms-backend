import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { fileguard } from "./logger.mjs";

const IMAGE_WHITELIST = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const EXCEL_MIMETYPES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformatsofficedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformatsofficedocument.spreadsheetml.template",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-excel.template.macroEnabled.12",
  "application/vnd.ms-excel.addin.macroEnabled.12",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12"
];
const WORD_MIMETYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-word.document.macroEnabled.12",
  "application/vnd.ms-word.template.macroEnabled.12"
];
const POWERPOINT_MIMETYPES = [
  "application/mspowerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.template",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "application/vnd.ms-powerpoint.addin.macroEnabled.12",
  "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
  "application/vnd.ms-powerpoint.slideshow.macroEnabled.12",
  "application/vnd.ms-powerpoint.template.macroEnabled.12"
];

export default {
  "domain-logo" : cfg({
    field_name_size : 92,
    field_size: 2_048_000,
    file_size: 2_048_000,
    files : 1
  }, IMAGE_WHITELIST)
}

//2nd Step: Buffer Magic Number Checking
export const verify_tt: RequestHandler = async (req, _, next) => {
  fileguard.verbose("Checking actual file signature (FileBuffer Magic Number)");
  if (!req.file) return next(new Error("Upload Rejection", { cause: "No data was sent." }));
  /* @ts-ignore */
  /*   const checked_files = await Promise.all(req.files.map((v)=> fileTypeFromBuffer(v.buffer)));
    fileguard.verbose(checked_files);
    
    checked_files.forEach((tt : any)=> {
      if (!SIGNATURE_MIME_WHITELIST.includes(tt?.mime!)){
        return next(
          new Error("Upload Rejection", {
            cause: `File type not supported, consider sending it in either these formats: ${SIGNATURE_MIME_WHITELIST.toString()}`,
          })
        );
      }
    }) */

  next(null);
}

function cfg(limits: Limits, whitelist: string[] = []) {
  return multer({
    storage: multer.memoryStorage(),

    //Refer to https://github.com/mscdex/busboy#busboy-methods for details on limit parameters
    limits,

    /* [File-Type Verification Middlewares] */
    fileFilter: async (_, file, cb) => {
      fileguard.verbose("FileGuard Sequence Started");
      fileguard.verbose("File to Process:");
      fileguard.verbose(file);
      //1st Step: Content-Type Check
      if (whitelist.length && !whitelist.includes(file.mimetype))
        return cb(
          new Error("Upload Rejection", {
            cause: `File type not supported, consider sending it in either these formats: ${whitelist.toString()}`,
          })
        );

      //2nd Step: Binary Magic Number Check
      //req file that is exposed in this function does not contain a reference to the underlying buffer of the file/s in question.
      //forcing me to move "verify_tt" to the main SFR middleware interceptor for better access to express request handler params.
      
      


      cb(null, true);
    },
  })
}

type Limits = {
  field_name_size?: number;
  field_size?: number;

  file_size?: number;
  header_pair?: number;
  fields?: number;
  files?: number;
}