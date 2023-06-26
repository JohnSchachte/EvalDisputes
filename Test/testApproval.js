// need to test if a member is apart of coaching and if member is not. 
function testCheckEvalChatApproved(){
    const process = mkProcess("41");
    const checkEvalId = process.getNode("checkEvalId");
    const result = checkEvalId.run();
    if(result === false)return
    if(!Array.isArray(result)) throw new Error("not correct result");
    if(result[0] != "jschachte@shift4.com") throw new Error("not correct result");
    Logger.log(result[1]);
}

function testCheckEvalCallDenied(){
    const process = mkProcess("36");
    const checkEvalId = process.getNode("checkEvalId");
    const result = checkEvalId.run();
    if(result === false)return;
    if(!Array.isArray(result)) throw new Error("not correct result");
    if(result[0] != "jschachte@shift4.com") throw new Error("not correct result");
    Logger.log(result[1]);
}

function testCheckEvalSiblingDenied(){
    const process = mkProcess("40");
    const checkEvalId = process.getNode("checkEvalId");
    const result = checkEvalId.run();
    if(result === false)return;
    if(!Array.isArray(result)) throw new Error("not correct result");
    if(result[0] != "jschachte@shift4.com") throw new Error("not correct result");
    Logger.log(result[1]);
}

function testHasBackendApproved(){
    const process = mkProcess("41");
    const hasBackend = process.getNode("hasCoachingBackend");
    const result = hasBackend.run();
    if(result === false)return;
    if(!Array.isArray(result)) throw new Error("not correct result");
    if(result[0] != "jschachte@shift4.com") throw new Error("not correct result");
    Logger.log(result[1]);
}


function testHasBackendDenied(){
    const process = mkProcess("40");
    const hasBackend = process.getNode("hasCoachingBackend");
    const result = hasBackend.run();
    if(result === false)return;
    if(!Array.isArray(result)) throw new Error("not correct result");
    if(result[0] != "foo@shift4.com") throw new Error("not correct result");
    Logger.log(result[1]);
}

function hasBackendOnSuccess(){
    const process = mkProcess("41");
    const hasBackend = process.getNode("hasCoachingBackend");
    const result = hasBackend.run();
    hasBackend.onSuccess(result);
}

function hasCheckEvalIdOnSuccess(){
  const process = mkProcess("41");
  const checkEvalId = process.getNode("checkEvalId");
  const result = checkEvalId.run();
  checkEvalId.onSuccess(result);
}