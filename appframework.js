//global variables
var updateTimer = null;
var configFavorites = null;
var logLevel = logger.logLevels.error;
var typeSupportHelpers = [];

//main app framework code
appFramework = {
    name: "appFramework",
    firstDraw: true,
    updateRate: 5000,
    errorRetries: 0,
    errorHandled: false,
    currentBearerToken: null,
    currentDetailPane: null,
    detailPanesLoaded: 0,

    activate: function() {
        this.loadConfig();
        logger.logLevel = logger.logLevels[config.app.logLevel];
        if (config.app.logLevel == "trace") {
            logger.warn("Activating app with verbose logging.");
        }
        
        logger.info("Configured to support types: ", JSON.stringify(config.app.machineTypes));
        for (var i=0; i<config.app.machineTypes.length; i++) {
            include("TypeSupport/" + config.app.machineTypes[i] + "/type.js", 
                //Helper loaded successfully
                () => {
                    this.detailPanesLoaded++;
                    if (this.detailPanesLoaded == config.app.machineTypes.length) {
                        for (var i in config.app.machineTypes) {
                            typeSupport.loadDetailPaneForType(config.app.machineTypes[i], this.detailPaneReady.bind(this));
                        };
                    }
                },
                //Helper failed to load
                (error) => {
                    this.showToast("Error!", "Could not load required Type support helper. The necessary Extension may not be installed on the server. See the console log for more details.");
                });
        }
    
        document.title = config.app.title;
        document.getElementById("machineName").innerHTML = config.app.title;
        document.getElementById("imgLogo").src = config.app.logo;
        if (config.app.style)
            include(config.app.style);
        
        if (config.app.updateRate && config.app.updateRate > 2000)
            this.updateRate = config.app.updateRate;
        else
            logger.error("Invalid update rate in config, default will be used!");
    },
    
    detailPanesReady: 0,
    detailPaneReady: function() {        
        this.detailPanesReady++;
        for (var i in typeSupportHelpers) {
            typeSupportHelpers[i].queryHelper = this.smipQueryHelper;
        }
        this.loadMachines();
        if (this.detailPanesReady == config.app.machineTypes.length)
            this.updateLoop();
    },
    
    loadMachines: function() {
        this.startSpinner("loadMachines");
        if (config.user.smipUrl && config.user.smipUrl != "" &&
            config.user.authenticator && config.user.authenticator !== "" &&
            config.user.username && config.user.username != "" &&
            config.user.password && config.user.password != "" &&
            config.user.role && config.user.role != "") {
                for (var i in typeSupportHelpers) {
                    typeSupportHelpers[i].loadMachines(appFramework.showMachines.bind(this));
                }
                //Update the details pane if present
                if (this.currentDetailPane) {
                    this.currentDetailPane.update();
                }
            }
        else {
            this.stopSpinner("loadMachines");
            this.toggleElement("settings", "block");
            this.stopUpdate();
        }
    },
    
    smipQueryHelper: async function (theQuery, callBack) {
        /* Note: this function lends itself to the detail panes, changing its callback context. 
        As a result "this" gets changed, so local members are referenced using the global name appFramework
        */
        if (!appFramework.currentBearerToken) {
            appFramework.currentBearerToken = await smip.getBearerToken();
        }
        if (config.app.logLevel == logger.trace) {
            //Just let errors happen in debug mode
            if (!appFramework.currentBearerToken) {
                throw new Error("SMIP authentication failed to return a usable bearer token!");
            }
            callBack(await smip.performGraphQLRequest(theQuery, config.user.smipUrl, appFramework.currentBearerToken), theQuery, this);
        } else {
            //Try to show some UI for errors if not in debug mode
            if (!appFramework.currentBearerToken) {
                appFramework.showToast("Error!", "Attempts to authenticate with the SMIP using configured credentials have failed. Check your settings and re-try.");
            } else {
                try {
                    if (callBack && (typeof callBack === "function"))
                        callBack(await smip.performGraphQLRequest(theQuery, config.user.smipUrl, appFramework.currentBearerToken), theQuery, this);
                }
                catch (ex) {
                    if (ex == 400 || ex == 401 || ex == 403) {
                        logger.info("Attempting bearer token refresh with SMIP.");
                        try {
                            appFramework.currentBearerToken = await smip.getBearerToken();
                            if (callBack && (typeof callBack === "function"))
                                callBack(await smip.performGraphQLRequest(theQuery, config.user.smipUrl, appFramework.currentBearerToken), theQuery, this);                        
                        }
                        catch (ex) {
                            logger.error("Authentication or bearer token refresh failure: " + JSON.stringify(ex));
                            appFramework.showToast("Error!", "Attempts to authenticate with the SMIP using configured credentials resulted in an error. Check your settings and re-try.");
                            appFramework.stopUpdate();
                            appFramework.stopSpinner("smipQueryHelper");
                        }
                    } else {
                        appFramework.errorRetries++;
                        if (ex == 502) {
                            logger.warn("Proxy error - 502: " + ex);
                        } else {
                            logger.warn("Caught an error: " + ex);
                            logger.warn(ex.message);
                            logger.info(ex.stack);
                        }
                    }
                    if (appFramework.errorRetries > 3) {    //TODO: Add exponential back-off
                        appFramework.errorRetries = 0;
                        if (!appFramework.errorHandled) {
                            appFramework.showToast("Error!", "An unexpected error occured accessing the SMIP!");
                        }
                        appFramework.errorHandled = true;
                    }
                }
            }
        }
    },
    
    showMachines: function(payload, useTypeName) {
        if (payload && payload.errors) {
            logger.error("An error occurred loading machines from the SMIP: " + JSON.stringify(payload.errors));
            this.showToast("SMIP Error", "Error querying equipment: " + payload.errors[0].message);
        }
        else if (payload && payload.data && payload.data.equipments && payload.data.equipments.length != 0) {
            var discoveredMachines = [];
            payload.data.equipments.forEach (function(item, index, arr) {
                this.toggleElement("toast", "none");
                machineId = "machine" + item.id;
                discoveredMachines.push(machineId);
                if (useTypeName && useTypeName != "" && typeof (useTypeName) !== "object")
                    item.typeName = useTypeName;
                var icon = typeSupport.getIconForType(item.typeName);
                if (!document.getElementById(machineId)) {
                    //Create the widget
                    newMachine = new widgetFactory(machineId, item, null, icon, this.machineClicked.bind(this));
                    document.getElementById("machines").appendChild(newMachine.build(newMachine));
                } else {
                    //Update the widget
                    document.getElementById(machineId).widget.update(item);
                }
            }.bind(this));
            //Delete widgets if equipment removed
            document.getElementById("machines").childNodes.forEach (function(item) {
                if (item.typeName == useTypeName && discoveredMachines.indexOf(item.id) == -1) {
                    logger.info(item.id + " was no longer found and is being removed");
                    document.getElementById("machines").removeChild(item);
                    //TODO: If the deleted one was selected, we need to clean-up the details pane too
                }
            });
        } else {
            logger.info("Empty payload for equipments query. Nothing to populate.");
            this.showToast("Warning!", "No compatible machine instances found on the SMIP instance. Please add equipment instances that match the SM Profile dependency.");    
        }
        //Update UI
        logger.info("Done updating");
        if (this.firstDraw) {
            //Give detail pane's injected dependencies a second to load
            window.setTimeout(function () {
                this.selectMachine(0, discoveredMachines)
              }.bind(this), 700);
            this.firstDraw = false;
        }
        this.stopSpinner("showMachines done");
    },
    
    selectMachine: function(i, discoveredMachines) {
        for (var j=0; j<document.getElementById("machines").childNodes.length; j++) {
            var item=document.getElementById("machines").childNodes[j];
            if (discoveredMachines.indexOf(item.id) != -1) {
                if (i == j) {
                    item.click();
                    break;
                }
            }
        };
    },
    
    machineClicked: function(event) {
        var widget = event.target || event.srcElement;
        widget = widget.widget;
        widget.select(document.getElementById("machines"));
        logger.info("Rendering details for " + JSON.stringify(widget));
        document.getElementById("machineName").innerHTML = widget.displayName;
    
        if (this.currentDetailPane != null) {
            this.currentDetailPane.destroy();
            this.currentDetailPane = null;
            //TODO: also remove scripts and css from page?
        }
    
        for (var i in typeSupportHelpers) {
            logger.trace("Checking if detail pane " + typeSupportHelpers[i].typeName + " is for " + widget.typeName);
            if (typeSupportHelpers[i].typeName.toLowerCase() == widget.typeName.toLowerCase()) {
                this.currentDetailPane = typeSupportHelpers[i];
                this.currentDetailPane.instanceId = widget.instanceId;
                this.currentDetailPane.create("details");
            }
        };
        if (this.currentDetailPane)
            logger.trace("The current detail pane is now: " + this.currentDetailPane.typeName);
    },

    validateRootElement: function(rootElement) {
        if (rootElement) {
            if (rootElement.nodeName == "DIV") {
                return rootElement;
            }
        }
        if (!rootElement || document.getElementById(rootElement) == null) {
            logger.error("Cannot create detail pane without a root element!");
            return false;
        } else {
            if (rootElement.nodeName != "DIV") {
                rootElement = document.getElementById(rootElement);
                if (rootElement.nodeName != "DIV") {
                    logger.error("Root element for detail pane was not a DIV!");
                    return false;
                } else {
                    return rootElement;
                }
            }
        }
    },
    
    showToast: function(title, message) {
        this.stopUpdate();
        document.getElementById("toast-text").innerHTML = "<strong>" + title + "</strong> " + message;
        this.toggleElement("toast", "block");
    },
    
    startSpinner: function(source) {
        if (source)
            source = " for " + source;
        logger.trace("spinner started" + source);
        document.getElementById("btnRefresh").innerHTML = "<i class=\"fas fa-sync-alt fa-spin\"></i>";
    },
    
    stopSpinner: function(source) {
        if (source)
            source = " for " + source;
        logger.trace("spinner stopped" + source);
        document.getElementById("btnRefresh").innerHTML = "<i class=\"fas fa-sync-alt\"></i>";
    },
    
    toggleElement: function(id, toggleVal, responsiveOnly) {
        if (!responsiveOnly || (responsiveOnly && window.innerWidth <= 640)) {  //sync with css
            if (typeof toggleVal === 'undefined')
            toggleVal = document.getElementById(id).style.display == "block" ? "none" : "block";
            else {
                if (toggleVal === true)
                    toggleVal = "block";
                else if (toggleVal === false)
                    toggleVal = "none";
            }
            document.getElementById(id).style.display = toggleVal;
        }
    },

    deleteElements: function(className) {
        var elements = Array.from(document.getElementsByClassName(className))
        if (elements.length != 0) {
            elements.forEach((element) => {
                element.remove()
            })
        }
    },

    showSettings: function() {
        this.stopUpdate();
        this.toggleElement('settings', true);
    },
    
    selectFavorite: function() {
        var form = document.getElementById("configForm").elements;
        var value = form.smipfavorite.options[form.smipfavorite.selectedIndex].value;
        if (value > -1) {
            config.user = configFavorites[value];
            this.updateConfigForm();
        } else {
            config.user = defaults.user;
            document.getElementById("configForm").reset();
        }
    },
    
    reflectFavorite: function() {
        var form = document.getElementById("configForm").elements;
        var foundFavorite = false;
        for (var f=0;f<configFavorites.length;f++) {
            if (configFavorites.smipUrl.toLowerCase() == form.smipurl.toLowerCase()) {
                form.smipfavorite.value = f;
                foundFavorite = true;
            }
        }
        if (!foundFavorite) {
            form.smipfavorite.value = -1;
            form.saveFavorite.checked = false;
        }
    },
    
    loadConfig: async function () {
        var cookieConfig = this.getCookie("config");
        if (cookieConfig) {
            config.user = cookieConfig;
        }
        configFavorites = this.getCookie("favorites");
        if (!configFavorites)
            configFavorites = [];
        this.updateConfigForm();
    },
    
    updateConfigForm: function() {
        var form = document.getElementById("configForm").elements;
    
        var foundFavorite = false;
        form.smipfavorite.innerHTML = "";
        if (configFavorites && configFavorites.length > 0) {
            var opt = document.createElement("option");
            opt.value = -1;
            opt.innerText = "New";
            form.smipfavorite.appendChild(opt);
            document.getElementById("divFavorites").style.display = "block";
            for (var f=0;f<configFavorites.length;f++) {
                var opt = document.createElement("option");
                opt.value = f;
                opt.innerText = configFavorites[f].smipUrl.replace("https://", "").replace("/graphql", "");
                if (configFavorites[f].smipUrl == config.user.smipUrl) {
                    opt.selected = true;
                }
                form.smipfavorite.appendChild(opt);
                foundFavorite = true;
            }
        }
        form.smipurl.value = config.user.smipUrl;
        form.authenticator.value = config.user.authenticator;
        form.smipusername.value = config.user.username;
        form.password.value = config.user.password;
        form.role.value = config.user.role; 
        form.modelParentId.value = config.user.modelParentId;
    },
    
    saveConfig: function () {
        logger.info("Saving Config");
        var form = document.getElementById("configForm").elements;
        config.user.smipUrl = form.smipurl.value;
        config.user.authenticator = form.authenticator.value;
        config.user.username = form.smipusername.value;
        config.user.password =  form.password.value;
        config.user.role = form.role.value;
        if (form.modelParentId != "")
            config.user.modelParentId = form.modelParentId.value;
        else
            config.user.modelParentId = null;
        
        if (form.saveFavorite.checked) {
            //overwrite, but don't duplicate similar favorites
            var foundFavorite = false;
            for (var f=0;f<configFavorites.length;f++) {
                if (configFavorites[f].smipUrl == config.user.smipUrl) {
                    configFavorites[f] = config.user;
                    foundFavorite = true;
                }
            }
            if (!foundFavorite) {
                configFavorites.push(config.user);
            } 
            this.setCookie("favorites", configFavorites, 90);
        }
        
        this.toggleElement("toast", "none");
        this.toggleElement("settings", "none");
        this.setCookie("config", config.user, 90);
        logger.info("User config now: " + JSON.stringify(config.user));
    
        //Clear Machines
        this.stopUpdate();
        if (this.currentDetailPane) {
            try {
                this.currentDetailPane.destroy();
            } catch (e) {
                logger.warn("Detail pane threw an error during destroy: " + e);
            }
            this.currentDetailPane = null;
        }
        document.getElementById("machines").childNodes.forEach (function(node, index, arr) {
            node.classList.remove("selected");
        });
    
        //Start again with new config
        this.updateConfigForm();
        this.loadMachines();
        this.toggleElement("machines", "block");
        this.updateLoop();
        //TODO: Need to cancel/cleanly abandon any pending promises
    },
    
    setCookie: function(name, value, duration) {
        var d = new Date();
        d.setTime(d.getTime() + (duration*24*60*60*1000));
        duration = d.toUTCString();
        logger.info("Saving cookie: " + name + ", value: " + JSON.stringify(value));
        var cookie = [name, "=", JSON.stringify(value), "; expires=" + duration + "; SameSite=Strict;"].join("");
        document.cookie = cookie;
    },
    
    getCookie: function (name) {
        var value = document.cookie.match(new RegExp(name + '=([^;]+)'));
        value && (value = JSON.parse(value[1]));
        logger.info("Got cookie: " + name + ", value: " + JSON.stringify(value));
        return value;
    },
    
    updateLoop: function () {
        window.clearInterval(updateTimer);
        if (config.app.logLevel != "trace") {
            updateTimer = window.setInterval(function () { 
                this.loadMachines();
            }.bind(this), this.updateRate);
        } else {
            logger.info("Verbose logging is on, update firing once -- loop disabled!");
        }
    },
    
    stopUpdate: function() {
        window.clearInterval(updateTimer);
    }
}

