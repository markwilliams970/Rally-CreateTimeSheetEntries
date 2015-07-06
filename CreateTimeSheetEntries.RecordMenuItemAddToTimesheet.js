(function() {
    var Ext = window.Ext4 || window.Ext;

    Ext.define('CreateTimeSheetEntries.RecordMenuItemAddToTimesheet', {
        extend: 'Rally.ui.menu.bulk.MenuItem',
        alias: 'widget.rallyrecordmenuitembulkcreatetimesheetentries',

        clientMetrics: [{
            beginMethod: '_onAddToTimesheetClicked',
            endMethod: 'onSuccess',
            description: 'bulk action complete'
        }],

        config: {
            text: 'Add to Timesheet...',

            handler: function() {
                this._onAddToTimesheetClicked();
            },

            predicate: function(records) {
                return _.every(records, function(record) {
                    return record.self.isArtifact();
                });
            },

            prepareRecords: function(records) {
                // console.log('PortfolioItemBulkStateChanger.RecordMenuItemPortfolioItemState.prepareRecords');
                var me = this;
                var successfulRecords = [];

                // Calculate week start

                var curr = new Date(); // get current date
                var start = curr.getDate() - curr.getDay();
                var weekStartLocal = new Date(curr.setDate(start));

                var weekStartDay = weekStartLocal.getDate();
                var weekStartMonth = weekStartLocal.getMonth();
                var weekStartYear = weekStartLocal.getFullYear();

                var weekStart = new Date(weekStartYear, weekStartMonth, weekStartDay);
                var weekStartUTC = new Date( weekStart.getTime() - (weekStart.getTimezoneOffset() * 60000));

                // console.log(weekStartUTC.toISOString());

                // Loop through records and apply updated state
                _.each(records, function(record) {

                    var taskRecord = record;

                    var workProduct = record.get('WorkProduct');
                    var workProductrefString = workProduct._ref;
                    var workProductRef = Ext.create('Rally.util.Ref', workProductrefString);
                    var workProductOID = workProductRef.getOid();

                    var taskOID = record.get('ObjectID');
                    var taskRef = record.get('_ref');

                    var owner = record.get('Owner');
                    var ownerRefString = owner._ref;
                    var ownerRef = Ext.create('Rally.util.Ref', ownerRefString);
                    var ownerOID = ownerRef.getOid();

                    var project = record.get('Project');
                    var projectRefString = project._ref;
                    var projectRef = Ext.create('Rally.util.Ref', projectRefString);
                    var projectOID = projectRef.getOid();

                    var timeSheetEntry = {
                        Project:       projectRefString,
                        WorkProduct:   workProductrefString,
                        Task:          taskRef,
                        User:          ownerRefString,
                        WeekStartDate: weekStartUTC.toISOString()
                    };

                    var newTimeSheetModel = Rally.data.ModelFactory.getModel({
                         type: 'TimeEntryItem'
                    }).then({
                        success: function(model) {
                            var record = Ext.create(model, timeSheetEntry);
                            record.save();
                            successfulRecords.push(taskRecord);
                        }
                    });                  
                    successfulRecords.push(record);
                });
                // console.log(successfulRecords);
                return successfulRecords;
            },

            callingScope: this
        },

        constructor: function(config) {
            // console.log('CreateTimeSheetEntries.RecordMenuItemAddToTimesheet.constructor:');
            // console.log('this.records');
            // console.log(this.records);
            this.mergeConfig(config);
            this.callParent(arguments);
        },

        _onAddToTimesheetClicked: function() {

            var me = this;

            var confirmLabel = "Add To Timesheet?";
            var message = "Add Selected Tasks to Timesheet for this Week?";

            Ext.create('Rally.ui.dialog.ConfirmDialog', {
                message: message,
                confirmLabel: confirmLabel,
                listeners: {
                    confirm: function(){
                        // console.log('CreateTimeSheetEntries.RecordMenuItemAddToTimesheet._onAddToTimesheetClicked');
                        if (me.onBeforeAction(me.records) === false) {
                            return;
                        }
                        me.saveRecords(me.records);                                                
                    }
                }
            });
        },

        /**
         * @override
         * @inheritdoc
         */
        onSuccess: function (successfulRecords, unsuccessfulRecords, selectedState, errorMessage) {
            // console.log('CreateTimeSheetEntries.RecordMenuItemAddToTimesheet.onSuccess');
            // console.log(this);
            // console.log('this.records:');
            // console.log(this.records);
            // console.log('successfulRecords:');
            // console.log(successfulRecords);
            var message = [
                'Timesheets added for',
                successfulRecords.length,
                (successfulRecords.length === 1 ? 'item' : 'items')
            ].join(' ');

            if(successfulRecords.length === this.records.length) {
                Rally.ui.notify.Notifier.show({ message: message + '.' });
            } else {
                Rally.ui.notify.Notifier.showWarning({
                    message: [message, ', but ', unsuccessfulRecords.length, ' failed: ', errorMessage].join(' ')
                });
            }

            var changes = {};
            Ext.callback(this.onActionComplete, null, [successfulRecords, unsuccessfulRecords, changes]);
            this.records = null;
        }
    });
})();