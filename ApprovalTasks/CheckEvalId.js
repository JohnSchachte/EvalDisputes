class CheckEvalId extends ApprovalTask {
  constructor(name,process) {
      super(name,process,JSON.stringify([name,process.rootKey]));
  }
  
  run(){
    // Logger.log(this.process.rootKey);
    if(!this.shouldRun())return; //denied,successful, or running
    // if true then the state has been set to running
    
    const [formResponse,colMap] = this.getFormResponseAndMap(); // gets the form response row and the column map of headers
    const email = formResponse[colMap.get("Email Address")];
    const agentObj = EmailToWFM.getAgentObj(email);
    if(!agentObj){
      return "skipped";
    }
    const isValid = validate(formResponse, colMap, agentObj);
    return isValid ?
    false : 
    [
      email,
      `The Eval Id (${formResponse[colMap.get(getType(formResponse,colMap) === "phone" ? "What is the Record Id for the Evaluation" : "What is the Chat Id for the Evaluation")]}) you submitted does not appear in our records or does not appear to be an evaluation about you.\n`
    ];
  }
}
