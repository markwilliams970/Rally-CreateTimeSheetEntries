Ext.override(Rally.ui.menu.bulk.RecordMenu, {
    items: [
        {xtype: 'rallyrecordmenuitembulkcreatetimesheetentries'}
    ]
});

Ext.override(Rally.ui.menu.bulk.MenuItem, {

    /**
     * Array of records that are "successful" update b/c they do not change
     *
     */
    successfulRecordsDueToNoChange: [],

    /**
     * Array of all records that are "successful" after updating and "no change"
     *
     */
    successfulRecords: [],

    /**
     * Array of all records that need to be updated
     *
     */
    dataToUpdate: [],


    /**
     * Uses a Rally.data.BulkRecordUpdater.updateRecords to save each record in records.
     * @param records {Rally.data.Model[]} artifact records to be saved
     * @param args {Object} additional args passed to onSuccess and prepareRecords
     */
    saveRecords: function(records, args) {
        // console.log('PortfolioItemBulkStateChanger.MenuItem.saveRecords');

        // console.log('selectedRecords:');
        // console.log(records);

        var me = this;

        me.successfulRecords = [];
        me.successfulRecordsDueToNoChange = [];
        me.dataToUpdate = [];

        var hydratedRecords = [];
        var promises = [];

        Ext.Array.each(records, function(artifact) {
            promises.push(me.hydrateArtifact(artifact, me));
        });

        Deft.Promise.all(promises).then({
            success: function(hydratedRecords) {
                // console.log("hydratedRecords:");
                // console.log(hydratedRecords);

                var successfulRecords = me.prepareRecords(hydratedRecords, args);
                me.successfulRecordsDueToNoChange = successfulRecords;

                // console.log("successfulRecords:");
                // console.log(successfulRecords);

                if (me.successfulRecordsDueToNoChange.length === records.length) {
                    me.onSuccess(me.successfulRecordsDueToNoChange, [], args);
                } else {

                    var selectedState = args;
                    var selectedStateRef = selectedState.get('_ref');

                    // console.log('selectedStateRef:');
                    // console.log(selectedStateRef);

                    var updateState = "";
                    if (selectedStateRef !== "") {
                        updateState = {'_ref': selectedStateRef};
                    }

                    // console.log('updateState:');
                    // console.log(updateState);

                    me.dataToUpdate = _.difference(hydratedRecords, me.successfulRecordsDueToNoChange);
                    // console.log('dataToUpdate:');
                    // console.log(me.dataToUpdate);

                    Rally.data.BulkRecordUpdater.updateRecords({
                        records: me.dataToUpdate,
                        propertiesToUpdate: {
                            State: updateState
                        },
                        success: function(failedRecords) {
                            // console.log('failedRecords');
                            // console.log(failedRecords);
                            var successfulUpdateRecords = _.difference(me.dataToUpdate, failedRecords);
                            var unsuccessfulRecords = failedRecords;

                            // console.log('successfulUpdateRecords:');
                            // console.log(successfulUpdateRecords);

                            me.successfulRecords = me.successfulRecordsDueToNoChange.concat(successfulUpdateRecords);
                            // console.log('me.successfulRecords after update and concat');
                            // console.log(me.successfulRecords);

                            if (me.successfulRecords.length !== 0) {
                                me.onSuccess(me.successfulRecords, unsuccessfulRecords, args, "successful update");
                            } else {
                                Rally.ui.notify.Notifier.showError({
                                    message: "No updates succeeded."
                                });
                                Ext.callback(me.onActionComplete, null, [me.successfulRecords, unsuccessfulRecords]);
                            }
                        },
                        scope: me
                    });
                }
            }
        });
    },

    hydrateArtifact: function(artifact, scope) {
        // console.log('PortfolioItemBulkStateChanger.MenuItem.hydrateArtifact');
        var deferred = Ext.create('Deft.Deferred');
        var me = scope;

        var artifactType = artifact.get("_type");
        var artifactOid  = artifact.get("ObjectID");
        var artifactModel = Rally.data.ModelFactory.getModel({
            type: artifactType,
            scope: me,
            success: function(model, operation) {
                model.load(artifactOid, {
                    scope: me,
                    success: function(artifactHydrated, operation) {
                        deferred.resolve(artifactHydrated);
                    }
                });
            }
        });
        return deferred;
    }
});