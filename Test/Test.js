function test(){
  const process = new Process(new Storage(),"1000");


  const task = new Task("test",process,JSON.stringify(["test","1000"]),process.storage);
  for (let property in task) {
    console.log(`${property}: ${task[property]}`);
  }
  task.updateSelfState("running");
  if(task.getStateSelf() != "running"){
    throw new Error();
  }

  if(task.getName() !== "test"){
    throw new Error();
  }

  task.updateProcess("approved");
  if(process.getState() != "approved"){
    throw new Error();
  }

  const neighbor = new Task("neighbor",process,JSON.stringify(["neighbor","1000"]),process.storage);
  neighbor.updateSelfState("running");
  // if(false === task.checkNeighborsState([neighbor],"running"))throw new Error();
  Logger.log(neighbor.getStateSelf());
  let neighbors = new Map([['neighbor', neighbor]]);
  if(false === task.checkNeighborsState(neighbors, "running")) throw new Error();
}

function testSiblings(){
  const process = mkProcess("1000");
  const children = process.children;
  const hasCoachingBackend = children.get("hasCoachingBackend");
  const checkEvalId = children.get("checkEvalId");
  const hasSiblings = hasCoachingBackend.siblings
  const checkSiblings = checkEvalId.siblings;
  hasSiblings.forEach((value,key,index) => Logger.log(value))
  checkSiblings.forEach((value,key) => Logger.log(value))

  hasCoachingBackend.updateSelfState("approved");
  if(hasCoachingBackend.getStateSelf() !== "approved")throw new Error("wrong state from what was set");
  if(hasCoachingBackend.checkNeighborsState(hasCoachingBackend.siblings,"approved")) throw new Error("siblings somehow has approved state");
}

function testDeconstruction(){
  const process = mkProcess("41");
  process.deconstructTree();

}