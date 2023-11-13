logger = {};
logger.logLevel = "error";

logger.logLevels = {
    "error": 4,
    "warn": 3,
    "info": 2,
    "trace": 1
};
const error = "error";
const warn = "warn";
const info = "info";
const trace = "trace";

logger.log = function() {
    if (arguments) {
        var messageLevel = "info";
        var messageText = "";
        for (let i = 0; i < arguments.length; i++) {
            let argument = arguments[i];
            if (argument && typeof argument === 'string') {
                if (argument.toLowerCase() == "trace" || argument.toLowerCase() == "info" || argument.toLowerCase() == "warn" || argument.toLowerCase() == "error")
                    messageLevel = argument;
                else
                    messageText += argument + " ";
            } else {
                messageText += JSON.stringify(argument);
            }
        };
        if (this.logLevels[messageLevel] >= this.logLevel) {
            console.log(messageLevel + ": " + messageText);
        }
    }
}