const testId = "41"
let testEvent = {
  range: {
      rowStart: testId
  }
}
function testAppendBackendTimeout(){
    initializeProcessRunning(testEvent);
    const process = mkProcess(testId);
    const append = process.getNode("appendBackend");
    append.setTimeout(10000);
    const result = append.run();
    append.onSuccess(result);
    process.deconstructTree();
}

function testAppendBackendSuccess(){
  const process = mkProcess(testId);
  const append = process.getNode("appendBackend");

  const hasBackend = process.getNode("hasCoachingBackend");
  let result = hasBackend.run();
  hasBackend.onSuccess(result);

  const checkEvalId = process.getNode("checkEvalId");
  result = checkEvalId.run();
  checkEvalId.onSuccess(result);

  append.setTimeout(10000);
  result = append.run();
  append.onSuccess(result);
  Logger.log(result);
}

function testConcurrentSendApprovalSuccess(){
  const process = mkProcess(testId);
  process.setState("running");
  const sendApproval = process.getNode("sendApproval");
  sendApproval.setTimeout(30000);
  result = sendApproval.run();
  sendApproval.onSuccess(result);
  Logger.log(result);
}

function testConcurrentAppendBackendSuccess(){
  const process = mkProcess(testId);
  process.setState("running");
  const append = process.getNode("appendBackend");
  append.setTimeout(30000);
  result = append.run();
  append.onSuccess(result);
  Logger.log(result);
}

function testConcurrentApproveStatus(){
  const process = mkProcess(testId);
  const hasBackend = process.getNode("hasCoachingBackend");
  let result = hasBackend.run();
  hasBackend.onSuccess(result);

  const checkEvalId = process.getNode("checkEvalId");
  result = checkEvalId.run();
  checkEvalId.onSuccess(result);
}

function testSendManagementSuccess(){
  const process = mkProcess(testId);

  // const sendApproval = process.getNode("sendApproval");
  // sendApproval.setTimeout(10000);
  // result = sendApproval.run();
  // sendApproval.onSuccess(result);
  // Logger.log(result);

  // const append = process.getNode("appendBackend");
  // append.setTimeout(10000);
  // result = append.run();
  // append.onSuccess(result);
  // Logger.log(result);

  const hasBackend = process.getNode("hasCoachingBackend");
  let result = hasBackend.run();
  hasBackend.onSuccess(result);

  const checkEvalId = process.getNode("checkEvalId");
  result = checkEvalId.run();
  checkEvalId.onSuccess(result);



  // const sendManagementEmail = process.getNode("sendManagementEmail");
  // result = sendManagementEmail.run();
  // sendManagementEmail.onSuccess(result);
  // Logger.log(result);
  
}