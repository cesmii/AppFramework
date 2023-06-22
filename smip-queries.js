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
    }
};
