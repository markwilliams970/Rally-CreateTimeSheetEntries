Ext.define('ChooseDateDialog', {
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.choosedate',

    requires: [
        'Rally.ui.Button',
        'Rally.ui.dialog.Dialog',
        'Rally.ui.TextField'
    ],

    clientMetrics: {
        beginEvent: 'beforeshow',
        endEvent: 'show',
        description: 'dialog shown'
    },

    width: 200,
    closable: true,
    autoShow: true,
    cls: 'rally-confirm-dialog',

    /**
     * @cfg {String}
     * Title to give to the dialog
     */
    title: '',

    /**
     * @cfg {String}
     * A question to ask the user
     */
    message: '',

    /**
     * @cfg {String}
     * The label for the left button
     */
    confirmLabel: 'Continue',

    /**
     * @cfg {String}
     * The label for the right button
     */
    cancelLabel: 'Cancel',

    /**
     * @cfg {Date}
     * The default date
     */
    defaultDate: null,

    /**
     * @cfg {Date}
     * The selected date
     */
    selectedDate: null,

    calendar: null,

    /**
     * @cfg {Date}
     * The max date
     */
    maxDate: null,

    /**
     * @cfg {Date}
     * The min date
     */
    minDate: null,


    items: [
        {
            xtype: 'component',
            itemId: 'confirmMsg',
            cls: 'confirmMessage'
        },
        {
            xtype: 'container',
            itemId: 'calendarContainer',
            width: 400,
        }
    ],

    dockedItems: [
        {
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '10',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    cls: 'confirm primary small',
                    itemId: 'confirmButton',
                    userAction: 'clicked yes in dialog'
                },
                {
                    xtype: 'rallybutton',
                    cls: 'cancel secondary small',
                    itemId: 'cancelButton',
                    ui: 'link'
                }
            ]
        }
    ],

    constructor: function(config) {
        this.callParent(arguments);

        if (this.autoCenter) {
            this.scrollListener.saveScrollPosition = true;
        }

        this.defaultDate = new Date();
        if (config.defaultDate) {
            this.defaultDate = config.defaultDate;
        }

        // Default selected date to default date
        this.selectedDate = this.defaultDate;

        if (config.calendarLabel) {
            this.calendarLabel = config.calendarLabel;
        }

        if (config.maxDate) {
            this.maxDate = config.maxDate;
        }

        if (config.minDate) {
            this.minDate = config.minDate;
        }

    },

    initComponent: function() {

        var me = this;

        this.callParent(arguments);

        this.addEvents(
            /**
             * @event
             */
            'confirm',

            /**
             * @event
             */
            'cancel'
        );

        this.down('#confirmButton').on('click', this._onConfirm, this);
        this.down('#confirmButton').setText(this.confirmLabel);

        this.down('#cancelButton').on('click', this._onCancel, this);
        this.down('#cancelButton').setText(this.cancelLabel);

        if(this.message) {
            this.down('#confirmMsg').update(this.message);
        } else {
            this.down('#confirmMsg').hide();
        }

        var calendarLabel = "Choose a date:";
        if (this.calendarLabel) {
            calendarLabel = this.calendarLabel;
        }

        var calendarConfig = {
            title: calendarLabel,
            width: 200,
            bodyPadding: 10,
            renderTo: Ext.getBody(),
            items: [{
                xtype: 'datepicker',
                handler: function(picker, date) {
                    me.selectedDate = date;
                }
            }]
        };

        if (me.maxDate) {
            calendarConfig.maxDate = this.maxDate;
        }

        if (me.minDate) {
            calendarConfig.minDate = this.minDate;
        }

        this.calendar = Ext.create('Ext.panel.Panel', calendarConfig);
        this.down('#calendarContainer').add(this.calendar);
    },

    show: function() {
        if (this.autoCenter) {
            this._saveScrollPosition();
        }
        this.callParent(arguments);
    },

    close: function() {
        this._onCancel();
    },

    _onConfirm: function() {
        this.fireEvent(
            'confirm',
            this,
            this.selectedDate
        );
        this.destroy();
    },

    _onCancel: function() {
        this.fireEvent('cancel', this);
        this.destroy();
    },

    _saveScrollPosition: function() {
        this.savedScrollPosition = {
            xOffset: (window.pageXOffset !== undefined) ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft,
            yOffset: (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop
        };
    }
});