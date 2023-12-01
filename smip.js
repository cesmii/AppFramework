if (typeof smip === 'undefined')
    smip = {};
smip.currentBearerToken = "";

smip.performGraphQLRequest = async function performGraphQLRequest(query, endPoint, bearerToken) {
    return new Promise(
        function (resolve, reject) {
            let xhr = new XMLHttpRequest();
            xhr.responseType = "json";
            xhr.open("POST", endPoint);
            xhr.setRequestHeader("Content-Type", "application/json");
            if (bearerToken && bearerToken != "")
                xhr.setRequestHeader("Authorization", bearerToken)
            xhr.onload = function() {
                if (xhr.status == 200)
                    resolve (xhr.response);
                else
                    reject (xhr.status);
            };
            xhr.send(JSON.stringify(query));
        }
    );
}

smip.getBearerToken = async function getBearerToken() {
    logger.trace("getBearerToken invoked!");
    if (config.user.authenticator && config.user.authenticator != "" &&
        config.user.username && config.user.username != "" &&
        config.user.password && config.user.password != "" &&
        config.user.role && config.user.role != "") {
            return new Promise(
                async function (resolve) {
                    // Step 1: Request a challenge
                    var theQuery = {
                        query: `mutation { authenticationRequest(input:
                            {authenticator: "${config.user.authenticator}", 
                            role: "${config.user.role}", 
                            userName: "${config.user.username}"})
                            { jwtRequest { challenge, message } } 
                        }`
                    };
                    var authResponse = await smip.performGraphQLRequest(theQuery, config.user.smipUrl);
                    var challenge = authResponse.data.authenticationRequest.jwtRequest.challenge;
                    if (!challenge) {
                        logger.error("Could not obtain auth challenge from SMIP: " + JSON.stringify(authResponse));
                        resolve(false);
                    }
                    // Step 2: Get token
                    var theQuery = {
                        query: `mutation { authenticationValidation(input:
                            {authenticator:"${config.user.authenticator}", 
                            signedChallenge: "${challenge}|${config.user.password}"})
                            { jwtClaim } 
                        }`
                    };
                    var challengeResponse = await smip.performGraphQLRequest(theQuery, config.user.smipUrl);
                    var newJwtToken = challengeResponse.data.authenticationValidation.jwtClaim;
                    if (!newJwtToken) {
                        logger.error("Could not authenticate with SMIP: " + JSON.stringify(challengeResponse));
                        resolve(false);                        
                    } else {
                        var newJwtToken = "Bearer " + challengeResponse.data.authenticationValidation.jwtClaim;
                        logger.info("Successfully authenticated with SMIP");
                        resolve(newJwtToken);
                    }
                    //TODO: Handle errors!
                }
            );
        }
    else {
        logger.info("Insufficient credentials configured for SMIP authentication. Check config.");
        return false;
    }
}

/* This function probably isn't necessary, as long as we make sure the query includes ids in the response */
smip.parseGraphQLForQueryParams = function(queryType, queryBody) {
    queryBody = queryBody.replace(/(\r\n|\n|\r)/gm, "");  //remove linebreaks
    queryBody = queryBody.replace(/\s+/g,"");   //remove extra spaces
    //isolate the params
    var queryParts = queryBody.split(queryType+"(")[1];
    queryParams = "{" + queryParts.split(")")[0] + "}";
    //try to form JSON
    queryParams = queryParams.replace(/{/g, "{\"");
    queryParams = queryParams.replace(/,/g, ",\"");
    queryParams = queryParams.replace(/:"/g, "\":\"");
    queryParams = queryParams.replace(/:\[/g, "\":\[");
    try {
        queryParams = JSON.parse(queryParams);
        return queryParams;
    } catch(error) {
        logger.info(error, "Could not parse query params to JSON: " + queryParts[0]);
        return false;
    }
};