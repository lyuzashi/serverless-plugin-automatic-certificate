const response = jest.genMockFromModule('cfn-response');

response.send = jest.fn((event, context, responseStatus, responseData, physicalResourceId) => {
 
  var responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
      PhysicalResourceId: physicalResourceId || context.logStreamName,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      Data: responseData
  });

  return responseBody;
})

module.exports = response;
