var errorRetries = 0;
var errorHandled = false;
var updateTimer = null;
var updateRate = 6000;
var currentBearerToken = "";
var currentDetailPane = null;
var configFavorites = null;
var logLevel = logLevels.error;

function activate() {
    loadConfig();

    document.title = config.title;
    document.getElementById("machineName").innerHTML = config.title;
    document.getElementById("imgLogo").src = config.logo;
    if (config.style && config.style != "") {
        var css = document.createElement("link");
        css.setAttribute("rel", "stylesheet");
        css.setAttribute("href", config.style + typeSupport.cacheBust());
        document.head.appendChild(css);    
    }
    typeSupport.loadDetailPaneForType(config.machineType, detailPaneReady);
    if (config.debug) {
        log("info", "Activating app in Debug mode!");
    }
}

function detailPaneReady() {
    loadMachines();
    updateLoop();
}

function loadMachines() {
    document.getElementById("btnRefresh").innerHTML = "<img src=\"spinner.gif\" height=\"22px\">";
    if (config.smipUrl)
        sendSmipQuery(queries.getEquipments(config.machineType, config.machineParentId), showMachines);
    else {
        showMachines();
        document.getElementById("btnRefresh").innerHTML = "Refresh";
        if (config.machineType != "example") {
            toggleElement("settings", "block");
            stopUpdate();
        }
    }
}

async function sendSmipQuery(theQuery, callBack) {
    if (!currentBearerToken) {
        currentBearerToken = await smip.getBearerToken();
    }
    if (config.debug) {
        //Just let errors happen in debug mode
        callBack(await smip.performGraphQLRequest(theQuery, config.smipUrl, currentBearerToken), theQuery, this);
    } else {
        //Try to show some UI for errors if not in debug mode
        try {
            callBack(await smip.performGraphQLRequest(theQuery, config.smipUrl, currentBearerToken), theQuery, this);
        }
        catch (ex) {
            if (ex == 400 || ex == 401 || ex == 403) {
                log("info", "Attempting bearer token refresh with SMIP.");
                try {
                    currentBearerToken = await smip.getBearerToken();
                    callBack(await smip.performGraphQLRequest(theQuery, config.smipUrl, currentBearerToken), theQuery, this);                        
                }
                catch (ex) {
                    log("error", "Authentication or bearer token refresh failure: " + JSON.stringify(ex));
                    showToast("Error!", "Attempts to authenticate with the SMIP using configured credentials have failed. Check your settings and re-try.");
                    stopUpdate();
                    document.getElementById("btnRefresh").innerHTML = "Refresh";
                }
            } else {
                errorRetries++;
                if (ex == 502) {
                    log("info", "Proxy error - 502: " + ex);
                } else {
                    log("info", "Caught an error: " + ex);
                    log("info", ex.message);
                    if (config.debug)
                        log("info", ex.stack);
                }
            }
            if (errorRetries > 3) {
                errorRetries = 0;
                if (!errorHandled)
                    alert ("An unexpected error occured accessing the SMIP!");
                errorHandled = true;
            }
        }
    }
}

function showMachines(payload, query, self) {
    if (payload && payload.data && payload.data.equipments && payload.data.equipments.length != 0) {
        var discoveredMachines = [];
        payload.data.equipments.forEach (function(item, index, arr) {
            toggleElement("toast", "none");
            machineId = "machine" + item.id;
            discoveredMachines.push(machineId);
            var icon = typeSupport.getIconForType(item.typeName);
            if (!document.getElementById(machineId)) {
                //Create the widget
                newMachine = new widgetFactory(machineId, item, null, icon, machineClicked);
                document.getElementById("machines").appendChild(newMachine.build(newMachine));
            } else {
                //Update the widget
                document.getElementById(machineId).widget.update(item);
            }
        });
        //Delete widgets if equipment removed
        document.getElementById("machines").childNodes.forEach (function(item) {
            if (discoveredMachines.indexOf(item.id) == -1) {
                log("info", item.id + " was no longer found and is being removed");
                document.getElementById("machines").removeChild(item);
                //TODO: If the deleted one was selected, we need to clean-up the details pane too
            }
        });
        //Update the details pane if present
        if (discoveredMachines.length > 0 && currentDetailPane)
            currentDetailPane.update();
    } else {
        //handle example case
        if (config.machineType == "example") {
            if (!this.exampleDone) {
                //Create the widget
                newMachine1 = new widgetFactory("example1", {"displayName": "Example #1", "typeName": "example", "id":"0001"}, null, typeSupport.getIconForType("example"), machineClicked);
                document.getElementById("machines").appendChild(newMachine1.build(newMachine1));
                newMachine2 = new widgetFactory("example2", {"displayName": "Example #2", "typeName": "example", "id":"0002"}, null, typeSupport.getIconForType("example"), machineClicked);
                document.getElementById("machines").appendChild(newMachine2.build(newMachine2));
                this.exampleDone = true;
            }
            if (currentDetailPane)
                currentDetailPane.update();
        } else {
            log("info", "Empty payload for equipments query. Nothing to populate.");
            showToast("Warning!", "No compatible machine instances found on the SMIP instance. Please add equipment instances that match the SM Profile dependency.");    
        }
    }
    //Update UI
    document.getElementById("btnRefresh").innerHTML = "Refresh";
}

