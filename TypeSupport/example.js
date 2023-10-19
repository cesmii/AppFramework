detailPane = {
    /* IDetailPane Interface Properties */
    typeName: "example",      //the SMIP type this detail pane is responsible for
    rootElement: 'reader',        //the HTML element to which this detail pane may append/destroy child nodes
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
<h2>${config.app.title}</h2>
<!--<div><input type=text id='scaninput' style='font-size: 24px;margin-top: 11px;width: 500px;' /></div>-->
<div style=''>
  <h2 id="instructionScan">${config.app.instructionScanSensor}</h2>
  <!--<button class='button open-button' type='submit'>Move to a Machine Area</button>-->
  <div id="sensorScanSuccess"></div>
  <div id="locationScanSuccess"></div>
  <div id="moveSensorToLocation"></div>
  <div id="selectNewParent"></div>
  <div id="successMessage"></div>
  <button id="new-scan" class='button' type='submit'>Scan Machine QR</button>
</div>
<div id='reader' style='width: 500px; height: 500px'></div>
<dialog class='modal' id='modal'>
  <button class='button close-button'>X</button>
  <h2>Move the <span data-name="sensorName"></span> to a Machine Area</h2>
  <ul class="select-new-parent"></ul>
</dialog>
    `,

    /* IDetailPane Interface Methods */
    //  create: called when the main page needs this kind of detail pane
    //    Implementation should create necessary HTML elements on the page and kick-off fetching/rendering data
    create: function(rootElement) {
      logger.log("info", "Activating example detail pane!");
      if (this.validateRootElement(rootElement)) {
        /*add elements to DOM*/
        var myDiv = document.createElement("div");
        myDiv.id = "divHello";
        myDiv.innerHTML = this.detailPaneHTML.replace("##", this.instanceId);
        myDiv.setAttribute("class", "example-hello");
        this.rootElement.appendChild(myDiv);

        // Render QR Scanner for sensor
        this.renderQrScanner('sensor');

        // initially hide new-scan button
        detailPane.toggleVisibility("new-scan", "hide");
        detailPane.toggleVisibility("sensorScanSuccess", "hide");

        let newScanButton = document.getElementById("new-scan");
        newScanButton.addEventListener("click", () => {
          detailPane.renderQrScanner('machine');
          detailPane.toggleVisibility("new-scan", "hide");
        });

        // If we are connected to the SMIP, go ahead see what sensors are in the SMIP instance
        // then see what Child Equipment is in our place
        if (this.connectedToSmip) {
          console.log('CONNECTED TO SMIP');
          sendSmipQuery(queries.getPlaceEquipment(config.app.placeId), this.getSensors.bind(this));
          sendSmipQuery(queries.getPlaceChildEquipment(config.app.placeId2), this.getNewParentPlaceEquipment.bind(this));
        }

        logger.log("info", "Detail pane html now: " + this.rootElement.innerHTML.trim());
      }
    },
    //  update: called when the main page says its time to update the contents of the page
    //    Implementation should fetching/render new data
    update: function() {
      if (this.ready) {
        logger.log("info", "Processing update request on example detail pane!");
        // Pause updates until this one is processed
        this.ready = false;
        document.getElementById("divHello").innerHTML = this.detailPaneHTML.replace("##", this.instanceId) + "<br><br>This pane has been updated " + this.getNextNumber() + " times...";
        this.ready = true;
      } else {
        logger.log("info", "Ignoring update request since not ready");
      }
    },
    //  destroy: called when the user navigates away from the element that required this detail pane
    //    Implementation should removed any HTML elements, event handlers and timers
    destroy: function() {
        this.rootElement.removeChild(document.getElementById("divHello"));
        this.count = 0;
        logger.log("info", "Destroyed example detail pane!");
    },
    // helper to ensure this pane has a place to attach
    validateRootElement: function(rootElement) {
        if (rootElement)
          this.rootElement = rootElement;
        if (!this.rootElement || document.getElementById(rootElement) == null) {
          logger.log("info", "Cannot create detail pane without a root element!");
          return false;
        } else {
          if (this.rootElement.nodeName != "DIV") {
            this.rootElement = document.getElementById(rootElement);
            if (this.rootElement.nodeName != "DIV") {
              logger.log("info", "Root element for detail was not a DIV!");
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
    },

    finishedMutation: function(payload, query) {
      console.log('inside finishedMutation ####');
      console.log('payload finishedMutation', payload);

      detailPane.toggleVisibility("moveSensorToLocation", "hide");
      detailPane.toggleVisibility("selectNewParent", "hide");
      document.getElementById('successMessage').textContent = 
      `✅ The ${detailPane.sensorMatchedToSMIP.displayName} has successfully been moved to the ${detailPane.locationMatchedToSMIP.displayName}`;
    },

    renderQrScanner: function(equipment) {
      if (equipment === "sensor") {
        console.log('RENDERING SENSOR QR SCANNER');
        // Render QR Scanner
        detailPane.html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        detailPane.html5QrcodeScanner.render(detailPane.onScanSuccessSensor, detailPane.onScanError);
      } else if (equipment === "machine") {
        console.log('RENDERING MACHINE QR SCANNER');
        // Render QR Scanner
        detailPane.html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        detailPane.html5QrcodeScanner.render(detailPane.onScanSuccessMachine, detailPane.onScanError);        
      }
    },

    getSensors: function(payload, query) {
      console.log('inside getSensors ####');
      console.log('payload getSensors', payload);
        let equipmentArray = payload.data.place.equipment;

        equipmentArray.forEach((equipment) => {
            console.log('equipment: ', equipment);
            console.log('equipment.attributes: ', equipment.attributes);
            let macidObject = (equipment.attributes.find((attr) => attr.displayName === 'MACID' && attr.stringValue));
            console.log('macidObject: ', macidObject);

            if (macidObject) {
              // add the id so we can push this id to a location later
              macidObject.id = equipment.id;
              macidObject.displayName = equipment.displayName;
              this.foundSensorData.push(macidObject);
              console.log('this.foundSensorData: ', this.foundSensorData);
            };
        });
    },
    // get the parent place equipment and add it to the modal
    getNewParentPlaceEquipment: function(payload, query) {
      console.log('inside getNewParentEquipment ####');
      console.log('payload getNewParentEquipment', payload);
      const modal = document.querySelector("#modal");
      // const openModal = document.querySelector(".open-button");
      const closeModal = document.querySelector(".close-button");
      let modalList = document.querySelector(".select-new-parent");

      closeModal.addEventListener("click", () => {
        modal.close();
      });

      let parentPlaceArray = payload.data.places;

      parentPlaceArray.forEach((place) => {
        console.log('place.equipment: ', place.equipment);
        // add the parent places to a global so we can display them on screen to choose
        this.foundParentPlaceEquipment.push(place.equipment[0]);

        let newButton = document.createElement("button");
        newButton.appendChild(document.createTextNode(place.equipment[0].displayName));
        newButton.dataset.id = place.equipment[0].id;
        newButton.classList.add(place.equipment[0].id);

        // let moveParentButton = document.querySelector(`.${place.equipment[0].id}`);
        newButton.addEventListener("click", () => {
          if (confirm(`Do you want to move the ${detailPane.sensorMatchedToSMIP.displayName} to the ${place.equipment[0].displayName}?`)) {
            let newPlaceId = place.equipment[0].id;
            
            sendSmipQuery(mutations.updateEquipmentParent(detailPane.sensorMatchedToSMIP.id, newPlaceId), detailPane.finishedMutation.bind(this));
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
      console.log('this.foundSensorData: ', this.foundSensorData)
      return this.foundSensorData;
    },

    compareScanToSMIP: function(decodedText) {
      console.log(`compareScanToSMIPScan result: ${decodedText}`);
    },
    toggleVisibility: function(elementId, state) {
      if (state === 'hide') {
        document.getElementById(elementId).style.visibility = "hidden";
      } else if (state === 'show') {
        document.getElementById(elementId).style.visibility = "visible";
      }
    },
    onScanSuccessMachine: function(decodedText, decodedResult) {
      console.log(`Scan result: ${decodedText}`, decodedResult);
      // Handle on success condition with the decoded text or result.
      detailPane.html5QrcodeScanner.clear();

      document.getElementById('instructionScan').textContent = config.app.instructionMoveSensor;
      
      let matchedSMIPtoScan = (detailPane.foundParentPlaceEquipment.find((attr) => attr.id === decodedText));
      console.log("matchedSMIPtoScan: ", matchedSMIPtoScan);
      detailPane.locationMatchedToSMIP = matchedSMIPtoScan;

      document.getElementById('locationScanSuccess').textContent = `✅ ${detailPane.locationMatchedToSMIP.displayName}successfully scanned.`;
      detailPane.toggleVisibility("locationScanSuccess", "show");

      document.getElementById('moveSensorToLocation').textContent = `Do you want to move the ${detailPane.sensorMatchedToSMIP.displayName} to the ${detailPane.locationMatchedToSMIP.displayName}?`

      let newButton = document.createElement("button");
      newButton.appendChild(document.createTextNode(`Move the ${detailPane.sensorMatchedToSMIP.displayName} to the ${detailPane.locationMatchedToSMIP.displayName}`));
      newButton.dataset.id = detailPane.locationMatchedToSMIP.id;
      newButton.classList.add(detailPane.locationMatchedToSMIP.id);

      newButton.addEventListener("click", () => {
          let newPlaceId = detailPane.locationMatchedToSMIP.id;
          
          sendSmipQuery(mutations.updateEquipmentParent(detailPane.sensorMatchedToSMIP.id, newPlaceId), detailPane.finishedMutation.bind(this));
      });
      document.getElementById("selectNewParent").appendChild(newButton);

    },
    onScanSuccessSensor: function(decodedText, decodedResult) {
      // Handle on success condition with the decoded text or result.
      console.log(`Scan result: ${decodedText}`, decodedResult);

      detailPane.html5QrcodeScanner.clear();

      detailPane.toggleVisibility("new-scan", "show");

      console.log('detailPane.foundSensorData: ', detailPane.foundSensorData);
      // document.getElementById("scaninput").value=decodedText;

      // use decodedText for SMIP call
      // smip call goes here
      // detailPane.foundSensorData has the sensor data we found in the SMIP

      let matchedSMIPtoScan = (detailPane.foundSensorData.find((attr) => attr.stringValue === decodedText));
      // we matched the decodedText with a known new sensor
      console.log("matchedSMIPtoScan: ", matchedSMIPtoScan);
      detailPane.sensorMatchedToSMIP = matchedSMIPtoScan;

      // sensor scan success message
      document.querySelector('[data-name="sensorName"]').textContent = matchedSMIPtoScan.displayName;
      document.getElementById('sensorScanSuccess').textContent = `✅ ${detailPane.sensorMatchedToSMIP.displayName} successfully scanned.`;
      detailPane.toggleVisibility("sensorScanSuccess", "show");

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
      // console.log('errorMessage: ', errorMessage)
    },
};
