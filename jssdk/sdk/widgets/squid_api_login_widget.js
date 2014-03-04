define([
  'backbone'
], function(Backbone) {

	var LoginView = Backbone.View.extend({

	    loginUrl: null,

	    redirectUri: null,

	    initialize: function() {
	        if (this.model) {
	            this.model.on("change:login", this.render, this);
	        }
	    },

	    setModel: function(model) {
	        this.model = model;
	        this.initialize();
	    },
	    
	    setLoginUrl: function(d) {
	        this.loginUrl = d;
	        return this;
	    },
	    
	    setRedirectUri: function(d) {
	        this.redirectUri = d;
	        return this;
	    },

	    events: {
	        "click #ko": "login",
	        "click #ok": "logout"
	    },

	    render: function() {
	        if (this.model) {
	            var userLogin = this.model.get("login");
	            var loginObj = this.$el.find("#ko");
	            var logoutObj = this.$el.find("#ok");
	            if (userLogin && userLogin != "") { // already logged in
	                logoutObj.find("#user").html(userLogin);
	                loginObj.hide();
	                logoutObj.show();
	            }
	            else {
	                loginObj.show();
	                logoutObj.hide();
	            }
	        }
	        this.$el.show();
	        return this;
	    },

	    login: function(event) {
	        var loginUrl;
	        if (this.loginUrl == null) {
	           loginUrl = this.model.defaultLoginUrl;
	        } else {
	            loginUrl = this.loginUrl;
	        }
	        var redirectUri;
	        if (this.redirectUri == null) {
	            // use the current location stripping token or code parameters
	            var url;
	            url = this.removeURLParameter(""+window.location, "access_token");
	            url = this.removeURLParameter(url, "code");
	            redirectUri = encodeURIComponent(url);
	        }
	        
            // redirection mode
            var url = loginUrl;
            if (loginUrl.indexOf("?") > 0) {
                url += "&";
            }
            else {
                url += "?";
            }
            window.location = url + "redirect_uri=" + redirectUri;
	    },
	    
	    logout: function(event) {
	        this.model.logout();
	    },
	    
	    removeURLParameter : function(url, parameter) {
            //prefer to use l.search if you have a location/link object
            var urlparts= url.split('?');   
            if (urlparts.length>=2) {
        
                var prefix= encodeURIComponent(parameter)+'=';
                var pars= urlparts[1].split(/[&;]/g);
        
                //reverse iteration as may be destructive
                for (var i= pars.length; i-- > 0;) {    
                    //idiom for string.startsWith
                    if (pars[i].lastIndexOf(prefix, 0) !== -1) {  
                        pars.splice(i, 1);
                    }
                }
        
                url= urlparts[0]+'?'+pars.join('&');
                return url;
            } else {
                return url;
            }
        }
	});

	return LoginView;
});