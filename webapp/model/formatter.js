sap.ui.define([], function () {
  "use strict";

  return {

    formatStatusToIcon: function (sStatus) {
      switch (sStatus) {
        case true:
          return "sap-icon://accept";
        case false:
          return "sap-icon://decline";
        default:
          return "sap-icon://busy";
      }
    },

    statusColorFormatter: function (sStatus) {
      switch (sStatus) {
        case true:
          return "green";
        case false:
          return "red";
        default:
          return "gray";
      }
    }    

  };

});