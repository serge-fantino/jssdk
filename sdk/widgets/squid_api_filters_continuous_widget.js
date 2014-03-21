define(['jquery','backbone', 'hbs!jssdk/sdk/templates/squid_api_filters_continuous_widget',
'jqueryui'], function($, Backbone, template) {

    var ContinuousFilterView = Backbone.View.extend({
        
        enable: true,
        startDate: null,
        endDate: null,
        model: null,
        initialized : false,
        pickerVisible : false,
        pickerAlwaysVisible : false,
        parent : null,
        template : template,

        initialize: function(options) {
            if (this.model) {
                this.model.on('change', this.render, this);
            }
            if (options.pickerVisible && (options.pickerVisible == true)) {
                this.pickerVisible = true;
                this.pickerAlwaysVisible = true;
            }
        },

        setModel: function(model) {
            this.model = model;
            this.initialize();
        },
        
        setTemplate : function(t) {
            if (t) {
                this.template = t;
            }
        },

        getSelectedItems: function() {
            var d1 = this.startDate;
            var d2 = this.endDate;
            var selectedItems = [];
            selectedItems.push({
                "lowerBound": d1.toISOString(),
                "upperBound": d2.toISOString(),
                "type": "i"
            });
            return selectedItems;
        },
    
        render: function() {
            if (this.model && this.model.get('dimension')) {
                var items = this.model.get('items');
                var selItems = this.model.get('selectedItems');
                var name = this.model.get('dimension').name;
                var facetId = this.model.get('facetId');

                var dateAvailable = false;
                var startDateStr;
                var endDateStr;
                if (items && items.length > 0) {
                    // set flag to indicate the date is available
                    dateAvailable = true;
                    // get start date and end date (in string format)
                    startDateStr = items[0].lowerBound;
                    endDateStr = items[0].upperBound;
                    if (selItems && selItems.length > 0) { // dates are selected
                        // get selected values instead
                        startDateStr = selItems[0].lowerBound;
                        endDateStr = selItems[0].upperBound;
                    }
                    // convert from string to Date object
                    this.startDate = new Date(Date.parse(startDateStr));
                    this.endDate = new Date(Date.parse(endDateStr));
                }
                if (this.initialized) {
                    this.$el.find("#startDate").text(this.startDate.toDateString());
                    this.$el.find("#endDate").text(this.endDate.toDateString());
                } else {
                    var selHTML = "";
                    // get HTML template and fill corresponding data
                    selHTML = this.template({
                        dateAvailable: dateAvailable,
                        facetId: facetId,
                        name: name,
                        startDateVal: this.startDate.toDateString(),
                        endDateVal: this.endDate.toDateString()
                    });
            
                    // render HTML
                    
                    this.$el.html(selHTML);
                    
                    // attach observers
                    var me = this;
                    
                    if (!me.pickerAlwaysVisible) {
                        me.$el.click(function(e) {
                        	// on click, show the date pickers
                            e.stopPropagation();
                            if (!me.pickerVisible) {
                                me.renderPicker(me);
                                me.pickerVisible = true;
                            }
                        });
                        
                        // close on click outside of the picker
                        $(document).click(function(e) {
                            if (me.pickerVisible) {
                                me.$el.find("#pickerContainer").hide();
                                me.pickerVisible = false;
                            }
                        });
                        
                        // close on click on "cancel"
                        me.$el.find(".btn-default").click(function(e) {
                            e.stopPropagation();
                            if (me.pickerVisible) {
                                me.$el.find("#pickerContainer").hide();
                                me.pickerVisible = false;
                            }
                        });
                        
                        // process on click on "ok"
                        me.$el.find(".btn-primary").click(function(e) {
                            e.stopPropagation();
                            if (me.pickerVisible) {
                                me.$el.find("#pickerContainer").fadeOut("fast");
                                me.pickerVisible = false;
                                if (me.parent) {
                                    me.parent.changeSelection(me);
                                }
                            }
                        });
                    } else {
                        me.renderPicker(me);
                        
                        me.$el.find(".btn-primary").click(function(e) {
                            if (me.parent) {
                                me.parent.changeSelection(me);
                            }
                        });
                    }
                    
                    this.initialized = true;
                }
            }
            
            return this;
        },
        
        renderPicker : function(me) {
            // build the date pickers (using classes instead of id to select the pickers as this is a bug in datePicker)
            var p1 = me.$el.find(".startDatePicker");
            p1.datepicker({
                    changeMonth: true,
                    changeYear: true,
                    defaultDate: me.startDate,
                    onSelect : function(date) {
                        me.startDate = new Date(Date.parse(date));
                    }
                });
            var p2 = me.$el.find(".endDatePicker");
            p2.datepicker({
                    changeMonth: true,
                    changeYear: true,
                    defaultDate: me.endDate,
                    onSelect : function(date) {
                        me.endDate = new Date(Date.parse(date));
                    }
                });
            
            me.$el.find("#pickerContainer").show();
        },

        setEnable: function(enable) {
            this.enable = enable;
        }
    });

return ContinuousFilterView;
});