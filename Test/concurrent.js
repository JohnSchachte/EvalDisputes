const concurrentId = "41"
function testConcurrentSendApprovalSuccess(){
    const process = mkProcess(concurrentId);
    process.setState("running");
    sendApproval.setTimeout(30000);
    const sendApproval = process.getNode("sendApproval");
    const result = sendApproval.run();
    sendApproval.onSuccess(result);
    Logger.log(result);
  }
  
  function testConcurrentAppendBackendSuccess(){
    const process = mkProcess(concurrentId);
    process.setState("running");
    const append = process.getNode("appendBackend");
    append.setTimeout(30000);
    const result = append.run();
    append.onSuccess(result);
    Logger.log(result);
  }

  function testConcurrentApproveStatus(){
    const process = mkProcess(concurrentId);
    const hasBackend = process.getNode("hasCoachingBackend");
    let result = hasBackend.run();
    hasBackend.onSuccess(result);
  
    const checkEvalId = process.getNode("checkEvalId");
    result = checkEvalId.run();
    checkEvalId.onSuccess(result);
  }

  function testConcurrentSendManagementSuccess(){
    const process = mkProcess(concurrentId);
    process.setState("running");
    const sendManagementEmail = process.getNode("sendManagementEmail");
    sendManagementEmail.setTimeout(30000);
    let result = sendManagementEmail.run();
    sendManagementEmail.onSuccess(result);
    Logger.log(result);
  }
