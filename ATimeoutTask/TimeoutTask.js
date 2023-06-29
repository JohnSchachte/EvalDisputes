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
        Logger.log(message);
        this.updateStateSelf("error");
        // kill all downstream processes
        this.updateNeighborsState(this.children,"killed");
        const errorQueue = this.ss.getSheetByName("Errors");
        // apppend itself and all downstream processes
        const task = JSON.parse(this.taskKey);
        errorQueue.appendRow(task);
        Custom_Utilities.throttling(ScriptApp,"doErrors",60000); // throttle for a minute
        task.push(new Date().toLocaleString());// col 4 should be the date update column
        task.push(message);
        this.ss.getSheetByName("Error_Log").appendRow(task);
    }

    mkCaseArray(submitRow,colMap, evalType){
        const row = new Array(11);
        row[1] = submitRow[colMap.get("Timestamp")];
        row[5] = submitRow[colMap.get(evalType === "phone" ? "What is the Record Id for the Evaluation" : "What is the Chat Id for the Evaluation")];
        row[6] = CoachingRequestScripts.getTicketNumber(submitRow[colMap.get("Ticket Number?")],submitRow[colMap.get("Do you have a Ticket Number?")].startsWith("Y"));
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
        const allNull = neighborsState.every(state => state === null) && this.process.getState() === null;
        const allApproved = neighborsState.every(state => state === "approved");
        const anyError = neighborsState.some(state => state === "error");
        const selfSuccess = this.getStateSelf() === "success";
        const timeoutExceeded = new Date().getTime() >= this.getTimeout();
    
        if (allNull) return { condition: 'allNull', continue: false };
        if (allApproved) return { condition: 'allApproved', continue: false };
        if (anyError) return { condition: 'anyError', continue: false };
        if (selfSuccess) return { condition: 'selfSuccess', continue: false };
        if (timeoutExceeded) return { condition: 'timeoutExceeded', continue: false };
    
        return { condition: null, continue: true };
      }
}