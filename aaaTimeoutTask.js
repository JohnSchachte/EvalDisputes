class TimeoutTask extends Task {
    constructor(name,process, taskKey,storage) {
      super(name,process, taskKey,storage);
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

    wait(targetState,delay = 500){
        const startTime = new Date().getTime();
        const maxTime = startTime + 3*300000;
        let processState = this.process.getState();
        let stateSelf = this.getStateSelf();
        let rn = new Date().getTime();
        // processState is the targetState && within Timeout && the process has not deconstructed itself && this process has not been killed by parent.
        while(processState !== targetState && rn < maxTime && rn < this.getTimeout() && processState &&
            processState !== "denied" && stateSelf !== "killed"){
            Utilities.sleep(delay);
            processState = this.process.getState();
            rn = new Date().getTime();
        }
        // if(!processState || processState === "denied") this.deconstruct(); // free all memory. Parent deconstructs tree but I'm worried this process may have saved state.
        return stateSelf === "killed" || rn < maxTime || rn < this.getTimeout() ? stateSelf : processState;
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
        const errorQueue = this.ss.getSheetByName("Errors");
        // apppend itself and all downstream processes
        const task = JSON.parse(this.taskKey);
        errorQueue.appendRow(task);
        for(let child of this.children){
            errorQueue.appendRow(JSON.parse(child.taskKey));
        }
        Custom_Utilities.throttling(ScriptApp,"doErrors",60000); // throttle for a minute
        task.push(new Date().toLocaleString());// col 4 should be the date update column
        task.push(message);
        this.ss.getSheetByName("Error_Log").appendRow(task);
    }
}