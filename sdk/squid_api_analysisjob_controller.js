define(['jquery', 'backbone', 'jssdk/sdk/squid_api'], function($, Backbone, squid_api) {

    var controller = {

        fakeServer: null,

        /**
         * Create (and execute) a new AnalysisJob.
         * @returns a Jquery Deferred
         */
        createAnalysisJob: function(analysisModel, filters, observer) {

        	if (!observer) {
        		observer = $.Deferred(); 
        	}
        	
            analysisModel.set("status","RUNNING");
    
            var selection;
            if (!filters) {
                selection =  analysisModel.get("selection");
            } else {
            	selection =  filters.get("selection");
            }

            // create a new AnalysisJob
            var analysisJob = new controller.ProjectAnalysisJob();
            var projectId;
            if (analysisModel.id.projectId) {
                projectId = analysisModel.id.projectId;
            } else {
                projectId = analysisModel.get("projectId");
            }
            analysisJob.set({"id" : {
                    projectId: projectId,
                    analysisJobId: null},
                    "domains" : analysisModel.get("domains"),
                    "dimensions": analysisModel.get("dimensions"),
                    "metrics": analysisModel.get("metrics"),
                    "autoRun": analysisModel.get("autoRun"),
                    "selection": selection});

            // save the analysisJob to API
            if (this.fakeServer) {
                this.fakeServer.respond();
            }
            
            analysisJob.save({}, {
            	success : function(model, response) {
                    console.log("createAnalysis success");
                    squid_api.model.error.set("errorMessage", null);
        	        analysisModel.set("jobId", model.get("id"));
        	        observer.resolve(model, response);
                },
                error : function(model, response) {
                	console.log("createAnalysis error");
                    squid_api.model.error.set("errorMessage", response);
                    analysisModel.set("error", response);
                    analysisModel.set("status", "DONE");
                    observer.reject(model, response);
                }
            });
            
            return observer;
        },
        
        /**
         * Create (and execute) a new AnalysisJob, then retrieve the results.
         */
        computeAnalysis: function(analysisModel, filters, observer) {
        	if (!observer) {
        		observer = $.Deferred(); 
        	}
            this.createAnalysisJob(analysisModel, filters)
            	.done(function(model, response) {
            		if (model.get("status") == "DONE") {
        	            analysisModel.set("error", model.get("error"));
        	            analysisModel.set("results", model.get("results"));
        	            analysisModel.set("status", "DONE");
        	            observer.resolve(model, response);
        	        } else {
        	        	// try to get the results
        	        	controller.getAnalysisJobResults(observer, analysisModel);
        	        }
            	})
            	.fail(function(model, response) {
            		observer.reject(model, response);
            	});
            	
            return observer;
        },
        
        /**
         * retrieve the results.
         */
        getAnalysisJobResults: function(observer, analysisModel) {
        	console.log("getAnalysisJobResults");
            var analysisJobResults = new controller.ProjectAnalysisJobResult();
            analysisJobResults.set("id", analysisModel.get("jobId"));

            // get the results from API
            analysisJobResults.fetch({
                error: function(model, response) {	
            		squid_api.model.error.set("errorMessage", response);
            		analysisModel.set("error", {message : response.statusText});
            		analysisModel.set("status", "DONE");
            		observer.reject(model, response);
                },
                success: function(model, response) {
                	if (model.get("apiError") && (model.get("apiError") == "COMPUTING_IN_PROGRESS")) {
                		// retry
                		controller.getAnalysisJobResults(observer, analysisModel);
                	} else {
	                    // update the analysis Model
	                    squid_api.model.error.set("errorMessage", null);
	                    analysisModel.set("error", null);
	                    analysisModel.set("results", model.toJSON());
	                    analysisModel.set("status", "DONE");
	                    observer.resolve(model, response);
                	}
                }
            });
            if (this.fakeServer) {
                this.fakeServer.respond();
            }
        },
        
        /**
         * Create (and execute) a new MultiAnalysisJob, retrieve the results 
         * and set the 'done' or 'error' attribute to true when all analysis are done or any failed.
         */
        computeMultiAnalysis: function(multiAnalysisModel, selection) {
            var me = this;
            multiAnalysisModel.set("status", "RUNNING");
            var analyses = multiAnalysisModel.get("analyses");
            var analysesCount = analyses.length;
            // build all jobs
            var jobs = [];
            for (var i=0; i<analysesCount; i++) {
            	var analysisModel = analyses[i];
	            var observer = $.Deferred(); 
	            jobs.push(this.computeAnalysis(analysisModel, selection, observer));
            }
            console.log("analysesCount : "+analysesCount);
            // wait for jobs completion
            $.when.apply($, jobs)
            	.done( function(model, response) {
            		multiAnalysisModel.set("error", model.get("error"));
        			multiAnalysisModel.set("status", "DONE");
            	})
            	.fail( function(model, response) {
            		multiAnalysisModel.set("status", "DONE");
            	});
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
            },
            
            isDone : function() {
        		return (this.get("status") == "DONE");
        	}
        }),
        
        MultiAnalysisModel: Backbone.Model.extend({
        	isDone : function() {
        		return (this.get("status") == "DONE");
        	}
        })

    };
    
    // ProjectAnalysisJob Model
    controller.ProjectAnalysisJob = squid_api.model.ProjectModel.extend({
            urlRoot: function() {
                return squid_api.model.ProjectModel.prototype.urlRoot.apply(this, arguments) + "/analysisjobs/" + (this.id.analysisJobId ? this.id.analysisJobId : "");
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