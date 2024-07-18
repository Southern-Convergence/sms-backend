
import { GetObjectCommand, ListObjectVersionsCommand, PutObjectCommand, DeleteObjectCommand, S3Client, ListObjectsCommand, GetObjectCommandInput, GetObjectAttributesCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { facilities } from './logger.mjs';

import { NODE_ENV } from "@cfg/index.mjs";
const IS_DEV = NODE_ENV !== "production";

const { DO_SPACES_BUCKET, DO_SPACES_VERSION_ENABLED_BUCKET, DO_SPACES_ENDPOINT, DO_SPACES_KEY, DO_SPACES_SECRET, DO_TEST_SPACES_BUCKET, DO_TEST_VERSIONING_ENABLED_BUCKET } = process.env;

export class DOSpace {
  protected instance: S3Client;
  protected bucket: string;
  constructor() {
    const cfg = {
      endpoint: DO_SPACES_ENDPOINT!,
      forcePathStyle: false,
      region: "sgp1",
      credentials: {
        accessKeyId: DO_SPACES_KEY as string,
        secretAccessKey: DO_SPACES_SECRET as string
      }
    }
    this.instance = new S3Client(cfg);
    this.bucket = IS_DEV ? DO_TEST_SPACES_BUCKET! : DO_SPACES_BUCKET!;

    facilities.info(`DO_Space Initialized with the ff. cfg:`);
    facilities.info(cfg);
  }

  list(prefix: string) {
    return this.instance.send(new ListObjectsCommand({
      Bucket: this.bucket,
      Prefix: prefix
    }))
  }

  get_attr(key: string) {
    /* 
      WARN: Bug with GetObjectAttributesCommand on versioning-enabled buckets.
      RangeError: Maximum call stack size exceeded
      Got something to do with how S3 handles xml return values from their APIs, out of my control.
    */
    return this.instance.send(new GetObjectAttributesCommand({
      Bucket: this.bucket,
      Key: key,
      ObjectAttributes: [],
      MaxParts: 10,
      PartNumberMarker: "sss"
    }))
  }

  upload(params: UploadParams) {
    return this.instance.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: `${params.dir}/${params.key}`,
      ACL: "public-read",
      Body: params.body,
      ContentType: params.content_type,
      Metadata: params.metadata
    }))
  }

  delete_object(key: string) {
    return this.instance.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    }))
  }
}

export class VersioningEnabledDOSpace extends DOSpace {
  constructor() {
    super();
    this.bucket = IS_DEV ? DO_TEST_VERSIONING_ENABLED_BUCKET! : DO_SPACES_VERSION_ENABLED_BUCKET!;
  }

  get_object_versions(prefix: string) {
    this.instance.send(new ListObjectVersionsCommand({
      Bucket: this.bucket,
      Prefix: prefix
    }))
  }

  get_object(cfg: GetObjectCommandInput) {
    return this.instance.send(new GetObjectCommand(cfg))
  }
}

export default {
  "hris": new DOSpace(),
  "hris-v": new VersioningEnabledDOSpace()
}


//https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/putobjectcommandinput.html#body-3
type UploadParams = {
  content_type: string,
  body: Blob | ReadableStream<any> | Readable, //
  metadata: Record<string, string>,
  key: string,
  dir: string
}


/*
Common AWS SDK Commands for file upload

PutObjectCommand: Put objects
ListObjectsCommand: Lists out all objects within a bucket
ListObjectsVersionCommand: Lists out all versions of an object.

*/