function machineClicked(event) {
    var widget = event.target || event.srcElement;
    widget = widget.widget;
    widget.select(document.getElementById("machines"));
    log("info", "Rendering details for " + JSON.stringify(widget));
    document.getElementById("machineName").innerHTML = widget.displayName;
    if (currentDetailPane != null) {
        currentDetailPane.destroy();
        //TODO: also remove scripts and css from page
    }
    currentDetailPane = detailPane;   //TODO: of type
    currentDetailPane.instanceId = widget.instanceId;
    currentDetailPane.queryHandler = sendSmipQuery;
    currentDetailPane.create("details");
}

function showToast(title, message) {
    stopUpdate();
    document.getElementById("toast-text").innerHTML = "<strong>" + title + "</strong> " + message;
    toggleElement("toast", "block");
}

function toggleElement(id, toggleVal) {
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
function deleteElements(className) {
    var elements = Array.from(document.getElementsByClassName(className))
    if (elements.length != 0) {
        elements.forEach((element) => {
            element.remove()
        })
    }
}

function selectFavorite() {
    var form = document.getElementById("configForm").elements;
    var value = form.smipfavorite.options[form.smipfavorite.selectedIndex].value;
    console.log ("selected: " + value, form.smipfavorite.options[form.smipfavorite.selectedIndex].text)
    if (value > -1) {
        config = configFavorites[value];
        updateConfigForm();
    } else {
        config = defaults;
        document.getElementById("configForm").reset();
    }
}

function reflectFavorite() {
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
}

async function loadConfig() {
    var cookieConfig = getCookie("config");
    if (cookieConfig) {
        config = cookieConfig;
    }
    configFavorites = getCookie("favorites");
    if (!configFavorites)
        configFavorites = [];
    updateConfigForm();
}

function updateConfigForm() {
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
            if (configFavorites[f].smipUrl == config.smipUrl) {
                opt.selected = true;
            }
            form.smipfavorite.appendChild(opt);
            foundFavorite = true;
        }
    }
    form.smipurl.value = config.smipUrl;
    form.authenticator.value = config.authenticator;
    form.smipusername.value = config.username;
    form.password.value = config.password;
    form.role.value = config.role; 
    form.machineParentId.value = config.machineParentId;
}

function saveConfig() {
    log("info", "Saving Config");

    var form = document.getElementById("configForm").elements;
    config.smipUrl = form.smipurl.value;
    config.authenticator = form.authenticator.value;
    config.username = form.smipusername.value;
    config.password =  form.password.value;
    config.role = form.role.value;
    if (form.machineParentId != "")
        config.machineParentId = form.machineParentId.value;
    else
        config.machineParentId = null;
    
    if (form.saveFavorite.checked) {
        //overwrite, but don't duplicate similar favorites
        var foundFavorite = false;
        for (var f=0;f<configFavorites.length;f++) {
            if (configFavorites[f].smipUrl == config.smipUrl) {
                configFavorites[f] = config;
                foundFavorite = true;
            }
        }
        if (!foundFavorite) {
            configFavorites.push(config);
        } 
        setCookie("favorites", configFavorites, 90);
    }
    
    toggleElement("toast", "none");
    toggleElement("settings", "none");
    setCookie("config", config, 90);

    if (config.debug)
        log("info", "Config now: " + JSON.stringify(config));

    //Clear Machines
    stopUpdate();
    if (currentDetailPane) {
        currentDetailPane.destroy();
        currentDetailPane = null;
    }
    document.getElementById("machines").childNodes.forEach (function(node, index, arr) {
        node.classList.remove("selected");
    });

    //Start again with new config
    updateConfigForm();
    loadMachines();
    toggleElement("machines", "block");
    updateLoop();
    //TODO: Need to cancel/cleanly abandon any pending promises
}

function setCookie(name, value, duration) {
    var d = new Date();
    d.setTime(d.getTime() + (duration*24*60*60*1000));
    duration = d.toUTCString();
    if (config.debug)
        log("info", "Saving cookie: " + name + ", value: " + JSON.stringify(value));
    var cookie = [name, "=", JSON.stringify(value), "; expires=" + duration + "; domain=.", window.location.host.toString(), "; SameSite=Strict; path=/;"].join("");
    document.cookie = cookie;
}

function getCookie(name) {
    var value = document.cookie.match(new RegExp(name + '=([^;]+)'));
    value && (value = JSON.parse(value[1]));
    if (config.debug)
        log("info", "Got cookie: " + name + ", value: " + JSON.stringify(value));
    return value;
}

function updateLoop() {
    if (!config.debug) {
        updateTimer = setInterval(function () { 
            loadMachines();
        }, updateRate);
    } else {
        log("info", "Debug mode is on, update firing once -- loop disabled!");
        loadMachines();
    }
}

function stopUpdate() {
    clearInterval(updateTimer);
}