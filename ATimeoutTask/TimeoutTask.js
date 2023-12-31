class TimeoutTask extends Task {
    constructor(name,process, taskKey) {
      super(name,process, taskKey);
    }

    setTriggerSelf(key = this.taskKey) {
        // Specific implementation for SpecificTask
        setTrigger(key);
    }
  
    fireTriggerSelf(){
        Custom_Utilities.fireTrigger();
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

    wait(targetState,condition = ()=>true,delay = 500){
        let processState = this.process.getState();
        // processState is the targetState && within Timeout && the process has not deconstructed itself && this process has not been killed by parent.
        while(processState !== targetState && new Date().getTime() < this.getTimeout() && processState &&
            processState !== "denied" && this.getStateSelf() !== "killed" && condition()){
            Utilities.sleep(delay);
            processState = this.process.getState();
            Logger.log("waiting");
        }
        let stateSelf = this.getStateSelf();
        // if(!processState || processState === "denied") this.deconstruct(); // free all memory. Parent deconstructs tree but I'm worried this process may have saved state.
        return stateSelf === "killed" || new Date() > this.getTimeout() ? "stopped" : processState;
    }

    rebootChildren(){
        const fiveMins = new Date().getTime() + 300000;
        this.children.forEach(child => {
            if(child instanceof TimeoutTask){
                child.setTimeout(fiveMins);
            }
            const stoppedStates = new Set(["stopped","killed",null]);
            if(stoppedStates.has(child.getStateSelf())){
                child.setTriggerSelf();
                child.updateStateSelf("pending");
            }
        });
        Custom_Utilities.fireTrigger(); // fires all the triggers that were just set.
    }

    onFailure(message){
        Logger.log(message);
        this.updateStateSelf("err");
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
}