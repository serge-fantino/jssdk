define(['backbone', 'hbs!jssdk/sdk/templates/squid_api_metric_value'], function(Backbone, template) {

    var View = Backbone.View.extend({
        
        viewInitialized : false,
        
        format : null,

        initialize: function(options) {
            if (this.model) {
                this.model.on('change:value', this.render, this);
            }
            if (options.format) {
                this.format = options.format;
            } else {
                this.format = function(val){return val;};
            }
        },

        setModel: function(model) {
            this.model = model;
            this.initialize();
        },

        render: function() {
            if (!this.viewInitialized) {
    			var html = template({});
    			this.$el.html(html);
    			this.viewInitialized = true;
			}
			
			var errorData = this.model.get("error");
			if (errorData) {
			    this.$el.find(".sq-error").show();
			    this.$el.find(".sq-content").hide();
				this.$el.find(".sq-wait").hide();
			} else {
    			var jsonData = this.model.toJSON();
    			if (jsonData) {
    				var val = jsonData.value;
    				// apply formatting
                    if (this.format) {
                        val = this.format(val);
                    }
                    var content = {"label" : jsonData.label, "value" : val};
                    var html = template(content);
			        this.$el.html(html);
                    
    			    this.$el.find(".sq-content").show();
    				this.$el.find(".sq-wait").hide();
    				this.$el.find(".sq-error").hide();
    			} else {
    				this.$el.find(".sq-content").hide();
    				this.$el.find(".sq-wait").show();
    				this.$el.find(".sq-error").hide();
    			}
            }

            return this;
        }

    });

    return View;
});
