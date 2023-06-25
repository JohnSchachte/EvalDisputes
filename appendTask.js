class Task {
    constructor(name,process,taskKey,storage) {
    //   this.parents = new Map();
      this.children = new Map();
      this.siblings = new Map();
      this.name = name;
      this.storage = storage;
      this.taskKey = taskKey;
      this.process = process;
    }
    
    getName(){return this.name;}

    setSibling(node){
      Logger.log("setting %s as sibling to %s",node.getName(),this.name)
      this.siblings.set(node.getName(),node);
    }

    setChild(node){
      this.children.set(node.getName(),node);
    }

    setSiblings(nodes){
      for(let node of nodes){
        this.setSibling(node);
      }
    }

    setChildren(nodes){
      for(let node of nodes){
        this.setChild(node);
      }
    }

    updateProcess(state){
        this.process.setState(state);
    }

    setTriggerSelf() {
      // Implement this method in child classes
      throw new Error('You have to implement the method setTriggerSelf!');
    }
  
    fireTriggerSelf() {
      // Implement this method in child classes
      throw new Error('You have to implement the method fireTriggerSelf!');
    }
  
    logSelf() {
      // Implement this method in child classes
      throw new Error('You have to implement the method logSelf!');
    }
  
    updateSelfState(newState) {
      this.storage.set(this.baseKey+"state",newState);
    }
  
    getStateSelf() {
      this.storage.get(this.baseKey+"state");
    }
  
    onSuccess() {
      // Implement this method in child classes
      throw new Error('You have to implement the method onSuccess!');
    }
  
    onFailure() {
      // Implement this method in child classes
      throw new Error('You have to implement the method onFailure!');
    }

    deconstruct(){
        //Implement this in child classes
        throw new Error('You have to implement the method deconstruct!');
    }

    checkNeighborsState(neighbors,state){
        for(let neighbor of neighbors){
            if(neighbor.getState() !== state){
                return false;
            }
        }
        return true;
    }

    deconstructNeighbors(neighbors,condition = (neighbor)=>true){
        for(let neighbor of neighbors){
            if(condition(neighbor)) neighbor.deconstruct();
        }
    }

    run(){
        //Implement this in child classes
        throw new Error('You have to implement the method run!');
    }
}

class TimeoutTask extends Task {
    constructor(parents, children, baseKey,storage,timeout=null) {
        super(parents, children, baseKey,storage);
        timeout? this.setTimeout(new Date().getTime()+timeout):false;
    }

    setTriggerSelf(key = this.taskKey) {
        // Specific implementation for SpecificTask
        setTrigger(key);
    }
  
    fireTriggerSelf(){
        Custom_Utilities.fireTrigger();
    }

    getTimeout(){
        const timeout = this.storage.get(this.key+"timeout");
        if(timeout)return parseInt(timeout);
        return null;
    }
    setTimeout(newTimeout){
        const currentTimeout = this.getTimeout();
        if(!currentTimeout || this.checkTimeout(currentTimeout,newTimeout)){
            this.storage.set(this.key+"timeout",newTimeout);
            return true;
        }
        return false;
    }

    checkTimeout(){
        //Implement this in child classes
        throw new Error('You have to implement the method checkTimeout!');
    }

    
    deconstruct(){
        this.storage.remove(this.taskKey);
    }

    wait(processStatus){
        const startTime = new Date().getTime();
        const maxTime = startTime + 3*300000;
        let state = this.process.getState();
        let rn = new Date().getTime();
        while(state !== processStatus && rn < maxTime && rn < this.getTimeout() && 
            state !== "denied" || state !== "killed"){
            Utilities.sleep(500);
            processStatus = this.process.getState();
            rn = new Date().getTime();
        }
        return state;
    }

    rebootChildren(){
        const fiveMins = new Date().getTime() + 300000;
        for(let child of this.children){
            if(child instanceof TimeoutTask){
                child.setTimeout(fiveMins);
            }
            if(child.getState() === "stopped"){
                child.setTriggerSelf();
                child.updateState("pending");
            }
        }
        Custom_Utilities.fireTrigger(); // fires all the triggers that were just set.
    }

