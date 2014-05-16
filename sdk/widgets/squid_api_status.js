define(['backbone', 'hbs!jssdk/sdk/templates/squid_api_status'], function(Backbone, defaultTemplate) {

	/*
	 * Widget which displays the global status set in it model (typically squid_api.model.status)
	 */
    var View = Backbone.View.extend({
        
        viewInitialized : false,
        
        template : null,
        
        format : null,

        initialize: function(options) {
            if (this.model) {
                this.model.on('change:status', this.render, this);
            }
            if (options.template) {
                this.template = options.template;
            } else {
                this.template = defaultTemplate;
            }
        },

        setModel: function(model) {
            this.model = model;
            this.initialize();
        },

        render: function() {
			var error = this.model.get("error");
			var status = this.model.get("status");
			var running = (status != this.model.STATUS_DONE);
			var failed = (error != null);
			
			if ((!running) && (!failed)) {
				// hide
				this.$el.hide();
			} else {
				// display
				var jsonData = this.model.toJSON();
                var html = this.template({"running" : running, "failed" : failed, "status" : jsonData});
		        this.$el.html(html);
		        this.$el.show();
				
			}
            return this;
        }

    });

    return View;
});
