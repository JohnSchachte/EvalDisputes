class TimeoutTask extends CommonTask {
    constructor(name,process, taskKey) {
      super(name,process, taskKey);
    }

    getTimeout(){
        const timeout = this.process.storage.get(this.taskKey+"timeout");
        if(timeout)return parseInt(timeout);
        return null;
    }
    setTimeout(newTimeout){
        const currentTimeout = this.getTimeout();
        const set = this.checkTimeout(currentTimeout,newTimeout); // returns thing to set or false;
        if(set){
            this.process.storage.set(this.taskKey+"timeout",set);
            return true;
        }
        return false;
    }

    checkTimeout(){
        //Implement this in child classes
        throw new Error('You have to implement the method checkTimeout!');
    }

    
    deconstruct(){
        this.process.storage.remove(this.taskKey+"state");
        this.process.storage.remove(this.taskKey+"timeout");
    }

    wait(condition = ()=>({ continue: true }), delay = 500) {
      let processState = this.process.getState();
      let conditionResult = condition();
      while(conditionResult.continue) {
          Utilities.sleep(delay);
          processState = this.process.getState();
          conditionResult = condition();
          Logger.log("waiting");
      }
      return conditionResult.condition; 
  }
  

    onFailure(message){
      this.updateStateSelf("error");
      // kill all downstream processes
      this.updateNeighborsState(this.children,"killed");
      const errorQueue = this.ss.getSheetByName("Errors");
      // apppend itself and all downstream processes
      const task = JSON.parse(this.taskKey);
      SpreadsheetApp.flush();
      errorQueue.appendRow(task);
      Custom_Utilities.throttling(ScriptApp,"doErrors",60000); // throttle for a minute
      task.push(new Date().toLocaleString());// col 4 should be the date update column
      task.push(message);
      SpreadsheetApp.flush();
      this.ss.getSheetByName("Error_Log").appendRow(task);
      Logger.log(message);
    }

    mkCaseArray(submitRow,colMap, evalType){
        const row = new Array(11);
        row[1] = submitRow[colMap.get("Timestamp")];
        row[5] = submitRow[colMap.get(evalType === "phone" ? "What is the Id for the Evaluation" : "What is the Chat Id for the Evaluation")];
        const hasTicketNumber = submitRow[colMap.get("Do you have a Ticket Number?")];
        row[6] = CoachingRequestScripts.getTicketNumber(
            submitRow[colMap.get("Ticket Number?")],
            hasTicketNumber && hasTicketNumber.startsWith("Y")
        );
        row[7] = "High"; //because they want these processed with 24hrs
        row[8] = `Evaluation Dispute : ${submitRow[colMap.get("What is your reason for disputing?")]}`; // category field
        row[10] = submitRow[colMap.get("Add any related files you'd like to share")];
        return row;
      }
      
      formatAdditionalComments(submitRow,colMap,relAgent,evalDate){
        let additionalContext = "";
        if(!BAD_VALUES.has(submitRow[colMap.get("What is your reason for disputing?")])){
          additionalContext += submitRow[colMap.get("What is your reason for disputing?")];
        }
        if(!BAD_VALUES.has(submitRow[colMap.get("SOP or KB article?")])){
          additionalContext += ": "+submitRow[colMap.get("SOP or KB article?")];
        }
        if(relAgent){
          additionalContext += "\nReliability Agent: "+relAgent; 
        }
        if(evalDate){
          additionalContext+= "\nEvaluation Date: " + evalDate;
        }
      
        if(!BAD_VALUES.has(submitRow[colMap.get("Additional Comments")])){
          additionalContext += "\n\nAdditional Comments: "+submitRow[colMap.get("Additional Comments")];
        }
        return additionalContext;
      }
      
      getHttp(team,cache){
        const getTeams = Custom_Utilities.memoize( () => CoachingRequestScripts.getTeams(REPORTING_ID),cache);
        const teams = getTeams();
        for(let i=0;i<teams.length;i++){
          if(teams[i].values[0].includes(team)){
            return teams[i].values[0][2]; // replace this with web app url
          }
        }
        throw new Error("Team is not on Operation Coaching Master Sheet");
      }
      checkCondition() {
        const neighborsState = this.getNeighborsState(this.parents);
        const processState = this.process.getState();
        const allNull = neighborsState.every(state => state === null) && processState  === null; //statiscally garbage collected.
        const allApproved = neighborsState.every(state => state === "success") || processState === "appproved";
        const anyError = neighborsState.some(state => state === "error"); // parent has errored and needs to reboot children.
        const selfSuccess = this.getStateSelf() === "success"; // this task has already succeeded
        const timeoutExceeded = new Date().getTime() >= this.getTimeout(); // timeout has exceeded
        const checkProcessState = this.process.endStates.has(this.process.getState()); // process has been denied or succeeded so we should stop.
        
        // Logger.log("allNull: " + allNull);
        // Logger.log("allApproved: " + allApproved);
        // Logger.log("anyError: " + anyError);
        // Logger.log("selfSuccess: " + selfSuccess);
        // Logger.log("timeoutExceeded: " + timeoutExceeded);
        // Logger.log("checkProcessState: " + checkProcessState);
        
        if(checkProcessState) return { condition: null, continue: false }; // process has been denied or succeeded so we should stop.
        if (allNull) return { condition: "decon", continue: false }; //statiscally garbage collected.
        if (allApproved) return { condition: 'approved', continue: false }; // all parents have succeeded
        if (anyError) return { condition: 'stopped', continue: false }; // parent has errored and needs to reboot children.
        if (selfSuccess) return { condition: null, continue: false }; // this task has already succeeded
        if (timeoutExceeded) return { condition: 'stopped', continue: false }; // timeout has exceeded
    
        return { condition: null, continue: true };
      }
}