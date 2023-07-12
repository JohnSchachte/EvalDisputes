class SendApproval extends TimeoutTask {
    constructor(name,process){
        super(name,process,JSON.stringify([name,process.rootKey]));
    }

    
    checkTimeout(currentTimeout,newTimeout){
        const rn = new Date().getTime();
        const proposed = rn + newTimeout;
        if(!currentTimeout || proposed > currentTimeout) return proposed.toString(); // there isn't one then return proposed
        return false;
    }

    run(){
        if(!this.shouldRun())return; //denied,successful, or running
        // if true then the state has been set to running
        const [formResponse,colMap] = this.getFormResponseAndMap(); // gets the form response row and the column map of headers
        const template = HtmlService.createTemplateFromFile("html/Approved");
        //wait for parents or other events described in timeout task
        const result = this.wait(this.checkCondition.bind(this));

        // Logger.log("resultState = %s in %s",result,this.getName());
        if(result === "approved"){
            //parents have approved
            // sendEmail("jschachte@shift4.com","Evaluation Dispute Approved",template);
            sendEmail(formResponse[colMap.get("Email Address")],"Evaluation Dispute Sent to Supervisor",template);
        }
        return result; // approved, denied, or stopped
    }

    logSelf(message){
        // false means approval
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        this.ss.getSheetByName("Email_Log").appendRow(task);
    }

    onSuccess(message){
        if(message === "approved"){
            this.updateStateSelf("success");
            this.logSelf(message);
        }else if(message === "stopped"){
            this.updateStateSelf("stopped");
        }else if(message === "decon"){
            this.deconstruct();
            // tree was deconstructed
        }
        Logger.log("message = %s in subprocess = %s",message,this.getName());
    }
}

class SendDenied extends CommonTask{
    constructor(name,process){
        super(name,process,JSON.stringify([name,process.rootKey]));
    }

    setTriggerSelf(key = this.taskKey) {
        // Specific implementation for SpecificTask
        setTrigger(key);
    }
  
    fireTriggerSelf(){
        Custom_Utilities.fireTrigger();
    }

    run(email,reason){
      email = email || "aduenes@shift4.com";
      reason = reason || "The Eval Id (11111) you submitted does not appear in our records or does not appear to be an evaluation about you.";
      //task = [sendDenied, aduenes@shift4.com, The Eval Id (11111) you submitted does not appear in our records or does not appear to be an evaluation about you.]
        // if(!this.shouldRun())return; //denied,successful, or running
      const template = HtmlService.createTemplateFromFile("html/DeniedEmail");
      template.denialReason = reason;
      // sendEmail("jschachte@shift4.com","Evaluation Dispute Denied",template);
      sendEmail(email,"Evaluation Dispute Denied",template);
      return true;
    }

    logSelf(message){
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        this.ss.getSheetByName("Email_Log").appendRow(task);
        this.ss.getSheetByName("Denied_Log").appendRow(task);
    }
    
    onSuccess(message){
        this.logSelf(message);
        this.process.deconstructTree();
    }

    deconstruct(){
      this.process.storage.remove(this.taskKey+"state");
    }

    onFailure(message){
        const errorQueue = this.ss.getSheetByName("Errors");
        // apppend itself and all downstream processes
        const task = JSON.parse(this.taskKey);
        errorQueue.appendRow(task);
        Custom_Utilities.throttling(ScriptApp,"doErrors",60000); // throttle for a minute
        task.push(new Date().toLocaleString());// col 4 should be the date update column
        task.push(message);
        this.ss.getSheetByName("Error_Log").appendRow(task);
        Logger.log("OnFailure message = %s",message);
    }
}