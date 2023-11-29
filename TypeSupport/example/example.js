typeSupportHelpers.push(exampleType = {
    /* IDetailPane Interface Required Properties */
    name: "exampleTypeSupportHelper", //Only used for tracing "this" while debugging
    typeName: "example",      //the SMIP type this detail pane is responsible for
    rootElement: null,        //the HTML element to which this detail pane may append/destroy child nodes
    instanceId: null,         //the SMIP id of the selected object that requires this detail pane
    queryHandler: null,       //the SMIP query method assigned by the host page

    /* Private implementation-specific properties */
    ready:false,
    count:0,
    helloHTML:"<h2>Hello world!</h2>This is an example detail pane, loaded for a type definition called <code>example</code>, and an instance with id <code>##</code>.<br>Within this pane, you can do anything you need to with Javascript, CSS and HTML5 to create a user-interface for a given type!",
    
   /**
   * This method is called when the type support handler is first initialized.
   * The implementation should load any additional scripts or resources it needs, as well as setting up the initial UI.
   * @rootElement {htmlElement} informs the type support handler's UI what DOM element they can attach elements to
   */
    create: function(rootElement) {
      logger.info("Activating example detail pane with root element: " + rootElement);
      this.rootElement = appFramework.validateRootElement(rootElement);
      if (this.rootElement) {
        /*add elements to DOM*/
        var myDiv = document.createElement("div");
        myDiv.id = "divHello";
        myDiv.innerHTML = this.helloHTML.replace("##", this.instanceId);
        myDiv.setAttribute("class", "example-hello");
        this.rootElement.appendChild(myDiv);

        logger.trace("Detail pane html now: " + this.rootElement.innerHTML.trim());
        this.ready = true;
      }
    },

   /**
   * This method is called when the app framework wants to load a list of machines
   * Implementation should fetch a list of machines of the type it supports.
   * @callBack {function} Callback assigned by the app framework to invoke when loading is complete
   */
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
      appFramework.stopSpinner("inner loadMachines");  //Usually the main app handles this, but the example case is hard-coded so doesn't callback the main app.
    },

   /**
   * This method is called when the app framework wants to update the contents of the page
   * Implementation should fetch/render new data
   */
    update: function() {
      if (this.ready) {
        logger.info("Processing update request on example detail pane!");
        // Pause updates until this one is processed
        this.ready = false;
        document.getElementById("divHello").innerHTML = this.helloHTML.replace("##", this.instanceId) + "<br><br>This pane has been updated " + this.getNextNumber() + " times...";
        this.ready = true;
      } else {
        logger.info("Ignoring update request since not ready");
      }
    },

    /**
    * This method is called when the user navigates away from the element that required this detail pane.
    * Implementation should remove any HTML elements, event handlers and timers.
    */
    destroy: function() {
      while (this.rootElement.firstChild) {
        this.rootElement.removeChild(this.rootElement.lastChild);
      }
      this.count = 0;
      this.ready = false;
      logger.info("Destroyed example detail pane!");
    },

    /* Private implementation-specific methods */
    getNextNumber: function() {
        //Silly function for example only!
        this.count++;
        return this.count;
    }
});