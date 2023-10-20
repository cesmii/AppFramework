const queries = {
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
    // query to find MAC ID's of the sensor's placed in 'new sensor initiation'
    getPlaceEquipment: function (placeId) {
      return {
        query: `{
          place(id: "${placeId}") {
            id
            displayName
            equipment(first: 10) {
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
    // query to find MAC ID's of the sensor's placed in 'new sensor initiation'
    getEquipment: function (id) {
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
    // query to get child equipment from a specified place
    getPlaceChildEquipment: function(placeId) {
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

const mutations = {
    // mutation to update equipment parent
    updateEquipmentParent: function(equipmentId, newPlaceId) {
      return {
        query: `mutation {
          updateEquipment(input: { id: "${equipmentId}", patch: { partOfId: "${newPlaceId}" } }) {
            place {
              id
              displayName
              parentPlace {
                id
                displayName
              }
            }
          }
        }`
      }
    },
}