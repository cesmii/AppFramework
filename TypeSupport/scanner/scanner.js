// Bootstrap dependencies and config
include("TypeSupport/scanner/html5-qrcode.min.js");
include("TypeSupport/scanner/scanner-config.js");

typeSupportHelpers.push(scannerType = {
    /* IDetailPane Interface Properties */
    typeName: "scanner",  //the SMIP type this detail pane is responsible for
    rootElement: null,        //the HTML element to which this detail pane may append/destroy child nodes
    instanceId: null,         //the SMIP id of the selected object that requires this detail pane
    queryHandler: null,       //the SMIP query method assigned by the host page
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
            this.queryHandler(smip.queries.getEquipmentsInPlace(config.app.placeId), this.getSensors.bind(this));
            this.queryHandler(smip.queries.getChildEquipmentsInPlace(config.app.placeId2), this.getNewParentPlaceEquipment.bind(this));
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
        this.rootElement.removeChild(document.getElementById("divReader"));
        logger.info("Destroyed scanner detail pane!");
    },

    /* Private implementation-specific methods */
    resetSensors: function() {
        let sensorArray = ["82840", "82849"];
        sensorArray.forEach((sensor) => {
            logger.info('sensor: ', sensor);
            this.queryHandler(mutations.updateEquipmentParent(sensor, config.app.placeId), this.finishedDemoReset.bind(this));
        });
    },

    finishedDemoReset: function(payload, query) {
      logger.trace("payload: ", payload);
      logger.trace("query: ", query);

      this.toggleVisibility("moveSensorToLocation", "hide");
      this.toggleVisibility("selectNewParent", "hide");
      document.getElementById('successMessage').textContent = 
      `✅ A sensor has successfully been moved back to the ${payload.data.updateEquipment.place.displayName}`;
    },

    finishedMutation: function(payload, query) {
      logger.info('inside finishedMutation ####');
      logger.trace('payload finishedMutation', payload);

      this.toggleVisibility("moveSensorToLocation", "hide");
      this.toggleVisibility("selectNewParent", "hide");
      document.getElementById('successMessage').textContent = 
      `✅ The ${this.sensorMatchedToSMIP.displayName} has successfully been moved to the ${this.locationMatchedToSMIP.displayName}`;
    },

    renderQrScanner: function(equipment) {
      if (equipment === "sensor") {
        logger.info('RENDERING SENSOR QR SCANNER');
        // Render QR Scanner
        this.html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        this.html5QrcodeScanner.render(this.onScanSuccessSensor, this.onScanError);
      } else if (equipment === "machine") {
        logger.info('RENDERING MACHINE QR SCANNER');
        // Render QR Scanner
        this.html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        this.html5QrcodeScanner.render(this.onScanSuccessMachine, this.onScanError);        
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
            this.queryHandler(mutations.updateEquipmentParent(this.sensorMatchedToSMIP.id, newPlaceId), this.finishedMutation.bind(this));
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
      if (state === 'hide') {
        document.getElementById(elementId).style.visibility = "hidden";
      } else if (state === 'show') {
        document.getElementById(elementId).style.visibility = "visible";
      }
    },
    onScanSuccessMachine: function(decodedText, decodedResult) {
      logger.trace(`Scan result: ${decodedText}`, decodedResult);
      // Handle on success condition with the decoded text or result.
      this.html5QrcodeScanner.clear();

      document.getElementById('instructionScan').textContent = config.app.instructionMoveSensor;

      let matchedSMIPtoScan = (this.foundParentPlaceEquipment.find((attr) => attr.id === decodedText));
      logger.trace("matchedSMIPtoScan: ", matchedSMIPtoScan);
      this.locationMatchedToSMIP = matchedSMIPtoScan;

      document.getElementById('locationScanSuccess').textContent = `✅ ${this.locationMatchedToSMIP.displayName}successfully scanned.`;
      this.toggleVisibility("locationScanSuccess", "show");

      document.getElementById('moveSensorToLocation').textContent = `Do you want to move the ${this.sensorMatchedToSMIP.displayName} to the ${this.locationMatchedToSMIP.displayName}?`

      let newButton = document.createElement("button");
      newButton.appendChild(document.createTextNode(`Move the ${this.sensorMatchedToSMIP.displayName} to the ${this.locationMatchedToSMIP.displayName}`));
      newButton.dataset.id = this.locationMatchedToSMIP.id;
      newButton.classList.add(this.locationMatchedToSMIP.id);

      newButton.addEventListener("click", () => {
          let newPlaceId = this.locationMatchedToSMIP.id;
          this.queryHandler(mutations.updateEquipmentParent(this.sensorMatchedToSMIP.id, newPlaceId), this.finishedMutation.bind(this));
      });
      document.getElementById("selectNewParent").appendChild(newButton);

    },
    onScanSuccessSensor: function(decodedText, decodedResult) {
      // Handle on success condition with the decoded text or result.
      logger.info(`Scan result: ${decodedText}`, decodedResult);

      this.html5QrcodeScanner.clear();

      this.toggleVisibility("new-scan", "show");

      logger.trace('this.foundSensorData: ', this.foundSensorData);
      // document.getElementById("scaninput").value=decodedText;

      // use decodedText for SMIP call
      // smip call goes here
      // this.foundSensorData has the sensor data we found in the SMIP

      let matchedSMIPtoScan = (this.foundSensorData.find((attr) => attr.stringValue === decodedText));
      // we matched the decodedText with a known new sensor
      logger.trace("matchedSMIPtoScan: ", matchedSMIPtoScan);
      this.sensorMatchedToSMIP = matchedSMIPtoScan;

      // sensor scan success message
      // document.querySelector('[data-name="sensorName"]').textContent = matchedSMIPtoScan.displayName;
      document.getElementById('sensorScanSuccess').textContent = `✅ ${this.sensorMatchedToSMIP.displayName} successfully scanned.`;
      this.toggleVisibility("sensorScanSuccess", "show");

      // Render QR Scanner for machine
      document.getElementById('instructionScan').textContent = config.app.instructionScanMachine;

      // move matched ID to new parent
      // - list parents on screen
      // wire up the button
      const openModal = document.querySelector(".open-button");
      const closeModal = document.querySelector(".close-button");

      openModal.addEventListener("click", () => {
        modal.showModal();
      });
      // - user chooses parent & confirms move
      // - move sensor to new, selected parent
      // await delay(2000);
      
    },
    onScanError: function(errorMessage) {
      // handle on error condition, with error message
      // logger.info('errorMessage: ', errorMessage)
    },
});