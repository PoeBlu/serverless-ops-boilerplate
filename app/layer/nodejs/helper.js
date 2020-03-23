const AWS = require('aws-sdk');
const SecretsManager = new AWS.SecretsManager({});

const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;
let ALLOWED_ORIGINS = [];


function responseFactory(statusCode, body, origin_header) {

  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      "X-Frame-Options": "deny",

    }
  }
}




function getAwsSecret(secretName) {
  return SecretsManager.getSecretValue({ SecretId: secretName }).promise();
}



module.exports = {
  responseFactory,
  getAwsSecret
};