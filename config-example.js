// This config is for example only and won't be used
//  Create a custom config by copying config-example.js to config.js and setting values there
config = {
    app: {  //These are global app settings that the user cannot change
        "title": "CESMII Machine View",
        "logo": "customlogo.png",
        "style": "custom.css",
        "updateRate": 5000,         //high update rates will have global performance impact -- this interface is not intended for high speed data!
        "machineTypes": ["example"],   //to support a different type, you must load or create TypeSupport resources
        "logLevel": "error"       //levels are: error, warn, info
    }, 
    user: { //These are defaults that the user can over-ride. Get them from your SMIP instance.
        "smipUrl": "https://demo.cesmii.net/graphql",
        "authenticator": "YOUR_AUTHENTICATOR",
        "password": "YOUR_AUTHENTICATOR_PASSWORD",    //For test only -- do not hard-code a password in prod. It will be visible to any client!
        "username": "YOUR_AUTHENTICATOR_USERNAME",
        "role": "YOUR_AUTHENTICATOR_ROLE",
        "modelParentId": 28221,   //the smip instance id of the parent
    }
};
