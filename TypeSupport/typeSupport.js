const typeSupport = {
    //Helpers
    getResourcePath: function(searchType, resourceKind) {
        for (var key in machineTypes) {
            if (key == searchType)
                return "TypeSupport/" + machineTypes[key].path + "/" + machineTypes[key][resourceKind];
        };
    },

    //Called by the main page code when a detail pane is needed
    //  Tries to the appropriate detailpane resources for a given type and loads them into the DOM
    loadDetailPaneForType: function(typeName, callBack) {
        logger.log(info, "Creating new detail pane for: " + typeName);
        //Load script
        var scriptPath = this.getResourcePath(typeName, "script");
        logger.log(info, "Loading resource: " + scriptPath);
        if (scriptPath) {
            var js = document.createElement("script");
            js.type = "text/javascript";
            js.src = scriptPath + this.cacheBust();
            logger.log(info, "DetailPane loaded script: " + JSON.stringify(js.src));
            js.onload = callBack;
            document.body.appendChild(js);
        } else {
            logger.log(info, "Could not find a detail pane script for type: " + typeName);
        }
        //Load css
        var cssPath = this.getResourcePath(typeName, "style");
        logger.log(info, "Loading resource: " + cssPath);
        if (cssPath) {
            var css = document.createElement("link");
            css.setAttribute("rel", "stylesheet");
            css.setAttribute("href", cssPath + this.cacheBust());
            document.head.appendChild(css);
            logger.log(info, "DetailPane loaded css: " + JSON.stringify(css.getAttribute("href")));
        } else {
            logger.log(info, "Could not find a detail pane stylesheet for type: " + typeName);
        }
        return true;
    },
    getIconForType:function(typeName) {
        var iconPath = this.getResourcePath(typeName, "icon");
        return iconPath;
    },
    cacheBust:function() {
        return "?" + (Math.round(Date.now())).toString(36);
    }
};

