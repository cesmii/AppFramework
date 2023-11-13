if (typeof smip === 'undefined')
    smip = {};
smip.queries = {
    getHistoricalData: function(attrId, starttime, endtime, datatype) {
      return {
        query: `{
        getRawHistoryDataWithSampling(
          ids: ["${attrId}"], 
          startTime: "${starttime}", 
          endTime: "${endtime}"
          maxSamples: 1
        ) {
            id
            ts
            ${datatype}
            }
        }
          `
      };
    },
    getEquipments: function(typeId, parentId) {
      //TODO: modify query with filter instead of having two almost identical queries
        if (parentId != null && parentId != "") {
          return {
            query: `{
              equipments(filter: {typeName: {equalTo: "${typeId}"}, partOfId: {equalTo: "${parentId}"}}) { 
                displayName
                typeName
                id
              }        
            }`
          }
        } else {
          return {
            query: `{
                equipments(filter: {typeName: {equalTo: "${typeId}"}}) { 
                  displayName
                  typeName
                  id
                }        
              }`
          };
        }
    },
    getEquipmentChildren: function(instanceId, depth) {
        //TODO: construct query recursively to depth
        return {
            query: `{
                equipment(id: "${instanceId}") {
                  id
                  displayName
                  childEquipment {
                    id
                    displayName
                    attributes {
                      id
                      displayName
                    }
                    childEquipment {
                      id
                      displayName
                      attributes {
                      id
                      displayName
                    }
                            childEquipment {
                      id
                      displayName
                      attributes {
                      id
                      displayName
                    }
                           childEquipment {
                      id
                      displayName
                      attributes {
                      id
                      displayName
                    }
                    }
                    }
                    }
                  }
                }
              }`
        };
    },
    // query to find details of a piece of equipment give its id
    getEquipmentById: function (id) {
      return {
        query: `{
          equipments(filter: { id: { equalTo: "${id}" } }) {
            displayName
            typeName
            id
          }
        }`
      };
    },
    // query to find details of a piece of equipment from a specified place
    getEquipmentsInPlace: function (placeId, limit=10) {
      return {
        query: `{
          place(id: "${placeId}") {
            id
            displayName
            equipment(first: ${limit}) {
              id
              displayName
              attributes {
                stringValue
                displayName
              }
            }
          }}`
      };
    },
    // query to get child equipment from a specified place
    getChildEquipmentsInPlace: function(placeId) {
      return {
        query: `{
          places(filter: { partOfId: { equalTo: "${placeId}" } }) {
            id
            displayName
            equipment {
              displayName
              id
              attributes {
                displayName
                id
                dataType
              }
              childEquipment {
                displayName
                typeName
                id
                attributes {
                  displayName
                  id
                  dataType
                }
              }
            }
          }
        }`
      }
    },
};
