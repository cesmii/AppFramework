typeSupportHelpers.push(exampleType = {
    /* IDetailPane Interface Required Properties */
    typeName: "example",  //the SMIP type this detail pane is responsible for
    rootElement: null,        //the HTML element to which this detail pane may append/destroy child nodes
    instanceId: null,         //the SMIP id of the selected object that requires this detail pane
    queryHandler: null,       //the SMIP query method assigned by the host page

    /* Private implementation-specific properties */
    ready:true,
    count:0,
    helloHTML:"<h2>Hello world!</h2>This is an example detail pane, loaded for a type definition called <code>example</code>, and an instance with id <code>##</code>.<br>Within this pane, you can do anything you need to with Javascript, CSS and HTML5 to create a user-interface for a given type!",
    
    /* IDetailPane Interface Required Methods */
    //  create: called when the main page needs this kind of detail pane
    //    Implementation should create necessary HTML elements on the page and kick-off fetching/rendering data
    create: function(rootElement) {
      logger.log(info, "Activating example detail pane!");
      if (this.validateRootElement(rootElement)) {
        /*add elements to DOM*/
        var myDiv = document.createElement("div");
        myDiv.id = "divHello";
        myDiv.innerHTML = this.helloHTML.replace("##", this.instanceId);
        myDiv.setAttribute("class", "example-hello");
        this.rootElement.appendChild(myDiv);

        logger.log(trace, "Detail pane html now: " + this.rootElement.innerHTML.trim());
      }
    },
    //  loadMachines: called when the main page says its time to load a list of machines
    //    Implementation should fetch a list of machines of the type it supports
    loadMachines: function(callBack) {
      var payload = {
        data: {
          equipments: [
            {"displayName": "Example #1", "typeName": "example", "id":"0001"},
            {"displayName": "Example #2", "typeName": "example", "id":"0002"}
          ]
        }
      }
      callBack(payload, this.typeName);
      stopSpinner("inner loadMachines");  //Usually the main app handles this, but the example case is hard-coded so doesn't callback the main app.
    },
    //  update: called when the main page says its time to update the contents of the page
    //    Implementation should fetch/render new data
    update: function() {
      if (this.ready) {
        logger.log(info, "Processing update request on example detail pane!");
        // Pause updates until this one is processed
        this.ready = false;
        document.getElementById("divHello").innerHTML = this.helloHTML.replace("##", this.instanceId) + "<br><br>This pane has been updated " + this.getNextNumber() + " times...";
        this.ready = true;
      } else {
        logger.log(info, "Ignoring update request since not ready");
      }
    },
    //  destroy: called when the user navigates away from the element that required this detail pane
    //    Implementation should removed any HTML elements, event handlers and timers
    destroy: function() {
        this.rootElement.removeChild(document.getElementById("divHello"));
        this.count = 0;
        logger.log(info, "Destroyed example detail pane!");
    },
    // helper to ensure this pane has a place to attach
    validateRootElement: function(rootElement) {
        if (rootElement)
          this.rootElement = rootElement;
        if (!this.rootElement || document.getElementById(rootElement) == null) {
          logger.log(info, "Cannot create detail pane without a root element!");
          return false;
        } else {
          if (this.rootElement.nodeName != "DIV") {
            this.rootElement = document.getElementById(rootElement);
            if (this.rootElement.nodeName != "DIV") {
              logger.log(info, "Root element for detail was not a DIV!");
              return false;
            } else {
              return true;
            }
          }
        }
    },

    /* Private implementation-specific methods */
    getNextNumber: function() {
        //Silly function for example only!
        this.count++;
        return this.count;
    }
});