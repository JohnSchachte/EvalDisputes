function testAppendBackendTimeout(){
    const process = mkProcess("41");
    const append = process.getNode("appendBackend");
    append.updateProcess("running");
    append.setTimeout(10000);
    const result = append.run();
    append.onSuccess(result);
    process.deconstructTree();
}

function testAppendBackendSuccess(){
  const process = mkProcess("41");
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