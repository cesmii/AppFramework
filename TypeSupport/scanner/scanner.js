// Bootstrap dependencies and config
include("TypeSupport/scanner/html5-qrcode.min.js");
include("TypeSupport/scanner/scanner-config.js");

typeSupportHelpers.push(scannerType = {
    /* IDetailPane Interface Properties */
    typeName: "scanner",  //the SMIP type this detail pane is responsible for
    rootElement: null,        //the HTML element to which this detail pane may append/destroy child nodes
    instanceId: null,         //the SMIP id of the selected object that requires this detail pane
    queryHelper: function(query, callback) {
      logger.info("queryHelper called with", query);
      
      // Check if we have a queryHandler assigned
      if (typeof this.queryHandler === 'function') {
        // Use the queryHandler provided by the host page
        logger.info("Using provided queryHandler");
        return this.queryHandler(query, callback);
      } else {
        // No queryHandler available
        logger.error("No queryHandler available. This component requires a SMIP query handler.");
        
        // Simulate a response with an error for the callback
        if (typeof callback === 'function') {
          const errorPayload = {
            errors: [{
              message: "No query handler available"
            }]
          };
          
          // Call the callback with our error payload
          setTimeout(() => callback(errorPayload, query), 100);
        }
        
        return null;
      }
    },
    /* Private implementation-specific properties */
    foundSensorData: [],
    foundParentPlaceEquipment: [],
    sensorMatchedToSMIP: null,
    locationMatchedToSMIP: null,
    html5QrcodeScanner: null,
    ready:true,
    count:0,
    detailPaneHTML:`
      <div style=''>
      <!--<div><input type=text id='scaninput' style='font-size: 24px;margin-top: 11px;width: 500px;' /></div>-->

        <h4 id="instructionScan">#instructionScanSensor</h4>
        <!--<button class='button open-button' type='submit'>Move to a Machine Area</button>-->
        <div id="sensorScanSuccess"></div>
        <div id="locationScanSuccess"></div>
        <div id="moveSensorToLocation"></div>
        <div id="selectNewParent"></div>
        <div id="successMessage"></div>
        <button id="new-scan" class='button' type='submit'>Scan Machine QR</button>
        <button id="reset-sensors" class='button reset-button' type='submit'>Reset Sensors</button>
      </div>
      <div id='reader' style=''></div>
          `,
    
    /* IDetailPane Interface Methods */
    //  create: called when the main page needs this kind of detail pane
    //    Implementation should create necessary HTML elements on the page and kick-off fetching/rendering data
    create: function(rootElement) {
        logger.info("Activating scanner detail pane!");
        
        this.rootElement = appFramework.validateRootElement(rootElement);
        if (this.rootElement) {  
          /*add elements to DOM*/
          var readerDiv = document.createElement("div");
          readerDiv.id = "divReader";
          readerDiv.innerHTML = this.detailPaneHTML.replace("#instructionScanSensor", config.app.instructionScanSensor);
          readerDiv.setAttribute("class", "reader-div");
          this.rootElement.appendChild(readerDiv);
  
          // Render QR Scanner for sensor
          this.renderQrScanner('sensor');
  
          // initially hide new-scan button
          this.toggleVisibility("new-scan", "hide");
          this.toggleVisibility("sensorScanSuccess", "hide");
  
          let newScanButton = document.getElementById("new-scan");
          newScanButton.addEventListener("click", () => {
            this.renderQrScanner('machine');
            this.toggleVisibility("new-scan", "hide");
          });
  
          let resetSensorsButton = document.getElementById("reset-sensors");
          resetSensorsButton.addEventListener("click", () => {
            logger.info("clicked reset sensors");
            this.resetSensors();
          });
  
          // If we are connected to the SMIP, go ahead see what sensors are in the SMIP instance
          // then see what Child Equipment is in our place
          if (this.connectedToSmip) {
            logger.info('CONNECTED TO SMIP');
            this.queryHelper(smip.queries.getEquipmentsInPlace(config.user.modelParentId), this.getSensors.bind(this));
          }
          logger.trace("Scanner pane html now: " + this.rootElement.innerHTML.trim());
        }
    },
    loadMachines: function(callBack) {
        var payload = {
          data: {
            equipments: [
              {"displayName": "Scanner #1", "typeName": "scanner", "id":"0003"},
            ]
          }
        }
        callBack(payload, this.typeName);
        appFramework.stopSpinner("inner loadMachines");  //Usually the main app handles this, but the example case is hard-coded so doesn't callback the main app.
    },
    //  update: called when the main page says its time to update the contents of the page
    //    Implementation should fetching/render new data
    update: function() {
      if (this.ready) {
        logger.info("Processing update request on example detail pane!");
        // Pause updates until this one is processed
        this.ready = true;
      } else {
        logger.info("Ignoring update request since not ready");
      }
    },
    //  destroy: called when the user navigates away from the element that required this detail pane
    //    Implementation should removed any HTML elements, event handlers and timers
    destroy: function() {
      while (this.rootElement.firstChild) {
        this.rootElement.removeChild(this.rootElement.lastChild);
      }
      logger.info("Destroyed scanner detail pane!");
    },

    /* Private implementation-specific methods */
    resetSensors: function() {
        let sensorArray = ["184438", "179709"];
        sensorArray.forEach((sensor) => {
            logger.info('sensor: ', sensor);
            this.queryHelper(smip.mutations.updateEquipmentParent(sensor, config.user.modelParentId), this.finishedDemoReset.bind(this));
        });
    },

    finishedDemoReset: function(payload, query) {
      logger.trace("payload: ", payload);
      logger.trace("query: ", query);

      this.toggleVisibility("moveSensorToLocation", "hide");
      this.toggleVisibility("selectNewParent", "hide");
      
      // Add null check before accessing place property
      if (payload && payload.data && payload.data.updateEquipment && payload.data.updateEquipment.place) {
        document.getElementById('successMessage').textContent = 
          `✅ A sensor has successfully been moved back to the ${payload.data.updateEquipment.place.displayName}`;
      } else {
        document.getElementById('successMessage').textContent = 
          `✅ A sensor has been successfully moved`;
        logger.warn("Missing place information in updateEquipment response");
      }
    },

    renderQrScanner: function(equipment) {
      const self = this; // Store reference to 'this' for use in callbacks
      
      if (equipment === "sensor") {
        logger.info('RENDERING SENSOR QR SCANNER');
        // Render QR Scanner with bound callbacks to preserve 'this' context
        this.html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        this.html5QrcodeScanner.render(
          function(decodedText, decodedResult) {
            // Using the stored reference to call the method
            self.onScanSuccessSensor(decodedText, decodedResult);
          }, 
          function(errorMessage) {
            self.onScanError(errorMessage);
          }
        );
      } else if (equipment === "machine") {
        logger.info('RENDERING MACHINE QR SCANNER');
        // Render QR Scanner with bound callbacks
        this.html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        this.html5QrcodeScanner.render(
          function(decodedText, decodedResult) {
            self.onScanSuccessMachine(decodedText, decodedResult);
          }, 
          function(errorMessage) {
            self.onScanError(errorMessage);
          }
        );       
      }
    },

    getSensors: function(payload, query) {
      logger.info('inside getSensors ####');
      logger.trace('payload getSensors', payload);
        let equipmentArray = payload.data.place.equipment;

        equipmentArray.forEach((equipment) => {
            logger.info('equipment: ', equipment);
            logger.info('equipment.attributes: ', equipment.attributes);
            let macidObject = (equipment.attributes.find((attr) => attr.displayName === 'MACID' && attr.stringValue));
            logger.info('macidObject: ', macidObject);

            if (macidObject) {
              // add the id so we can push this id to a location later
              macidObject.id = equipment.id;
              macidObject.displayName = equipment.displayName;
              this.foundSensorData.push(macidObject);
              logger.info('this.foundSensorData: ', this.foundSensorData);
            };
        });
    },
    // get the parent place equipment and add it to the modal
    getNewParentPlaceEquipment: function(payload, query) {
      logger.info('inside getNewParentEquipment ####');
      logger.trace('payload getNewParentEquipment', payload);
      // const modal = document.querySelector("#modal");
      // const openModal = document.querySelector(".open-button");
      // const closeModal = document.querySelector(".close-button");
      // let modalList = document.querySelector(".select-new-parent");

      // closeModal.addEventListener("click", () => {
      //   modal.close();
      // });

      let parentPlaceArray = payload.data.places;

      parentPlaceArray.forEach((place) => {
        logger.trace('place.equipment: ', place.equipment);
        // add the parent places to a global so we can display them on screen to choose
        this.foundParentPlaceEquipment.push(place.equipment[0]);

        let newButton = document.createElement("button");
        newButton.appendChild(document.createTextNode(place.equipment[0].displayName));
        newButton.dataset.id = place.equipment[0].id;
        newButton.classList.add(place.equipment[0].id);

        // let moveParentButton = document.querySelector(`.${place.equipment[0].id}`);
        newButton.addEventListener("click", () => {
          if (confirm(`Do you want to move the ${this.sensorMatchedToSMIP.displayName} to the ${place.equipment[0].displayName}?`)) {
            let newPlaceId = place.equipment[0].id;
            this.queryHelper(smip.mutations.updateEquipmentParent(this.sensorMatchedToSMIP.id, newPlaceId), this.finishedMutation.bind(this));
          }
        });
        // modalList.appendChild(newButton);

      });

    },
    connectedToSmip: function() {
        if (config.user.smipUrl && config.user.smipUrl != "" &&
          config.user.authenticator && config.user.authenticator !== "" &&
          config.user.username && config.user.username != "" &&
          config.user.password && config.user.password != "" &&
          config.user.role && config.user.role != "") {
          return true;
        } else {
          return false
        }
    },

    getFoundSensorData: function() {
      logger.trace('this.foundSensorData: ', this.foundSensorData)
      return this.foundSensorData;
    },

    compareScanToSMIP: function(decodedText) {
      logger.info(`compareScanToSMIPScan result: ${decodedText}`);
    },
    toggleVisibility: function(elementId, state) {
      const element = document.getElementById(elementId);
      if (!element) {
        logger.warn(`Element with ID ${elementId} not found`);
        return;
      }
      
      if (state === 'hide') {
        element.style.display = "none"; // Use display instead of visibility
      } else if (state === 'show') {
        element.style.display = "block"; // Use display instead of visibility
      }
    },
    onScanSuccessMachine: function(decodedText, decodedResult) {
      logger.info(`Machine scan result: ${decodedText}`, decodedResult);
      this.html5QrcodeScanner.clear();

      // Show loading state
      document.getElementById('locationScanSuccess').textContent = `Verifying machine ID...`;
      this.toggleVisibility("locationScanSuccess", "show");

      // First verify the machine ID is valid
      this.queryHelper(
        smip.queries.getEquipmentById(decodedText),
        (payload, query) => {
          if (payload && payload.data && payload.data.equipments && payload.data.equipments.length > 0) {
            // Found a valid machine
            const machine = payload.data.equipments[0];
            this.locationMatchedToSMIP = machine;
            
            // Show confirmation UI
            document.getElementById('locationScanSuccess').textContent = `✅ ${machine.displayName} successfully scanned.`;
            this.toggleVisibility("locationScanSuccess", "show");

            // Rest of UI code...
            document.getElementById('moveSensorToLocation').textContent = `Do you want to move the ${this.sensorMatchedToSMIP.displayName} to ${machine.displayName}?`;
            this.toggleVisibility("moveSensorToLocation", "show");

            // Clear any previous buttons
            const selectNewParent = document.getElementById("selectNewParent");
            selectNewParent.innerHTML = '';

            let newButton = document.createElement("button");
            newButton.appendChild(document.createTextNode(`Move the ${this.sensorMatchedToSMIP.displayName} to ${machine.displayName}`));
            newButton.dataset.id = machine.id;
            newButton.classList.add('button');

            newButton.addEventListener("click", () => {
              // Show loading state
              document.getElementById('moveSensorToLocation').textContent = `Moving ${this.sensorMatchedToSMIP.displayName} to ${machine.displayName}...`;
              
              // Disable the button while operation is in progress
              newButton.disabled = true;
              newButton.textContent = "Moving...";
              
              // Make the API call
              this.queryHelper(
                smip.mutations.updateEquipmentParent(this.sensorMatchedToSMIP.id, machine.id), 
                this.finishedMutation.bind(this)
              );
            });
            
            selectNewParent.appendChild(newButton);
            this.toggleVisibility("selectNewParent", "show");
          } else {
            // Invalid machine ID
            document.getElementById('locationScanSuccess').textContent = `❌ No machine found with ID: ${decodedText}`;
            this.toggleVisibility("locationScanSuccess", "show");
          }
        }
      );
    },
    onScanSuccessSensor: function(decodedText, decodedResult) {
      // Handle on success condition with the decoded text or result.
      logger.info(`Scan result: ${decodedText}`, decodedResult);

      this.html5QrcodeScanner.clear();
      
      // Match the sensor with SMIP data - remove "let" here as it's already declared elsewhere
      const matchedSMIPtoScan = (this.foundSensorData.find((attr) => attr.stringValue === decodedText));
      logger.trace("matchedSMIPtoScan: ", matchedSMIPtoScan);
      
      // Check if sensor was found
      if (!matchedSMIPtoScan) {
        document.getElementById('sensorScanSuccess').textContent = `❌ No sensor found with MACID: ${decodedText}`;
        this.toggleVisibility("sensorScanSuccess", "show");
        return;
      }
      
      this.sensorMatchedToSMIP = matchedSMIPtoScan;

      // Show success message for sensor
      document.getElementById('sensorScanSuccess').textContent = `✅ ${this.sensorMatchedToSMIP.displayName} successfully scanned.`;
      this.toggleVisibility("sensorScanSuccess", "show");
      
      // Show the button to scan machine
      this.toggleVisibility("new-scan", "show");
      
      // Update instruction for next step
      document.getElementById('instructionScan').textContent = config.app.instructionScanMachine;
    },
    onScanError: function(errorMessage) {
      // handle on error condition, with error message
      // logger.info('errorMessage: ', errorMessage)
    },
    finishedMutation: function(payload, query) {
      logger.info('inside finishedMutation');
      logger.trace('payload from finishedMutation:', payload);

      // Hide the loading message
      this.toggleVisibility("moveSensorToLocation", "hide");
      this.toggleVisibility("selectNewParent", "hide");
      
      // Check if we have valid response data with necessary properties
      if (payload && payload.data && payload.data.updateEquipment) {
        let successMessage;
        
        // Check if we have place information
        if (payload.data.updateEquipment.place) {
          successMessage = `✅ The ${this.sensorMatchedToSMIP.displayName} has successfully been moved to the ${payload.data.updateEquipment.place.displayName}`;
        } else if (this.locationMatchedToSMIP) {
          // Use cached location information if available
          successMessage = `✅ The ${this.sensorMatchedToSMIP.displayName} has successfully been moved to the ${this.locationMatchedToSMIP.displayName}`;
        } else {
          // Generic success message
          successMessage = `✅ The ${this.sensorMatchedToSMIP.displayName} has been successfully moved`;
        }
        
        document.getElementById('successMessage').textContent = successMessage;
        this.toggleVisibility("successMessage", "show");
        
        // Add a "Scan New Sensor" button
        const selectNewParent = document.getElementById("selectNewParent");
        selectNewParent.innerHTML = '';
        
        let scanNewButton = document.createElement("button");
        scanNewButton.appendChild(document.createTextNode("Scan New Sensor"));
        scanNewButton.classList.add('button');
        scanNewButton.addEventListener("click", () => {
          this.resetUI();
          this.renderQrScanner('sensor');
        });
        
        selectNewParent.appendChild(scanNewButton);
        this.toggleVisibility("selectNewParent", "show");
        
      } else if (payload && payload.errors) {
        // Handle error response
        const errorMessage = payload.errors[0]?.message || "Unknown error occurred";
        document.getElementById('successMessage').textContent = `❌ Error: ${errorMessage}`;
        this.toggleVisibility("successMessage", "show");
        logger.error("Error in mutation response:", errorMessage);
      } else {
        // Generic error
        document.getElementById('successMessage').textContent = "❌ Error: Could not update equipment location";
        this.toggleVisibility("successMessage", "show");
        logger.error("Invalid payload structure in finishedMutation");
      }
    },
    resetUI: function() {
      // Hide all dynamic elements
      this.toggleVisibility("sensorScanSuccess", "hide");
      this.toggleVisibility("locationScanSuccess", "hide");
      this.toggleVisibility("moveSensorToLocation", "hide");
      this.toggleVisibility("selectNewParent", "hide");
      this.toggleVisibility("successMessage", "hide");
      
      // Clear content
      document.getElementById('sensorScanSuccess').textContent = '';
      document.getElementById('locationScanSuccess').textContent = '';
      document.getElementById('moveSensorToLocation').textContent = '';
      document.getElementById('successMessage').textContent = '';
      document.getElementById('selectNewParent').innerHTML = '';
      
      // Reset instruction
      document.getElementById('instructionScan').textContent = config.app.instructionScanSensor;
    }
});