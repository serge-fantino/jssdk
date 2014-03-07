define([
    'backbone',
    'd3'
], function(Backbone) {
    
    var View = Backbone.View.extend( {
        
        // constants
        formatNumber : d3.format(",d"),
        formatDate : d3.time.format("%Y-%m-%d"),
        
        // variables
        width : null, 
        height : 200, 
        xScaleType : null,
        xScaleFormat : null,
        xDimensionId : null,
        yMetricId : null,
        
        template : null,
        
        initialResults : null,
		
		setTemplate : function(t) {
            if (t) {
                this.template = t;
            }
            return this;
        },
        
        // setters
        setWidth : function(w) {
            this.width = w;
            return this;
        },
        
        setHeight : function(h) {
            this.height = h;
            return this;
        },
        
        setXScaleType : function(t) {
            this.xScaleType = t;
            return this;
        },
        
        setXDimensionId : function(d) {
            this.xDimensionId = d;
            return this;
        },
        
        setYMetricId : function(d) {
            this.yMetricId = d;
            return this;
        },
        
        initialize : function() {
            if (this.model) {
                this.model.on('change:results', this.render, this);
                this.model.on('change:readyStatus', this.updateStatus, this);
            }
        },
        
        setModel : function(model) {
            this.model = model;
            this.initialize();
        },
        
        updateStatus: function(){
        	var readyStatus = this.model.get('readyStatus');
        	var waiting = this.$el.find(".sq-wait");
        	if (readyStatus) {
       			waiting.hide();
        	} else {
        		waiting.show();
        	}
        },

        render : function() {
            var me = this;
			var results = this.model.get("results");
			if (results && (!this.initialResults)) {
                this.initialResults = results;
            }
			
			var viewPort = this.$el.find(".sq-content");
			viewPort.empty();
    			
			if (results) {
			    if (!this.xScaleType) {
			        if (results.cols[0].dataType == "DATE") {
			            this.setXScaleType("time");
			        } else {
			            this.setXScaleType("linear");
			        }
			    }
			    if (!this.xDimensionId) {
			        this.setXDimensionId(results.cols[0].id);
			    }
			    if (!this.yMetricId) {
			        this.setYMetricId(results.cols[1].id);
			    }
			    
			    // set the x and y indexes
			    var yIndex = 1;
			    var xIndex = 0;
			    for(var i=0; i<results.cols.length; i++) {
			        var colId = results.cols[i].id;
			        if (colId == this.xDimensionId) {
			            xIndex = i;
			        }
			        if (colId == this.yMetricId) {
			            yIndex = i;
			        }
			    }
			    var chartWidth;
			    if (!this.width) {
			        chartWidth = this.$el.width();
			    } else {
			        chartWidth = this.width;
			    }
				this.buildViz(results, xIndex, yIndex, viewPort.get(0), chartWidth);
                
			}
			return this;
		},
		
		buildViz : function(jsonData, xIndex, yIndex, viewPort, chartWidth) {
		    var me = this;
		    var cols = jsonData.cols;
			var rows = jsonData.rows;
            
            var xAxis;
            var xPositionFn;
            
            var margin = {top: 20, right: 20, bottom: 30, left: null};
            
            
            // build the Y scale
            
            var height = this.height - margin.top - margin.bottom;
            var y = d3.scale.linear()
                .range([height, 0]);
            
            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .ticks(10);
                
            var ymax = d3.max(rows, function(d) { 
                return +d.v[yIndex]; 
            });

            y.domain([0, ymax]);
            
            margin.left = (((ymax+"").length)*10);
            
            
            // build the X scale
            
            var width = chartWidth - margin.left - margin.right;
            if (this.xScaleType == "linear") {
                var xScaleFormat = d3.format("+,d");
                var x = d3.scale.linear()
                    .range([0, width]);
            
                xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom")
                    .ticks(5);
                    
                var xmax = d3.max(rows, function(d) { 
                    return xScaleFormat(d.v[xIndex]); 
                });
                
                var xmin = d3.min(rows, function(d) { 
                    return xScaleFormat(d.v[xIndex]); 
                });
                
                x.domain([xmin, xmax]);
                
                xPositionFn = function(d) {
                    var v = x(xScaleFormat(d.v[xIndex]));
                    return v; 
                }
            }
            
            if (this.xScaleType == "time") {
                var xScaleFormat = d3.time.format("%Y-%m-%d");
                var x = d3.time.scale()
                    .range([0, width]);
            
                xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom")
                    .ticks(5);
                    
                var xmax = d3.max(rows, function(d) { 
                    return xScaleFormat.parse(d.v[xIndex]); 
                });
                
                var xmin = d3.min(rows, function(d) { 
                    return xScaleFormat.parse(d.v[xIndex]); 
                });
                
                x.domain([xmin, xmax]);
                
                xPositionFn = function(d) {
                    var v = x(xScaleFormat.parse(d.v[xIndex]));
                    return v; 
                }
            }

            if (this.xScaleType == "ordinal") {
                var x = d3.scale.ordinal()
                    .rangeRoundBands([0, width], .1);
            
                xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                x.domain(rows.map(function(d) { return d.v[xIndex]; }));
                
                xPositionFn = function(d) {
                    var v = x(d.v[xIndex]);
                    return v; 
                }
            }
            
                
            //x.domain(rows.map(function(d) { return d.v[xIndex]; }));

		    var svg = d3.select(viewPort).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svg.append("g")
                  .attr("class", "x axis")
                  .attr("transform", "translate(0," + height + ")")
                  .call(xAxis);

            svg.append("g")
                  .attr("class", "y axis")
                  .call(yAxis)
                .append("text")
                  .attr("transform", "rotate(-90)")
                  .attr("y", 6)
                  .attr("dy", ".71em")
                  .style("text-anchor", "end")
                  .text(cols[yIndex].lname);

		    svg.selectAll(".bar")
                  .data(rows)
                  .enter().append("rect")
                  .attr("class", "bar")
                  .attr("x", xPositionFn)
                  .attr("width", function(d) {  return 3; })
                  .attr("y", function(d) { 
                      var r = y(d.v[yIndex]);
                      return r;
                      })
                  .attr("height", function(d) { 
                      var r = height - y(d.v[yIndex]); 
                      return r;
                    });
                  
		}
		

	});

    return View;
});
