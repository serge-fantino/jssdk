define(['jquery', 'backbone', 'jssdk/js/jquery-url'], function($, Backbone) {
	
	// just make shure console.log will not crash
	if (!window.console) {
		window.console = {
			log : function() {
			}
		};
	}

	// Squid API definition
    var squid_api = {

        apiURL: null,
        timeoutMillis : null,
        setApiURL: function(a1) {
            if (a1 && a1[a1.length - 1] == "/") {
                a1 = a1.substring(0, a1.length - 1);
            }
            this.apiURL = a1;
            return this;
        },
        setTimeoutMillis: function(t) {
            this.timeoutMillis = t;
            return this;
        },
        customerId: null,
        fakeServer: null,
        // declare some namespaces
        model: {},
        view: {},
        collection: {},
        controller: {},

        utils: {
            /**
             * Write a cookie.
             * @param name cookie name
             * @param dom cookie domain
             * @param exp cookie expiration delay in minutes
             * @param v cookie value
             */
            writeCookie: function(name, dom, exp, v) {
                var d = null;
                if (exp) {
                    d = new Date();
                    d.setTime(d.getTime() + (exp * 60 * 1000));
                }
                var nc = name + "=" + escape(v) + ((d === null) ? "" : ";expires=" + d.toUTCString()) + "; path=/;";
                if (dom) {
                    nc = nc + " domain=" + dom;
                }
                document.cookie = nc;
            },

            readCookie: function(name) {
                var c = null,
                    dc = document.cookie;
                if (dc.length > 0) {
                    var cs = dc.indexOf(name + "=");
                    if (cs != -1) {
                        cs = cs + name.length + 1;
                        var ce = dc.indexOf(";", cs);
                        if (ce == -1) {
                            ce = dc.length;
                        }
                        c = unescape(dc.substring(cs, ce));
                    }
                }
                return c;
            },
            
            clearLogin : function() {
            	var cookiePrefix = "sq-token";
                squid_api.utils.writeCookie(cookiePrefix + "_" + squid_api.customerId, "", -100000, null);
                squid_api.utils.writeCookie(cookiePrefix, "", -100000, null);
                squid_api.model.login.set({
                    accessToken: null,
                    login: null
                });
            }
        },

        /**
         * Init the API by checking if an AccessToken is present in the url and updating the loginModel accordingly.
         * @param a loginModel (will use the defautl one if null)
         */
        init: function(args) {
            var apiURL = args.apiURL;
            if (!apiURL) {
                apiURL = "https://api.squidsolutions.com/release/v4.2/rs";
            }
            this.setApiURL(apiURL);
            
            var timeoutMillis = args.timeoutMillis;
            if (!timeoutMillis) {
                timeoutMillis = 10*1000; // 10 Sec.
            }
            this.setTimeoutMillis(timeoutMillis);
            
            this.customerId = args.customerId;
            this.clientId = args.clientId;

            var loginModel = args.loginModel;
            if (!loginModel) {
                loginModel = this.model.login;
            }
            var t = $.url("?access_token");
            if (t === null) {
                t = $.url("#access_token");
            }
            
            // set the access_token (to start the login model update)
            loginModel.setAccessToken(t);
        }
    };

    squid_api.model.BaseModel = Backbone.Model.extend({
        baseRoot: function() {
            return squid_api.apiURL;
        },
        urlRoot: function() {
            return this.baseRoot();
        },
        url: function() {
            var url = this.urlRoot();
            if (typeof this.timeoutMillis === 'undefined' ) {
            	url = this.addParam(url, "timeout",squid_api.timeoutMillis);
            } else {
            	if (this.timeoutMillis != null) {
            		url = this.addParam(url, "timeout",this.timeoutMillis());
            	}
            }
            url = this.addParam(url, "access_token",squid_api.model.login.get("accessToken"));
            return url;
        },
        error: null,
        addParam : function(url, name, value) {
            if (value) {
                var delim;
                if (url.indexOf("?")<0) {
                    delim = "?";
                } else {
                    delim = "&";
                }
                url += delim + name + "=" + value;
            }
            return url;
        },
        
        optionsFilter : function(options) {
        	// success
        	var success;
			if (!options) {
				options = {success : null, error : null}; 
			} else {
				success = options.success;
			}
			options.success =  function(model, response, options) {
				squid_api.model.status.setTaskDone(this);
                // normal behavior
				if (success) {
					success.call(this, model, response, options);
				}
			};

			var error;
			error = options.error;
			options.error =  function(model, response, options) {
				if (response.status == 401) {
                    // this is an auth issue
                    squid_api.model.status.set("message", "invalid token");
                    squid_api.model.status.set("error", response);
                    squid_api.utils.clearLogin();
                } else {
                	if (error) {
                		// normal behavior
                		error.call(this.model, response, options);
                	} else {
                		// fallback behavior
                		squid_api.model.status.set("error", response);
                	}
                }
			};
			return options;
		},
        
        /*
         * Overriding fetch to handle token expiration
         */
		fetch : function(options) {
			squid_api.model.status.addTask(this);
			return Backbone.Model.prototype.fetch.call(this, this.optionsFilter(options));
		},

		/*
         * Overriding save to handle token expiration
         */
		save : function(attributes, options) {
			squid_api.model.status.addTask(this);
			return Backbone.Model.prototype.save.call(this, attributes, this.optionsFilter(options));
		}
        
    });

    squid_api.model.BaseCollection = Backbone.Collection.extend({
        baseRoot: function() {
            return squid_api.apiURL;
        },
        urlRoot: function() {
            return this.baseRoot();
        },
        url: function() {
            var url = this.urlRoot();
            url = this.addParam(url, "timeout",squid_api.timeoutMillis);
            url = this.addParam(url, "access_token",squid_api.model.login.get("accessToken"));
            return url;
        },
        error: null,
        addParam : function(url, name, value) {
            if (value) {
                var delim;
                if (url.indexOf("?")<0) {
                    delim = "?";
                } else {
                    delim = "&";
                }
                url += delim + name + "=" + value;
            }
            return url;
        }
    });

    squid_api.model.TokenModel = squid_api.model.BaseModel.extend({
        urlRoot: function() {
            return this.baseRoot() + "/tokeninfo";
        }
    });

    squid_api.model.LoginModel = squid_api.model.BaseModel.extend({

        accessToken: null,

        login: null,

        resetPassword: null,

        urlRoot: function() {
            return this.baseRoot() + "/user";
        },
        
        getDefaultLoginUrl : function() {
            return "https://api.squidsolutions.com/release/v4.2/api/oauth" + "?client_id=" + squid_api.clientId + "&" + "customerId=" + squid_api.customerId;
        },

        /**
         * Login the user
         */
        setAccessToken: function(token, cookieExpiration) {
            if (!cookieExpiration) {
                cookieExpiration = 120; // 2 hours
            }
            var cookiePrefix = "sq-token";
            var cookie;
            if (squid_api.customerId) {
                cookie = cookiePrefix + "_" + squid_api.customerId;
            }
            else {
                cookie = cookiePrefix;
            }
            if ((!token) || (typeof token == "undefined")) {
                // search in a cookie
                token = squid_api.utils.readCookie(cookie);
            }

            if ((token) && (typeof token != "undefined")) {
                this.set("accessToken", token);
            }

            var me = this;

            // fetch the token info from server
            var tokenModel = new squid_api.model.TokenModel({
                "token": token
            });
            
            tokenModel.fetch({
                error: function(model, response, options) {
                    squid_api.model.login.set("login", null);
                },
                success: function(model, response, options) {
                    // set the customerId
                    squid_api.customerId = model.get("customerId");
                    // verify the clientId
                    if (model.get("clientId") != this.clientId) {
                        model.set("login", null);
                    }

                    // update login model from server
                    me.fetch({
                        success: function(model) {
                            if ((token) && (typeof token != "undefined")) {
                                // write in a customer cookie
                                squid_api.utils.writeCookie(cookiePrefix + "_" + squid_api.customerId, "", cookieExpiration, token);
                                // write in a global cookie
                                squid_api.utils.writeCookie(cookiePrefix, "", cookieExpiration, token);
                            }
                        }
                    });
                }
            });


        },

        /**
         * Logout the current user
         */
        logout: function() {
            var me = this;
            // set the access token and refresh data
            var request = $.ajax({
                type: "GET",
                url: squid_api.apiURL + "/logout?access_token=" + this.get("accessToken"),
                dataType: 'json',
                contentType: 'application/json'
            });

            request.done(function(jsonData) {
            	squid_api.utils.clearLogin();
            });

            request.fail(function(jqXHR, textStatus, errorThrown) {
                squid_api.model.status.set("message", "logout failed");
                squid_api.model.status.set("error", errorThrown);
            });
        }

    });
    
    squid_api.model.login = new squid_api.model.LoginModel();

    // user model
    squid_api.model.UserModel = squid_api.model.BaseModel.extend({

        accessToken: null,

        login: null,

        email: null,

        groups: null,

        objectType: "User",

        password: null,

        wsName: null,

        error: "",

        url: function() {
            return this.baseRoot() + this.wsName + "?access_token=" + this.accessToken; // get user
        }

    });
    squid_api.model.userModel = new squid_api.model.UserModel();


    // Status Model
    squid_api.model.StatusModel = squid_api.model.BaseModel.extend({
    	runningTasks : [],
    	completedTasks : [],
    	addTask : function(task) {
    		this.runningTasks.push(task);
    		this.set("status",this.STATUS_RUNNING);
    	},
    	setTaskDone : function(task) {
    		var tasks = this.runningTasks.splice(task);
    		this.completedTasks.push(task);
    		if (tasks.length == 0) {
    			this.set("status",this.STATUS_DONE);
    		}
    	}
    });
    squid_api.model.status = new squid_api.model.StatusModel({
    	STATUS_RUNNING : "RUNNING",
    	STATUS_DONE : "DONE",
    	status : null,
    	error : null,
    	message : null
    });

    /*
     * --- Meta Model ---
     */
    
    squid_api.model.ProjectCollection = squid_api.model.BaseCollection.extend({
        model : squid_api.model.ProjectModel,
        urlRoot: function() {
            return this.baseRoot() + "/projects";
        }
    });
    
    squid_api.model.ProjectModel = squid_api.model.BaseModel.extend({
        urlRoot: function() {
            return this.baseRoot() + "/projects/" + this.id.projectId;
        }
    });

    squid_api.model.DomainModel = squid_api.model.ProjectModel.extend({
        urlRoot: function() {
            return squid_api.model.ProjectModel.prototype.urlRoot.apply(this, arguments) + "/domains/" + this.id.domainId;
        }
    });
    
    squid_api.model.MetricModel = squid_api.model.DomainModel.extend({
        urlRoot: function() {
            return squid_api.model.DomainModel.prototype.urlRoot.apply(this, arguments) + "/metrics/" + this.id.metricId;
        }
    });
    
    squid_api.model.MetricCollection = squid_api.model.BaseCollection.extend({
        model : squid_api.model.MetricModel
    });
    
    return squid_api;
});