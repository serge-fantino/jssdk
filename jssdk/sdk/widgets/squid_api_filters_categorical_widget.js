define([
  'jquery',
  'backbone',
  'hbs!sdk/templates/squid_api_filters_categorical_widget'
], function($, Backbone, template) {

	var CategoricalFilterView = Backbone.View.extend( {
		
		model: null,
		parent : null,
		template : template,
		
		initialize : function() {
			if (this.model) {
				this.model.on('change', this.render, this);
			}
		},
		
		setModel : function(model) {
			this.model = model;
			this.initialize();
		},
		
		setTemplate : function(t) {
            if (t) {
                this.template = t;
            }
        },
		
        events: {
            "change": function(event) {
                if (this.parent) {
                    this.parent.changeSelection(this);
                }
            }
        },
        
        getSelectedItems: function() {
            var selectedItems = [];
            var val = this.$el.find("select").val();
            if (val != '') {
                selectedItems.push({
                    "id": val,
                    "value": val,
                    "type": "v"
                });
            }
            return selectedItems;
        },

		render : function() {
			var selHTML = "";
			if (this.model && this.model.get('dimension')) {
				var items = this.model.get('items');
				var selItems = this.model.get('selectedItems');
				var name = this.model.get('dimension').name;
				var facetId = this.model.get('facetId');
				
				var selAvailable = false;
				var options = [];
				if (items && items.length > 0) {
					// set flag to indicate the filter selection is available
					selAvailable = true;
					// build select box options
					var selected;
					var selItemsLen = selItems.length;
					for (var j = 0; j < items.length; j++) {
						selected = false;
						for (var k = 0; k < selItemsLen; k++) {
							if (items[j].id == selItems[k].id) { // option is selected
								selected = true;
								break;
							}
						}
						options.push({value : items[j].id, label : items[j].value, selected : selected});
					}
				}
				// get HTML template and fill corresponding data
				selHTML = this.template({
					selAvailable : selAvailable,
					facetId : facetId,
					name : name,
					options : options
				});
			}
			// render HTML
			this.$el.html(selHTML);
			return this;
		},
		
		setEnable: function(enable) {
			var selection = this.$el.find("select");
			if (selection) {
				$(selection).attr('disabled', !enable);
			}
		}
		
	});

	return CategoricalFilterView;
});