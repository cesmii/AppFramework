logger = {};
logger.logLevel = "error";

logger.logLevels = {
    "error": 4,
    "warn": 3,
    "info": 2,
    "trace": 1
};

logger.log = function(logLevel, arguments) {
    if (arguments) {
        var messageLevel = logLevel;
        var messageText = "";
        if ( typeof arguments === "object") {
            messageText = JSON.stringify(arguments);    
        } else {
            messageText = arguments;
        }
        if (logger.logLevel == logger.logLevels.trace) {
            var e = new Error();
            var lastFunction = e.stack.split("\n")[2];
            if (lastFunction)
                messageText += "\n(" + lastFunction + ")"
        }
        if (this.logLevels[messageLevel] >= this.logLevel) {
            console.log(messageLevel + ": " + messageText);
        }
    }
}

logger.trace = function() {
    logger.log ("trace", arguments);
}

logger.info = function() {
    logger.log ("info", arguments);
}

logger.warn = function() {
    logger.log ("warn", arguments);
}

logger.error = function() {
    logger.log ("error", arguments);
}