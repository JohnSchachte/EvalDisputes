class Task {
    constructor(name,process,taskKey,storage) {
      this.parents = new Map();
      this.children = new Map();
      this.siblings = new Map();
      this.name = name;
      this.storage = storage;
      this.taskKey = taskKey;
      this.process = process;
      this.ss =  SpreadsheetApp.openById(BACKEND_ID); // make this the id of the spreadsheet of information

    }

    getNode(name){
      return (this.children.get(name) || this.siblings.get(name) || this.parents.get(name));
    }
    
    getName(){return this.name;}

    setSibling(node){
      Logger.log("setting %s as sibling to %s",node.getName(),this.name);
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
      this.storage.set(this.taskKey+"state",newState);
    }
  
    getStateSelf() {
      return this.storage.get(this.taskKey+"state");
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
      let result = true;
      neighbors.forEach(neighbor => {
        Logger.log(neighbor.getStateSelf());
        Logger.log(neighbor.getName());
        if (neighbor.getStateSelf() !== state) {
          result = false;
        }
      });
      return result;
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