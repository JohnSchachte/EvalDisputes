function tryTask(node){
  try{
    node.run();
    node.onSuccess();
    return true;
  }catch(f){
    Logger.log(f);
    node.onFailure(f);
    return false;
  }
}

function initializeStarts(formId,jobName){
  const process = mkProcess(formId);
  const node = process.getNode(jobName);
  tryTask(node);
}