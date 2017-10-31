const AWS = require('aws-sdk-mock');
const cloudfrontCertificate = require('./function-cloudfront-certificate').handler;
const response = require('cfn-response');

jest.setTimeout(300000);

const eventMock = {
  ResponseURL: 'http://pre-signed-S3-url-for-response',
  StackId: 'arn:aws:cloudformation:us-west-2:EXAMPLE/stack-name/guid',
  RequestId: 'afd8d7c5-9376-4013-8b3b-307517b8719e',
  ResourceType: 'Custom::TestResource',
  RequestType: 'Create',
  ServiceToken: 'arn:aws:lambda:us-east-1:84969EXAMPLE:function:ACMTest',
  LogicalResourceId: 'MyTestResource',
  PhysicalResourceId: 'preview-dev-CustomcertificateResource-GY46X6CSJH8C'
}

// beforeEach(() => {
//   AWS.mock('SES', 'verifyDomainIdentity', (params, callback) => {
//     callback(null, { VerificationToken: 'E9biZfpkD6WgTyISYfyzKUfOedDhhFi3f69RQbgQ/4M=' });
//   });
//   AWS.mock('SES', 'waitFor', (state, { Identities: [ Domain ] }, callback) => {
//     // state === 'identityExists'
//     const VerificationStatus = 'Success';
//     callback(null, { VerificationAttributes: { [Domain]: { VerificationStatus } } });
//   });
//   AWS.mock('Route53', 'changeResourceRecordSets', (params, callback) => {
//     console.log('resource requested', params.ChangeBatch.Changes[0].ResourceRecordSet.ResourceRecords[0]);
//     callback(null, {
//       ChangeInfo: {
//         Id: '0000EXAMPLE',
//         Status: 'PENDING',
//         SubmittedAt: '2017-03-27T17:48:16.751Z',
//         Comment: ''
//       }
//     })
//   })
// });

// afterEach(() => {
//   AWS.restore('SES');
//   AWS.restore('Route53');
// });

test('custom resource creates', () => {

  const event = Object.assign({
    ResourceProperties: {
      DomainName: '21.mcsaatchi.com.au',
      HostedZoneId: 'Z2EV8UO4DI8MRR',
      Region: 'us-east-1'
    },
  }, eventMock);

  const context = {
    awsRequestId: '84969EXAMPLE',
    invokedFunctionArn: 'arn:aws:lambda:ap-southeast-2:84969EXAMPLE:CRTest'
  }

  return cloudfrontCertificate(event, context).then(() => {
    expect(response.send).toBeCalledWith(event, context, response.SUCCESS, {});
  });

});
