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

    activate: function() {
        this.loadConfig();
        logger.logLevel = logger.logLevels[config.app.logLevel];
        if (config.app.logLevel == "trace") {
            logger.log(warn, "Activating app with verbose logging.");
        }
        
        logger.log(info, "Conifgured to support types: ", JSON.stringify(config.app.machineTypes));
        for (var i=0; i<config.app.machineTypes.length; i++) {
            include("TypeSupport/" + config.app.machineTypes[i] + "/type.js", () => {
                this.initDetailPanes();
            });
        }
    
        document.title = config.app.title;
        document.getElementById("machineName").innerHTML = config.app.title;
        document.getElementById("imgLogo").src = config.app.logo;
        include(config.app.style);
        
        if (config.app.updateRate && config.app.updateRate > 2000)
            this.updateRate = config.app.updateRate;
        else
            logger.log(error, "Invalid update rate in config, default will be used!");
    },
    
    detailPanesLoaded: 0,
    initDetailPanes: function() {
        this.detailPanesLoaded++;
        if (this.detailPanesLoaded == config.app.machineTypes.length) {
            for (var i in config.app.machineTypes) {
                typeSupport.loadDetailPaneForType(config.app.machineTypes[i], this.detailPaneReady.bind(this));
            };
        }
    },
    
    detailPanesReady: 0,
    detailPaneReady: function() {        
        this.detailPanesReady++;
        for (var i in typeSupportHelpers) {
            typeSupportHelpers[i].queryHandler = this.sendSmipQuery;
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
    
    sendSmipQuery: async function (theQuery, callBack) {  //TODO: this method needs to send typeName to callBack
        if (!this.currentBearerToken) {
            this.currentBearerToken = await smip.getBearerToken();
        }
        if (config.app.logLevel == "info") {
            //Just let errors happen in debug mode
            callBack(await smip.performGraphQLRequest(theQuery, config.user.smipUrl, this.currentBearerToken), theQuery, this);
        } else {
            //Try to show some UI for errors if not in debug mode
            try {
                callBack(await smip.performGraphQLRequest(theQuery, config.user.smipUrl, this.currentBearerToken), theQuery, this);
            }
            catch (ex) {
                if (ex == 400 || ex == 401 || ex == 403) {
                    logger.log(info, "Attempting bearer token refresh with SMIP.");
                    try {
                        this.currentBearerToken = await smip.getBearerToken();
                        callBack(await smip.performGraphQLRequest(theQuery, config.user.smipUrl, this.currentBearerToken), theQuery, this);                        
                    }
                    catch (ex) {
                        logger.log(error, "Authentication or bearer token refresh failure: " + JSON.stringify(ex));
                        this.showToast("Error!", "Attempts to authenticate with the SMIP using configured credentials have failed. Check your settings and re-try.");
                        this.stopUpdate();
                        this.stopSpinner("sendSmipQuery");
                    }
                } else {
                    this.errorRetries++;
                    if (ex == 502) {
                        logger.log(warn, "Proxy error - 502: " + ex);
                    } else {
                        logger.log(warn, "Caught an error: " + ex);
                        logger.log(warn, ex.message);
                        logger.log(info, ex.stack);
                    }
                }
                if (this.errorRetries > 3) {
                    this.errorRetries = 0;
                    if (!this.errorHandled)
                        alert ("An unexpected error occured accessing the SMIP!");
                    this.errorHandled = true;
                }
            }
        }
    },
    
    showMachines: function(payload, updatingTypeName) {
        if (payload && payload.data && payload.data.equipments && payload.data.equipments.length != 0) {
            var discoveredMachines = [];
            payload.data.equipments.forEach (function(item, index, arr) {
                this.toggleElement("toast", "none");
                machineId = "machine" + item.id;
                discoveredMachines.push(machineId);
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
                if (item.typeName == updatingTypeName && discoveredMachines.indexOf(item.id) == -1) {
                    logger.log(info, item.id + " was no longer found and is being removed");
                    document.getElementById("machines").removeChild(item);
                    //TODO: If the deleted one was selected, we need to clean-up the details pane too
                }
            });
        } else {
            logger.log(info, "Empty payload for equipments query. Nothing to populate.");
            this.showToast("Warning!", "No compatible machine instances found on the SMIP instance. Please add equipment instances that match the SM Profile dependency.");    
        }
        //Update UI
        logger.log(info, "Done updating");
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
        logger.log(info, "Rendering details for " + JSON.stringify(widget));
        document.getElementById("machineName").innerHTML = widget.displayName;
    
        if (this.currentDetailPane != null) {
            this.currentDetailPane.destroy();
            //TODO: also remove scripts and css from page?
        }
    
        for (var i in typeSupportHelpers) {
            if (typeSupportHelpers[i].typeName == widget.typeName) {
                this.currentDetailPane = typeSupportHelpers[i];
                this.currentDetailPane.instanceId = widget.instanceId;
                this.currentDetailPane.create("details");
            }
        };
    },
    
    showToast: function(title, message) {
        this.stopUpdate();
        document.getElementById("toast-text").innerHTML = "<strong>" + title + "</strong> " + message;
        this.toggleElement("toast", "block");
    },
    
    startSpinner: function(source) {
        if (source)
            source = " for " + source;
        logger.log(trace, "spinner started" + source);
        document.getElementById("btnRefresh").innerHTML = "<i class=\"fas fa-sync-alt fa-spin\"></i>";
    },
    
    stopSpinner: function(source) {
        if (source)
            source = " for " + source;
        logger.log(trace, "spinner stopped" + source);
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
            opt.innerText = "";
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
        logger.log(info, "Saving Config");
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
        logger.log(info, "User config now: " + JSON.stringify(config.user));
    
        //Clear Machines
        this.stopUpdate();
        if (this.currentDetailPane) {
            this.currentDetailPane.destroy();
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
        logger.log(info, "Saving cookie: " + name + ", value: " + JSON.stringify(value));
        var cookie = [name, "=", JSON.stringify(value), "; expires=" + duration + "; SameSite=Strict;"].join("");
        document.cookie = cookie;
    },
    
    getCookie: function (name) {
        var value = document.cookie.match(new RegExp(name + '=([^;]+)'));
        value && (value = JSON.parse(value[1]));
        logger.log(info, "Got cookie: " + name + ", value: " + JSON.stringify(value));
        return value;
    },
    
    updateLoop: function () {
        window.clearInterval(updateTimer);
        if (config.app.logLevel != "trace") {
            updateTimer = window.setInterval(function () { 
                this.loadMachines();
            }.bind(this), this.updateRate);
        } else {
            logger.log(info, "Verbose logging is on, update firing once -- loop disabled!");
        }
    },
    
    stopUpdate: function() {
        window.clearInterval(updateTimer);
    }
}

//global function to simplify bootstrapping resources
const include = (function(source, callBack) {
    if (!source || source == "") {
        logger.log("warn", "Could not include an empty source");
        return false;
    }
    cacheBust = function() {
        return "?" + (Math.round(Date.now())).toString(36);
    };

    if (source.indexOf(".css") != -1) {
        var css = document.createElement("link");
        css.setAttribute("rel", "stylesheet");
        css.setAttribute("href", source + cacheBust());
        document.head.appendChild(css);    
    } else {
        var js = document.createElement("script");
        js.type = "text/javascript";
        js.src = source + cacheBust();
        document.body.appendChild(js);
        if (callBack) {
            js.addEventListener('load', () => {
                callBack();
            });
        }    
    }
    return true;
})