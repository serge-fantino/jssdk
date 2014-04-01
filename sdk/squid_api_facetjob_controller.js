define(['backbone', 'jssdk/sdk/squid_api'], function(Backbone, squid_api) {

    var controller = {

        fakeServer: null,

        computeFacets: function(filtersModel) {
            // create a new FacetJob
            var facetJob = new controller.ProjectFacetJob();
            facetJob.set("id", {
                projectId: filtersModel.id.projectId,
                facetJobId: null
            });
            facetJob.set("domains", filtersModel.get("domains"));

            var userSelection = null;
            if (filtersModel.get("selection")) {
                userSelection = filtersModel.get("selection");
            }
            filtersModel.set("selection", null);
            facetJob.set("selection", userSelection);
            facetJob.set("error", null);
            facetJob.on("change:id", function(event) {

                // fetch the job results
                var facetJobResult = new controller.ProjectFacetJobResult();
                facetJobResult.set("id", event.id);

                facetJobResult.on("change", function(event) {
                    var facets = event.get("facets");
                    // update the filters Model
                    filtersModel.set("selection", {"facets" : facets});
                    filtersModel.set("readyStatus", true);
                }, this);

                if (facetJob.get("error") === null) {
                    // get the results from API
                    facetJobResult.fetch({
                        error: function(model, error) {
                            squid_api.model.error.set("errorMessage", error);
                            filtersModel.set("readyStatus", true);
                            filtersModel.set("error", {message : error.statusText});
                        },
                        success: function() {
                            squid_api.model.error.set("errorMessage", null);
                        }
                    });
                    if (this.fakeServer) {
                        this.fakeServer.respond();
                    }
                }
                else {
                    // in case of error init the models
                    filtersModel.set("error", event.get("error"));
                }
            }, this);

            // save the facetJob to API
            facetJob.save({}, {
                error: function(model, error) {
                    filtersModel.set("error", {message : error.statusText});
                }
            });

            if (this.fakeServer) {
                this.fakeServer.respond();
            }

        },
        
        FiltersModel: Backbone.Model.extend({
            setProjectId : function(projectId) {
                this.set("id", {
                        "projectId": projectId,
                        "analysisJobId": null
                });
                return this;
            },
            
            setDomainIds : function(domainIdList) {
                var domains = [];
                for (var i=0; i<domainIdList.length; i++) {
                    domains.push({
                        "projectId": this.get("id").projectId,
                        "domainId": domainIdList[i]
                    });
                }
                this.set("domains", domains);
                return this;
            }
        })
    };

    controller.ProjectFacetJob = squid_api.model.ProjectModel.extend({
        urlRoot: function() {
            return squid_api.model.ProjectModel.prototype.urlRoot.apply(this, arguments) + "/facetjobs/" + (this.id.facetJobId === null ? "" : this.id.facetJobId);
        },
        error: null,
        domains: null
    });

    controller.ProjectFacetJobResult = controller.ProjectFacetJob.extend({
        urlRoot: function() {
            return controller.ProjectFacetJob.prototype.urlRoot.apply(this, arguments) + "/results";
        },
        error: null
    });
        
    return controller;
});