    onFailure(message){
        Logger.log(message);
        // kill all downstream processes
        this.updateNeighborsState("killed",this.children);
        const errorQueue = globals.ss.getSheetByName("Errors");
        // apppend itself and all downstream processes
        errorQueue.appendRow(this.taskKey);
        for(let child of this.children){
            errorQueue.appendRow(child.taskKey);
        }
        Custom_Utilities.throttling(ScriptApp,"doErrors",60000); // throttle for a minute
        const task = JSON.parse(this.taskKey);
        task.push(new Date().toLocaleString());// col 4 should be the date update column
        task.push(message);
        globals.ss.getSheetByName("Error_Log").appendRow(task);
    }
}

class AppendBackend extends TimeoutTask {
    constructor(name,process,){
        // const children = new Map(childrenNames.map(name =>[name,process.children.get(name)]));
        // const parents = new Map(parentNames.map(name =>[name,process.children.get(name)]));
        // const siblings = new Map(siblingNames.map(name =>[name,process.children.get(name)]));
        
        super(name,process,JSON.stringify([name,process.rootKey]),new Storage(),process);
    }

    checkTimeout(currentTimeout,newTimeout){
        return newTimeout > currentTimeout;
    }

    logSelf(message){
        // false means approval
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        globals.ss.getSheetByName("Backend_Log").appendRow(task);
    }

    onSuccess(message){
        if(message){
            this.updateProcess("appended");
            this.rebootChildren();
            this.logSelf(message);
        }
        this.deconstruct();
    }

    run(){
        Logger.log(this.rootKey);
        //do this before the check. Usually waiting 3-5 seconds anyways.
        const reader = Custom_Utilities.getMemoizedReads(cache);
        const formResponse = reader(BACKEND_ID,`Submissions!${this.rootKey}:${this.rootKey}`).values[0];
        const colMap = mkColMap(reader(BACKEND_ID,"Submissions!1:1").values[0]);
      
        
        const memoizedGetHttp = Custom_Utilities.memoize(getHttp,cache);
        
        
        const caseArray = mkCaseArray(formResponse,colMap);
      
        const requestOptions = {
          method: 'post',
          contentType: 'application/json',
          headers: {
            Authorization: 'Bearer ' + CoachingRequestScripts.getOAuthService().getAccessToken()
          }
        };
      
        //check has been performed for the valid wfm agent;
        // all the things we can do with agentObject
        const agentObject = EmailToWFM.getAgentObj(formResponse[colMap.get("Email Address")]);
        if(!agentObject){
            return;
        }

        const endPoint = memoizedGetHttp(agentObject["Team"],cache);
        caseArray[2] = agentObject["Employee Name"];
        caseArray[3] = agentObject["SUPERVISOR"];
        caseArray[4] = agentObject["Email Address"]; //submitter
        const name = agentObject["Employee Name"].toLowerCase().trim();
        
        // the check has been performed for the evalId.
        const evalType = getType(formResponse,colMap);
        const idObject = getIdObject(formResponse,colMap,evalType,name);
        if(!idObject){
            return;
        }

        caseArray[9] = formatAdditionalComments(formResponse,colMap,idObject[0],idObject[1]); //caseArray is fully complete
        requestOptions["payload"] = JSON.stringify(caseArray); // prepare for request
        const resultState = this.wait("approved");
        if(resultState != "approved"){
            return false;
        }
        const response = CoachingRequestScripts.fetchWithOAuth(endPoint,requestOptions); //parsed json.
        return response["id"]; // return id
    }
}

class SendApproval extends TimeoutTask {
    constructor(name,process,parentNames,childrenNames,siblingNames){
        super(name,process,parentNames,childrenNames,siblingNames,JSON.stringify([name,process.rootKey]),new Storage(),process);
    }

    
    checkTimeout(currentTimeout,newTimeout){
        return newTimeout > currentTimeout;
    }

