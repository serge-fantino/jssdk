define(['backbone', 'sdk/squid_api'], function(Backbone, squid_api) {

    var controller = {

        fakeServer: null,

        /**
         * Create (and execute) a new AnalysisJob.
         */
        createAnalysisJob: function(analysisModel, filters) {

            analysisModel.set({
                readyStatus: false
            }, {silent : true});
            
            analysisModel.set("results", null);
    
            var userSelection;
            if (filters) {
                userSelection = squid_api.utils.buildSelection(filters.get("selection"));
            } else {
                userSelection =  analysisModel.get("selection");
            }

            // create a new AnalysisJob
            var analysisJob = new controller.ProjectAnalysisJob();
            var projectId;
            if (analysisModel.id.projectId) {
                projectId = analysisModel.id.projectId;
            } else {
                projectId = analysisModel.get("projectId");
            }
            analysisJob.set("id", {
                    projectId: projectId,
                    analysisJobId: null});
            analysisJob.set("domains", analysisModel.get("domains"));
            analysisJob.set("dimensions", analysisModel.get("dimensions"));
            analysisJob.set("metrics", analysisModel.get("metrics"));
            analysisJob.set("autoRun", analysisModel.get("autoRun"));
            analysisJob.set("selection", userSelection);
            analysisJob.set("error", null);

            // save the analysisJob to API
            analysisJob.save({}, {
                error: function(model, error) {
                    squid_api.model.error.set("errorMessage", error);
                    analysisModel.set({"readyStatus": true});
                    analysisModel.set("error", {message : error.statusText});
                },
                success : function() {
                    console.log("createAnalysis save");
                    analysisModel.set({
                        jobId: analysisJob.get("id"),
                        readyStatus: true,
                        results: null,
                        error : analysisJob.get("error")
                    });
                }
            });
            if (this.fakeServer) {
                this.fakeServer.respond();
            }
        },

        /**
         * Create (and execute) a new AnalysisJob, then retrieve the results.
         */
        computeAnalysis: function(analysisModel, filters) {
            var me = this;
            analysisModel.once("change:jobId", function() {
                me.getAnalysisJobResults(analysisModel, filters);
            });

            this.createAnalysisJob(analysisModel, filters);

        },
        
        /**
         * retrieve the results.
         */
        getAnalysisJobResults: function(analysisModel, filters) {
            if ((analysisModel.get("readyStatus") === true) && (analysisModel.get("jobId"))) {
                console.log("getAnalysisResults new");
                var analysisJobResult = new controller.ProjectAnalysisJobResult();
                analysisJobResult.set("id", analysisModel.get("jobId"));

                analysisJobResult.on("change", function(event) {
                    // update the analysis Model
                    console.log("getAnalysisResults results : "+event.get("id"));
                    analysisModel.set({"results" : event.toJSON(), "error" : event.get("error")});
                    squid_api.model.error.set("errorMessage", null);
                }, this);

                // get the results from API
                analysisJobResult.fetch({
                    error: function(model, error) {
                        squid_api.model.error.set("errorMessage", error);
                        analysisModel.set("error", {message : error.statusText});
                    },
                    success: function() {}
                });
                if (this.fakeServer) {
                    this.fakeServer.respond();
                }

            }

        },

        AnalysisModel: Backbone.Model.extend({
            results: null,
            
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
            },
            
            setDimensionIds : function(dimensionIdList) {
                var dims = [];
                for (var i=0; i<dimensionIdList.length; i++) {
                    dims.push({
                        "projectId": this.get("id").projectId,
                        "domainId": this.get("domains")[0].domainId,
                        "dimensionId": dimensionIdList[i]
                    });
                }
                this.set("dimensions", dims);
                return this;
            },
            
            setMetricIds : function(metricIdList) {
                var metrics = [];
                for (var i=0; i<metricIdList.length; i++) {
                    metrics.push({
                        "projectId": this.get("id").projectId,
                        "domainId": this.get("domains")[0].domainId,
                        "metricId": metricIdList[i]
                    });
                }
                this.set("metrics", metrics);
                return this;
            }
        })

    };
    
    // ProjectAnalysisJob Model
    controller.ProjectAnalysisJob = squid_api.model.ProjectModel.extend({
            urlRoot: function() {
                return squid_api.model.ProjectModel.prototype.urlRoot.apply(this, arguments) + "/analysisjobs/" + (this.id.analysisJobId === null ? "" : this.id.analysisJobId);
            },
            error: null,
            domains: null,
            dimensions: null,
            metrics: null,
            selection: null
        });

    // ProjectAnalysisJobResult Model
    controller.ProjectAnalysisJobResult = controller.ProjectAnalysisJob.extend({
            urlRoot: function() {
                return controller.ProjectAnalysisJob.prototype.urlRoot.apply(this, arguments) + "/results" + "?" + "compression="+this.compression+ "&"+"format="+this.format;
            },
            error: null,
            format: "json",
            compression: "none"
        });

    return controller;
});