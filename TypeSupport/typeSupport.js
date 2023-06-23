const typeSupport = {
    //Called by the main page code when a detail pane is needed
    //  Tries to the appropriate detailpane resources for a given type and loads them into the DOM
    loadDetailPaneForType: function(typeName, callBack) {
        var scriptPath = typeName + ".js";
        var cssPath = typeName + ".css";

        console.log("Creating new detail pane for: " + typeName);
        if (scriptPath) {
            var js = document.createElement("script");
            js.type = "text/javascript";
            js.src = "TypeSupport/" + scriptPath + this.cacheBust();
            console.log("DetailPane loaded script: " + JSON.stringify(js.src));
            js.onload = callBack;
            document.body.appendChild(js);
        } else {
            console.log("Could not find a detail pane script for type: " + typeName);
        }
        if (cssPath) {
            var css = document.createElement("link");
            css.setAttribute("rel", "stylesheet");
            css.setAttribute("href", "TypeSupport/" + cssPath + this.cacheBust());
            document.head.appendChild(css);
            console.log("DetailPane loaded css: " + JSON.stringify(css.getAttribute("href")));
        } else {
            console.log("Could not find a detail pane stylesheet for type: " + typeName);
        }
    },
    getIconForType:function(typename) {
        var typename = typename.toLowerCase() + ".png";
        return this.getMyPath() + typename;
    },
    getMyPath:function() {
        return "TypeSupport/";
        //TODO: do clever stuff to figure out relative path of icons
        /*
        var scripts= document.getElementsByTagName('script');
        for (var i=0;i<scripts.length;i++){
            if (scripts[i].src.toLowerCase().indexOf("typeicons.js") != -1) {
                //this is the path of the current script
            }
        }
        */
    },
    cacheBust:function() {
        return "?" + (Math.round(Date.now())).toString(36);
    }
};