    run(){
        const reader = Custom_Utilities.getMemoizedReads(cache);
        const formResponse = reader(BACKEND_ID,`Submissions!${this.rootKey}:${this.rootKey}`).values[0]; 
        const colMap = mkColMap(reader(BACKEND_ID,"Submissions!1:1").values[0]);
        const template = HtmlService.createTemplateFromFile("Approved");
      
        sendEmail(formResponse[colMap.get("Email Address")],"Evaluation Dispute Sent to Supervisor",template);
        return true;
    }

    logSelf(message){
        // false means approval
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        globals.ss.getSheetByName("Email_Log").appendRow(task);
    }

    onSuccess(message){
        this.logSelf(message);
        this.deconstruct();
    }
}

class SendManagementEmail extends TimeoutTask {
    constructor(name,process,parentNames,childrenNames,siblingNames){
        super(name,process,parentNames,childrenNames,siblingNames,JSON.stringify([name,process.rootKey]),new Storage(),process);
    }
    
    checkTimeout(currentTimeout,newTimeout){
        return newTimeout > currentTimeout;
    }

    run(){
        const reader = Custom_Utilities.getMemoizedReads(cache);
        const formResponse = reader(BACKEND_ID,`Submissions!${this.rootKey}:${this.rootKey}`).values[0];
        const colMap = mkColMap(reader(BACKEND_ID,"Submissions!1:1").values[0]);
        const evalType = getType(formResponse,colMap);
        const caseArray = mkCaseArray(formResponse,colMap,evalType);

        const agentObject = EmailToWFM.getAgentObj(formResponse[colMap.get("Email Address")]);
        if(!agentObject){
            return;
        }

        const name = agentObject["Employee Name"].toLowerCase().trim();
        // the check has been performed for the evalId.
        const idObject = getIdObject(formResponse,colMap,evalType,name);
        if(!idObject){
            return;
        }

        caseArray[9] = formatAdditionalComments(formResponse,colMap,idObject[0],idObject[1]); //caseArray is fully complete
        
        caseArray[2] = agentObject["Employee Name"];
        caseArray[3] = agentObject["SUPERVISOR"];
        caseArray[4] = agentObject["Email Address"]; //submitter
        
        
        
        const vars = {
            agentName : agentObject["Employee Name"],
            id : caseArray[5],
            ticket : caseArray[6] == "No Ticket" ?
            [caseArray[6]] :
            caseArray[6].match(/\d{7}/g).map(el => {return {"id" : el, "url" : "https://tickets.shift4.com/#/tickets/"+el}}),
            severity : caseArray[7],
            reason : caseArray[8],
            description : caseArray[9],
            file : caseArray[10] ? caseArray[10].split(", ") : null,
            agentEmail : formResponse[colMap.get("Email Address")]
        };
        
        const template = HtmlService.createTemplateFromFile("Management_Notification");
        template.vars = vars;
        
        const resultState = this.wait("appended");
        if(resultState != "appended"){
            return false;
        }
        sendEmail(CoachingRequestScripts.getEmails(agentObject),"Agent Evaluation Dispute: " + agentObject["Employee Name"],template);
        return true;
    }

    logSelf(message){
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        globals.ss.getSheetByName("Email_Log").appendRow(task);
    }
    
    onSuccess(message){
        this.logSelf(message);
        this.deconstruct();
        this.process.deconstructTree();
    }
}

class SendDenied extends Task{
    constructor(name,process,parentNames,childrenNames,siblingNames){
        super(name,process,parentNames,childrenNames,siblingNames,JSON.stringify([name,process.rootKey]),new Storage(),process);
    }

    run(email,reason){
        const template = HtmlService.createTemplateFromFile("DeniedEmail");
        template.denialReason = reason;
        sendEmail(email,"Evaluation Dispute Denied",template);
        return true;
    }

    logSelf(message){
        const task = JSON.parse(this.taskKey);
        task.push(message);
        task.push(new Date().toLocaleString());
        globals.ss.getSheetByName("Email_Log").appendRow(task);
        globals.ss.getSheetByName("Denied_Log").appendRow(task);
    }
    
    onSuccess(message){
        this.logSelf(message);
        this.deconstruct();
    }
}
