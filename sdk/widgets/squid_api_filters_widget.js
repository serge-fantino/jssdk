define(['backbone',
'jssdk/sdk/widgets/squid_api_filters_categorical_widget', 
'jssdk/sdk/widgets/squid_api_filters_continuous_widget',
'hbs!jssdk/sdk/templates/squid_api_filters_widget', 'underscore'], 
function(Backbone, CategoricalFilterView, ContinuousFilterView, defaultTemplate) {
    
    var View = Backbone.View.extend({
        initialSelection: null,
        childViews: null,
        filterIds: null,
        displayCategorical: true,
        displayContinuous: true,
        template : null,
        continuousFilterTemplate : null,
        categoricalFilterTemplate : null,
        pickerAlwaysVisible : false,
        
        filterModel: Backbone.Model.extend({
            facetId: null,
            dimension: null,
            domain: null,
            items: null,
            selectedItems: null
        }),
        
        initialize: function(options) {
            if (this.model) {
                if (this.initialSelection == null) {
                    this.initialSelection = this.model.get("selection");
                }
                // listen for some model events
                this.model.on('change:selection', this.render, this);
                this.model.on('change:error', this.render, this);
                this.model.on('change:enabled', this.setEnable, this);
            }
            if (options.pickerVisible && (options.pickerVisible == true)) {
                this.pickerAlwaysVisible = true;
            }
            if (options.template) {
                this.template = options.template;
            } else {
                this.template = defaultTemplate;
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

        setEnable: function() {
            var enabled = this.model.get("enabled");
            if (this.childViews) {
                for (var i = 0; i < this.childViews.length; i++) {
                    var view = this.childViews[i];
                    if (view) {
                        view.setEnable(enabled);
                    }
                }
            }
        },

        changeSelection: function(childView) {
            var selectedItems = childView.getSelectedItems();
            
            // pick the right facet to update
            var sel = this.model.get("selection");
            if (sel) {
                var facets = sel.facets;
                for (var i=0; i< facets.length; i++) {
                    var facet = facets[i];
                    if (facet && (facet.id == childView.model.get("facetId"))) {
                        if ((facet.items.length > 0)) {
                            facet.selectedItems = selectedItems;
                        }
                    }
                }
                // notify observers manually since we only updated a facet
                this.model.trigger("change:userSelection", this.model);
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
                var sel = this.model.get("selection");
                if (!sel) {
                    this.$el.find(".sq-wait").show();
                } else {
                    var facets = sel.facets;
                    this.$el.find(".sq-wait").hide();
                    if (this.childViews) {
                        // update the child views models
                        for (var i = 0; i < this.childViews.length; i++) {
                            var view = this.childViews[i];
                            if (view) {
                                var facetId = view.model.get("facetId");
                                var facet;
                                for (var j=0; j<facets.length; j++) {
                                    if (facets[j].id == facetId) {
                                        facet = facets[j];
                                    }
                                }
                                view.model.set({
                                    facetId: facet.id,
                                    dimension: facet.dimension,
                                    domain: facet.domain,
                                    items: facet.items,
                                    selectedItems: facet.selectedItems
                                });
                            }
                        }
                    } else {
                        // sort & filter the facets
                        var sortedFacets = [];
                        for (var i = 0; i < facets.length; i++) {
                            var facetId = facets[i].dimension.oid;
                            if (!this.filterIds) {
                                // bypass sorting
                                idx = i;
                            } else {
                                var idx = this.filterIds.indexOf(facetId);
                                if (idx >-1) {
                                    // apply sorting
                                    sortedFacets[idx] = facets[i];
                                }
                            }
                            if (facet.dimension.type == "CONTINUOUS" && (this.displayContinuous)) {
                                sortedFacets[idx] = facets[i];
                            }
                            if (facet.dimension.type == "CATEGORICAL" && (this.displayCategorical)) {
                                sortedFacets[idx] = facets[i];
                            }
                        }
                        
                        // build the sub-views
                        this.childViews = [];
                        for (var i = 0; i < sortedFacets.length; i++) {
                            var facet = sortedFacets[i];
                            if (facet) {
                                var model = null;
                                var view = null;
                                var facetContainerId = "sq-facet_" + i;
                                var filterEl;
                                // create a sub view
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
                                    if (this.displayCategorical) {
                                        container.append("<div id='"+facetContainerId+"'></div>");
                                        filterEl = this.$el.find("#"+facetContainerId);
                                        model = new this.filterModel();
                                        view = new CategoricalFilterView({
                                            model: model,
                                            el: filterEl
                                        });
                                        view.setTemplate(this.categoricalFilterTemplate);
                                    } else {
                                        view = null;
                                    }
                                }
                               
                                if (view) {
                                    view.parent = this;
                                    // set view model
                                    model.set({
                                        facetId: facet.id,
                                        dimension: facet.dimension,
                                        domain: facet.domain,
                                        items: facet.items,
                                        selectedItems: facet.selectedItems
                                    });
                                    view.setEnable(enabled);
                                }
                                this.childViews.push(view);
                            }
                        }
                    }
                }
			}
            return this;
        },
        
        hasChanged : function() {
            var isEqual = true;
            if (this.model.get("selection")) {
                var facets = this.model.get("selection").facets;
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