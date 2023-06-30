function Storage() {
    this.storage = scriptProp;
  }
  
  Storage.prototype.get = function(key) {
    return this.storage.getProperty(key);
  }
  
  Storage.prototype.set = function(key, value) {
    this.storage.setProperty(key,value);
  }
  
  Storage.prototype.remove = function(key) {
    this.storage.deleteProperty(key);
  }

  Storage.prototype.garbageCollect = function() {
    var properties = this.storage.getAllProperties();
  
    // Create an array of keys
    var keys = Object.keys(properties);
  
    // Filter keys based on the condition
    var keysToDelete = keys.filter((key) => properties[key] === 'success' || properties[key] === 'denied');
  
    // Delete the properties
    keysToDelete.forEach(key =>  this.storage.deleteProperty(key));  // passing `this` for correct context inside forEach
  }