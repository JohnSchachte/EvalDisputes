function tryTask(node){
  try{
    const message = node.run();
    node.onSuccess(message);
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
  if(node instanceof TimeoutTask){
    node.setTimeout(10000)
  }
  tryTask(node);
}