const addCustomResource = require('add-custom-resource');
const traverse = require('traverse');
const path = require('path');
const fs = require('fs');
const UglifyJS = require('uglify-es');

const sourcePath = path.join(__dirname, 'function-cloudfront-certificate.js');
const buildDir = path.join(__dirname, 'build');
const originalCustomResourceSource = fs.readFileSync(sourcePath).toString();
const customResourceSource = UglifyJS.minify(originalCustomResourceSource, {
  toplevel: true,
  output: {
    quote_style: 1,
  }
}).code.replace('module.exports.handler=','module.exports.handler =');
const sourceCodePath = path.join(buildDir, 'function-cloudfront-certificate.js');

if (!fs.existsSync(buildDir)){
  fs.mkdirSync(buildDir);
}
fs.writeFileSync(sourceCodePath, customResourceSource);

class CloudfrontCertificatePlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      'after:aws:package:finalize:mergeCustomProviderResources': this.replaceCertificate.bind(this),
    };
  }

  replaceRef(name) {
    const template = this.serverless.service.provider.compiledCloudFormationTemplate;
    const updateRef = function(leaf) {
      if (this.key !== `Ref` || this.isNotLeaf) return;
      if (leaf === name) this.update(`Custom${name}Resource`);
    }
    traverse(template.Resources).forEach(updateRef);
    traverse(template.Outputs).forEach(updateRef);
  }

  replaceCertificate() {
    const template = this.serverless.service.provider.compiledCloudFormationTemplate;

    const resources = template.Resources;
    const outputs = template.Outputs;

    
    // Theory: look for AWS::CertificateManager::Certificate in resources, 
    // replace with a custom resource as below using the same name,
    // replace any refs to the original name with the Custom{name}Resource version 
    // in Resources and Outputs
    // Ensure properties are sent through for execution?


    // Success response Data
    // Optional, custom resource provider-defined name-value pairs to send with the response. 
    // You can access the values provided here by name in the template with Fn::GetAtt.


    for(let name in resources) {
      if (resources[name].Type === 'AWS::CertificateManager::Certificate') {
        addCustomResource(template, {
          name,
          sourceCodePath,
          role: {
            policies: [{
              PolicyName: 'certificate-creation-permission',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [{
                  Effect: 'Allow',
                  Action: [
                    'acm:*',
                    'ses:VerifyDomainIdentity',
                    'ses:DeleteIdentity',
                    'ses:GetIdentityVerificationAttributes',
                    'ses:DescribeActiveReceiptRuleSet',
                    'route53:ChangeResourceRecordSets',
                  ],
                  Resource: '*',
                }]
              }
            }],
          },
          resource: {
            properties: resources[name].Properties,
          }
        });
        delete resources[name];
        this.replaceRef(name);
      }
    }

  }
}

module.exports = CloudfrontCertificatePlugin;