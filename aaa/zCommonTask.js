class CommonTask extends Task {
    constructor(name, process, taskKey) {
      super(name, process, taskKey);
    }

    setTriggerSelf(key = this.taskKey) {
        // Specific implementation for SpecificTask
        setTrigger(key);
    }
  
    fireTriggerSelf(){
        Custom_Utilities.fireTrigger();
    }
  
    rebootChildren(){
        const fiveMins = new Date().getTime() + 300000;
        this.children.forEach(child => {
            if(child instanceof TimeoutTask){
                child.setTimeout(fiveMins);
            }
            if(this.stoppedStates.has(child.getStateSelf())){
                child.setTriggerSelf();
                child.updateStateSelf("pending");
                Logger.log("set = %s trigger",child.getName());
            }
        });
     
        Custom_Utilities.fireTrigger(); // fires all the triggers that were just set.
    }

    shouldRun(){
        if(this.progressStates.has(this.getStateSelf()))return false; //do nothing because it's already run or is running.
        this.updateStateSelf("running");
        return true;
    }

    getFormResponseAndMap(){
        const readFromCache = Custom_Utilities.getMemoizedReads(cache);
        const formResponse = readFromCache(BACKEND_ID_TEST,`Submissions!${this.process.rootKey}:${this.process.rootKey}`).values[0]; 
        const colMap = mkColMap(readFromCache(BACKEND_ID_TEST,"Submissions!1:1").values[0]);
        return [formResponse,colMap];
    }
}
