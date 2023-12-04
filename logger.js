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
            for (let key in arguments) {
                if ( typeof arguments[key] === "object") {
                    messageText += JSON.stringify(arguments[key]);
                } else {
                    messageText += arguments[key];
                }
             }
        } else {
            messageText = arguments;
        }
        if (logger.logLevel == logger.logLevels.trace) {
            var e = new Error();
            var lastFunction = e.stack.split("\n")[2];
            if (lastFunction)
                messageText += "\n(" + lastFunction + ")"
            messageText = logLevel + ": " + messageText;
            console.groupCollapsed(messageText);
            console.trace();
        }
        if (this.logLevels[messageLevel] >= this.logLevel) {
            switch(logLevel) {
                case "info": {
                    console.info(messageText);
                    break;
                } case "warn": {
                    console.warn(messageText);
                    break;
                } case "error": {
                    console.error(messageText);
                    break;
                } default: {
                    console.log(messageText);
                    break;
                }
            }
        }
        if (logger.logLevel == logger.logLevels.trace)
            console.groupEnd();
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
