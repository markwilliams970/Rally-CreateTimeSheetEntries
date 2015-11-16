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

        _selectDateChooserDialog: null,

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

            processRecords: function(records, args, selectedDate) {
                // console.log('CreateTimeSheetEntries.RecordMenuItemAddToTimesheet.processRecords');
                var me = this;
                var successfulRecords = [];

                var curr = new Date(); // get current date

                // Calculate week start
                var weekStart = me._calculateWeekStart(selectedDate);
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

        _calculateWeekStart: function(inputDate) {
            // Calculate week start
            var start = inputDate.getDate() - inputDate.getDay();
            var weekStartLocal = new Date(inputDate.setDate(start));

            var weekStartDay = weekStartLocal.getDate();
            var weekStartMonth = weekStartLocal.getMonth();
            var weekStartYear = weekStartLocal.getFullYear();

            var weekStart = new Date(weekStartYear, weekStartMonth, weekStartDay);
            return weekStart;
        },

        _validateDate: function(selectedIteration, chosenDate) {

            // console.log('CreateTimeSheetEntries.RecordMenuItemAddToTimesheet._validateDate');

            var me = this;
            var maxDate = selectedIteration.get('EndDate');
            var minDate = selectedIteration.get('StartDate');

            var maxDateString = me._dateToISOString(maxDate);
            var minDateString = me._dateToISOString(minDate);

            var weekStartChosenDate = me._calculateWeekStart(chosenDate);

            var warnLabel = "Week Start for Chosen Date must be within Iteration StartDate: \n" +
                    minDateString +
                    "\nAnd EndDate:\n" +
                    maxDateString +
                    "\n Of Selected Tasks.";

            if ( ( weekStartChosenDate.getTime() < minDate.getTime() ) || ( weekStartChosenDate.getTime() > maxDate.getTime() )) {
                // Notify of successful deletion
                Ext.create('Rally.ui.dialog.ConfirmDialog', {
                    title: "Warning: Invalid Date Selected!",
                    message: warnLabel,
                    confirmLabel: "Ok"
                });
            } else {

                var confirmLabel = "Add To Timesheet?";
                var message = "Add Selected Tasks to Timesheet for selected Week?";

                Ext.create('Rally.ui.dialog.ConfirmDialog', {
                    message: message,
                    confirmLabel: confirmLabel,
                    listeners: {
                        confirm: function(){
                            // console.log('CreateTimeSheetEntries.RecordMenuItemAddToTimesheet._onAddToTimesheetClicked');
                            if (me.onBeforeAction(me.records) === false) {
                                return;
                            }

                            // console.log('Go ahead and save the records...');
                            args = {};
                            me.saveRecords(me.records, args, chosenDate);
                        }
                    }
                });

            }
        },

        _selectWeekForTimesheet: function(selectedIteration) {
            // console.log('CreateTimeSheetEntries.RecordMenuItemAddToTimesheet._selectWeekForTimesheet');

            var me = this;

            var maxDate = selectedIteration.get('EndDate');
            var minDate = selectedIteration.get('StartDate');

            // Get the week to which we want to add the timesheets
            if (me._selectDateChooserDialog) {
                me._selectDateChooserDialog.destroy();
            }

            var label = "Choose Week within Timesheet Week to Add Tasks:";
            var defaultDate = new Date();
            var confirmLabel = "Ok";

            me._selectDateChooserDialog = Ext.create('ChooseDateDialog', {
                calendarLabel: label,
                defaultDate: defaultDate,
                confirmLabel: confirmLabel,
                maxDate: maxDate,
                minDate: minDate,
                listeners: {
                    confirm: function(dialog, chosendate) {
                        // Validate selected date is within Iteration
                        me._validateDate(selectedIteration, chosendate);
                    }
                }
            });
        },

        _hydrateIteration: function() {

            // console.log('CreateTimeSheetEntries.RecordMenuItemAddToTimesheet._hydrateIteration');

            var me = this;

            var selectedIteration = me.records[0].get('Iteration');

            // hydrate iteration data
            var iterationOid  = selectedIteration["ObjectID"];
            var iterationModel = Rally.data.ModelFactory.getModel({
                type: 'iteration',
                scope: me,
                success: function(model, operation) {
                    model.load(iterationOid, {
                        scope: me,
                        success: function(iterationHydrated, operation) {
                            me._selectWeekForTimesheet(iterationHydrated);
                        }
                    });
                }
            });

        },

        _onAddToTimesheetClicked: function() {

            var me = this;

            // Get the Iteration corresponding to the selected Tasks
            me._hydrateIteration();


        },

        _dateToISOString: function(date, convertToUTC, stripTimePortion) {

            // console.log('_dateToISOString');

            if (stripTimePortion) {
                return Rally.util.DateTime.toIsoString( date, convertToUTC ).replace(/T[\W\w]*/,"");
            } else {
                return Rally.util.DateTime.toIsoString( date, convertToUTC );
            }
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