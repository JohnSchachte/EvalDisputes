function testConcurrentHasBackendError(){
    const process = mkProcess(concurrentId);
    const hasBackend = process.getNode("hasCoachingBackend");
    let result = hasBackend.run();
    hasBackend.onFailure(result);
  
    const checkEvalId = process.getNode("checkEvalId");
    result = checkEvalId.run();
    checkEvalId.onSuccess(result);
  }

  function testConcurrentCheckEvalError(){
    const process = mkProcess(concurrentId);
    const hasBackend = process.getNode("hasCoachingBackend");
    let result = hasBackend.run();
    hasBackend.onSuccess(result);
  
    const checkEvalId = process.getNode("checkEvalId");
    result = checkEvalId.run();
    checkEvalId.onFailure(result);
  }

  function bothError(){
    const process = mkProcess(concurrentId);
    const hasBackend = process.getNode("hasCoachingBackend");
    hasBackend.onFailure();
  
    const checkEvalId = process.getNode("checkEvalId");
    checkEvalId.onFailure();
  }