//global function to simplify bootstrapping resources
const include = (function(source, successCallBack, errorCallBack) {
    logger.trace("Including source: " + JSON.stringify(source));
    //enclosed (private) helper
    cacheBust = function() {
        return "?" + (Math.round(Date.now())).toString(36);
    };

    if (!source || source == "") {
        logger.warn("Could not Include an empty source.");
        return false;
    }
    var args;
    if (typeof source == 'object') {
        args = source;
        if (args["href"])
            source = args.href;
        if (args["HREF"])
            source = args.HREF;
        if (args["src"])
            source = args.src;
        if (args["SRC"])
            source = args.SRC;
    }
    source = source + cacheBust();

    if (source.indexOf(".css") != -1) {
        //Inject CSS links
        var css = document.createElement("link");
        css.setAttribute("rel", "stylesheet");
        if (args) {     //Support arguments if sent
            for (let key in args) {
                css[key] = args[key];
            }
        }
        css.setAttribute("href", source);
        document.head.appendChild(css);
    } else {
        //Inject Script sources
        var js = document.createElement("script");
        js.type = "text/javascript";
        if (args) {     //Support arguments if sent
            for (let key in args) {
                js[key] = args[key];
            }
        }
        js.src = source;
        js.onerror = (error) => {
            logger.error("Failed to Include script: " + source);
            if (errorCallBack) {
                errorCallBack(error);
            }
        };
        document.body.appendChild(js);
        if (successCallBack) {
            js.addEventListener('load', () => {
                successCallBack();
            });
        }
    }
    return true;
})