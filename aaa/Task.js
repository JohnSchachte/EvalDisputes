/**
 * Task class that represents a task in the process.
 */
class Task {
  /**
   * Constructs a new Task instance.
   * @param {string} name - The name of the task.
   * @param {Process} process - The process that this task belongs to.
   * @param {string} taskKey - The key of the task.
   */
    constructor(name,process,taskKey) {
      this.parents = new Map();
      this.children = new Map();
      this.siblings = new Map();
      this.name = name;
      this.taskKey = taskKey;
      this.process = process;
    }
  /**
  * Retrieves a node by its name from children, siblings or parents.
  * @param {string} name - The name of the node.
  * @returns {Node} The node.
  */
    getNode(name){
      return (this.children.get(name) || this.siblings.get(name) || this.parents.get(name));
    }
    /**
    * Returns the name of the task.
    * @returns {string} The name of the task.
    */
    getName(){return this.name;}
  /**
  * Sets a parent for the task.
  * @param {Task} node - The parent task.
  */
  setParent(node){
    this.parents.set(node.getName(),node);
  }

  /**
  * Sets multiple parents for the task.
  * @param {Array<Task>} nodes - The parent tasks.
  */
  setParents(nodes){
    for(let node of nodes){
      this.setParent(node);
    }
  }

  /**
  * Sets a sibling for the task.
  * @param {Task} node - The sibling task.
  */
    setSibling(node){
      Logger.log("setting %s as sibling to %s",node.getName(),this.name);
      this.siblings.set(node.getName(),node);
    }
    /**
    * Sets a child for the task.
    * @param {Task} node - The child task.
    */
    setChild(node){
      this.children.set(node.getName(),node);
    }

     /**
    * Sets multiple siblings for the task.
    * @param {Array<Task>} nodes - The sibling tasks.
    */
    setSiblings(nodes){
      for(let node of nodes){
        this.setSibling(node);
      }
    }
 /**
  * Sets multiple children for the task.
  * @param {Array<Task>} nodes - The child tasks.
  */
    setChildren(nodes){
      for(let node of nodes){
        this.setChild(node);
      }
    }
 /**
  * Updates the state of the process.
  * @param {string} state - The new state.
  */
    updateProcess(state){
        this.process.setState(state);
    }
  /**
    * Sets a trigger for the task. To be implemented in child classes.
    */
    setTriggerSelf() {
      // Implement this method in child classes
      throw new Error('You have to implement the method setTriggerSelf!');
    }
   /**
  * Fires a trigger for the task. To be implemented in child classes.
  */
    fireTriggerSelf() {
      // Implement this method in child classes
      throw new Error('You have to implement the method fireTriggerSelf!');
    }
   /**
  * Logs the task. To be implemented in child classes.
  */
    logSelf() {
      // Implement this method in child classes
      throw new Error('You have to implement the method logSelf!');
    }
   /**
  * Updates the state of the task.
  * @param {string} newState - The new state.
  */
    updateStateSelf(newState) {
      this.process.storage.set(this.taskKey+"state",newState);
    }
   /**
  * Returns the state of the task.
  * @returns {string} The state of the task.
  */
    getStateSelf() {
      return this.process.storage.get(this.taskKey+"state");
    }
   /**
  * Handles the success scenario. To be implemented in child classes.
  */
    onSuccess() {
      // Implement this method in child classes
      throw new Error('You have to implement the method onSuccess!');
    }
  /**
  * Handles the failure scenario. To be implemented in child classes.
  */
    onFailure() {
      // Implement this method in child classes
      throw new Error('You have to implement the method onFailure!');
    }
 /**
  * Deconstructs the task. To be implemented in child classes.
  */
    deconstruct(){
        //Implement this in child classes
        throw new Error('You have to implement the method deconstruct!');
    }
    checkNeighborsState(neighbors, state) {
      let allInState = true;
      neighbors.forEach((value, key) => {
        if (value.getStateSelf() !== state) {
          allInState = false;
        }
      });
      return allInState;
    }
    
    checkSomeNeighborsState(neighbors, state) {
      let someInState = false;
      neighbors.forEach((value, key) => {
        if (value.getStateSelf() === state) {
          someInState = true;
        }
      });
      return someInState;
    }
    
    getNeighborsState(neighbors) {
      const states = [];
      neighbors.forEach((value, key) => {
        states.push(value.getStateSelf());
      });
      return states;
    }

  /**
  * Checks the state of the neighbors.
  * @param {Array<Task>} neighbors - The neighbor tasks.
  * @param {string} state - The state to check.
  * @returns {boolean} True if all neighbors are in the given state, false otherwise.
  */
  updateNeighborsState(neighbors,state,condition = (neighbor) => true){
    neighbors.forEach(neighbor => {
      if(condition(neighbor)) {
        neighbor.updateStateSelf(state);
      }
    });
  }
  /**
  * Deconstructs the neighbor tasks.
  * @param {Array<Task>} neighbors - The neighbor tasks.
  * @param {conditionCallback} condition - The condition to check for each neighbor.
  */
    deconstructNeighbors(neighbors, condition = (neighbor) => true) {
      neighbors.forEach(neighbor => {
        if(condition(neighbor)) {
          neighbor.deconstruct();
        }
      });
    }
     /**
  * Runs the task. To be implemented in child classes.
  */
    run(){
        //Implement this in child classes
        throw new Error('You have to implement the method run!');
    }
}