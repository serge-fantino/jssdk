define(['backbone', 'hbs!jssdk/sdk/templates/squid_api_metric_value', 'd3'], function(Backbone, template) {

    var View = Backbone.View.extend({
        
        viewInitialized : false,

        initialize: function(options) {
            if (this.model) {
                this.model.on('change:value', this.render, this);
            }
            this.options = options;
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
			    this.$el.find(".content").hide();
				this.$el.find(".sq-wait").hide();
			} else {
    			var jsonData = this.model.toJSON();
    			if (jsonData) {
    				var val = jsonData.value;
    				if (this.options.format) {
                        var f = d3.format(this.options.format);
                        val = f(val);
                    }
                    var content = {"label" : jsonData.label, "value" : val};
                    var html = template(content);
			        this.$el.html(html);
                    
    			    this.$el.find(".content").show();
    				this.$el.find(".sq-wait").hide();
    				this.$el.find(".sq-error").hide();
    			} else {
    				this.$el.find(".content").hide();
    				this.$el.find(".sq-wait").show();
    				this.$el.find(".sq-error").hide();
    			}
            }

            return this;
        }

    });

    return View;
});
