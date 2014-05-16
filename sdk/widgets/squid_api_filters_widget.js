define(['jquery','backbone',
'jssdk/sdk/widgets/squid_api_filters_categorical_widget', 
'jssdk/sdk/widgets/squid_api_filters_continuous_widget',
'jssdk/sdk/squid_api_facetjob_controller',
'hbs!jssdk/sdk/templates/squid_api_filters_widget', 'underscore'], 
function($,Backbone, CategoricalFilterView, ContinuousFilterView, FacetJobController, defaultTemplate) {
    
    var View = Backbone.View.extend({
        initialModel: null,
        currentModel: null,
        childViews: null,
        filterIds: null,
        displayCategorical: true,
        displayContinuous: true,
        refreshOnChange: true,
        template : null,
        continuousFilterTemplate : null,
        categoricalFilterTemplate : null,
        pickerAlwaysVisible : false,
        booleanGroupName : null,
        multiselectOptions : {},
        
        filterModel: Backbone.Model.extend({
            facetId: null,
            dimension: null,
            domain: null,
            items: null,
            selectedItems: null
        }),
        
        initialize: function(options) {
            if (options.pickerVisible && (options.pickerVisible == true)) {
                this.pickerAlwaysVisible = true;
            }
            if (options.booleanGroupName) {
                this.booleanGroupName = options.booleanGroupName;
            }
            if (options.template) {
                this.template = options.template;
            } else {
                this.template = defaultTemplate;
            }
            if (options.refreshOnChange != null) {
                this.refreshOnChange = options.refreshOnChange;
            }
            if (options.multiselectOptions != null) {
                this.multiselectOptions = options.multiselectOptions;
            }
            if (this.model) {
                var me = this;
                if (this.initialSelection == null) {
                    // duplicate the initial model (once)
                    this.initialModel = $.extend(true, {}, this.model.attributes);
                }
                
                // build the current model
                this.currentModel = new FacetJobController.FiltersModel();
                // set the current model
                var attributesClone = $.extend(true, {}, me.model.attributes);
                me.currentModel.set(attributesClone);
                me.currentModel.set("enabled", true);
                
                this.currentModel.on('change:status', function() {
                    if (me.currentModel.isDone()) {
                    	me.currentModel.set("enabled",true);
                    }
                    me.render();
                    }, this);
                this.currentModel.on('change:enabled', function() {
                	me.setEnable(me.currentModel.get("enabled"));
                    }, this);
                // listen for some model events
                this.model.on('change:selection', function() {
                    // update the current model
                	var attributesClone = $.extend(true, {}, me.model.attributes);
                    me.currentModel.set("selection", attributesClone.selection);
                    me.render();
                    }, this);
                this.model.on('change:enabled', this.setEnable, this);
            }
        },

        setModel: function(model) {
            this.model = model;
            this.initialize();
        },
        
        setContinuousFilterTemplate : function(t) {
            this.continuousFilterTemplate = t;
            return this;
        },
        
        /*
         * Set an ordered array of filter ids (dimension oids) to display.
         */
        setFilterIds : function(a) {
            this.filterIds = a;
            return this;
        },
        
        setCategoricalFilterTemplate : function(t) {
            this.categoricalFilterTemplate = t;
            return this;
        },

        setEnable: function(enabled) {
        	if (typeof(enabled) == 'undefined') {
            	enabled = this.model.get("enabled");
        	}
            if (this.childViews) {
                for (var i = 0; i < this.childViews.length; i++) {
                    var view = this.childViews[i];
                    if (view) {
                        view.setEnable(enabled);
                    }
                }
            }
        },

        /**
         * Called by childViews when a selection occurred.
         */
        changeSelection: function(childView) {
            var selectedItems = childView.getSelectedItems();
            var facetId = childView.model.get("facetId");
            // update the current model
            var sel = this.currentModel.get("selection");
            if (sel) {
                var facets = sel.facets;
                for (var i=0; i< facets.length; i++) {
                    var facet = facets[i];
                    if (facetId != null) {
                    	// normal facet
	                    if (facet && (facet.id == facetId)) {
	                        if ((facet.items.length > 0)) {
	                            facet.selectedItems = selectedItems;
	                        }
	                    }
                    } else {
                    	// boolean group facet
                    	// clear selection
                		if (facet && ((facet.items.length == 1) && (facet.items[0].value == "true"))) {
                			facet.selectedItems = [];
                		}
                		// set the selection
                    	for (var j=0; j<selectedItems.length; j++) {
                    		if (facet && (facet.dimension.oid == selectedItems[j].id)) {
                    			facet.selectedItems = [{"type" : "v", "id" : "0", "value" : "true"}];
                    		}
                    	}
                    }
                }
            }
            // recompute the current facets
            if (this.refreshOnChange) {
	            this.currentModel.set("enabled",false);
	            FacetJobController.compute(this.currentModel);
            }
            
        },
        
        applySelection: function() {
        	if (this.currentModel.get("enabled") == true) {
	            // update the model selection with current
	            this.model.set("selection", this.currentModel.get("selection"));
        	}
        },
        
        cancelSelection: function() {
        	if (this.currentModel.get("enabled") == true) {
	            // update the current model with the original model
	            var attributesClone = $.extend(true, {}, this.model.attributes);
	            this.currentModel.set("selection", attributesClone.selection);
	            this.render();
	            console.log("cancelSelection");
        	}
        },

        render: function() {
            var container;
            if (!this.$el.html()) {
                // first call, setup the child views
                this.$el.html(this.template());            
            }
            container = this.$el.find(".sq-content");
            var errorData = this.model.get("error");
			if (errorData) {
			    console.error(errorData.message);
			    this.$el.find(".sq-error").show();
			    this.$el.find(".sq-content").hide();
				this.$el.find(".sq-wait").hide();
			} else {
			    this.$el.find(".sq-error").hide();
                var enabled = this.model.get("enabled");
                var sel = this.currentModel.get("selection");
                if ((!sel) || (this.currentModel.get("status") == "RUNNING")) {
                    this.$el.find(".sq-wait").show();
                } else {
                    var facets = sel.facets;
                    this.$el.find(".sq-wait").hide();
                    
                    // sort & filter the facets
                    var sortedFacets = [];
                    var booleanGroupFacet = {"dimension" : {"type" : "CATEGORICAL", "oid" : null, "id" : null, "name" : this.booleanGroupName }, "items" : [], "selectedItems" : []};
                    for (var i = 0; i < facets.length; i++) {
                        var facet = facets[i];
                        var facetId = facet.dimension.oid;
                        var idx;
                        if (!this.filterIds) {
                            // bypass sorting
                            idx = i;
                        } else {
                        	// apply sorting
                            idx = this.filterIds.indexOf(facetId);
                            if (idx < 0) {
                                // ignore this facet
                            	idx = null;
                            }
                        }
                        // apply group boolean rule
                        if (this.booleanGroupName) {
                        	if ((facet.items.length == 1) && (facet.items[0].value == "true")) {
                        		idx = null;
                        		// add a new item to the boolean group
                        		booleanGroupFacet.items.push({"type" : "v", "id" : facet.dimension.oid, "value" : facet.dimension.name});
                        		if (facet.selectedItems.length > 0) {
                        			// this facet is selected
                        			booleanGroupFacet.selectedItems.push({"type" : "v", "id" : facet.dimension.oid, "value" : facet.dimension.name});
                        		}
                        	}
                        }
                        // apply display rules
                        if (idx != null) {
                            if ((facet.dimension.type == "CONTINUOUS") && (this.displayContinuous)) {
                                sortedFacets[idx] = facets[i];
                            }
                            if ((facet.dimension.type == "CATEGORICAL") && (this.displayCategorical)) {
                                sortedFacets[idx] = facets[i];
                            }
                        }
                    }
                    if (this.booleanGroupName) {
                    	// sort by alphabetical order
                    	booleanGroupFacet.items.sort(function(a,b) { 
	                    		if (a.value < b.value) return -1;
	                    	    if (a.value > b.value) return 1;
	                    	    return 0;
                    		} 
                    	);
                    	sortedFacets.push(booleanGroupFacet);
                    }
                    
                    var buildViews = false;
                    if (!this.childViews) {
                    	// build new views
                    	this.childViews = [];
                    	buildViews = true;
                    }
                    
                    var viewIdx = 0;
                    for (var i = 0; i < sortedFacets.length; i++) {
                        var facet = sortedFacets[i];
                        if (facet) {
                            var model = null;
                            if (buildViews) {
                                // build the sub-views
                                var view = null;
                                var facetContainerId = "sq-facet_" + i;
                                var filterEl;
                                // create the sub view
                                container.append("<div id='"+facetContainerId+"'></div>");
                                filterEl = this.$el.find("#"+facetContainerId);
                                model = new this.filterModel();
                                if (facet.dimension.type == "CONTINUOUS") {
                                        view = new ContinuousFilterView({
                                            model: model,
                                            el: filterEl,
                                            pickerVisible : this.pickerAlwaysVisible
                                        });
                                        view.setTemplate(this.continuousFilterTemplate);
                                }
                                if (facet.dimension.type == "CATEGORICAL") {
                                        model = new this.filterModel();
                                        view = new CategoricalFilterView({
                                            model: model,
                                            el: filterEl
                                        });
                                        view.setTemplate(this.categoricalFilterTemplate);
                                }
                                view.parent = this;
                                view.setEnable(enabled);
                                this.childViews.push(view);
                            } else {
                            	model = this.childViews[viewIdx].model;
                                viewIdx++;
                            }
                            // set view model
                            model.set({
                                facetId: facet.id,
                                dimension: facet.dimension,
                                items: facet.items,
                                selectedItems: facet.selectedItems
                            },{silent:true});
                            model.trigger("change");
                        }
                    }
                }
			}
			container.find('.multiselect').multiselect(this.multiselectOptions);
            return this;
        },

        hasChanged : function() {
            var isEqual = true;
            if (this.currentModel.get("selection")) {
                var facets = this.currentModel.get("selection").facets;
                var initSelection = this.initialModel.selection;
                for (var i=0; i<facets.length; i++) {
                    var dimId = facets[i].dimension.id.dimensionId;
                    var initItems = this.getSelectedItems(this.initialSelection, dimId);
                    var curItems = facets[i].selectedItems;
                    if (initItems == null) {
                        initItems = [];
                    }
                    initItems.sort();
                    if (curItems == null) {
                        curItems = [];
                    }
                    curItems.sort();
                    // check this is the same selection
                    if (curItems.length != initItems.length) {
                        isEqual = false;
                    } else {
                        for (var j=0; j<initItems.length; j++) {
                            if (initItems[j].id != curItems[j].id) {
                                isEqual = false;
                            }
                        }
                    }
                }
            }
            return !isEqual;
        },
        
        getSelectedItems : function(selection, dimensionId) {
            var facets = selection.facets;
            for (var i=0; i<facets.length; i++) {
                var dimId = facets[i].dimension.id.dimensionId;
                if (dimId == dimensionId) {
                    return facets[i].selectedItems;
                }
            }
            return null;
        }


    });

    return View;
});
