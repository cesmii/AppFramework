const typeSupport = {
    name: "typeSupport",
    readyCallback: null,
    machineTypes: {},
    //Called by the main page code when a detail pane is needed
    //  Tries to find the appropriate detailpane resources for a given type and loads them into the DOM
    loadDetailPaneForType: function(typeName, callBack) {
        logger.info("Creating new detail pane for: " + typeName);
        this.readyCallback = callBack;
        //Load script
        var scriptPath = this.getResourcePath(typeName, "script");
        logger.info("Loading resource: " + scriptPath);
        if (scriptPath) {
            include(scriptPath, () => {
                this.detailPaneForTypeReady();
            });
        } else {
            logger.info("Could not find a detail pane script for type: " + typeName);
        }
        //Load css
        var cssPath = this.getResourcePath(typeName, "style");
        logger.info("Loading resource: " + cssPath);
        if (cssPath && cssPath != "") {
            include(cssPath);
            logger.info("DetailPane loaded css: " + JSON.stringify(cssPath));
        } else {
            logger.info("Could not find a detail pane stylesheet for type: " + typeName);
        }
        return true;
    },
    detailPaneForTypeReady: function() {
        this.readyCallback();
    },
    getIconForType: function(typeName) {
        logger.trace("getting icon for type: " + typeName);
        var iconPath = this.getResourcePath(typeName, "icon");
        return iconPath;
    },
    //Helpers
    getResourcePath: function(searchType, resourceKind) {
        for (var key in this.machineTypes) {
            if (key.toLowerCase() == searchType.toLowerCase())
                return "TypeSupport/" + key + "/" + this.machineTypes[key][resourceKind];
        };
    }
};

