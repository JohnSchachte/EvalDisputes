function mkProcess(rootKey,) {
  const children = new Map();
  const storage = new Storage();
  const process = new Process(storage, rootKey);

  // first depth
  const hasCoachingBackend = new HasCoachingBackend("hasCoachingBackend", process, storage);
  const checkEvalId = new CheckEvalId("checkEvalId", process, storage);
  children.set(hasCoachingBackend.name, hasCoachingBackend);
  children.set(checkEvalId.name, checkEvalId);
  hasCoachingBackend.setSibling(checkEvalId);
  checkEvalId.setSibling(hasCoachingBackend);

  // second depth
  const appendBackend = new AppendBackend("appendBackend", process, storage);
  const sendApproval = new SendApproval("sendApproval", process, storage);
  const sendDenied = new SendDenied("sendDenied", process, storage);
  children.set(appendBackend.name, appendBackend);
  children.set(sendApproval.name, sendApproval);
  children.set(sendDenied.name, sendDenied);
  const secondDepth = [appendBackend, sendApproval, sendDenied];
  checkEvalId.setChildren(secondDepth);
  hasCoachingBackend.setChildren(secondDepth);

  appendBackend.setSiblings([sendApproval, sendDenied]);
  sendApproval.setSiblings([appendBackend, sendDenied]);
  sendDenied.setSiblings([appendBackend, sendApproval]);

  // third depth
  const sendManagementEmail = new SendManagementEmail("sendManagementEmail", process, storage);
  children.set(sendManagementEmail.name, sendManagementEmail);
  appendBackend.setChild(sendManagementEmail);

  process.setTree(children); // Pass the children map to setTree
  return process;
}

function testProcess(){
  const process = mkProcess("1")
  for (let [name, task] of process.children.entries()) {
    console.log(`Task name: ${name}`);
    console.log(`Task parents: ${[...task.parents.keys()].join(', ')}`);
    console.log(`Task children: ${[...task.children.keys()].join(', ')}`);
    console.log(`Task siblings: ${[...task.siblings.keys()].join(', ')}`);
    console.log('---');
  }
}


class Process {
constructor(storage,rootKey){
    this.storage = storage;
    this.rootKey = rootKey;
    this.children;
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
        for(let child of this.children){
            child.deconstruct();
        }
    }
}
  