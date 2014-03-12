define(['backbone', 'hbs!jssdk/sdk/templates/squid_api_metric_value', 'd3'], function(Backbone, template) {

    var SingleValueView = Backbone.View.extend({
        
        viewInitialized : false,

        initialize: function(options) {
            if (this.model) {
                this.model.on('change:results', this.render, this);
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
			    console.error(errorData.message);
			    this.$el.find(".sq-error").show();
			    this.$el.find(".content").hide();
				this.$el.find(".sq-wait").hide();
			} else {
    			var jsonData = this.model.get("results");
    			if (jsonData) {
                    var colIdx = null;
                    for (var i = 0; i < jsonData.cols.length; i++) {
                        var col = jsonData.cols[i];
                        if (col.pk.metricId) {
                            colIdx = i;
                        }
                    }
                    if (colIdx !== null) {
                        var label = jsonData.cols[colIdx].lname;
                        var val = jsonData.rows[0].v[colIdx];
                        if (this.options.format) {
                            var f = d3.format(this.options.format);
                            val = f(val);
                        }
                        var content = {"label" : label, "value" : val};
                        var html = template(content);
    			        this.$el.html(html);
                    }
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

    return SingleValueView;
});
