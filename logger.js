logger = {};
logger.logLevel = "error";

logger.logLevels = {
    "error": 3,
    "warn": 2,
    "info": 1
};
logger.log = function() {
    var messageLevel = "info";
    var messageText = "";
    for (let i = 0; i < arguments.length; i++) {
        let argument = arguments[i];
        if (argument.toLowerCase() == "info" || argument.toLowerCase() == "warn" || argument.toLowerCase() == "error")
            messageLevel = argument;
        else
            messageText += argument + " ";
    };
    if (this.logLevels[messageLevel] >= this.logLevel) {
        console.log(messageLevel + ": " + messageText);
    }
}