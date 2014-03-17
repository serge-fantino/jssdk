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

            buildSelection: function(selection) {
                var facets = [];
                if (selection) {
                    if (selection.facets) {
                        facets = selection.facets;
                    } else {
                        // for backward compatibility
                        facets = selection;
                    }
                }
                return {
                    facets: facets
                };
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
                timeoutMillis = 60*60*1000;
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
        setAccessToken: function(token, callback, cookieExpiration) {
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
                error: function(model, error) {
                    squid_api.model.loading.set("loading", false);
                    squid_api.model.login.set("login", null);
                    if (error.status != 401) {
                        // this is not just a login issue
                        squid_api.model.error.set("errorMessage", error);
                    }

                    if (callback) {
                        callback(me, false);
                    }
                },
                success: function(model) {
                    // set the customerId
                    squid_api.customerId = model.get("customerId");
                    // verify the clientId
                    if (model.get("clientId") != this.clientId) {
                        squid_api.model.loading.set("loading", false);
                        model.set("login", null);
                        if (callback) {
                            callback(model, false);
                        }
                    }

                    // update login model from server
                    me.fetch({
                        error: function(model, error) {
                            squid_api.model.loading.set("loading", false);
                            model.set("login", null);
                            if (error.status != 401) {
                                // this is not just a login issue
                                squid_api.model.error.set("errorMessage", error);
                            }
                            if (callback) {
                                callback(model, false);
                            }
                        },

                        success: function(model) {
                            squid_api.model.loading.set("loading", false);
                            if ((token) && (typeof token != "undefined")) {
                                // write in a customer cookie
                                squid_api.utils.writeCookie(cookiePrefix + "_" + squid_api.customerId, "", cookieExpiration, token);
                                // write in a global cookie
                                squid_api.utils.writeCookie(cookiePrefix, "", cookieExpiration, token);
                            }
                            if (callback) {
                                callback(model, true);
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
                var cookiePrefix = "sq-token";
                squid_api.utils.writeCookie(cookiePrefix + "_" + squid_api.customerId, "", - 100000, null);
                squid_api.utils.writeCookie(cookiePrefix, "", - 100000, null);
                me.set({
                    accessToken: null,
                    login: null
                });
            });

            request.fail(function(jqXHR, textStatus, errorThrown) {
                squid_api.model.error.set("logout failed", errorThrown);
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

        urlRoot: function() {
            return this.baseRoot() + "/status";
        }

    });
    squid_api.model.status = new squid_api.model.StatusModel();


    // Error Model
    squid_api.model.ErrorModel = squid_api.model.BaseModel.extend({
        errorMessage: null
    });
    squid_api.model.error = new squid_api.model.ErrorModel();

    // Global loading Model
    squid_api.model.LoadingModel = squid_api.model.BaseModel.extend({
        loading: true
    });
    squid_api.model.loading = new squid_api.model.LoadingModel();

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

    // deprecated 
    
    squid_api.model.FiltersModel = Backbone.Model.extend({
        selection: null,
        userSelection: null
    });

    return squid_api;
});