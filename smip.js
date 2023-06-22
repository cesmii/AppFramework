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
    return new Promise(
        async function (resolve, reject) {
            // Step 1: Request a challenge
            var theQuery = {
                query: `mutation { authenticationRequest(input:
                    {authenticator: "${config.authenticator}", 
                    role: "${config.role}", 
                    userName: "${config.name}"})
                    { jwtRequest { challenge, message } } 
                }`
            };
            var authResponse = await smip.performGraphQLRequest(theQuery, config.smipUrl);
            var challenge = authResponse.data.authenticationRequest.jwtRequest.challenge;

            // Step 2: Get token
            var theQuery = {
                query: `mutation { authenticationValidation(input:
                    {authenticator:"${config.authenticator}", 
                    signedChallenge: "${challenge}|${config.password}"})
                    { jwtClaim } 
                }`
            };
            var challengeResponse = await smip.performGraphQLRequest(theQuery, config.smipUrl);
            var newJwtToken = "Bearer " + challengeResponse.data.authenticationValidation.jwtClaim;
            console.log("Successfully authenticated with SMIP");
            resolve(newJwtToken);

            //TODO: Handle errors!
        }
    );
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
        console.log(error, "Could not parse query params to JSON: " + queryParts[0]);
        return false;
    }
};