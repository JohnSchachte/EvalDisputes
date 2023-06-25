// copied as of 6/2/2023
const cache = CacheService.getScriptCache();
const REPORTING_ID = "1zQ98-rxOzfeq1QOmVeaC7OgOcZ0IaD7vv7_Vak7rclE";
const BACKEND_ID_TEST = "1aDyYnI1Bve9fDrT5k5Ykle93dzrgp0qNTGRtRaR3V3U";
const BACKEND_ID = "15b5tb9q5Ysit_0zNBzsNw9Fk2zPRhKyWsRhbO1SuI5Y";
const BAD_VALUES = new Set(["",null,undefined]); // faslify but excluding 0;
const sheetsAPI = Sheets.Spreadsheets.Values
const scriptProp = PropertiesService.getScriptProperties();

const setTrigger = function (task){
    task = JSON.stringify(task);
    let trigger = Custom_Utilities.setImmediateTrigger(ScriptApp,"initiateTask");
    // Cache the task using the trigger's unique ID as the key
    cache.put(trigger.getUniqueId(), task);
  }