Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items: [
        {
            xtype: 'container',
            itemId: 'iterationChooser',
            padding: '10px',
            layout: 'hbox'
        },
        {
            xtype: 'container',
            itemId: 'includeComplete',
            padding: '10px',
            layout: 'vbox'
        },
        {
            xtype: 'container',
            itemId: 'gridContainer',
            padding: '10px'
        }
    ],

    _iterationCombobox: null,
    _includeCompletedTasks: null,
    _currentUser: null,
    _currentProject: null,
    _getTasksButton: null,
    _typeFeature: null,
    _taskGrid: null,

    launch: function() {

        var me = this;

        var currentContext = me.getContext();

        //Get the current user and project
        me._currentUser = currentContext.getUser();
        me._currentProject = currentContext.getProject();

        me._buildUI();
    },

    _buildUI: function() {

        var me = this;

        me._iterationCombobox = Ext.create('Rally.ui.combobox.IterationComboBox', {
            fieldLabel:   'Choose Iteration',
            width:        '350px',
            listeners: {
                scope: this,
                'select': me._getTasks
            }
        });

        me.down("#iterationChooser").add(me._iterationCombobox);

        me._includeCompletedTasks = Ext.create('Rally.ui.CheckboxField', {
            fieldLabel: 'Include Tasks where State = Completed',
            value: false,
            width: '200px'
        });

        me.down("#includeComplete").add(me._includeCompletedTasks);

        me._getTasksButton = Ext.create('Rally.ui.Button', {
            text: 'Get My Tasks',
            handler: function() {
                me._getTasks();
            }
        });

        me.down('#iterationChooser').add(me._getTasksButton);
    },

    _getTasks: function() {

        var me = this;

        var selectedIteration           = this._iterationCombobox.getValue();
        var selectedIterationRef        = Ext.create('Rally.util.Ref', selectedIteration);
        var selectedIterationObjectID   = selectedIterationRef.getOid();

        var currentUserName             = me._currentUser.UserName;
        var currentProjectObjectID      = me._currentProject.ObjectID;

        // console.log(selectedIterationObjectID);

        if (this._taskGrid) {
            this._taskGrid.destroy();
        }

        var includeComplete = false;
        includeComplete = me._includeCompletedTasks.getValue();


        var noneFoundMessage = "No Tasks owned by you found for the current Project and selected Iteration.";

        var taskFilters = [
                    {
                        property: 'Iteration.ObjectID',
                        operator: '=',
                        value: selectedIterationObjectID
                    },
                    {
                        property: 'Project.ObjectID',
                        operator: '=',
                        value: currentProjectObjectID
                    },
                    {
                        property: 'Owner.UserName',
                        operator: '=',
                        value: currentUserName
                    }
                ];

        if (includeComplete === false) {
            taskFilters.push({
                property: 'State',
                operator: '<',
                value: 'Completed'
            });
            noneFoundMessage = "No Tasks owned by you where State < Completed were found for the current Project and selected Iteration.";
        }

        // console.log(taskFilters);
        // console.log(currentUserName);
        // console.log(currentProjectObjectID);

        this._taskGrid = this.down('#gridContainer').add({
            xtype: 'rallygrid',
            itemId: 'rallygrid',
            columnCfgs: [
                'FormattedID',
                'Name',
                'Project',
                'State',
                'Owner',
                'Iteration'
            ],
            context: this.getContext(),
            enableBulkEdit: true,
            showRowActionsColumn: true,
            storeConfig: {
                model: 'Task',
                filters: taskFilters,
                listeners: {
                    load: function(store, data, success) {
                        if (data.length === 0) {
                            Ext.create('Rally.ui.dialog.ConfirmDialog', {
                                title: "Tasks Not Found",
                                message: noneFoundMessage,
                                confirmLabel: "Ok",
                                listeners: {
                                    confirm: function () {
                                        return;
                                    }
                                }
                            });
                        }
                    }
                }
            }

        });
    }
});