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