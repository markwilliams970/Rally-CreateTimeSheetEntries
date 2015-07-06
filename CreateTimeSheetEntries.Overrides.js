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

                var unsuccessfulRecords = [];

                var successfulRecords = me.prepareRecords(hydratedRecords, args);
                me.successfulRecordsDueToNoChange = successfulRecords;

                me.onSuccess(successfulRecords, unsuccessfulRecords, args, "successful update");
                Ext.callback(me.onActionComplete, null, [successfulRecords, unsuccessfulRecords]);

                // console.log("successfulRecords:");
                // console.log(successfulRecords);
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