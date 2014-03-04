define(['backbone', 
'sdk/widgets/squid_api_filters_categorical_widget', 
'sdk/widgets/squid_api_filters_continuous_widget',
'hbs!sdk/templates/squid_api_filters_widget'], 
function(Backbone, CategoricalFilterView, ContinuousFilterView, template) {

    var View = Backbone.View.extend({
        childViews: null,
        filterIds: null,
        displayCategorical: true,
        displayContinuous: true,
        continuousFilterTemplate : null,
        categoricalFilterTemplate : null,
        categoricalFilterModel: Backbone.Model.extend({
            facetId: null,
            dimension: null,
            domain: null,
            items: null,
            selectedItems: null
        }),
        continuousFilterModel: Backbone.Model.extend({
            facetId: null,
            dimension: null,
            domain: null,
            items: null,
            selectedItems: null
        }),

        initialize: function() {
            if (this.model) {
                // listen for some model events
                this.model.on('change:selection', this.render, this);
                this.model.on('change:error', this.render, this);
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
         * Set an array of filter ids (dimension ids) to display.
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
            var facets = this.model.get("selection");
            if (facets) {
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
                    this.$el.html(template());
                    container = this.$el.find(".sq-content");
            }
            var errorData = this.model.get("error");
			if (errorData) {
			    console.error(errorData.message);
			    this.$el.find(".sq-error").show();
			    this.$el.find(".content").hide();
				this.$el.find(".sq-wait").hide();
			} else {
			    this.$el.find(".sq-error").hide();
                var enabled = this.model.get("enabled");
                var facets = this.model.get("selection");
                if (!facets) {
                    this.$el.find(".sq-wait").show();
                } else {
                    this.$el.find(".sq-wait").hide();
                    if (this.childViews) {
                        // update the child views models
                        for (var i = 0; i < this.childViews.length; i++) {
                            var view = this.childViews[i];
                            if (view) {
                                var facet = facets[i];
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
                        // build the sub-views
                        this.childViews = [];
                        for (var i = 0; i < facets.length; i++) {
                            var facet = facets[i];
                            var model = null;
                            var view = null;
                            var facetContainerId = "sq-facet_" + i;
        
                            this.$el.append("<div id='"+facetContainerId+"'></div>");
                            var filterEl = this.$el.find("#"+facetContainerId);
                            
                            // create a sub view (applying display rules)
                            if ((this.filterIds == null) || (this.filterIds.indexOf(facet.dimension.oid)>-1)) {
                                if (facet.dimension.type == "CONTINUOUS") {
                                    if (this.displayContinuous) {
                                        model = new this.continuousFilterModel();
                                        view = new ContinuousFilterView({
                                            model: model,
                                            el: filterEl
                                        });
                                        view.setTemplate(this.continuousFilterTemplate);
                                    } else {
                                        view = null;
                                    }
                                }
                                if (facet.dimension.type == "CATEGORICAL") {
                                    if (this.displayCategorical) {
                                        model = new this.categoricalFilterModel();
                                        view = new CategoricalFilterView({
                                            model: model,
                                            el: filterEl
                                        });
                                        view.setTemplate(this.categoricalFilterTemplate);
                                    } else {
                                        view = null;
                                    }
                                }
                            }
                            if (view) {
                                view.parent = this;
                                if (!filterEl) {
                                    // append the sub view to the filter view
                                    container.append(view.$el);
                                }
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
            return this;
        }


    });

    return View;
});