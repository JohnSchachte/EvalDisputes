function mkProcess(rootKey,) {
  const children = new Map();
  const storage = new Storage();
  const process = new Process(storage, rootKey);

  // first depth
  const hasCoachingBackend = new HasCoachingBackend("hasCoachingBackend", process);
  const checkEvalId = new CheckEvalId("checkEvalId", process);
  children.set(hasCoachingBackend.name, hasCoachingBackend);
  children.set(checkEvalId.name, checkEvalId);
  hasCoachingBackend.setSibling(checkEvalId);
  checkEvalId.setSibling(hasCoachingBackend);

  // second depth
  const appendBackend = new AppendBackend("appendBackend", process);
  const sendApproval = new SendApproval("sendApproval", process);
  const sendDenied = new SendDenied("sendDenied", process);
  children.set(appendBackend.name, appendBackend);
  children.set(sendApproval.name, sendApproval);
  children.set(sendDenied.name, sendDenied);
  const secondDepth = [appendBackend, sendApproval];
  checkEvalId.setChildren(secondDepth);
  hasCoachingBackend.setChildren(secondDepth);

  // appendBackend.setSiblings([sendApproval, sendDenied]);
  // sendApproval.setSiblings([appendBackend, sendDenied]);
  // sendDenied.setSiblings([appendBackend, sendApproval]);

  // third depth
  const sendManagementEmail = new SendManagementEmail("sendManagementEmail", process);
  children.set(sendManagementEmail.name, sendManagementEmail);
  appendBackend.setChild(sendManagementEmail);

  process.setTree(children); // Pass the children map to setTree
  return process;
}


class Process {
  constructor(storage,rootKey){
    this.storage = storage;
    this.rootKey = rootKey;
    this.children;
  }
  
  getNode(name){
    return this.children ? this.children.get(name) : null;
  }

  setTree(tree){
    this.children = tree; 
  }
  
  getState(){
        return this.storage.get(this.rootKey+"state");
  }
  
  setState(newState){
        this.storage.set(this.rootKey+"state",newState);
  }
  
  deconstructTree(){
      this.storage.remove(this.rootKey+"state");
      this.children.forEach(child => child.deconstruct());
  }
}
  