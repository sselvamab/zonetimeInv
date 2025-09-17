sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "xlsx",
    "sap/m/MessageBox",
	"sap/ui/export/library",    
    "sap/ui/export/Spreadsheet",
], (Controller, Fragment, XLSX, MessageBox, exportLibrary, Spreadsheet
) => {
    "use strict";
	const EdmType = exportLibrary.EdmType;

    return Controller.extend("com.abeam.zsupplierinv1.controller.Upload", {
        onInit() {           
        },

        onOpenUploadSheet: function () {
            this._displayUploadSheet();
        },

        _displayUploadSheet: function () {
            this._countSheet = null;
            if (!this._oUploadSheetDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.abeam.zsupplierinv1.fragment.UploadSheet",
                    controller: this,
                }).then(
                    function (dialog) {
                        this._oUploadSheetDialog = dialog;
                        this.getView().addDependent(this._oUploadSheetDialog);
                        this._oUploadSheetDialog.open();
                    }.bind(this)
                );
            } else {
                this.byId("fileUploader").setValue(null).clear();
                this._oUploadSheetDialog.open();
            }
        },

        onCancelUploadSheet: function () {
            this._countSheet = null;
            if (this._oUploadSheetDialog) {
                this._oUploadSheetDialog.close();
            }
        },

        onUploadSheetChange: function (oEvent) {
            this._countSheet = {
                file: oEvent.getParameter("files")[0],
                XLSXImport: true,
            };
        },

        onConfirmUploadSheet: function (oEvent) {
            if (!this._countSheet) {
                MessageBox.error(this._getText("noFileSelected"));
                return;
            }

            this.byId("UploadSheetDialog").setBusy(true);

            const reader = new FileReader();

            reader.onload = function (e) {
                var data = e.target.result;
                var workbook = XLSX.read(data, { type: 'binary' }); // Read as binary
                var sheetName = workbook.SheetNames[0]; // Get the first sheet
                var headerData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]); // Convert to JSON
                var addnlSheetName = workbook.SheetNames[1]; // Get the second sheet
                var addnlData = XLSX.utils.sheet_to_json(workbook.Sheets[addnlSheetName]); // Convert to JSON
                var glSheetName = workbook.SheetNames[2]; // Get the third sheet
                var glData = XLSX.utils.sheet_to_json(workbook.Sheets[glSheetName]); // Convert to JSON                

                this.aTable = [];

                headerData.forEach(function (oHeader, index) {
                    oHeader[addnlSheetName] = addnlData[index];
                    oHeader[glSheetName] = [glData[index]];
                    // this.oTable = Object.assign({}, oHeader);
                    this.oTable = oHeader;
                   // this.aTable.push(this.oTable);

                    this.getView().getModel().create("/A_SupplierInvoice", oHeader, {
                        method: "POST",
                        success: function (data) {
                             this.oTable.CompanyCode = data.CompanyCode;
                            this.oTable.DocumentDate = data.DocumentDate;
                            this.oTable.InvoicingParty = data.InvoicingParty;
                            this.oTable.InvoiceGrossAmount = data.InvoiceGrossAmount;
                            this.oTable.DocumentCurrency = data.DocumentCurrency;

                            this.oTable.SupplierInvoice = data.SupplierInvoice;
                            this.oTable.Status = true;
                            this.aTable.push(Object.assign({}, this.oTable));
                            this.oTable.Message = "Succesfully Posted"
                            this.byId("UploadSheetDialog").setBusy(false);
                            this._oUploadSheetDialog.close();

                            // var oModel = new sap.ui.model.json.JSONModel({ "UploadCollection": this.aTable });
                            // this.byId("tableid").setModel(oModel);

                            this.byId("tableid").getModel().refresh(true);
                            //MessageBox.success("Data Uploaded Successfully")
                        }.bind(this),
                        error: function (e) {
                            this.oTable.Status = false;
                            this.oTable.Message = e.message.value;
                            this.byId("UploadSheetDialog").setBusy(false);
                            this._oUploadSheetDialog.close();
                            this.aTable.push(Object.assign({}, this.oTable));

                            // var oModel = new sap.ui.model.json.JSONModel({ "UploadCollection": this.aTable });
                            // this.byId("tableid").setModel(oModel);

                            this.byId("tableid").getModel().refresh(true);
                            // MessageBox.error("Upload failed")
                        }.bind(this)
                    });

                }.bind(this));

                /////////////////////////////////////////////////////////////////////////////////////////                

                // You can now bind this data to a model, send it to the backend, etc.
                var oModel = new sap.ui.model.json.JSONModel({ "UploadCollection": this.aTable });
                this.byId("tableid").setModel(oModel);                
            }.bind(this);

            reader.readAsBinaryString(this._countSheet.file); // Read the file
        },

        fnResolve: function () {
            console("resolved");
        },

        fnReject: function () {
            console("rejected");
        },

        _onUploadSheetXSLXCompleted: function (file) {
            try {
                const workbook = XLSX.read(file, {
                    type: "binary",
                });

                const sheet = XLSX.utils.sheet_to_row_object_array(workbook.Sheets["Upload"]);

            } catch (error) {
                MessageBox.error(this._getText("xlsxCannotBeRead"));
                return [];
            }
        },

        _getText: function (sKey, args) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, args);
        },

createColumnConfig: function() {

			return [
				{
					label: "Company Code",
					property: "CompanyCode",
					type: EdmType.Number,
					scale: 0
				},
				{
					label: "Document Date",
					property: "DocumentDate",
					width: "25"
				},
				{
					label: "Invoicing Party",
					property: "InvoicingParty",
                    type: EdmType.Number,
					width: "25"
				},
				{
					label: "Invoice Amount",
					property: "InvoiceGrossAmount",
					type: EdmType.Currency,
					unitProperty: "DocumentCurrency",
					width: "18"
				},
				{
					label: "Invoice Number",
					property: "SupplierInvoice",
					type: EdmType.String
				}];
		},        

		onExport: function() {
			const oTable = this.byId("tableid");
			const oBinding = oTable.getBinding("items");
			const aCols = this.createColumnConfig();
			const oSettings = {
				workbook: { columns: aCols },
				dataSource: oBinding
			};
			const oSheet = new Spreadsheet(oSettings);

			oSheet.build()
				.then(function() {
					MessageToast.show("Excel Downloaded");
				}).finally(function() {
					oSheet.destroy();
				});
		}        

    });
}
);
//  });
//});