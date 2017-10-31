const AWS = require('aws-sdk');
const response = require('cfn-response');

module.exports.handler = function(event, context) {

  const params = Object.assign({}, event.ResourceProperties);
  const Domain = params['DomainName'];
  const options = params['Region'] ? { region: params['Region'] } : {};
  const HostedZoneId = params['HostedZoneId'];
  const Name = params['DomainName'];
  delete params['ServiceToken'];
  delete params['Region'];
  delete params['HostedZoneId'];
  const acm = new AWS.ACM(options);
  const ses = new AWS.SES(options);
  const route53 = new AWS.Route53();

  const verifySES = () => {
    switch (event.RequestType) {
      case 'Create':
        // First check if domain is verified already or has pending already
        return ses.verifyDomainIdentity({ Domain }).promise().then(recordVerificationToken);
      case 'Delete':
        return ses.deleteIdentity({ Identity: Domain }).promise().then(recordVerificationToken);
      default:
        return Promise.reject('no action matched');
    }
  }

  const recordVerificationToken = ({ VerificationToken }) => {
    // First check if record already exists, set and append 
    // (quoted strings separated by new lines) (or skip it it's the same)
    // TODO Delete
    return route53.changeResourceRecordSets({
      HostedZoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: 'CREATE',
            ResourceRecordSet: {
              Name: `_amazonses.${Name}`,
              ResourceRecords: [
                {
                  Value: `"${VerificationToken}"`
                }
              ],
              Type: 'TXT',
              TTL: 300,
            }
          }
        ]
      }
    }).promise();
  }

  const waitForIdentity = () => {
    return ses.waitFor('identityExists', { Identities: [ Domain ] }).promise()
      .then(({ VerificationAttributes }) => {
        console.log(`Wait for`, VerificationAttributes)
        const status = VerificationAttributes[Domain].VerificationStatus;
        if(status === 'Failed') return Promise.reject();
        return Promise.resolve();
    })
  }

  const createReceiptRuleSet = () => {
    // Or use existing active one...
  }

  const createReceiptRule = () => {

  }

  const requestCert = () => {
    return Promise.resolve().then(() => {
      switch (event.RequestType) {
        case 'Create':
          return acm.requestCertificate(params).promise().then(waitForIssue).then(outputCertARN);
        case 'Delete':
          const CertificateArn = event.PhysicalResourceId;
          return acm.deleteCertificate({ CertificateArn }).promise().then(done);
        default:
          return Promise.resolve('no action matched');
      }
    })
  };

  const waitForIssue = ({ CertificateArn }) => (
    new Promise((resolve) => {
      const retry = setInterval(() => {
        acm.describeCertificate({ CertificateArn }).promise().then(({ Certificate }) => {
          console.log(Certificate);
          if (Certificate.Status === 'ISSUED') {
            clearInterval(retry);
            resolve(Certificate);
          }
        })
      }, 5000);
    })
  );

  const outputCertARN = ({ CertificateArn: physicalResourceId }) => (
    response.send(event, context, response.SUCCESS, {}, physicalResourceId)
  );

  const done = () => (
    response.send(event, context, response.SUCCESS, {})
  );


/*
  // If event.Records[0].Sns.Message is an email from ACM via SES, act on it. 
  // This would involve a HTTPS capable request engine 
  //   https://nodejs.org/api/https.html#https_https_request_options_callback

  // Use context.awsRequestId as the IdempotencyToken...  
  //   can this be checked if a request has already been made before setting up the other bits?


  // Automatic certificate validation
  // * Verify SES domain
  // * Add Route53 records
  // * SES email recieve policy (custom policy) AWS::CloudFormation::CustomResource
  // * MX record to SES - AWS::Route53::RecordSet
  // * SES recieve SNS topic - AWS::CloudFormation::CustomResource
  // * Lambda function with SNS topic event - Serverless function, topic added
  // * Certificate DependsOn all of the above

  // Use context.invokedFunctionArn as the SNS event target
 */

 /*
  FIRST OF ALL, check if a cert is issued for the requested domain name and return that arn.
 */

  return Promise.resolve()
  .then(verifySES)
  .then(waitForIdentity)
  .then(done)
  /* requestCert(event) */
  .catch((err) => {
    console.log(err);
    response.send(event, context, response.FAILED, {});
  });
};
